import { NextRequest, NextResponse } from "next/server";
import { sweepExpiredPendingGenerations } from "@/lib/teaser/cleanup";

// Sweeps pending_generations that expired unconsumed (02 §6) plus the
// anon-owned source assets behind them. Authorization: Bearer $CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[teaser-sweep] missing CRON_SECRET");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sweepExpiredPendingGenerations();
    return NextResponse.json(result);
  } catch (err) {
    console.error(
      "[teaser-sweep] run failed:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Sweep run failed" }, { status: 500 });
  }
}
