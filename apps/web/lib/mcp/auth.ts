import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * MCP request authentication (#272).
 *
 * The caller is a remote MCP client (ChatGPT connector), so there is no
 * cookie session. Every request must carry `Authorization: Bearer <token>`
 * where token is a Supabase access token issued to the owner — obtained via
 * the OAuth 2.1 authorization-code flow advertised by the project's auth
 * server (see .well-known routes) or a short-lived dev token.
 *
 * Verification is fully server-side:
 *   1. `auth.getUser(token)` validates the JWT against Supabase — forged or
 *      expired tokens fail closed before any data access.
 *   2. `profiles.is_admin || is_owner` is re-checked on EVERY call — bearer
 *      user IDs, client-supplied flags and JWT user_metadata are never
 *      trusted.
 *   3. Downstream work uses a client bound to the caller's own token, so
 *      RLS and `auth.uid()` behave exactly as they do for the web admin and
 *      the service role is never touched.
 */

export interface McpCallerContext {
  user: User;
  /** Bearer token as received — forwarded to Engineer A's API calls. */
  accessToken: string;
  /** Supabase client scoped to the caller's token (their RLS, their uid). */
  supabase: SupabaseClient;
  isOwner: boolean;
}

export type McpAuthResult =
  | { ok: true; caller: McpCallerContext }
  | { ok: false; status: 401 | 403; error: string };

function userClientForToken(token: string): SupabaseClient {
  return createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
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
  const supabase = userClientForToken(token);
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
      isOwner: Boolean(profile.is_owner),
    },
  };
}
