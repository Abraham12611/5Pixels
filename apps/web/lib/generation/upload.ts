"use server";

import { v4 as uuidv4 } from "uuid";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { buildOutputPath, isOwnedUserPath } from "./paths";

const USER_ASSET_BUCKET = "user-assets";
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const ALLOWED_SOURCE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

export interface SourceUploadInit {
  signedUrl: string;
  path: string;
  token: string;
}

export async function prepareSourceUpload(
  mimeType: string,
  size: number
): Promise<SourceUploadInit> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (!ALLOWED_SOURCE_MIME_TYPES.includes(mimeType)) {
    throw new Error("Unsupported image format");
  }
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_SOURCE_BYTES) {
    throw new Error("Image must be 20 MB or smaller");
  }

  const ext = mimeExtension(mimeType);
  if (!ext) throw new Error("Unsupported image format");

  const path = `${user.id}/sources/${uuidv4()}.${ext}`;

  const service = createServiceClient();
  const { data, error } = await service.storage
    .from(USER_ASSET_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data?.token) {
    console.error("[prepareSourceUpload] signed URL failed", error?.message);
    throw new Error("Unable to start upload");
  }

  return { signedUrl: data.signedUrl, path, token: data.token };
}

export interface FinalizedSourceAsset {
  assetId: string;
  path: string;
}

async function getStoredObjectMetadata(
  path: string
): Promise<{ mimeType: string | null; size: number | null } | null> {
  const service = createServiceClient();
  const folder = path.split("/").slice(0, -1).join("/");
  const filename = path.split("/").pop() ?? "";
  const { data, error } = await service.storage
    .from(USER_ASSET_BUCKET)
    .list(folder, { search: filename, limit: 1 });

  if (error || !data || data.length === 0) return null;
  const file = data[0];
  const fileWithSize = file as unknown as { size?: number };
  return {
    mimeType: (file.metadata?.mimetype as string | undefined) ?? null,
    size: fileWithSize.size ?? null,
  };
}

export async function finalizeSourceUpload(
  path: string,
  claimedMimeType: string,
  claimedSize: number
): Promise<FinalizedSourceAsset> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (!isOwnedUserPath(user.id, path)) {
    throw new Error("Invalid upload path");
  }

  // Verify the object was actually uploaded and match metadata from storage.
  const metadata = await getStoredObjectMetadata(path);
  if (!metadata) {
    throw new Error("Upload not found in storage");
  }

  const actualMimeType = metadata.mimeType ?? claimedMimeType;
  const actualSize = metadata.size ?? claimedSize;

  if (!ALLOWED_SOURCE_MIME_TYPES.includes(actualMimeType)) {
    throw new Error("Unsupported image format");
  }
  if (
    !Number.isSafeInteger(actualSize) ||
    actualSize <= 0 ||
    actualSize > MAX_SOURCE_BYTES
  ) {
    throw new Error("Image size is not allowed");
  }

  // Idempotency: return the existing asset row for this storage key if present.
  const { data: existing } = await supabase
    .from("assets")
    .select("id")
    .eq("owner_user_id", user.id)
    .eq("bucket", USER_ASSET_BUCKET)
    .eq("storage_key", path)
    .maybeSingle();

  if (existing) {
    return { assetId: existing.id as string, path };
  }

  const { data: asset, error: insertError } = await supabase
    .from("assets")
    .insert({
      owner_user_id: user.id,
      storage_provider: "supabase",
      storage_key: path,
      bucket: USER_ASSET_BUCKET,
      media_type: "image",
      mime_type: actualMimeType,
      bytes: actualSize,
      visibility: "private",
      source_type: "generation_source",
    })
    .select("id")
    .single();

  if (insertError || !asset) {
    console.error("[finalizeSourceUpload] insert failed", insertError?.message);
    // Best-effort cleanup so a failed finalization does not leave orphan objects.
    const service = createServiceClient();
    await service.storage.from(USER_ASSET_BUCKET).remove([path]);
    throw new Error("Unable to finalize upload");
  }

  return { assetId: asset.id, path };
}

export async function getSignedSourceUrl(
  path: string,
  expiresSeconds = 300
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (!isOwnedUserPath(user.id, path)) {
    throw new Error("Invalid source path");
  }

  const service = createServiceClient();
  const { data, error } = await service.storage
    .from(USER_ASSET_BUCKET)
    .createSignedUrl(path, expiresSeconds);

  if (error || !data?.signedUrl) {
    console.error("[getSignedSourceUrl] sign failed", error?.message);
    throw new Error("Unable to sign source URL");
  }

  return data.signedUrl;
}

export async function getSignedSourceUrlByAssetId(
  assetId: string,
  expiresSeconds = 300
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("assets")
    .select("storage_key, bucket")
    .eq("id", assetId)
    .eq("owner_user_id", user.id)
    .single();

  if (error || !data) throw new Error("Source asset not found");
  if (data.bucket !== USER_ASSET_BUCKET)
    throw new Error("Invalid asset bucket");

  return getSignedSourceUrl(data.storage_key, expiresSeconds);
}

export async function getSignedAssetUrl(
  bucket: string,
  storageKey: string,
  expiresSeconds = 300
): Promise<string> {
  const service = createServiceClient();
  const { data, error } = await service.storage
    .from(bucket)
    .createSignedUrl(storageKey, expiresSeconds);
  if (error || !data?.signedUrl) {
    console.error("[getSignedAssetUrl] sign failed", error?.message);
    throw new Error("Unable to sign asset URL");
  }
  return data.signedUrl;
}

export async function uploadOutputImage(
  userId: string,
  buffer: ArrayBuffer | Buffer,
  contentType: string
): Promise<{ path: string }> {
  const path = buildOutputPath(userId, contentType);
  const service = createServiceClient();
  const uploadData =
    buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  const { error } = await service.storage
    .from(USER_ASSET_BUCKET)
    .upload(path, uploadData, { contentType });
  if (error) {
    console.error("[uploadOutputImage] upload failed", error.message);
    throw new Error("Unable to save generated image");
  }
  return { path };
}

export async function createOutputAsset(
  userId: string,
  path: string,
  contentType: string,
  size: number
): Promise<string> {
  const service = createServiceClient();
  const { data: asset, error } = await service
    .from("assets")
    .insert({
      owner_user_id: userId,
      storage_provider: "supabase",
      storage_key: path,
      bucket: USER_ASSET_BUCKET,
      media_type: "image",
      mime_type: contentType,
      bytes: size,
      visibility: "private",
      source_type: "generation_output",
    })
    .select("id")
    .single();

  if (error || !asset) {
    console.error("[createOutputAsset] insert failed", error?.message);
    throw new Error("Unable to record generated image");
  }

  return asset.id as string;
}
