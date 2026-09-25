"use server";

import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { applyRetentionForNewAsset } from "@/lib/db/retention-asset";
import { createAndSubmitGeneration } from "@/lib/generation/actions";
import {
  ANON_SESSION_COOKIE,
  getOrCreateAnonSessionId,
} from "./anon-session";
import { claimAnonPromoRows } from "@/lib/offers/engine";
import { deriveTeaserVariant, type TeaserVariant } from "./variant";
import type { OutputSizeOption } from "@/types/catalog";

const USER_ASSET_BUCKET = "user-assets";
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const ALLOWED_SOURCE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ANON_RETENTION_DAYS = 7;

function mimeExtension(mimeType: string): string | null {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

function isOwnedAnonPath(anonId: string, path: string): boolean {
  return path.startsWith(`anon/${anonId}/`) && !path.includes("..");
}

export interface TeaserUploadInit {
  signedUrl: string;
  path: string;
  token: string;
}

/**
 * Anonymous-aware variant of prepareSourceUpload: same bucket; signed-in
 * callers get the conventional `{userId}/sources/` prefix so a mid-flow
 * login keeps ownership checks intact, anonymous callers get
 * `anon/{session}/` keyed to the first-party cookie minted here (08 §5).
 */
export async function prepareTeaserSourceUpload(
  mimeType: string,
  size: number
): Promise<TeaserUploadInit> {
  if (!ALLOWED_SOURCE_MIME_TYPES.includes(mimeType)) {
    throw new Error("Unsupported image format");
  }
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_SOURCE_BYTES) {
    throw new Error("Image must be 20 MB or smaller");
  }
  const ext = mimeExtension(mimeType);
  if (!ext) throw new Error("Unsupported image format");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const prefix = user
    ? `${user.id}`
    : `anon/${await getOrCreateAnonSessionId()}`;
  const path = `${prefix}/sources/${uuidv4()}.${ext}`;

  const service = createServiceClient();
  const { data, error } = await service.storage
    .from(USER_ASSET_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data?.token) {
    console.error("[prepareTeaserSourceUpload] signed URL failed", error?.message);
    throw new Error("Unable to start upload");
  }
  return { signedUrl: data.signedUrl, path, token: data.token };
}

export type { TeaserVariant };

export interface PendingGeneration {
  id: string;
  productVersionId: string;
  sourceAssetId: string;
  teaserVariant: TeaserVariant;
}

/**
 * Records the uploaded source as an asset row and stores the generation
 * intent in pending_generations. No provider call happens — this is the
 * zero-COGS teaser (02 §2, 08 §1). Signed-in users get a user_id-owned row;
 * anonymous get an anon_session_id-owned row claimed at signup.
 */
