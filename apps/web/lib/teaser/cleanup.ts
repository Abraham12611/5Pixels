"use server";

import { createServiceClient } from "@/lib/supabase/service";

const BATCH_SIZE = 500;
const MAX_BATCHES_PER_RUN = 10;

export interface PendingSweepResult {
  pendingDeleted: number;
  assetsDeleted: number;
  batches: number;
  errors: string[];
}

/**
 * Sweeps pending_generations that expired unconsumed (02 §6): the teaser
 * intent was never activated, so the row — and for anonymous uploads the
 * backing storage object + asset row — is removed.
 *
 * Asset handling:
 * - Anon-owned assets (owner_user_id IS NULL, anon_session_id set) are
 *   deleted from storage and soft-deleted — they exist solely for the
 *   pending intent and serve the 7-day anon TTL.
 * - User-owned assets are left alone: a signed-in user's source image is
 *   governed by their own retention settings (applyRetentionForNewAsset),
 *   which may legitimately outlive the pending row.
 *
 * Idempotent by construction: only consumed_at IS NULL + expires_at <= now
 * rows are touched, and consumed/claimed rows can never re-enter the set.
 * Loops in batches so a backlog drains within a single cron run.
 */
export async function sweepExpiredPendingGenerations(
  now = new Date()
): Promise<PendingSweepResult> {
  const service = createServiceClient();
  const errors: string[] = [];
  let pendingDeleted = 0;
  let assetsDeleted = 0;
  let batches = 0;

  while (batches < MAX_BATCHES_PER_RUN) {
    const { data: rows, error } = await service
      .from("pending_generations")
      .select("id, source_asset_id")
      .is("consumed_at", null)
      .lte("expires_at", now.toISOString())
      .limit(BATCH_SIZE);

    if (error) {
      errors.push(`select failed: ${error.message}`);
      break;
    }
    if (!rows?.length) break;
    batches += 1;

    const pendingIds = rows.map((r) => r.id as string);
    const assetIds = rows.map((r) => r.source_asset_id as string);

    // Delete pending rows first — source_asset_id is a NOT NULL FK, so the
    // intent must go before any asset removal.
    const { error: deleteError } = await service
      .from("pending_generations")
      .delete()
      .in("id", pendingIds);
    if (deleteError) {
      errors.push(`pending delete failed: ${deleteError.message}`);
      break;
    }
    pendingDeleted += pendingIds.length;

    // Only sweep anon-owned assets; user-owned sources keep their retention.
    const { data: assets, error: assetError } = await service
      .from("assets")
      .select("id, bucket, storage_key")
      .in("id", assetIds)
      .is("owner_user_id", null)
      .not("anon_session_id", "is", null)
      .is("deleted_at", null);

    if (assetError) {
      errors.push(`asset select failed: ${assetError.message}`);
      continue;
    }

    const expired = assets ?? [];
    if (expired.length === 0) continue;

    const byBucket = new Map<string, string[]>();
    for (const a of expired) {
      const bucket = a.bucket as string;
      const keys = byBucket.get(bucket) ?? [];
      keys.push(a.storage_key as string);
      byBucket.set(bucket, keys);
    }
    for (const [bucket, keys] of byBucket) {
      const { error: storageError } = await service.storage
        .from(bucket)
        .remove(keys);
      if (storageError) {
        errors.push(
          `storage removal failed for ${bucket}: ${storageError.message}`
        );
      }
    }

    // Soft-delete matches the retention sweeper's convention so the row
    // stays auditable even though the storage object is gone.
    const { error: updateError } = await service
      .from("assets")
      .update({
        anon_session_id: null,
        visibility: "private",
        deleted_at: now.toISOString(),
        retention_expires_at: null,
      })
      .in(
        "id",
        expired.map((a) => a.id as string)
      );
    if (updateError) {
      errors.push(`asset update failed: ${updateError.message}`);
    } else {
      assetsDeleted += expired.length;
    }

    if (rows.length < BATCH_SIZE) break;
  }

  return { pendingDeleted, assetsDeleted, batches, errors };
}
