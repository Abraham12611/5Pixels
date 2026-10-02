"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { recordReferralWelcomeEvent } from "@/lib/referrals/actions";

/**
 * /r/[code] welcome client pieces: fires the referral_welcome impression on
 * mount and renders the claim CTA, which records the accept (claimed) event
 * before navigating to signup with ?ref= preserved.
 */
export function ReferralWelcomeTracker({
  referrerId,
}: {
  referrerId: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void recordReferralWelcomeEvent("impression", referrerId);
  }, [referrerId]);

  return null;
}

export function ReferralClaimLink({ referrerId }: { referrerId: string }) {
  return (
    <Link
      href={`/signup?ref=${encodeURIComponent(referrerId)}`}
      onClick={() => {
        void recordReferralWelcomeEvent("accept", referrerId);
      }}
      className="bg-lime-500 text-ink-950 hover:bg-lime-400 mt-5 flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold transition-colors"
    >
      Claim your gift
    </Link>
  );
}
