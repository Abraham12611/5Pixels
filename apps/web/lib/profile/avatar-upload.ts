"use server";

import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const AVATAR_BUCKET = "user-assets";
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

export interface AvatarUploadInit {
  signedUrl: string;
  path: string;
}

export async function prepareAvatarUpload(
  mimeType: string,
  size: number
): Promise<AvatarUploadInit> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("Unsupported image format");
  }
  if (!Number.isSafeInteger(size) || size <= 0 || size > AVATAR_MAX_BYTES) {
    throw new Error("Avatar must be 2 MB or smaller");
  }

  const ext = mimeExtension(mimeType);
  if (!ext) throw new Error("Unsupported image format");

  const path = `${user.id}/avatars/${uuidv4()}.${ext}`;

  const service = createServiceClient();
  const { data, error } = await service.storage
    .from(AVATAR_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data?.signedUrl) {
    console.error("[prepareAvatarUpload] signed URL failed", error?.message);
    throw new Error("Unable to start avatar upload");
  }

  return { signedUrl: data.signedUrl, path };
}

export interface FinalizedAvatarAsset {
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
    .from(AVATAR_BUCKET)
    .list(folder, { search: filename, limit: 1 });

  if (error || !data || data.length === 0) return null;
  const file = data[0];
  const fileWithSize = file as unknown as { size?: number };
  return {
    mimeType: (file.metadata?.mimetype as string | undefined) ?? null,
    size: fileWithSize.size ?? null,
  };
}

export async function finalizeAvatarUpload(
  path: string,
  claimedMimeType: string,
  claimedSize: number
): Promise<FinalizedAvatarAsset> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const expectedPrefix = `${user.id}/avatars/`;
  if (!path.startsWith(expectedPrefix)) {
    throw new Error("Invalid avatar upload path");
  }

  const metadata = await getStoredObjectMetadata(path);
  if (!metadata) {
    throw new Error("Avatar upload not found in storage");
  }

  const actualMimeType = metadata.mimeType ?? claimedMimeType;
  const actualSize = metadata.size ?? claimedSize;

  if (!ALLOWED_MIME_TYPES.includes(actualMimeType)) {
    throw new Error("Unsupported image format");
  }
  if (
    !Number.isSafeInteger(actualSize) ||
    actualSize <= 0 ||
    actualSize > AVATAR_MAX_BYTES
  ) {
    throw new Error("Avatar size is not allowed");
  }

  const { data: existing } = await supabase
    .from("assets")
    .select("id")
    .eq("owner_user_id", user.id)
    .eq("bucket", AVATAR_BUCKET)
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
      bucket: AVATAR_BUCKET,
      media_type: "image",
      mime_type: actualMimeType,
      bytes: actualSize,
      visibility: "public",
      source_type: "avatar",
    })
    .select("id")
    .single();

  if (insertError || !asset) {
    console.error("[finalizeAvatarUpload] insert failed", insertError?.message);
    const service = createServiceClient();
    await service.storage.from(AVATAR_BUCKET).remove([path]);
    throw new Error("Unable to finalize avatar upload");
  }

  return { assetId: asset.id as string, path };
}
