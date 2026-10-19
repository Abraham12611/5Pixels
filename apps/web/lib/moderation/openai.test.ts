import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isOpenAiModerationConfigured,
  screenUserPrompt,
} from "./openai";

const fetchStub = vi.fn();
const SENSITIVE = "the secret user prompt text xyzzy";

beforeEach(() => {
  fetchStub.mockReset();
  vi.stubGlobal("fetch", fetchStub);
  vi.stubEnv("OPENAI_API_KEY", "sk-test-abc123");
  delete process.env.OPENAI_MODERATION_URL;
  delete process.env.OPENAI_BASE_URL;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function apiResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function moderationResult(
  flagged: boolean,
  categories: Record<string, boolean> = {}
) {
  return {
    flagged,
    categories: {
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
      ...categories,
    },
    category_scores: {},
    category_applied_input_types: {},
  };
}

describe("screenUserPrompt (OpenAI guarded path)", () => {
  it("fails closed when OPENAI_API_KEY is missing — in every environment", async () => {
    delete process.env.OPENAI_API_KEY;
    vi.stubEnv("NODE_ENV", "development");
    expect(isOpenAiModerationConfigured()).toBe(false);
    expect(await screenUserPrompt("make it brighter")).toEqual({
      kind: "unavailable",
    });
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("allows clean text", async () => {
    fetchStub.mockResolvedValue(
      apiResponse({ id: "modr_1", results: [moderationResult(false)] })
    );
    expect(await screenUserPrompt("a beach portrait")).toEqual({
      kind: "allow",
    });
    expect(fetchStub).toHaveBeenCalledTimes(1);
    const [, init] = fetchStub.mock.calls[0]!;
    const sent = JSON.parse((init as RequestInit).body as string);
    expect(sent.model).toBe("omni-moderation-latest");
    expect(sent.input).toEqual(["a beach portrait"]);
    expect((init as RequestInit).headers).toMatchObject({
      authorization: "Bearer sk-test-abc123",
    });
  });

  it("blocks flagged text with its categories", async () => {
    fetchStub.mockResolvedValue(
      apiResponse({
        id: "modr_2",
        results: [moderationResult(true, { "sexual/minors": true })],
      })
    );
    const outcome = await screenUserPrompt("disallowed content");
    expect(outcome.kind).toBe("blocked");
    if (outcome.kind === "blocked") {
      expect(outcome.categories).toContain("sexual/minors");
      expect(outcome.resultId).toBe("modr_2");
    }
  });

  it("blocks flagged text even without a named category", async () => {
    fetchStub.mockResolvedValue(
      apiResponse({ results: [moderationResult(true)] })
    );
    const outcome = await screenUserPrompt("disallowed content");
    expect(outcome.kind).toBe("blocked");
  });

  it("blocks on a true category even if flagged disagrees — categories are enforced signals", async () => {
    fetchStub.mockResolvedValue(
      apiResponse({
        results: [
          moderationResult(false, { "self-harm/instructions": true }),
        ],
      })
    );
    const outcome = await screenUserPrompt("edge case");
    expect(outcome.kind).toBe("blocked");
  });

  it("screens every input in a batch — a harmful option field cannot bypass", async () => {
    fetchStub.mockResolvedValue(
      apiResponse({
        results: [
          moderationResult(false),
          moderationResult(true, { hate: true }),
        ],
      })
    );
    const outcome = await screenUserPrompt([
      "make it brighter",
      "hateful poster caption",
    ]);
    expect(outcome.kind).toBe("blocked");
    const [, init] = fetchStub.mock.calls[0]!;
    const sent = JSON.parse((init as RequestInit).body as string);
    expect(sent.input).toHaveLength(2);
  });

  it("skips blank strings in a batch — and allows an all-empty batch without a call", async () => {
    expect(await screenUserPrompt(["  ", ""])).toEqual({ kind: "allow" });
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("fails closed on a non-OK response", async () => {
    fetchStub.mockResolvedValue(apiResponse({ error: "boom" }, 500));
    expect(await screenUserPrompt("anything")).toEqual({
      kind: "unavailable",
    });
  });

  it("fails closed on 401/403 auth rejection", async () => {
    fetchStub.mockResolvedValue(apiResponse({ error: "bad key" }, 401));
    expect(await screenUserPrompt("anything")).toEqual({
      kind: "unavailable",
    });
  });

  it("fails closed on a network error or timeout", async () => {
    fetchStub.mockRejectedValue(new Error("socket hangup"));
    expect(await screenUserPrompt("anything")).toEqual({
      kind: "unavailable",
    });
    fetchStub.mockRejectedValue(
      new DOMException("The operation timed out", "TimeoutError")
    );
    expect(await screenUserPrompt("anything")).toEqual({
      kind: "unavailable",
    });
  });

  it("fails closed on invalid JSON", async () => {
    fetchStub.mockResolvedValue(
      new Response("not json", { status: 200 })
    );
    expect(await screenUserPrompt("anything")).toEqual({
      kind: "unavailable",
    });
  });

  it("fails closed on malformed results — missing/empty/non-boolean", async () => {
    for (const body of [
      {},
      { results: [] },
      { results: [{}] },
      { results: [{ flagged: "yes" }] },
      { results: [{ flagged: false, categories: { hate: "yes" } }] },
      { results: null },
    ]) {
      fetchStub.mockResolvedValue(apiResponse(body));
      expect(await screenUserPrompt("anything")).toEqual({
        kind: "unavailable",
      });
    }
  });

  it("fails closed when the result count doesn't match the input count", async () => {
    fetchStub.mockResolvedValue(
      apiResponse({ results: [moderationResult(false)] })
    );
    expect(
      await screenUserPrompt(["prompt one", "prompt two"])
    ).toEqual({ kind: "unavailable" });
  });

  it("never logs the submitted text", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchStub.mockResolvedValue(
      apiResponse({
        results: [moderationResult(true, { violence: true })],
      })
    );
    await screenUserPrompt(SENSITIVE);
    for (const spy of [warn, error]) {
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain(SENSITIVE);
      }
    }
    warn.mockRestore();
    error.mockRestore();
  });

  it("honors OPENAI_MODERATION_URL override for a private gateway", async () => {
    vi.stubEnv("OPENAI_MODERATION_URL", "https://gw.internal/mod");
    fetchStub.mockResolvedValue(
      apiResponse({ results: [moderationResult(false)] })
    );
    await screenUserPrompt("text");
    expect(fetchStub.mock.calls[0]![0]).toBe("https://gw.internal/mod");
  });
});
