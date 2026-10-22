import { NextRequest, NextResponse } from "next/server";
import { runBillingReconciliation } from "@/lib/billing/fal-billing";

// Reconciles completed generations against fal's authoritative billing
// events (cost_total per request_id), absorbing overruns and suspending
// endpoints whose billed cost exceeds the quoted maximum.
// Authorization: Bearer $CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[billing-reconcile] missing CRON_SECRET");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runBillingReconciliation();
    return NextResponse.json(result);
  } catch (err) {
    console.error(
      "[billing-reconcile] run failed:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Reconcile run failed" }, { status: 500 });
  }
}
