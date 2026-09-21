import { z } from "zod";

export const favoriteProductIdSchema = z.string().uuid("Invalid product ID");

export interface FavoriteValidationResult {
  success: boolean;
  productId?: string;
  error?: string;
}

/**
 * Validate a product ID before it is passed to a favorite action.
 */
export function validateFavoriteProductId(
  input: string | null | undefined
): FavoriteValidationResult {
  if (!input || typeof input !== "string") {
    return { success: false, error: "Product ID is required" };
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { success: false, error: "Product ID is required" };
  }

  const result = favoriteProductIdSchema.safeParse(trimmed);
  if (!result.success) {
    return { success: false, error: "Invalid product ID" };
  }

  return { success: true, productId: result.data };
}
