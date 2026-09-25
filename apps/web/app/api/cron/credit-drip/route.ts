import { NextRequest, NextResponse } from "next/server";
import { runCreditDrip } from "@/lib/billing/drip";

// Authenticated endpoint for a cron trigger (Vercel Cron, Supabase scheduled
// function, etc.). Authorization: Bearer $CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[credit-drip] missing CRON_SECRET");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCreditDrip();
    return NextResponse.json(result);
  } catch (err) {
    console.error(
      "[credit-drip] run failed:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Drip run failed" }, { status: 500 });
  }
}
