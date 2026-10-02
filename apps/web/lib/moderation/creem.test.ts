import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractUserText, screenUserText } from "./creem";

const fetchStub = vi.fn();

beforeEach(() => {
  fetchStub.mockReset();
  vi.stubGlobal("fetch", fetchStub);
  vi.stubEnv("CREEM_API_KEY", "creem_test_abc123");
  vi.stubEnv("NODE_ENV", "test");
  delete process.env.CREEM_API_URL;
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

describe("extractUserText", () => {
  it("collects non-empty strings, ignoring inert values", () => {
    expect(
      extractUserText({
        title: "  Ada's Big Night ",
        size: "large",
        count: 3,
        enabled: false,
        blank: "   ",
        nested: { caption: "hello" },
        list: ["one", 2, "three"],
      })
    ).toEqual(["Ada's Big Night", "large", "hello", "one", "three"]);
  });

  it("returns empty for no user text", () => {
    expect(extractUserText({})).toEqual([]);
    expect(extractUserText({ n: 1, ok: true })).toEqual([]);
  });
});

describe("screenUserText", () => {
  it("posts to the test API when the key is a creem_test_ key", async () => {
    fetchStub.mockResolvedValue(apiResponse({ decision: "allow" }));
    await screenUserText("a beach portrait", "user_1:product_2");
    const [url, init] = fetchStub.mock.calls[0]!;
    expect(url).toBe("https://test-api.creem.io/v1/moderation/prompt");
    expect(init.headers["x-api-key"]).toBe("creem_test_abc123");
    expect(JSON.parse(init.body)).toEqual({
      prompt: "a beach portrait",
      external_id: "user_1:product_2",
    });
  });

  it("uses the production API for live keys", async () => {
    vi.stubEnv("CREEM_API_KEY", "creem_live456");
    fetchStub.mockResolvedValue(apiResponse({ decision: "allow" }));
    await screenUserText("hi");
    expect(fetchStub.mock.calls[0]![0]).toBe(
      "https://api.creem.io/v1/moderation/prompt"
    );
  });

  it("allows on allow", async () => {
    fetchStub.mockResolvedValue(apiResponse({ decision: "allow" }));
    expect(await screenUserText("hi")).toEqual({ kind: "allow" });
  });

  it("blocks on deny", async () => {
    fetchStub.mockResolvedValue(
      apiResponse({ id: "mod_1", decision: "deny" })
    );
    const result = await screenUserText("bad text");
    expect(result.kind).toBe("blocked");
    expect(result).toMatchObject({ decision: "deny", resultId: "mod_1" });
  });

  it("blocks on flag — flagged prompts are treated like denies", async () => {
    fetchStub.mockResolvedValue(apiResponse({ decision: "flag" }));
    const result = await screenUserText("edgy text");
    expect(result).toMatchObject({ kind: "blocked", decision: "flag" });
  });

  it("fails closed on network errors", async () => {
    fetchStub.mockRejectedValue(new Error("socket hangup"));
    expect(await screenUserText("hi")).toEqual({ kind: "unavailable" });
  });

  it("fails closed on non-2xx responses", async () => {
    fetchStub.mockResolvedValue(apiResponse({ error: "boom" }, 500));
    expect(await screenUserText("hi")).toEqual({ kind: "unavailable" });
  });

  it("fails closed on an unrecognized decision", async () => {
    fetchStub.mockResolvedValue(apiResponse({ decision: "maybe" }));
    expect(await screenUserText("hi")).toEqual({ kind: "unavailable" });
  });

  it("fails closed on invalid JSON", async () => {
    fetchStub.mockResolvedValue(
      new Response("not json", { status: 200 })
    );
    expect(await screenUserText("hi")).toEqual({ kind: "unavailable" });
  });

  it("fails closed in production when the key is missing", async () => {
    delete process.env.CREEM_API_KEY;
    vi.stubEnv("NODE_ENV", "production");
    expect(await screenUserText("hi")).toEqual({ kind: "unavailable" });
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("allows outside production when the key is missing", async () => {
    delete process.env.CREEM_API_KEY;
    vi.stubEnv("NODE_ENV", "development");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await screenUserText("hi")).toEqual({ kind: "allow" });
    warn.mockRestore();
  });
});
