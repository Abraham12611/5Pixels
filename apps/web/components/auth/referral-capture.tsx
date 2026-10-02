"use client";

import { useEffect } from "react";
import { captureReferral } from "@/lib/referrals/actions";

/**
 * Mounts on the signup page when it loads with ?ref=<id>. Calls the
 * server action once to drop the attribution cookie, which survives the
 * email-confirm / OAuth round trip to the auth callback.
 */
export function ReferralCapture({ referrerId }: { referrerId: string }) {
  useEffect(() => {
    captureReferral(referrerId).catch(() => {
      // Attribution is best-effort — never block signup over it.
    });
  }, [referrerId]);
  return null;
}
