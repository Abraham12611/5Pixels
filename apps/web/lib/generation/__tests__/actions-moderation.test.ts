import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/service", () => {
  const terminal = { data: null, error: { message: "not found" } };
  const chain: Record<string, unknown> = new Proxy(
    {},
    {
      get: (_, prop) =>
        prop === "single" || prop === "maybeSingle"
          ? async () => terminal
          : () => chain,
    }
  );
  return {
    createServiceClient: vi.fn(() => ({ from: () => chain })),
  };
});
vi.mock("../upload", () => ({
  loadUserInputAssets: vi.fn(),
  signUserInputAssets: vi.fn(),
  getAssetObjectVersion: vi.fn(),
  markAssetModerationStatus: vi.fn(),
}));
vi.mock("../input-assets", () => ({
  inputAssetRejectionReason: vi.fn(() => null),
}));

const fetchStub = vi.fn();

beforeEach(() => {
  fetchStub.mockReset();
  vi.stubGlobal("fetch", fetchStub);
  vi.stubEnv("OPENAI_API_KEY", "sk-test-abc123");
  // The legacy Creem screen stays paused — with OpenAI configured it is
  // not consulted for generation text at all.
  vi.stubEnv("CREEM_MODERATION_ENABLED", "false");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

const FLAGGED_BODY = {
  id: "modr_x",
  results: [
    {
      flagged: true,
      categories: {
        sexual: false,
        "sexual/minors": false,
        harassment: true,
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
      },
      category_scores: {},
    },
  ],
};

function cleanBody() {
  return {
    id: "modr_ok",
    results: [
      {
        flagged: false,
        categories: {},
        category_scores: {},
      },
    ],
  };
}

async function driveAction(options: Record<string, unknown>) {
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
    options,
    outputSize: { name: "Square", width: 1024, height: 1024, is_default: true },
    idempotencyKey: "test-key",
  });
}

describe("createAndSubmitGeneration — legacy text fields screened via OpenAI", () => {
  it("blocks a free-text option field even with no custom prompt (bypass attempt)", async () => {
    fetchStub.mockResolvedValue(
      new Response(JSON.stringify(FLAGGED_BODY), { status: 200 })
    );
    const result = await driveAction({ caption: "harassing poster text" });
    expect(result.error).toMatch(/content policy/i);
    const [, init] = fetchStub.mock.calls[0]!;
    const sent = JSON.parse((init as RequestInit).body as string);
    // The option text is what was actually submitted to the moderator.
    expect(sent.input.join(" ")).toContain("harassing poster text");
  });

  it("lets clean option text through the OpenAI screen", async () => {
    // First call (option screen) allows; then the flow proceeds — mock
    // just enough for the next rejection stage to keep the test honest:
    // an unavailable image classifier stops it later, proving the text
    // screen itself passed.
    fetchStub.mockResolvedValueOnce(
      new Response(JSON.stringify(cleanBody()), { status: 200 })
    );
    fetchStub.mockRejectedValueOnce(new Error("image classifier down"));
    const { signUserInputAssets } = await import("../upload");
    (signUserInputAssets as ReturnType<typeof vi.fn>).mockResolvedValue([
      "https://signed.example/a1.png",
    ]);
    const result = await driveAction({ caption: "Summer Party 2026" });
    expect(result.error).toMatch(/couldn't verify|unable|try again/i);
    expect(fetchStub.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("fails closed when the moderation API is unreachable — before any quote", async () => {
    fetchStub.mockRejectedValue(new Error("socket hangup"));
    const result = await driveAction({ caption: "anything" });
    expect(result.error).toMatch(/couldn't verify/i);
  });
});
