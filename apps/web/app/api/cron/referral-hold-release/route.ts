import { NextRequest, NextResponse } from "next/server";
import { releaseDueReferralHolds } from "@/lib/referrals/rewards";

// Releases first-party referral payment-share holds once their refund
// window elapses. Authorization: Bearer $CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[referral-hold-release] missing CRON_SECRET");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await releaseDueReferralHolds();
    return NextResponse.json(result);
  } catch (err) {
    console.error(
      "[referral-hold-release] run failed:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { error: "Release run failed" },
      { status: 500 }
    );
  }
}
