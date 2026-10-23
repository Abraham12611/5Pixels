import { NextResponse } from "next/server";
import { supabaseUrl } from "@/lib/supabase/env";

/**
 * RFC 8414 — Authorization Server Metadata (#272).
 *
 * Proxies the Supabase project's REAL discovery document instead of
 * hand-coding endpoints — the project's Auth → OAuth Server feature
 * publishes `/.well-known/openid-configuration` (and the OAuth-server
 * variant under `/auth/v1/.well-known/oauth-authorization-server`) with
 * the authoritative authorize/token/register/userinfo URLs. Forwarded
 * verbatim so metadata can never drift from the actual provider; cached
 * briefly at the edge.
 */

export const dynamic = "force-dynamic";

const DISCOVERY_PATHS = [
  "/auth/v1/.well-known/oauth-authorization-server",
  "/auth/v1/.well-known/openid-configuration",
];

export async function GET() {
  const base = supabaseUrl().replace(/\/+$/, "");
  for (const path of DISCOVERY_PATHS) {
    try {
      const res = await fetch(`${base}${path}`, {
        next: { revalidate: 300 },
        headers: { accept: "application/json" },
      });
      if (!res.ok) continue;
      const doc = await res.json();
      if (doc && typeof doc === "object" && "issuer" in doc) {
        return NextResponse.json(doc, {
          headers: { "cache-control": "public, max-age=300" },
        });
      }
    } catch {
      // try next discovery path
    }
  }
  return NextResponse.json(
    {
      error: "oauth_server_unavailable",
      error_description:
        "The Supabase OAuth 2.1 server is not enabled on this project. Enable Auth → OAuth Server to use the ChatGPT connector.",
    },
    { status: 503 }
  );
}
