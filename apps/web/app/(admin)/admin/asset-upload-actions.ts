"use server";

import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/db/admin";
import {
  buildPresetMediaPath,
  validateAdminUpload,
  validateOwnedPresetMediaPath,
  type AdminAssetRole,
} from "@/lib/uploads/admin-assets";

const BUCKET = "preset-media";

interface StartUploadInput {
  role: string;
  name: string;
  mimeType: string;
  bytes: number;
}

export async function createAdminAssetUpload(input: StartUploadInput) {
  const { supabase, user } = await requireAdmin();
  const role = validateAdminUpload(input.role, {
    name: input.name,
    type: input.mimeType,
    size: input.bytes,
  });
  const path = buildPresetMediaPath(
    user.id,
    role,
    randomUUID(),
    input.mimeType
  );
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, {
      upsert: false,
    });

  if (error || !data?.token) throw new Error("Unable to authorize upload");
  return { path, token: data.token };
}

export async function finalizeAdminAssetUpload(
  role: AdminAssetRole,
  path: string
) {
  const { supabase, user } = await requireAdmin();
  const safePath = validateOwnedPresetMediaPath(user.id, role, path);
  const slash = safePath.lastIndexOf("/");
  const directory = safePath.slice(0, slash);
  const filename = safePath.slice(slash + 1);
  const { data: objects, error: objectError } = await supabase.storage
    .from(BUCKET)
    .list(directory, { limit: 2, search: filename });
  const object = objects?.find((item) => item.name === filename);
  const metadata = object?.metadata as
    { mimetype?: unknown; size?: unknown } | undefined;
  const mimeType =
    typeof metadata?.mimetype === "string" ? metadata.mimetype : "";
  const bytes =
    typeof metadata?.size === "number" ? metadata.size : Number(metadata?.size);

  if (objectError || !object || !Number.isSafeInteger(bytes)) {
    throw new Error("Uploaded object could not be verified");
  }
  validateAdminUpload(role, { name: filename, type: mimeType, size: bytes });

  const { data: asset, error: insertError } = await supabase
    .from("assets")
    .insert({
      owner_user_id: user.id,
      storage_provider: "supabase",
      storage_key: safePath,
      bucket: BUCKET,
      media_type: mimeType.startsWith("video/") ? "video" : "image",
      mime_type: mimeType,
      bytes,
      visibility: "public",
      source_type: role,
    })
    .select("id")
    .single();

  if (insertError || !asset) {
    await supabase.storage.from(BUCKET).remove([safePath]);
    throw new Error("Unable to save uploaded asset");
  }

  const { data: publicData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(safePath);
  return { id: asset.id, publicUrl: publicData.publicUrl, mimeType };
}
