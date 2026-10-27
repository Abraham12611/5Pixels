import { beforeEach, describe, expect, it, vi } from "vitest";

const chatMock = vi.fn();
vi.mock("@/lib/ai/openrouter", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/ai/openrouter")>();
  return {
    ...mod,
    openRouterChatText: (...args: unknown[]) => chatMock(...args),
  };
});

interface TableResult {
  single?: unknown;
  list?: unknown;
}

const tables: Record<string, TableResult> = {};
const updateCalls: { table: string; values: unknown }[] = [];
let updateError: { message: string } | null = null;

function chain(listResult: unknown, singleResult: unknown) {
  const c: Record<string, unknown> = {
    maybeSingle: () =>
      Promise.resolve({ data: singleResult, error: null }),
    single: () => Promise.resolve({ data: singleResult, error: null }),
  };
  for (const method of ["eq", "is", "in", "order", "limit", "select"]) {
    c[method] = () => c;
  }
  // Thenable — lets `await client.from(t).select().eq()…limit()` resolve
  // to a list result for the sweep query shape.
  c.then = (onFulfilled: (v: unknown) => unknown, onRejected?: unknown) =>
    Promise.resolve(listResult).then(onFulfilled, onRejected as never);
  return c;
}

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from(table: string) {
      const t = tables[table] ?? {};
      return {
        select: () => chain(t.list ?? null, t.single ?? null),
        update: (values: unknown) => {
          updateCalls.push({ table, values });
          return chain({ error: updateError }, null);
        },
      };
    },
    storage: {
      from: () => ({
        createSignedUrl: () =>
          Promise.resolve({
            data: { signedUrl: "https://signed.example/hero.png" },
            error: null,
          }),
      }),
    },
  }),
}));

const {
  ensurePromptRecipe,
  containsVerbatimLeak,
  sanitizeRecipe,
} = await import("../generate");
const { sweepPromptRecipes } = await import("../sweep");

const PRODUCT = {
  id: "prod-1",
  name: "Akai Poster",
  type: "poster",
  short_description: "90s manga poster",
  long_description: "A bold vertical manga-style poster preset.",
  public_status: "active",
  public_prompt_recipe: null,
  hero_asset_id: "asset-1",
  poster_asset_id: null,
};

const VERSION = {
  private_instruction_template:
    "Use the internal template alpha-beta-gamma with locked seeds and " +
    "private provider parameters that must never appear in public copy.",
  private_negative_instruction: "no watermark",
};

const ASSET = {
  bucket: "preset-media",
  storage_key: "products/akai/hero.png",
  mime_type: "image/png",
};

const GOOD_RECIPE =
  "Vertical poster, pure white paper background with subtle grain. " +
  "Massive arched bold italic display wordmark in deep midnight-blue " +
  "across the top. Centered illustrated portrait with confident smirk. " +
  "Palette: crimson red, midnight blue, silver chrome.";

beforeEach(() => {
  chatMock.mockReset();
  updateCalls.length = 0;
  updateError = null;
  for (const key of Object.keys(tables)) delete tables[key];
  tables.products = { single: PRODUCT };
  tables.product_versions = { single: VERSION };
  tables.assets = { single: ASSET };
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
});

describe("containsVerbatimLeak", () => {
  it("detects a copied window of the private recipe", () => {
    const leaked =
      "A nice poster. " +
      "Use the internal template alpha-beta-gamma with locked seeds and " +
      "private provider parameters that must never appear in public copy.";
    expect(containsVerbatimLeak(leaked, VERSION.private_instruction_template))
      .toBe(true);
  });

  it("accepts a genuine paraphrase", () => {
    expect(
      containsVerbatimLeak(GOOD_RECIPE, VERSION.private_instruction_template)
    ).toBe(false);
  });

  it("ignores short or missing sources", () => {
    expect(containsVerbatimLeak(GOOD_RECIPE, "short")).toBe(false);
    expect(containsVerbatimLeak(GOOD_RECIPE, null)).toBe(false);
  });
});

describe("sanitizeRecipe", () => {
  it("strips a wrapping code fence", () => {
    expect(sanitizeRecipe(`\`\`\`\n${GOOD_RECIPE}\n\`\`\``)).toBe(GOOD_RECIPE);
  });

  it("rejects trivially short output", () => {
    expect(sanitizeRecipe("too short")).toBeNull();
  });

  it("caps output at the column limit", () => {
    const huge = `${GOOD_RECIPE}\n\n${"x".repeat(10_000)}`;
    const out = sanitizeRecipe(huge);
    expect(out).not.toBeNull();
    expect(out!.length).toBeLessThanOrEqual(8_000);
  });
});

