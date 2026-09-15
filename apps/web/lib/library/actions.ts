"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface LibraryActionResult {
  success: boolean;
  error?: string;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

/** Toggle a result's saved state for the Library "Saved" tab. */
export async function setGenerationSaved(
  generationId: string,
  saved: boolean
): Promise<LibraryActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sign in to save results." };

  const { data, error } = await supabase.rpc("set_generation_saved", {
    p_generation_id: generationId,
    p_saved: saved,
  });

  if (error || data !== true) {
    console.error("[setGenerationSaved] failed", error?.message);
    return { success: false, error: "Could not update this result." };
  }

  revalidatePath("/app/library");
  revalidatePath(`/app/results/${generationId}`);
  return { success: true };
}

/**
 * Record that a result was downloaded so the Library "Downloaded" tab stays
 * truthful. Fire-and-forget — a tracking miss must never block the file.
 */
export async function markGenerationDownloaded(
  generationId: string
): Promise<void> {
  const { supabase, user } = await requireUser();
  if (!user) return;

  const { error } = await supabase.rpc("mark_generation_downloaded", {
    p_generation_id: generationId,
  });
  if (error) {
    console.error("[markGenerationDownloaded] failed", error.message);
  }
}

/**
 * Permanently delete a generation, its outputs, and any asset rows left
 * unreferenced. The RPC returns the orphaned storage refs so the objects can
 * be removed here — the owner folder policy allows the user's own deletes.
 */
export async function deleteGeneration(
  generationId: string
): Promise<LibraryActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sign in to manage results." };

  const { data, error } = await supabase.rpc("delete_generation", {
    p_generation_id: generationId,
  });

  if (error) {
    console.error("[deleteGeneration] failed", error.message);
    return { success: false, error: "Could not delete this result." };
  }

  const refs = (data ?? []) as { bucket: string; storage_key: string }[];

  // Best-effort storage cleanup. Orphaned objects are harmless — nothing can
  // address them once the asset rows are gone — but we try to keep the bucket
  // tidy anyway.
  const byBucket = new Map<string, string[]>();
  for (const ref of refs) {
    const keys = byBucket.get(ref.bucket) ?? [];
    keys.push(ref.storage_key);
    byBucket.set(ref.bucket, keys);
  }
  for (const [bucket, keys] of byBucket) {
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .remove(keys);
    if (storageError) {
      console.error(
        `[deleteGeneration] storage cleanup failed for ${bucket}`,
        storageError.message
      );
    }
  }

  revalidatePath("/app/library");
  revalidatePath("/app");
  return { success: true };
}
