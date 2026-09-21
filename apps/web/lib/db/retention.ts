"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminOrOwner } from "@/lib/db/admin";

export interface ExpiredAsset {
  id: string;
  bucket: string;
  storage_key: string;
}

export async function getExpiredAssets(limit = 100): Promise<ExpiredAsset[]> {
  await requireAdminOrOwner();

  const service = createServiceClient();
  const { data, error } = await service
    .from("assets")
    .select("id, bucket, storage_key")
    .lte("retention_expires_at", new Date().toISOString())
    .is("deleted_at", null)
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    bucket: row.bucket as string,
    storage_key: row.storage_key as string,
  }));
}

export async function deleteExpiredAssets(): Promise<{
  deleted: number;
  errors: string[];
}> {
  await requireAdminOrOwner();

  const service = createServiceClient();
  const expired = await getExpiredAssets(1000);

  const errors: string[] = [];

  // Group by bucket for batch storage removal.
  const byBucket = new Map<string, string[]>();
  for (const asset of expired) {
    const keys = byBucket.get(asset.bucket) ?? [];
    keys.push(asset.storage_key);
    byBucket.set(asset.bucket, keys);
  }

  for (const [bucket, keys] of byBucket) {
    const { error } = await service.storage.from(bucket).remove(keys);
    if (error) {
      errors.push(`Storage removal failed for ${bucket}: ${error.message}`);
    }
  }

  if (expired.length > 0) {
    const ids = expired.map((a) => a.id);
    const { error: updateError } = await service
      .from("assets")
      .update({
        owner_user_id: null,
        visibility: "private",
        deleted_at: new Date().toISOString(),
        retention_expires_at: null,
      })
      .in("id", ids);

    if (updateError) {
      errors.push(`Asset update failed: ${updateError.message}`);
    }
  }

  return {
    deleted: expired.length,
    errors,
  };
}
