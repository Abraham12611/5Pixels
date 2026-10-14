import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { runFalPricingSync } from "@/lib/pricing/sync/fal";

// Refreshes Fal pricing: updates the coarse provider_model_pricing feed and
// writes fresh immutable provider_pricing_snapshots for endpoints backed by
// a verified pricing definition. Runs on a schedule well inside the
// snapshot TTL so quotable routes never lapse between runs.
// Authorization: Bearer $CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[pricing-sync] missing CRON_SECRET");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runFalPricingSync(createServiceClient());
    return NextResponse.json(result);
  } catch (err) {
    console.error(
      "[pricing-sync] run failed:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Pricing sync failed" }, { status: 500 });
  }
}
