import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * MCP request authentication (#272).
 *
 * The caller is a remote MCP client (ChatGPT connector), so there is no
 * cookie session. Every request must carry `Authorization: Bearer <token>`
 * where token is a Supabase access token issued through the project's
 * OAuth 2.1 server (see .well-known routes + /oauth/consent) or a
 * short-lived dev token.
 *
 * Verification is fully server-side:
 *   1. `auth.getUser(token)` validates the JWT against Supabase — forged or
 *      expired tokens fail closed before any data access.
 *   2. `profiles.is_admin || is_owner` is re-checked on EVERY call — bearer
 *      user IDs, client-supplied flags and JWT user_metadata are never
 *      trusted.
 *   3. Downstream work uses a client whose session IS the caller's token,
 *      so RLS, `auth.uid()` and Engineer A's `createPresetFactoryContext`
 *      behave exactly as they do for the web admin — the service role is
 *      never touched.
 *   4. If `PRESET_FACTORY_MCP_CLIENT_IDS` is set (comma-separated), the
 *      token's `azp`/`client_id`/`aud` claim must match one of them, so
 *      ordinary web-session tokens can't drive the MCP write surface.
 */

export interface McpCallerContext {
  user: User;
  /** Bearer token as received — forwarded nowhere else; the client carries it. */
  accessToken: string;
  /** Supabase client scoped to the caller's token (their RLS, their uid). */
  supabase: SupabaseClient;
  isAdmin: boolean;
  isOwner: boolean;
}

export type McpAuthResult =
  | { ok: true; caller: McpCallerContext }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Build a client whose auth session is the caller's verified token.
 * `setSession` stores it so `supabase.auth.getUser()` (used inside
 * `createPresetFactoryContext`) resolves without a cookie store; the
 * global Authorization header keeps every PostgREST call on the caller's
 * own JWT. The refresh_token is a placeholder — it is only touched when
 * the access token has expired, in which case setSession fails closed and
 * we never get here (the token was verified moments earlier).
 */
async function userClientForToken(token: string): Promise<SupabaseClient> {
  const client = createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { error } = await client.auth.setSession({
    access_token: token,
    refresh_token: "mcp-transport-only",
  });
  if (error) {
    throw new Error("Caller token could not establish a session context.");
  }
  return client;
}

/** Decode a JWT payload without trusting it — verification already happened
 * server-side via getUser(); this is only the optional client-id gate. */
function tokenClaims(token: string): Record<string, unknown> {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function clientIdAllowed(token: string): boolean {
  const allow = process.env.PRESET_FACTORY_MCP_CLIENT_IDS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!allow || allow.length === 0) return true; // gate only when configured
  const claims = tokenClaims(token);
  const candidates = [claims.azp, claims.client_id, claims.aud]
    .flat()
    .filter((v): v is string => typeof v === "string");
  return candidates.some((c) => allow.includes(c));
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

  // Optional client binding: only tokens issued to the approved MCP OAuth
  // client may drive this surface when the env gate is configured.
  if (!clientIdAllowed(token)) {
    return { ok: false, status: 403, error: "Token was not issued to an approved MCP client" };
  }

  // 1 — verify the token with Supabase (invalid/expired → fail closed).
  const verifier = createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await verifier.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }
  const user = data.user;

  // 2 — fresh role check on every request, using the caller's own session.
  let supabase: SupabaseClient;
  try {
    supabase = await userClientForToken(token);
  } catch {
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin, is_owner")
    .eq("id", user.id)
    .single();
  if (profileError || !(profile?.is_admin || profile?.is_owner)) {
    return {
      ok: false,
      status: 403,
      error: "Preset Factory is restricted to admin/owner accounts",
    };
  }

  return {
    ok: true,
    caller: {
      user,
      accessToken: token,
      supabase,
      isAdmin: Boolean(profile.is_admin),
      isOwner: Boolean(profile.is_owner),
    },
  };
}