describe("ensurePromptRecipe", () => {
  it("throws when OPENROUTER_API_KEY is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(ensurePromptRecipe("prod-1")).rejects.toThrow(
      "OPENROUTER_API_KEY"
    );
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("skips a draft product without calling any model", async () => {
    tables.products = { single: { ...PRODUCT, public_status: "draft" } };
    expect(await ensurePromptRecipe("prod-1")).toBe("skipped");
    expect(chatMock).not.toHaveBeenCalled();
    expect(updateCalls).toHaveLength(0);
  });

  it("skips a product that already has a recipe — never overwrites", async () => {
    tables.products = {
      single: { ...PRODUCT, public_prompt_recipe: "hand-written" },
    };
    expect(await ensurePromptRecipe("prod-1")).toBe("skipped");
    expect(chatMock).not.toHaveBeenCalled();
    expect(updateCalls).toHaveLength(0);
  });

  it("generates with the hero image and writes a conditional update", async () => {
    chatMock.mockResolvedValue(GOOD_RECIPE);
    expect(await ensurePromptRecipe("prod-1")).toBe("generated");

    const [args] = chatMock.mock.calls[0]!;
    const call = args as {
      model: string;
      messages: { role: string; content: unknown }[];
    };
    expect(call.model).toBe("minimax/minimax-m3.1-flash:free");
    const parts = call.messages[1]!.content as { type: string }[];
    expect(parts.map((p) => p.type)).toEqual(["text", "image_url"]);

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]!.table).toBe("products");
    expect(
      (updateCalls[0]!.values as { public_prompt_recipe: string })
        .public_prompt_recipe
    ).toBe(GOOD_RECIPE);
  });

  it("falls through to the next model on failure", async () => {
    chatMock
      .mockRejectedValueOnce(new Error("OpenRouter request failed with 429"))
      .mockResolvedValue(GOOD_RECIPE);
    expect(await ensurePromptRecipe("prod-1")).toBe("generated");
    const second = chatMock.mock.calls[1]![0] as { model: string };
    expect(second.model).toBe("nvidia/nemotron-3.5-lightning:free");
  });

  it("escalates to paid fallbacks only after every free model fails", async () => {
    chatMock.mockImplementation((args: { model: string }) =>
      args.model.endsWith(":free")
        ? Promise.reject(new Error("OpenRouter request failed with 429"))
        : Promise.resolve(GOOD_RECIPE)
    );
    expect(await ensurePromptRecipe("prod-1")).toBe("generated");
    // 3 free-model vision attempts failed, then first paid model won.
    expect(chatMock).toHaveBeenCalledTimes(4);
    const fourth = chatMock.mock.calls[3]![0] as { model: string };
    expect(fourth.model).toBe("qwen/qwen3.8-omni-flash");
  });

  it("rejects output that leaks the private recipe verbatim", async () => {
    chatMock
      .mockResolvedValueOnce(
        "Result: " + VERSION.private_instruction_template
      )
      .mockResolvedValue(GOOD_RECIPE);
    expect(await ensurePromptRecipe("prod-1")).toBe("generated");
    expect(chatMock).toHaveBeenCalledTimes(2);
    expect(
      (updateCalls[0]!.values as { public_prompt_recipe: string })
        .public_prompt_recipe
    ).toBe(GOOD_RECIPE);
  });

  it("retries text-only when every vision attempt fails", async () => {
    chatMock.mockImplementation((args: { messages: { content: unknown }[] }) => {
      const parts = args.messages[1]!.content as { type: string }[];
      if (parts.some((p) => p.type === "image_url")) {
        return Promise.reject(
          new Error("OpenRouter request failed with 400")
        );
      }
      return Promise.resolve(GOOD_RECIPE);
    });
    expect(await ensurePromptRecipe("prod-1")).toBe("generated");
    // 9 vision attempts (3 free + 6 paid) failed, then the first
    // text-only attempt succeeded.
    expect(chatMock).toHaveBeenCalledTimes(10);
  });

  it("works without an image when the product has no hero/poster asset", async () => {
    tables.products = {
      single: { ...PRODUCT, hero_asset_id: null, poster_asset_id: null },
    };
    chatMock.mockResolvedValue(GOOD_RECIPE);
    expect(await ensurePromptRecipe("prod-1")).toBe("generated");
    const parts = (
      chatMock.mock.calls[0]![0] as { messages: { content: unknown }[] }
    ).messages[1]!.content as { type: string }[];
    expect(parts.map((p) => p.type)).toEqual(["text"]);
  });

  it("returns failed when every model fails", async () => {
    chatMock.mockRejectedValue(new Error("OpenRouter request failed with 500"));
    expect(await ensurePromptRecipe("prod-1")).toBe("failed");
    expect(updateCalls).toHaveLength(0);
  });
});

describe("sweepPromptRecipes", () => {
  it("processes published products missing a recipe and aggregates", async () => {
    tables.products = {
      list: { data: [{ id: "p1" }, { id: "p2" }], error: null },
      single: PRODUCT,
    };
    chatMock.mockResolvedValue(GOOD_RECIPE);
    const result = await sweepPromptRecipes(5);
    expect(result.processed).toBe(2);
    expect(result.generated).toBe(2);
  });
});
