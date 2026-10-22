import { NextRequest, NextResponse } from "next/server";
import {
  retryRevokedArticleMedia,
  sweepOrphanedPublicObjects,
  sweepStaleArticleUploads,
} from "@/lib/articles/media-lifecycle";

// Article media sweep (#129): three cleanup jobs in one pass —
//   1. pending uploads never finalized (abandoned signed-URL flows)
//   2. revoked rows whose public object deletion previously failed
//   3. public-bucket objects no published row references (orphans)
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
    const stale = await sweepStaleArticleUploads();
    const revoked = await retryRevokedArticleMedia();
    const orphans = await sweepOrphanedPublicObjects();
    return NextResponse.json({
      staleUploadsDeleted: stale.deleted,
      revocationsConfirmed: revoked,
      orphanObjectsDeleted: orphans,
    });
  } catch (err) {
    console.error(
      "[article-media-sweep] run failed:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Sweep run failed" }, { status: 500 });
  }
}
