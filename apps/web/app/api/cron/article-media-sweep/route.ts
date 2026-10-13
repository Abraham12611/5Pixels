import { NextRequest, NextResponse } from "next/server";
import { sweepStaleArticleUploads } from "@/lib/articles/media-lifecycle";

// Sweeps pending article-media uploads that were never finalized (abandoned
// signed-URL flows) along with their orphan staging objects (#129).
// Authorization: Bearer $CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[article-media-sweep] missing CRON_SECRET");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sweepStaleArticleUploads();
    return NextResponse.json(result);
  } catch (err) {
    console.error(
      "[article-media-sweep] run failed:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Sweep run failed" }, { status: 500 });
  }
}
