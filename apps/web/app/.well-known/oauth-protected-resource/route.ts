import { NextRequest, NextResponse } from "next/server";
import { supabaseUrl } from "@/lib/supabase/env";

/**
 * RFC 9728 — OAuth 2.0 Protected Resource Metadata (#272).
 *
 * Advertised via `WWW-Authenticate: Bearer resource_metadata=...` on 401s so
 * ChatGPT connectors can discover the authorization server automatically.
 * The authorization server is the 5Pixels Supabase project's built-in OAuth
 * 2.1 server (`{project}/auth/v1`) — it must be enabled in the project's
 * Auth settings for the browser-consent flow to work.
 */
export function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  return NextResponse.json({
    resource: `${origin}/api/mcp`,
    authorization_servers: [`${supabaseUrl()}/auth/v1`],
    bearer_methods_supported: ["header"],
    resource_documentation: `${origin}/admin`,
    scopes_supported: [],
  });
}
