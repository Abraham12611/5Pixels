"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSignedAssetUrl } from "@/lib/generation/upload";

export interface PublicShare {
  shareId: string;
  shareUrl: string;
}

export interface SharedGeneration {
  id: string;
  productName: string;
  productSlug: string;
  outputUrl: string | null;
  outputWidth: number | null;
  outputHeight: number | null;
}

function createShareUrl(shareId: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return `${base}/s/${shareId}`;
}

export async function createPublicShare(
  generationId: string
): Promise<PublicShare | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Verify ownership and completion.
  const { data: existing } = await supabase
    .from("generations")
    .select("id, status, public_share_id")
    .eq("id", generationId)
    .eq("user_id", user.id)
    .single();

  if (
    !existing ||
    existing.status !== "completed" ||
    existing.public_share_id
  ) {
    if (existing?.public_share_id) {
      return {
        shareId: existing.public_share_id as string,
        shareUrl: createShareUrl(existing.public_share_id as string),
      };
    }
    return null;
  }

  const service = createServiceClient();
  const shareId = crypto.randomUUID();

  const { error } = await service
    .from("generations")
    .update({ public_share_id: shareId, shared_at: new Date().toISOString() })
    .eq("id", generationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[createPublicShare] failed", error.message);
    return null;
  }

  revalidatePath(`/app/results/${generationId}`);
  return { shareId, shareUrl: createShareUrl(shareId) };
}

export async function disablePublicShare(
  generationId: string
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const service = createServiceClient();
  const { error } = await service
    .from("generations")
    .update({ public_share_id: null, shared_at: null })
    .eq("id", generationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[disablePublicShare] failed", error.message);
    return false;
  }

  revalidatePath(`/app/results/${generationId}`);
  return true;
}

export async function getPublicGeneration(
  shareId: string
): Promise<SharedGeneration | null> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key || !key.startsWith("eyJ")) {
    console.error("[getPublicGeneration] missing or invalid service role key");
    return null;
  }

  const service = createServiceClient();

  const { data, error } = await service
    .from("generation_outputs")
    .select(
      `
      width,
      height,
      is_primary,
      assets(bucket, storage_key),
      generations!inner(status, products(name, slug))
    `
    )
    .eq("generations.public_share_id", shareId)
    .order("is_primary", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  const generationRow = (data.generations as unknown[] ?? [])[0] as {
    status: string;
    products: { name: string; slug: string }[];
  } | undefined;

  if (!generationRow || generationRow.status !== "completed") return null;

  const product = generationRow.products[0] ?? {
    name: "Untitled",
    slug: "",
  };

  const assets = (data.assets as unknown[] ?? []) as Array<{
    bucket: string;
    storage_key: string;
  }>;

  const asset = assets[0];
  let outputUrl: string | null = null;

  if (asset) {
    outputUrl = await getSignedAssetUrl(
      asset.bucket,
      asset.storage_key,
      86400
    );
  }

  return {
    id: shareId,
    productName: product.name,
    productSlug: product.slug,
    outputUrl,
    outputWidth: (data.width as number | null) ?? null,
    outputHeight: (data.height as number | null) ?? null,
  };
}
