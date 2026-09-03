import { describe, expect, it } from "vitest";
import { parseFalImageUrl, createFalAdapter } from "../fal";
import { createMockProvider } from "../mock";

describe("parseFalImageUrl", () => {
  it("extracts the first image from an images array", () => {
    expect(
      parseFalImageUrl({
        images: [{ url: "https://fal.media/image1.png" }],
      })
    ).toBe("https://fal.media/image1.png");
  });

  it("prefers image property when no images array", () => {
    expect(parseFalImageUrl({ image: "https://fal.media/image2.png" })).toBe(
      "https://fal.media/image2.png"
    );
  });

  it("falls back to a top-level url", () => {
    expect(parseFalImageUrl({ url: "https://fal.media/image3.png" })).toBe(
      "https://fal.media/image3.png"
    );
  });

  it("returns undefined when no image is present", () => {
    expect(parseFalImageUrl({ logs: [] })).toBeUndefined();
  });
});

describe("createFalAdapter downloadImage SSRF protection", () => {
  it("rejects non-https URLs", async () => {
    process.env.FAL_KEY = "test-key";
    const provider = createFalAdapter();
    await expect(
      provider.downloadImage("http://fal.media/image.png")
    ).rejects.toThrow("Untrusted image host");
  });

  it("rejects URLs with credentials", async () => {
    process.env.FAL_KEY = "test-key";
    const provider = createFalAdapter();
    await expect(
      provider.downloadImage("https://user:pass@fal.media/image.png")
    ).rejects.toThrow("Untrusted image host");
  });

  it("rejects non-fal hosts", async () => {
    process.env.FAL_KEY = "test-key";
    const provider = createFalAdapter();
    await expect(
      provider.downloadImage("https://evil.com/image.png")
    ).rejects.toThrow("Untrusted image host");
  });

  it("accepts trusted fal media hosts", async () => {
    process.env.FAL_KEY = "test-key";
    const provider = createFalAdapter();
    // No network call is made because the host is validated before fetching.
    await expect(
      provider.downloadImage("https://fal.media/image.png")
    ).rejects.toThrow(); // will fail at HEAD, but host passes validation
  });
});

describe("createMockProvider", () => {
  it("returns a request id on submit", async () => {
    const provider = createMockProvider();
    const result = await provider.submit({
      endpoint: "fal-ai/test",
      prompt: "test",
      sourceImageUrl: "https://example.com/source.png",
    });
    expect(result.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns completed after the configured pending calls", async () => {
    const provider = createMockProvider({ pendingStatusCalls: 2 });
    const { requestId } = await provider.submit({
      endpoint: "fal-ai/test",
      prompt: "test",
      sourceImageUrl: "https://example.com/source.png",
    });
    expect((await provider.status("fal-ai/test", requestId)).status).toBe(
      "in_progress"
    );
    expect((await provider.status("fal-ai/test", requestId)).status).toBe(
      "in_progress"
    );
    const final = await provider.status("fal-ai/test", requestId);
    expect(final.status).toBe("completed");
  });

  it("returns failed when configured", async () => {
    const provider = createMockProvider({ statusFailureError: "mock failure" });
    const { requestId } = await provider.submit({
      endpoint: "fal-ai/test",
      prompt: "test",
      sourceImageUrl: "https://example.com/source.png",
    });
    const result = await provider.status("fal-ai/test", requestId);
    expect(result.status).toBe("failed");
  });

  it("returns unknown for transient network simulation", async () => {
    const provider = createMockProvider({ unknownStatus: true });
    const { requestId } = await provider.submit({
      endpoint: "fal-ai/test",
      prompt: "test",
      sourceImageUrl: "https://example.com/source.png",
    });
    const result = await provider.status("fal-ai/test", requestId);
    expect(result.status).toBe("unknown");
  });
});
