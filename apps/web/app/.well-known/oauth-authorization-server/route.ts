import { NextResponse } from "next/server";
import { supabaseUrl } from "@/lib/supabase/env";

/**
 * RFC 8414 — Authorization Server Metadata (#272).
 *
 * Points MCP clients at the Supabase project's OAuth 2.1 server endpoints.
 * Requires the project's Auth → OAuth Server feature to be enabled; when it
 * is, dynamic client registration + PKCE work out of the box.
 */
export function GET() {
  const base = `${supabaseUrl()}/auth/v1`;
  return NextResponse.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/clients/register`,
    userinfo_endpoint: `${base}/userinfo`,
    jwks_uri: `${base}/.well-known/jwks.json`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_basic", "client_secret_post"],
    scopes_supported: ["openid", "email", "profile"],
  });
}
