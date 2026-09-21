import { describe, expect, it } from "vitest";
import { validateFavoriteProductId } from "@/lib/catalog/validation";

describe("validateFavoriteProductId", () => {
  it("accepts a valid UUID", () => {
    const result = validateFavoriteProductId(
      "550e8400-e29b-41d4-a716-446655440000"
    );
    expect(result.success).toBe(true);
    expect(result.productId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.error).toBeUndefined();
  });

  it("rejects a missing ID", () => {
    const result = validateFavoriteProductId(undefined);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Product ID is required");
  });

  it("rejects an empty ID", () => {
    const result = validateFavoriteProductId("   ");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Product ID is required");
  });

  it("rejects a non-UUID string", () => {
    const result = validateFavoriteProductId("not-a-uuid");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid product ID");
  });
});
