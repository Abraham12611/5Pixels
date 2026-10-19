// @vitest-environment node
/**
 * #185 staging validation — the moderation flow exercised end-to-end over
 * REAL HTTP. A local stub stands in for the OpenAI moderation endpoint
 * (OPENAI_MODERATION_URL), so every request/response goes through the same
 * fetch path production uses; only the supabase/quote module boundaries
 * are mocked. Evidence for the release checklist:
 *
 *   - harmful user text is rejected before any quote/credit reservation
 *   - moderation outage/rejection fails closed before credits move
 *   - prompt-less legacy presets keep their behavior when OpenAI is
 *     unconfigured
 *   - submitted text and private recipe content never reach the logs —
 *     and recipe text never leaves our infra toward the moderator
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const recipeStore = { current: null as unknown };
vi.mock("@/lib/supabase/service", () => {
  const terminal = () => ({ data: recipeStore.current, error: recipeStore.current ? null : { message: "not found" } });
  const chain: Record<string, unknown> = new Proxy(
    {},
    {
      get: (_, prop) =>
        prop === "single" || prop === "maybeSingle" ? terminal : () => chain,
    }
  );
  return { createServiceClient: vi.fn(() => ({ from: () => chain })) };
});

const quoteSpy = vi.fn();
vi.mock("@/lib/pricing/quote", () => ({
  createGenerationQuote: (...args: unknown[]) => quoteSpy(...args),
}));
vi.mock("../upload", () => ({
  loadUserInputAssets: vi.fn(),
  signUserInputAssets: vi.fn(async () => ["https://signed.example/a1.png"]),
  getAssetObjectVersion: vi.fn(async () => "v1"),
  markAssetModerationStatus: vi.fn(async () => true),
}));
vi.mock("../input-assets", () => ({
  inputAssetRejectionReason: vi.fn(() => null),
}));
vi.mock("../reference-assets", () => ({
  getSignedReferenceAssets: vi.fn(async () => []),
}));

const RECIPE_SENTINEL = "PRIVATE_RECIPE_SENTINEL_7f3a";
const USER_SECRET = "USER_TEXT_SENTINEL_9b2c";

/** Stub moderation endpoint: captures requests; flags any input carrying
 *  the word "harmful"; response mode is programmable per test. */
interface Captured {
  body: { model?: string; input?: string[] };
  auth: string | undefined;
}
let captured: Captured[] = [];
let stubMode: "ok" | "http500" | "malformed" = "ok";
let stub: Server;
let stubUrl = "";

const ALL_CATEGORIES = {
  sexual: false,
  "sexual/minors": false,
  harassment: false,
  "harassment/threatening": false,
  hate: false,
  "hate/threatening": false,
  illicit: false,
  "illicit/violent": false,
  "self-harm": false,
  "self-harm/intent": false,
  "self-harm/instructions": false,
  violence: false,
  "violence/graphic": false,
};

function stubResponse(input: string[]) {
  const hit = input.some((t) => /harmful/i.test(t));
  return {
    id: "modr_stub",
    model: "omni-moderation-latest",
    results: input.map(() => ({
      flagged: hit,
      categories: { ...ALL_CATEGORIES, harassment: hit },
      category_scores: {},
      category_applied_input_types: hit ? { harassment: ["text"] } : {},
    })),
  };
}

beforeEach(async () => {
  captured = [];
  stubMode = "ok";
  quoteSpy.mockReset();
  recipeStore.current = null;
  stub = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      captured.push({
        body: raw ? JSON.parse(raw) : {},
        auth: req.headers.authorization,
      });
      if (stubMode === "http500") {
        res.writeHead(500).end("boom");
        return;
      }
      if (stubMode === "malformed") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ results: [{ flagged: "yes" }] }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(stubResponse(captured.at(-1)!.body.input ?? [])));
    });
  });
  await new Promise<void>((r) => stub.listen(0, "127.0.0.1", r));
  stubUrl = `http://127.0.0.1:${(stub.address() as AddressInfo).port}/v1/moderations`;
  vi.stubEnv("OPENAI_API_KEY", "sk-staging-test");
  vi.stubEnv("OPENAI_MODERATION_URL", stubUrl);
  vi.stubEnv("CREEM_MODERATION_ENABLED", "false");
  vi.stubEnv("NODE_ENV", "production");
});

afterEach(async () => {
  await new Promise<void>((r) => stub.close(() => r()));
  vi.unstubAllEnvs();
  vi.resetModules();
});

