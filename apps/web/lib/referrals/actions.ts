"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrCreateAnonSessionId } from "@/lib/teaser/anon-session";
import { setReferralCookie, UUID_RE } from "./session";

/** Client-callable capture for the signup page's ?ref= param. */
export async function captureReferral(referrerId: string): Promise<void> {
  await setReferralCookie(referrerId);
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
