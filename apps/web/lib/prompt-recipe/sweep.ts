import { createServiceClient } from "@/lib/supabase/service";
import { ensurePromptRecipe, type EnsureResult } from "./generate";

export interface SweepResult {
  processed: number;
  generated: number;
  skipped: number;
  failed: number;
}

/**
 * Backfill pass over published presets missing a public recipe. Sequential
 * on purpose: free-tier models have tight rate limits, and a small batch
 * keeps every cron run well inside the function budget. Products that
 * fail are retried on the next sweep.
 */
export async function sweepPromptRecipes(
  limit = 10
): Promise<SweepResult> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("public_status", "active")
    .is("public_prompt_recipe", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const result: SweepResult = {
    processed: 0,
    generated: 0,
    skipped: 0,
    failed: 0,
  };

  for (const row of data ?? []) {
    let outcome: EnsureResult;
    try {
      outcome = await ensurePromptRecipe(row.id);
    } catch (err) {
      console.error(
        `[prompt-recipe] sweep threw for ${row.id}:`,
        err instanceof Error ? err.message : String(err)
      );
      outcome = "failed";
    }
    result.processed += 1;
    result[outcome] += 1;
  }
  return result;
}
