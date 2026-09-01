"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateFavoriteProductId } from "@/lib/catalog/validation";

export interface ToggleFavoriteResult {
  success: boolean;
  favorited?: boolean;
  error?: string;
}

/**
 * Toggle a favorite for the currently authenticated user.
 *
 * The action validates the product ID, verifies the product is an active
 * public preset, and then lets the favorites RLS/unique key handle the actual
 * write. Errors are sanitized and never leak internal database details.
 */
export async function toggleFavorite(
  rawProductId: string,
  favorited: boolean
): Promise<ToggleFavoriteResult> {
  const validation = validateFavoriteProductId(rawProductId);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const productId = validation.productId!;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Sign in to save favorites." };
  }

  try {
    const { data: isPublic } = await supabase.rpc("is_public_product", {
      p_product_id: productId,
    });

    if (!isPublic) {
      return {
        success: false,
        error: "This preset is not available to favorite.",
      };
    }

    if (favorited) {
      const { error: insertError } = await supabase.from("favorites").insert({
        user_id: user.id,
        product_id: productId,
      });

      if (insertError) {
        // Unique violation means it is already favorited; treat as success.
        if (insertError.code === "23505") {
          revalidatePath("/explore");
          revalidatePath("/app/favorites");
          revalidatePath(`/presets/[slug]`, "page");
          return { success: true, favorited: true };
        }
        throw insertError;
      }
    } else {
      const { error: deleteError } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (deleteError) throw deleteError;
    }

    revalidatePath("/explore");
    revalidatePath("/app/favorites");
    revalidatePath(`/presets/[slug]`, "page");

    return { success: true, favorited };
  } catch (err) {
    console.error("[toggleFavorite] failed", {
      userId: user.id,
      productId,
      favorited,
      error: err,
    });
    return {
      success: false,
      error: "Could not update favorite. Please try again.",
    };
  }
}
