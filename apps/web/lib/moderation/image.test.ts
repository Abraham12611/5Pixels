import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NSFW_BLOCK_THRESHOLD, screenUserImage } from "./image";

const fetchStub = vi.fn();

beforeEach(() => {
  fetchStub.mockReset();
  vi.stubGlobal("fetch", fetchStub);
  vi.stubEnv("FAL_KEY", "fal_test_abc123");
  vi.stubEnv("NODE_ENV", "test");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function apiResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("screenUserImage", () => {
  it("sends the image URL to the image classifier with provider auth", async () => {
    fetchStub.mockResolvedValue(apiResponse({ nsfw_probability: 0.01 }));
    const outcome = await screenUserImage(
      "https://signed.example/user-assets/photo.png?token=x",
      "user_1:asset_2"
    );
    expect(outcome).toEqual({ kind: "allow" });
    expect(fetchStub).toHaveBeenCalledTimes(1);
    const [url, init] = fetchStub.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("imageutils/nsfw");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Key fal_test_abc123"
    );
    expect(JSON.parse(init.body as string)).toEqual({
      image_url: "https://signed.example/user-assets/photo.png?token=x",
    });
  });

  it("allows a clean image (below the NSFW threshold)", async () => {
    fetchStub.mockResolvedValue(apiResponse({ nsfw_probability: 0.02 }));
    expect(await screenUserImage("https://img/x.png")).toEqual({
      kind: "allow",
    });
  });

  it("blocks at or above the NSFW threshold", async () => {
    fetchStub.mockResolvedValue(apiResponse({ nsfw_probability: 0.97 }));
    expect(await screenUserImage("https://img/x.png")).toEqual({
      kind: "blocked",
      probability: 0.97,
    });
    fetchStub.mockResolvedValue(
      apiResponse({ nsfw_probability: NSFW_BLOCK_THRESHOLD })
    );
    const atBoundary = await screenUserImage("https://img/x.png");
    expect(atBoundary.kind).toBe("blocked");
  });

  it("fails closed when the provider key is not configured", async () => {
    delete process.env.FAL_KEY;
    expect(await screenUserImage("https://img/x.png")).toEqual({
      kind: "unavailable",
    });
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("fails closed on non-2xx responses", async () => {
    fetchStub.mockResolvedValue(apiResponse({ detail: "boom" }, 500));
    expect(await screenUserImage("https://img/x.png")).toEqual({
      kind: "unavailable",
    });
  });

  it("fails closed on transport errors and timeouts", async () => {
    fetchStub.mockRejectedValue(new Error("socket hangup"));
    expect(await screenUserImage("https://img/x.png")).toEqual({
      kind: "unavailable",
    });
    fetchStub.mockRejectedValue(
      Object.assign(new Error("timed out"), { name: "TimeoutError" })
    );
    expect(await screenUserImage("https://img/x.png")).toEqual({
      kind: "unavailable",
    });
  });

  it("fails closed on malformed payloads", async () => {
    for (const body of [
      {},
      { nsfw_probability: "high" },
      { nsfw_probability: 1.5 },
      { nsfw_probability: -0.1 },
      { unrelated: true },
      null,
      "ok",
    ]) {
      fetchStub.mockResolvedValue(apiResponse(body));
      expect(await screenUserImage("https://img/x.png")).toEqual({
        kind: "unavailable",
      });
    }
  });

  it("tolerates a { data } envelope but still requires a valid probability", async () => {
    fetchStub.mockResolvedValue(
      apiResponse({ data: { nsfw_probability: 0.1 } })
    );
    expect(await screenUserImage("https://img/x.png")).toEqual({
      kind: "allow",
    });
    fetchStub.mockResolvedValue(apiResponse({ data: { unexpected: true } }));
    expect(await screenUserImage("https://img/x.png")).toEqual({
      kind: "unavailable",
    });
  });
});