export async function createPendingGeneration(input: {
  productVersionId: string;
  sourcePath: string;
  mimeType: string;
  size: number;
  params?: Record<string, unknown>;
  outputSize?: Record<string, unknown>;
}): Promise<PendingGeneration> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const service = createServiceClient();

  const store = await cookies();
  const cookieAnonId = store.get(ANON_SESSION_COOKIE)?.value ?? null;

  const userId: string | null = user?.id ?? null;
  let anonId: string | null = null;
  let ownerCheck: boolean;

  if (userId) {
    // Conventional user path — plus an anon path when this user uploaded
    // before the auth round-trip and the cookie is still present.
    ownerCheck =
      input.sourcePath.startsWith(`${userId}/sources/`) ||
      (cookieAnonId !== null && isOwnedAnonPath(cookieAnonId, input.sourcePath));
  } else {
    anonId = cookieAnonId ?? (await getOrCreateAnonSessionId());
    ownerCheck = isOwnedAnonPath(anonId, input.sourcePath);
  }
  if (!ownerCheck) throw new Error("Invalid upload path");

  // Verify the object actually landed in storage.
  const folder = input.sourcePath.split("/").slice(0, -1).join("/");
  const filename = input.sourcePath.split("/").pop() ?? "";
  const { data: listed } = await service.storage
    .from(USER_ASSET_BUCKET)
    .list(folder, { search: filename, limit: 1 });
  const file = listed?.[0];
  if (!file) throw new Error("Upload not found in storage");

  const meta = (file.metadata ?? {}) as Record<string, unknown>;
  const width = Number(meta.width);
  const height = Number(meta.height);

  const { data: asset, error: assetError } = await service
    .from("assets")
    .insert({
      owner_user_id: userId,
      anon_session_id: userId ? null : anonId,
      storage_provider: "supabase",
      storage_key: input.sourcePath,
      bucket: USER_ASSET_BUCKET,
      media_type: "image",
      mime_type: (file.metadata?.mimetype as string | undefined) ?? input.mimeType,
      bytes: (file as { size?: number }).size ?? input.size,
      width: Number.isFinite(width) && width > 0 ? width : null,
      height: Number.isFinite(height) && height > 0 ? height : null,
      visibility: "private",
      source_type: "generation_source",
      // Anonymous uploads are short-lived; signed-in users get their own
      // retention settings applied below.
      retention_expires_at: userId
        ? null
        : new Date(
            Date.now() + ANON_RETENTION_DAYS * 24 * 60 * 60 * 1000
          ).toISOString(),
    })
    .select("id")
    .single();

  if (assetError || !asset) {
    console.error("[createPendingGeneration] asset insert failed", assetError?.message);
    throw new Error("Unable to save upload");
  }

  if (userId) {
    await applyRetentionForNewAsset(asset.id, userId, "generation_source");
  }

  const pendingId = uuidv4();
  const teaserVariant = deriveTeaserVariant(
    `${anonId ?? userId}:${input.productVersionId}:${pendingId}`
  );

  const { data: pending, error: pendingError } = await service
    .from("pending_generations")
    .insert({
      id: pendingId,
      user_id: userId,
      anon_session_id: userId ? null : anonId,
      product_version_id: input.productVersionId,
      source_asset_id: asset.id,
      params: input.params ?? {},
      output_size: input.outputSize ?? null,
      teaser_variant: teaserVariant,
    })
    .select("id")
    .single();

  if (pendingError || !pending) {
    console.error(
      "[createPendingGeneration] pending insert failed",
      pendingError?.message
    );
    throw new Error("Unable to save request");
  }

  return {
    id: pending.id as string,
    productVersionId: input.productVersionId,
    sourceAssetId: asset.id as string,
    teaserVariant,
  };
}

/**
 * Moves anon-owned assets and pending generations to a freshly-authed user.
 * Called from the auth callback (08 §5 claim step). Storage objects are
 * moved from `anon/{session}/` to `{userId}/sources/` so every downstream
 * path check (`isOwnedUserPath`) keeps working after the claim.
 */
export async function claimAnonSessionToUser(userId: string): Promise<void> {
  const store = await cookies();
  const anonId = store.get(ANON_SESSION_COOKIE)?.value;
  if (!anonId) return;

  const service = createServiceClient();

  // Relocate storage objects before flipping ownership so keys stay
  // conventional. Best-effort per object — a failed move leaves the asset
  // claimed but with its anon key, which the owner-scoped signer still
  // resolves.
  const { data: anonAssets } = await service
    .from("assets")
    .select("id, storage_key")
    .eq("anon_session_id", anonId)
    .is("owner_user_id", null);

  for (const asset of anonAssets ?? []) {
    const key = asset.storage_key as string;
    if (!key.startsWith(`anon/${anonId}/`)) continue;
    const filename = key.split("/").pop() ?? uuidv4();
    const newKey = `${userId}/sources/${filename}`;
    const { error: moveError } = await service.storage
      .from(USER_ASSET_BUCKET)
      .move(key, newKey);
    if (moveError) {
      console.error(
        "[claimAnonSession] storage move failed",
        moveError.message
      );
      continue;
    }
    await service
      .from("assets")
      .update({ storage_key: newKey })
      .eq("id", asset.id);
  }

  const [assetsRes, pendingRes] = await Promise.all([
    service
      .from("assets")
      .update({ owner_user_id: userId, anon_session_id: null })
      .eq("anon_session_id", anonId)
      .is("owner_user_id", null)
      .select("id"),
    service
      .from("pending_generations")
      .update({ user_id: userId, anon_session_id: null })
      .eq("anon_session_id", anonId)
      .is("user_id", null)
      .select("id"),
  ]);

  if (assetsRes.error) {
    console.error("[claimAnonSession] assets claim failed", assetsRes.error.message);
  }
  if (pendingRes.error) {
    console.error("[claimAnonSession] pending claim failed", pendingRes.error.message);
  }

  // Marker for the offer engine: this user completed the teaser funnel.
  if ((pendingRes.data ?? []).length > 0) {
    await service
      .from("profiles")
      .update({ free_teaser_seen_at: new Date().toISOString() })
      .eq("id", userId)
      .is("free_teaser_seen_at", null);
  }

  // Promo assignments/events made against the anon session follow the user
  // too (08 §5) — pre-auth impressions stay attributable.
  try {
    await claimAnonPromoRows(anonId, userId);
  } catch (err) {
    console.error(
      "[claimAnonSession] promo claim failed",
      err instanceof Error ? err.message : String(err)
    );
  }

  // The cookie has done its job — drop it so a stale anon id can't claim
  // future uploads to this account.
  try {
    store.delete(ANON_SESSION_COOKIE);
  } catch {
    // Route-handler context may not allow mutation — harmless either way.
  }
}

