import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import {
  isReferralCode,
  normalizeReferralCode,
} from "@/lib/referrals/codes";
import { attributeReferral } from "./rewards";

/**
 * First-party referral attribution (03 §3): `?ref=<user_id>` on signup
 * pages is captured into an HTTP-only cookie; the auth callback claims it
 * once a verified session exists — so attribution survives the email-
 * confirm / OAuth round trips that drop query params.
 *
 * Server-only lib — NOT a "use server" module: the constant export and
 * claim helpers are imported by server code (route handlers, server
 * actions), while the client-callable action lives in ./actions.
 */
export const REF_COOKIE = "spx_ref";
export const REF_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves a referrer identity — UUID (`?ref=<uuid>` legacy links) or a
 * human code (`K7M-2QX` / `k7m2qx`) — to a profiles.id. Null when the
 * input is neither a well-formed candidate nor an existing profile.
 */
export async function resolveReferrerId(input: string): Promise<string | null> {
  const service = createServiceClient();
  if (UUID_RE.test(input)) {
    const { data } = await service
      .from("profiles")
      .select("id")
      .eq("id", input)
      .maybeSingle();
    return (data?.id as string | undefined) ?? null;
  }
  if (isReferralCode(input)) {
    const { data } = await service
      .from("profiles")
      .select("id")
      .eq("referral_code", normalizeReferralCode(input))
      .maybeSingle();
    return (data?.id as string | undefined) ?? null;
  }
  return null;
}

/**
 * Validates the referrer exists and drops the attribution cookie. Accepts
 * a profile UUID or a human referral code — the cookie always stores the
 * resolved UUID so claimReferralForUser needs no code awareness.
 */
export async function setReferralCookie(refOrCode: string): Promise<void> {
  const referrerId = await resolveReferrerId(refOrCode);
  if (!referrerId) return;

  const store = await cookies();
  store.set(REF_COOKIE, referrerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: REF_COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Runs in the auth callback after the anon-session claim. A valid
 * `spx_ref` becomes a referral_participants row and marks the referee's
 * free teaser unlock (03 §1 — referred signups get one free generation
 * via free_unlock_source = 'referral'). No-op without a cookie, for an
 * invalid/self referral, or when the user is already attributed.
 */
export async function claimReferralForUser(userId: string): Promise<void> {
  const store = await cookies();
  const referrerId = store.get(REF_COOKIE)?.value;
  if (!referrerId || !UUID_RE.test(referrerId)) return;
  try {
    store.delete(REF_COOKIE);
  } catch {
    // Route-handler context may not allow mutation — harmless either way.
  }
  if (referrerId === userId) return;

  await attributeReferral(userId, referrerId);
}
