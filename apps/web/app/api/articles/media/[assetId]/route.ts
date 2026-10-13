import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  ARTICLE_MEDIA_THUMB_WIDTHS,
  UUID_RE,
} from "@/lib/articles/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Staff-gated article media proxy (#129).
 *
 * Private staging objects must be previewable inside the editor + media
 * library without ever persisting signed URLs or exposing private bucket
 * paths. This route is the ONLY read path for draft media: it requires an
 * authenticated admin/owner session, the asset must be linked to an article
 * (article_assets row), and bytes stream through the service client.
 *
 * ?w=<width> requests a bounded, on-the-fly thumbnail (allowed widths only,
 * images only) — output is always re-encoded WebP.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
  if (!UUID_RE.test(assetId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, is_owner")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin && !profile?.is_owner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: row } = await supabase
    .from("article_assets")
    .select(
      "asset_id, assets!inner(bucket, storage_key, mime_type, media_type, deleted_at)"
    )
    .eq("asset_id", assetId)
    .maybeSingle();

  const asset = (row?.assets ?? null) as unknown as {
    bucket: string;
    storage_key: string;
    mime_type: string;
    media_type: string;
    deleted_at: string | null;
  } | null;
  if (!asset || asset.deleted_at) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (asset.bucket !== "article-media" && asset.bucket !== "article-media-public") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const service = createServiceClient();
  const { data: blob, error } = await service.storage
    .from(asset.bucket)
    .download(asset.storage_key);
  if (error || !blob) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Buffer = Buffer.from(await blob.arrayBuffer());
  let contentType = asset.mime_type;

  const widthParam = Number(request.nextUrl.searchParams.get("w"));
  const allowed = ARTICLE_MEDIA_THUMB_WIDTHS as readonly number[];
  if (
    request.nextUrl.searchParams.has("w") &&
    asset.media_type === "image" &&
    allowed.includes(widthParam)
  ) {
    try {
      body = await sharp(body, { failOn: "none" })
        .resize({ width: widthParam, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      contentType = "image/webp";
    } catch (err) {
      console.error("[article-media proxy] resize failed", err);
    }
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": contentType,
      // Private per-session caching only — staging objects are immutable per
      // asset, but visibility flips on publish/unpublish must not be cached.
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
