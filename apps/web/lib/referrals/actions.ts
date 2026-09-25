"use server";

import { setReferralCookie } from "./session";

/** Client-callable capture for the signup page's ?ref= param. */
export async function captureReferral(referrerId: string): Promise<void> {
  await setReferralCookie(referrerId);
}
