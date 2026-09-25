import { createClient } from "@/lib/supabase/server";
import { isRelativePath } from "@/lib/auth/url";
import { claimAnonSessionToUser } from "@/lib/teaser/pending";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no-code", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Recovery links land on their own expired state with a resend path.
    // Everything else (signup confirmation, OAuth) gets a calm login error —
    // never the raw provider message.
    if (next === "/update-password") {
      return NextResponse.redirect(
        new URL("/forgot-password?error=link-expired", request.url)
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "link-expired");
    if (isRelativePath(next) && next !== "/app") {
      loginUrl.searchParams.set("next", next);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Claim any anon-session uploads/pending generations to the new account
  // (08 §5) — runs once per session claim; no-op when no anon cookie exists.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    try {
      await claimAnonSessionToUser(user.id);
    } catch {
      // Claim failure must not block auth — worst case the teaser re-uploads.
    }
  }

  const redirectTo = isRelativePath(next) ? next : "/app";
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
