"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrCreateAnonSessionId } from "@/lib/teaser/anon-session";
import {
  resolveReferrerId,
  setReferralCookie,
  UUID_RE,
} from "./session";
import { attributeReferral } from "./rewards";

/** Client-callable capture for the signup page's ?ref= param. */
export async function captureReferral(referrerId: string): Promise<void> {
  await setReferralCookie(referrerId);
}

/**
 * Manual code claim (07 §2C/3.5): the onboarding code step submits here.
 * Validates the signed-in claimant has no prior attribution, resolves the
 * code to a referrer, and attributes — returning the referrer's display
 * name for the success state.
 */
export async function claimReferralCode(
  code: string
): Promise<{ ok: boolean; referrerName?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to continue." };

  const referrerId = await resolveReferrerId(code);
  if (!referrerId) {
    return { ok: false, error: "That code doesn't look right — check it and try again." };
  }
  if (referrerId === user.id) {
    return { ok: false, error: "That's your own code — share it with a friend instead." };
  }

  const claimed = await attributeReferral(user.id, referrerId);
  if (!claimed) {
    return { ok: false, error: "This account already has a referral on it." };
  }

  const service = createServiceClient();
  const { data: referrer } = await service
    .from("profiles")
    .select("display_name, username")
    .eq("id", referrerId)
    .maybeSingle();

  return {
    ok: true,
    referrerName:
      (referrer?.display_name as string | null) ??
      (referrer?.username as string | null) ??
      undefined,
  };
}

/**
 * referral_welcome_shown / referral_claimed for the /r/[code] page, mapped
 * onto the validated promo_events enum (impression/accept) with
 * context="referral_welcome". Unlike recordOfferEvent this mints the anon
 * session cookie first — a referred visitor is typically brand-new and
 * cookiless, and the event would otherwise be silently dropped.
 */
export async function recordReferralWelcomeEvent(
  event: "impression" | "accept",
  referrerId: string
): Promise<void> {
  if (!UUID_RE.test(referrerId)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const anonId = user ? null : await getOrCreateAnonSessionId();

  const service = createServiceClient();
  const { error } = await service.from("promo_events").insert({
    user_id: user?.id ?? null,
    anon_id: anonId,
    surface: "referral",
    event,
    context: "referral_welcome",
    meta: { referrer_id: referrerId },
  });
  if (error) {
    console.error("[recordReferralWelcomeEvent] insert failed", error.message);
  }
}
