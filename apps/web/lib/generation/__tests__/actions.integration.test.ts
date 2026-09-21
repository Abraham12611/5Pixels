import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("createAndSubmitGeneration action", () => {
  it("rejects unauthenticated callers", { timeout: 15000 }, async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { createAndSubmitGeneration } = await import("../actions");

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const result = await createAndSubmitGeneration({
      productId: "00000000-0000-0000-0000-000000000001",
      productVersionId: "00000000-0000-0000-0000-000000000002",
      sourceAssetId: "00000000-0000-0000-0000-000000000003",
      options: {},
      outputSize: { name: "Square", width: 1024, height: 1024, is_default: true },
      idempotencyKey: "test-key",
    });

    expect(result.error).toBe("Please sign in to continue.");
  });
});
