import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * MCP request authentication (#272).
 *
 * The caller is a remote MCP client (ChatGPT connector), so there is no
 * cookie session. Every request must carry `Authorization: Bearer <token>`
 * where token is a Supabase access token issued through the project's
 * OAuth 2.1 server to the approved connector client.
 *
 * Verification is fully server-side:
 *   1. `auth.getUser(token)` validates the JWT against Supabase — forged or
 *      expired tokens fail closed before any data access.
 *   2. `PRESET_FACTORY_MCP_CLIENT_IDS` (comma-separated) is REQUIRED in
 *      production: the token's `client_id` claim — issued by the Supabase
 *      OAuth server per its documented claim shape — must match an entry,
 *      so ordinary web-session bearer tokens can never drive this surface.
 *      Outside production the gate may stay unset for local development.
 *   3. Role/owner checks are NOT duplicated here — Engineer A's
 *      `createBearerPresetFactoryContext` is the single authoritative gate
 *      (it re-verifies the JWT with GoTrue, reads profiles, and every
 *      SECURITY DEFINER RPC re-checks `is_admin()/is_owner()` on
 *      `auth.uid()`).
 */

export interface McpCallerContext {
  user: User;
  /** Bearer token as received — passed to A's bearer context factory. */
  accessToken: string;
  /**
   * Token-scoped client for MCP-side bookkeeping (audit inserts). Carries
   * the caller's JWT in `Authorization` so RLS/`auth.uid()` resolve to the
   * real caller; no session is persisted and the service role is never
   * touched.
   */
  supabase: SupabaseClient;
}

export type McpAuthResult =
  | { ok: true; caller: McpCallerContext }
  | { ok: false; status: 401 | 403; error: string };

function userClientForToken(token: string): SupabaseClient {
  return createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

/** Decode a JWT payload — verification already happened via getUser();
 * this is only the client-binding gate. */
function tokenClaims(token: string): Record<string, unknown> {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Client binding gate. Production: the allowlist MUST be configured and the
 * token's `client_id` claim (the field Supabase's OAuth 2.1 server
 * documents for OAuth-issued access tokens) must match — fail closed.
 * Development: unset allowlist degrades to a warning-free pass for local
 * work, but never silently in production.
 */
function clientIdCheck(token: string): { ok: true } | { ok: false; error: string } {
  const allow = process.env.PRESET_FACTORY_MCP_CLIENT_IDS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!allow || allow.length === 0) {
    return isProduction()
      ? { ok: false, error: "MCP client allowlist (PRESET_FACTORY_MCP_CLIENT_IDS) is not configured" }
      : { ok: true };
  }
  const claims = tokenClaims(token);
  const clientId = typeof claims.client_id === "string" ? claims.client_id : null;
  if (!clientId || !allow.includes(clientId)) {
    return { ok: false, error: "Token was not issued to an approved MCP client" };
  }
  return { ok: true };
}

export async function authenticateMcpRequest(
  request: Request
): Promise<McpAuthResult> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }
  const token = match[1];

  // Client binding first — cheap reject before any provider calls.
  const clientCheck = clientIdCheck(token);
  if (!clientCheck.ok) {
    return { ok: false, status: 403, error: clientCheck.error };
  }

  // Verify the token with Supabase (invalid/expired → fail closed).
  const verifier = createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await verifier.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }

  // Role authorization is delegated to createBearerPresetFactoryContext —
  // a non-admin caller authenticates here but every tool call resolves the
  // canonical context and fails closed with `forbidden`.
  return {
    ok: true,
    caller: {
      user: data.user,
      accessToken: token,
      supabase: userClientForToken(token),
    },
  };
}
