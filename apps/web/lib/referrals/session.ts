import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

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

/** Validates the referrer exists and drops the attribution cookie. */
export async function setReferralCookie(referrerId: string): Promise<void> {
  if (!UUID_RE.test(referrerId)) return;
  const service = createServiceClient();
  const { data: referrer } = await service
    .from("profiles")
    .select("id")
    .eq("id", referrerId)
    .maybeSingle();
  if (!referrer) return;

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

  const service = createServiceClient();

  const [{ data: referrer }, { data: existing }] = await Promise.all([
    service
      .from("profiles")
      .select("id")
      .eq("id", referrerId)
      .maybeSingle(),
    service
      .from("referral_participants")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (!referrer || existing?.user_id) return;

  const { error } = await service.from("referral_participants").insert({
    user_id: userId,
    referred_by: referrerId,
  });
  if (error) {
    console.error(
      "[claimReferralForUser] participant insert failed",
      error.message
    );
    return;
  }

  await service
    .from("profiles")
    .update({ free_unlock_source: "referral" })
    .eq("id", userId)
    .is("free_unlock_source", null);
}
