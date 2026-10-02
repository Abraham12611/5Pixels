import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isRelativePath } from "@/lib/auth/url";
import { LEGAL_VERSION } from "@/lib/legal";
import { claimAnonSessionToUser } from "@/lib/teaser/pending";
import { claimReferralForUser } from "@/lib/referrals/session";
import { syncParticipantToGrowSurf } from "@/lib/growsurf/sync";
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
    try {
      await claimReferralForUser(user.id);
    } catch {
      // Referral attribution is best-effort — never block auth over it.
    }
    try {
      // GrowSurf participant sync (03 §3): every user is a potential
      // referrer. No-ops when unconfigured or already synced.
      await syncParticipantToGrowSurf(user.id);
    } catch {
      // Third-party sync must never block auth.
    }
  }

  const redirectTo = isRelativePath(next) ? next : "/app";

  // New signups enter onboarding before the app (08 §5); existing users
  // were backfilled and pass straight through. The requested `next`
  // rides along so deep links survive the detour.
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at, legal_consent_version")
      .eq("id", user.id)
      .single();

    // OAuth and email-confirmation logins reach here: the "By continuing you
    // agree" line under the OAuth button covers consent, so stamp whatever
    // version is missing/stale. Password sign-ins gate re-acceptance in the
    // signIn action instead.
    if (profile && profile.legal_consent_version !== LEGAL_VERSION) {
      try {
        const service = createServiceClient();
        await service
          .from("profiles")
          .update({
            legal_consent_version: LEGAL_VERSION,
            legal_consent_accepted_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      } catch {
        // Consent stamping must never block auth.
      }
    }
    if (profile && !profile.onboarding_completed_at) {
      const onboardingUrl = new URL("/onboarding", request.url);
      if (redirectTo !== "/app") {
        onboardingUrl.searchParams.set("next", redirectTo);
      }
      return NextResponse.redirect(onboardingUrl);
    }
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