export interface PendingGenerationSummary {
  id: string;
  productName: string;
  productSlug: string;
  creditCost: number;
  createdAt: string;
}

/**
 * Latest unconsumed, unexpired pending generation for the signed-in user —
 * drives the "finish your result" surface after signup/payment.
 */
export async function getPendingGenerationForUser(): Promise<PendingGenerationSummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data, error } = await service
    .from("pending_generations")
    .select(
      `
      id,
      created_at,
      product_versions!inner(
        credit_cost,
        products!inner(name, slug)
      )
    `
    )
    .eq("user_id", user.id)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const version = data.product_versions as unknown as {
    credit_cost: number;
    products: { name: string; slug: string };
  };
  const product = version.products;

  return {
    id: data.id as string,
    productName: product.name,
    productSlug: product.slug,
    creditCost: Number(version.credit_cost),
    createdAt: data.created_at as string,
  };
}

/**
 * Replays a saved pending intent as a real generation (08 §5 unlock step).
 * The consume is atomic (consumed_at IS NULL guard) so a double-click or
 * refresh can't charge twice; a creation failure rolls the consume back so
 * the user can retry. Idempotency key `replay:{pendingId}` makes a retried
 * replay resolve to the same generation row.
 */
export async function replayPendingGeneration(
  pendingId: string
): Promise<{ error: string } | never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in to continue." };
  }

  const service = createServiceClient();
  const { data: pending, error: consumeError } = await service
    .from("pending_generations")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", pendingId)
    .eq("user_id", user.id)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id, product_version_id, source_asset_id, params, output_size")
    .maybeSingle();

  if (consumeError || !pending) {
    return { error: "That saved result is no longer available." };
  }

  async function rollbackConsume() {
    await service
      .from("pending_generations")
      .update({ consumed_at: null })
      .eq("id", pending!.id)
      .eq("user_id", user!.id);
  }

  const { data: version } = await service
    .from("product_versions")
    .select("product_id, output_sizes")
    .eq("id", pending.product_version_id)
    .single();

  const productId = version?.product_id as string | undefined;
  if (!version || !productId) {
    await rollbackConsume();
    return { error: "This look isn't available right now." };
  }

  const sizes = Array.isArray(version.output_sizes)
    ? (version.output_sizes as OutputSizeOption[])
    : [];
  const outputSize =
    (pending.output_size as OutputSizeOption | null) ??
    sizes.find((s) => s.is_default) ??
    sizes[0] ?? {
      name: "Square (1:1)",
      width: 1024,
      height: 1024,
      is_default: true,
    };

  const result = await createAndSubmitGeneration({
    productId,
    productVersionId: pending.product_version_id as string,
    sourceAssetId: pending.source_asset_id as string,
    options: (pending.params as Record<string, unknown> | null) ?? {},
    outputSize,
    idempotencyKey: `replay:${pending.id}`,
  });

  if (result?.error) {
    await rollbackConsume();
    return result;
  }

  return { error: "Unable to start generation. Please try again." };
}