const CLEAN_RECIPE = {
  product_type: "filter",
  private_instruction_template: RECIPE_SENTINEL,
  private_negative_instruction: null,
  provider_strategy: {
    primary_provider: "fal-ai",
    primary_model: "nano-banana-2/edit",
    fallback_provider: null,
    fallback_model: null,
  },
  model_config: {},
  post_process_config: {},
  prompt_override_enabled: true,
  prompt_max_chars: 200,
  products: { type: "filter", metadata: {} },
};

async function drive(opts: {
  prompt?: string;
  options?: Record<string, unknown>;
}) {
  const { createClient } = await import("@/lib/supabase/server");
  const { loadUserInputAssets } = await import("../upload");
  const { createAndSubmitGeneration } = await import("../actions");
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
    },
  });
  (loadUserInputAssets as ReturnType<typeof vi.fn>).mockResolvedValue([
    {
      assetId: "a1",
      bucket: "user-assets",
      storageKey: "u1/a1.png",
      mediaType: "image",
      mimeType: "image/png",
      bytes: 100,
      width: 512,
      height: 512,
      moderationStatus: "approved",
      moderationObjectVersion: "v1",
      deletedAt: null,
    },
  ]);
  return createAndSubmitGeneration({
    productId: "00000000-0000-0000-0000-000000000001",
    productVersionId: "00000000-0000-0000-0000-000000000002",
    inputs: [{ assetId: "a1" }],
    options: opts.options ?? {},
    prompt: opts.prompt,
    outputSize: { name: "Square", width: 1024, height: 1024, is_default: true },
    idempotencyKey: "staging-key",
  });
}

describe("staging validation — moderation flow over real HTTP (#185)", () => {
  it("rejects a harmful custom prompt before any quote — prompt text sent, recipe never is", async () => {
    vi.stubEnv("PRESET_USER_PROMPT_ENABLED", "true");
    recipeStore.current = CLEAN_RECIPE;
    const result = await drive({ prompt: `harmful ${USER_SECRET}` });
    expect(result.error).toMatch(/content policy/i);
    // No quote/credit reservation was ever created.
    expect(quoteSpy).not.toHaveBeenCalled();
    // Two real moderation calls happened: option-text screen + prompt batch.
    expect(captured.length).toBe(2);
    const batch = captured[1]!;
    expect(batch.auth).toBe("Bearer sk-staging-test");
    expect(batch.body.model).toBe("omni-moderation-latest");
    expect(batch.body.input!.join(" ")).toContain(USER_SECRET);
    // The private recipe must never be transmitted to the moderator.
    expect(JSON.stringify(batch.body)).not.toContain(RECIPE_SENTINEL);
  });

  it("blocks a moderation outage (500) before credit reservation", async () => {
    stubMode = "http500";
    const result = await drive({ options: { caption: "anything" } });
    expect(result.error).toMatch(/couldn't verify/i);
    expect(quoteSpy).not.toHaveBeenCalled();
  });

  it("blocks a malformed response before credit reservation", async () => {
    stubMode = "malformed";
    const result = await drive({ options: { caption: "anything" } });
    expect(result.error).toMatch(/couldn't verify/i);
    expect(quoteSpy).not.toHaveBeenCalled();
  });

  it("fails closed when the endpoint is unreachable entirely", async () => {
    vi.stubEnv("OPENAI_MODERATION_URL", "http://127.0.0.1:1/v1/moderations");
    const result = await drive({ options: { caption: "anything" } });
    expect(result.error).toMatch(/couldn't verify/i);
    expect(quoteSpy).not.toHaveBeenCalled();
  });

  it("preserves legacy prompt-less behavior when OpenAI is unconfigured", async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await drive({ options: { caption: "Summer Party 2026" } });
    // The flag-gated Creem screen allowed it — the failure is the missing
    // recipe (mock returns not-found), proving the text screen passed.
    expect(result.error).toBe("Unable to start generation. Please try again.");
    expect(captured.length).toBe(0);
  });

  it("never logs submitted text or recipe content on a blocked verdict", async () => {
    vi.stubEnv("PRESET_USER_PROMPT_ENABLED", "true");
    recipeStore.current = CLEAN_RECIPE;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await drive({ prompt: `harmful ${USER_SECRET}` });
    for (const spy of [warn, error]) {
      for (const call of spy.mock.calls) {
        const out = JSON.stringify(call);
        expect(out).not.toContain(USER_SECRET);
        expect(out).not.toContain(RECIPE_SENTINEL);
      }
    }
    warn.mockRestore();
    error.mockRestore();
  });
});
