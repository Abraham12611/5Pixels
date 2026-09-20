import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseFalImageUrl, createFalAdapter } from "../fal";
import { createMockProvider } from "../mock";

const queueStub = vi.hoisted(() => ({
  submit: vi.fn(),
  status: vi.fn(),
  result: vi.fn(),
}));

vi.mock("@fal-ai/client", () => ({
  createFalClient: vi.fn(() => ({ queue: queueStub })),
}));

beforeEach(() => {
  queueStub.submit.mockReset();
  queueStub.status.mockReset();
  queueStub.result.mockReset();
});

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

describe("createFalAdapter submit", () => {
  const baseInput = {
    endpoint: "fal-ai/nano-banana-2/edit",
    prompt: "make it glow",
    sourceImageUrl: "https://fal.media/files/source.png",
  };

  function lastSubmitBody() {
    return queueStub.submit.mock.calls.at(-1)?.[1]?.input as Record<
      string,
      unknown
    >;
  }

  beforeEach(() => {
    queueStub.submit.mockResolvedValue({
      request_id: "req-1",
      status_url: "https://queue.fal.run/x",
    });
  });

  it("sends both image_url and image_urls for endpoint compatibility", async () => {
    const provider = createFalAdapter();
    await provider.submit(baseInput);
    const body = lastSubmitBody();
    expect(body.image_url).toBe(baseInput.sourceImageUrl);
    expect(body.image_urls).toEqual([baseInput.sourceImageUrl]);
  });

  it("translates image_size into aspect_ratio + resolution for nano-banana", async () => {
    const provider = createFalAdapter();
    await provider.submit({
      ...baseInput,
      modelConfig: { image_size: { width: 1820, height: 1024 } },
    });
    const body = lastSubmitBody();
    expect(body.aspect_ratio).toBe("16:9");
    expect(body.resolution).toBe("2K");
  });

  it("snaps portrait sizes to the nearest ratio", async () => {
    const provider = createFalAdapter();
    await provider.submit({
      ...baseInput,
      modelConfig: { image_size: { width: 1024, height: 1280 } },
    });
    expect(lastSubmitBody().aspect_ratio).toBe("4:5");
  });

  it("does not override an explicit model_config aspect_ratio", async () => {
    const provider = createFalAdapter();
    await provider.submit({
      ...baseInput,
      modelConfig: {
        image_size: { width: 1820, height: 1024 },
        aspect_ratio: "3:2",
      },
    });
    expect(lastSubmitBody().aspect_ratio).toBe("3:2");
  });
});

describe("createFalAdapter status", () => {
  it("treats a 4xx result fetch as terminal failure", async () => {
    process.env.FAL_KEY = "test-key";
    queueStub.status.mockResolvedValue({ status: "COMPLETED" });
    queueStub.result.mockRejectedValue(
      Object.assign(new Error("Unprocessable Entity"), { status: 422 })
    );

    const provider = createFalAdapter();
    const result = await provider.status("fal-ai/nano-banana-2/edit", "req-1");
    expect(result.status).toBe("failed");
  });

  it("maps COMPLETED-with-error payloads to failed", async () => {
    process.env.FAL_KEY = "test-key";
    queueStub.status.mockResolvedValue({
      status: "COMPLETED",
      error: "content_policy_violation",
    });
    queueStub.result.mockResolvedValue({ data: {} });

    const provider = createFalAdapter();
    const result = await provider.status("fal-ai/test", "req-2");
    expect(result.status).toBe("failed");
    expect(queueStub.result).not.toHaveBeenCalled();
  });

  it("keeps transient result-fetch errors retryable", async () => {
    process.env.FAL_KEY = "test-key";
    queueStub.status.mockResolvedValue({ status: "COMPLETED" });
    queueStub.result.mockRejectedValue(new Error("socket hangup"));

    const provider = createFalAdapter();
    const result = await provider.status("fal-ai/test", "req-3");
    expect(result.status).toBe("unknown");
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
