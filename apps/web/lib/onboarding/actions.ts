"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrCreateAnonSessionId } from "@/lib/teaser/anon-session";

const USERNAME_RE = /^[a-z0-9_.]{2,32}$/;

/**
 * Live availability check for the onboarding username step — debounced
 * client-side, and re-run inside completeOnboarding as the real gate.
 */
export async function checkUsername(
  username: string
): Promise<{ available: boolean; error?: string }> {
  const normalized = username.trim().toLowerCase();
  if (!USERNAME_RE.test(normalized)) {
    return {
      available: false,
      error: "2–32 characters: letters, numbers, dots, or underscores.",
    };
  }
  const service = createServiceClient();
  // ilike for case-insensitivity — but `_`/`%` are LIKE wildcards and `_`
  // is in our charset, so they must be escaped or `a_b` falsely "taken"s.
  const escaped = normalized.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data } = await service
    .from("profiles")
    .select("id")
    .ilike("username", escaped)
    .maybeSingle();
  return { available: !data };
}

export interface OnboardingAnswers {
  username: string;
  goal: string | null;
  interests: string[];
  source: string | null;
  referralCodeUsed: string | null;
  skipped: string[];
}

/**
 * Final write of the onboarding flow (08 §2B): one server action at the
 * Done step — validates + persists username, answers, and the completion
 * stamp. The referral claim itself already happened at the code step.
 */
export async function completeOnboarding(
  answers: OnboardingAnswers
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to continue." };

  const username = answers.username.trim().toLowerCase();
  const check = await checkUsername(username);
  if (!check.available) {
    return {
      ok: false,
      error:
        check.error ?? "That username is taken — pick another to continue.",
    };
  }

  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({
      username,
      onboarding_answers: {
        goal: answers.goal,
        interests: answers.interests,
        source: answers.source,
        referral_code_used: answers.referralCodeUsed,
        skipped: answers.skipped,
      },
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) {
    if (error.message.includes("duplicate")) {
      return { ok: false, error: "That username is taken — pick another." };
    }
    console.error("[completeOnboarding] profile update failed", error.message);
    return { ok: false, error: "Couldn't save — try again." };
  }
  return { ok: true };
}

/** Step-funnel events (08 §4): context="onboarding", validated enum. */
export async function recordOnboardingEvent(
  event: "impression" | "accept" | "decline" | "dismiss",
  meta: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const anonId = user ? null : await getOrCreateAnonSessionId();

  const service = createServiceClient();
  const { error } = await service.from("promo_events").insert({
    user_id: user?.id ?? null,
    anon_id: anonId,
    surface: "onboarding",
    event,
    context: "onboarding",
    meta,
  });
  if (error) {
    console.error("[recordOnboardingEvent] insert failed", error.message);
  }
}
