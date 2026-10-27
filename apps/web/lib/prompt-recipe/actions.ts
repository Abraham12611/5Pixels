"use server";

import { requireAdminOrOwner } from "@/lib/db/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { isOpenRouterConfigured } from "@/lib/ai/openrouter";
import {
  generateRecipeText,
  resolveImageUrl,
  type RecipeProductRow,
  type RecipeVersionRow,
} from "./generate";

/**
 * Manual "Generate" button in the product form — produces recipe text
 * from the form's *current* values (including unsaved edits) and returns
 * it for the admin to review inside the field. Nothing is written to the
 * database; the recipe lands in the normal Save flow like typed text.
 * Unlike the automatic fill, this works on drafts too — an explicit
 * admin action, not background spend.
 */

export interface PromptRecipeDraftInput {
  name: string;
  type: "filter" | "poster";
  short_description?: string | null;
  long_description?: string | null;
  private_instruction_template?: string | null;
  private_negative_instruction?: string | null;
  hero_asset_id?: string | null;
  poster_asset_id?: string | null;
}

export type PromptRecipeDraftResult =
  | { ok: true; recipe: string }
  | { ok: false; error: string };

export async function generatePromptRecipeDraft(
  input: PromptRecipeDraftInput
): Promise<PromptRecipeDraftResult> {
  await requireAdminOrOwner();

  if (!isOpenRouterConfigured()) {
    return { ok: false, error: "OPENROUTER_API_KEY is not configured." };
  }

  const product: RecipeProductRow = {
    id: "manual",
    name: input.name,
    type: input.type,
    short_description: input.short_description ?? null,
    long_description: input.long_description ?? null,
    public_status: "active",
    public_prompt_recipe: null,
    hero_asset_id: input.hero_asset_id ?? null,
    poster_asset_id: input.poster_asset_id ?? null,
  };
  const version: RecipeVersionRow = {
    private_instruction_template:
      input.private_instruction_template ?? null,
    private_negative_instruction:
      input.private_negative_instruction ?? null,
  };

  let imageUrl: string | null = null;
  try {
    imageUrl = await resolveImageUrl(createServiceClient(), product);
  } catch {
    // Asset lookup/signing is best-effort — generate text-only instead.
    imageUrl = null;
  }

  try {
    const recipe = await generateRecipeText(product, version, imageUrl);
    if (!recipe) {
      return {
        ok: false,
        error:
          "Every model failed or produced unusable output — try again shortly.",
      };
    }
    return { ok: true, recipe };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Recipe generation failed.",
    };
  }
}
