"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export interface FeedbackResult {
  success: boolean;
  error?: string;
}

export interface FeedbackStats {
  average: number;
  count: number;
}

export async function submitGenerationFeedback(
  generationId: string,
  rating: number,
  notes?: string
): Promise<FeedbackResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { success: false, error: "Rating must be between 1 and 5." };
  }

  const { error } = await supabase.from("generation_feedback").upsert(
    {
      generation_id: generationId,
      user_id: user.id,
      rating,
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,generation_id" }
  );

  if (error) {
    console.error("[submitGenerationFeedback] failed", error.message);
    return { success: false, error: "Unable to save feedback." };
  }

  revalidatePath(`/app/results/${generationId}`);
  revalidatePath(`/app/generations/${generationId}`);
  return { success: true };
}

export async function getMyFeedbackForGeneration(
  generationId: string
): Promise<{ rating: number; notes: string | null } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("generation_feedback")
    .select("rating, notes")
    .eq("generation_id", generationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    rating: Number(data.rating),
    notes: (data.notes as string | null) ?? null,
  };
}

export async function getProductFeedbackStats(
  productId: string
): Promise<FeedbackStats> {
  const service = createServiceClient();

  const { data, error } = await service
    .from("generation_feedback")
    .select("rating")
    .eq("generation_id.product_id", productId);

  if (error) {
    console.error("[getProductFeedbackStats] failed", error.message);
    return { average: 0, count: 0 };
  }

  const rows = (data ?? []) as { rating: number }[];
  if (rows.length === 0) return { average: 0, count: 0 };

  const average =
    rows.reduce((sum, row) => sum + Number(row.rating), 0) / rows.length;
  return { average: Math.round(average * 10) / 10, count: rows.length };
}

export async function getGenerationFeedbackStats(
  generationId: string
): Promise<FeedbackStats> {
  const service = createServiceClient();

  const { data, error } = await service
    .from("generation_feedback")
    .select("rating")
    .eq("generation_id", generationId);

  if (error) {
    console.error("[getGenerationFeedbackStats] failed", error.message);
    return { average: 0, count: 0 };
  }

  const rows = (data ?? []) as { rating: number }[];
  if (rows.length === 0) return { average: 0, count: 0 };

  const average =
    rows.reduce((sum, row) => sum + Number(row.rating), 0) / rows.length;
  return { average: Math.round(average * 10) / 10, count: rows.length };
}
