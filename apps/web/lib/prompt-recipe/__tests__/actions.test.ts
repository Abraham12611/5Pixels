import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/admin", () => ({
  requireAdminOrOwner: vi.fn(async () => {}),
}));

const genMock = vi.fn();
const imageMock = vi.fn();
vi.mock("../generate", () => ({
  generateRecipeText: (...args: unknown[]) => genMock(...args),
  resolveImageUrl: (...args: unknown[]) => imageMock(...args),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({}),
}));

const { generatePromptRecipeDraft } = await import("../actions");

const INPUT = {
  name: "Akai Poster",
  type: "poster" as const,
  short_description: "90s manga poster",
  private_instruction_template: "secret internal recipe",
  hero_asset_id: "asset-1",
};

beforeEach(() => {
  genMock.mockReset();
  imageMock.mockReset();
  imageMock.mockResolvedValue("https://signed.example/hero.png");
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
});

describe("generatePromptRecipeDraft", () => {
  it("returns the generated recipe without touching the DB", async () => {
    genMock.mockResolvedValue("public recipe text");
    const result = await generatePromptRecipeDraft(INPUT);
    expect(result).toEqual({ ok: true, recipe: "public recipe text" });
    expect(genMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Akai Poster", type: "poster" }),
      expect.objectContaining({
        private_instruction_template: "secret internal recipe",
      }),
      "https://signed.example/hero.png"
    );
  });

  it("fails cleanly when OPENROUTER_API_KEY is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const result = await generatePromptRecipeDraft(INPUT);
    expect(result.ok).toBe(false);
    expect(genMock).not.toHaveBeenCalled();
  });

  it("generates text-only when image signing fails", async () => {
    imageMock.mockRejectedValue(new Error("storage down"));
    genMock.mockResolvedValue("recipe");
    const result = await generatePromptRecipeDraft(INPUT);
    expect(result.ok).toBe(true);
    expect(genMock.mock.calls[0]![2]).toBeNull();
  });

  it("maps an unusable generation to an error result", async () => {
    genMock.mockResolvedValue(null);
    const result = await generatePromptRecipeDraft(INPUT);
    expect(result.ok).toBe(false);
  });
});
