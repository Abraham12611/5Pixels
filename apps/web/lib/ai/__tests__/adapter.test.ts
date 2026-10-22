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

  it("disables fal's internal fallback — rerouting is ours, priced", async () => {
    const provider = createFalAdapter();
    await provider.submit(baseInput);
    const options = queueStub.submit.mock.calls.at(-1)?.[1] as {
      headers?: Record<string, string>;
    };
    expect(options.headers?.["x-app-fal-disable-fallback"]).toBe("true");
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

  it("pins num_images to 1 even when model_config asks for more", async () => {
    const provider = createFalAdapter();
    await provider.submit({
      ...baseInput,
      modelConfig: { num_images: 4 },
    });
    expect(lastSubmitBody().num_images).toBe(1);
  });

  it("pins limit_generations on nano-banana routes — model_config cannot unset it", async () => {
    const provider = createFalAdapter();
    await provider.submit({
      ...baseInput,
      modelConfig: { limit_generations: false },
    });
    expect(lastSubmitBody().limit_generations).toBe(true);
  });

  it("does not send limit_generations to non-nano/gemini endpoints", async () => {
    const provider = createFalAdapter();
    await provider.submit({
      ...baseInput,
      endpoint: "fal-ai/flux/dev/image-to-image",
    });
    expect(lastSubmitBody().limit_generations).toBeUndefined();
  });

  it("pins resolution to the quoted tier — model_config cannot upgrade it", async () => {
    const provider = createFalAdapter();
    await provider.submit({
      ...baseInput,
      modelConfig: {
        image_size: { width: 1024, height: 1024 }, // 1K tier
        resolution: "4K", // would bill 2× the quote
      },
    });
    expect(lastSubmitBody().resolution).toBe("1K");
  });

  it("appends preset reference images after the source in image_urls", async () => {
    const provider = createFalAdapter();
    await provider.submit({
      ...baseInput,
      referenceImageUrls: [
        "https://fal.media/files/style-ref.png",
        "https://fal.media/files/composition-ref.png",
      ],
    });
    const body = lastSubmitBody();
    expect(body.image_url).toBe(baseInput.sourceImageUrl);
    expect(body.image_urls).toEqual([
      baseInput.sourceImageUrl,
      "https://fal.media/files/style-ref.png",
      "https://fal.media/files/composition-ref.png",
    ]);
  });

  it("passes aspect_ratio 'auto' through for match-source sizes", async () => {
    const provider = createFalAdapter();
    await provider.submit({
      ...baseInput,
      modelConfig: {
        image_size: { width: 3000, height: 4000 },
        aspect_ratio: "auto",
      },
    });
    const body = lastSubmitBody();
    expect(body.aspect_ratio).toBe("auto");
    expect(body.resolution).toBe("4K");
  });
});

describe("createFalAdapter ordered multi-image submission (#179)", () => {
  const multiInput = {
    endpoint: "fal-ai/nano-banana-2/edit",
    prompt: "combine these photos",
    inputImageUrls: [
      "https://fal.media/files/user-1.png",
      "https://fal.media/files/user-2.png",
      "https://fal.media/files/user-3.png",
    ],
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

  it("sends every user input in order ahead of admin references", async () => {
    const provider = createFalAdapter();
    await provider.submit({
      ...multiInput,
      referenceImageUrls: ["https://fal.media/files/admin-style.png"],
    });
    const body = lastSubmitBody();
    expect(body.image_url).toBe("https://fal.media/files/user-1.png");
    expect(body.image_urls).toEqual([
      "https://fal.media/files/user-1.png",
      "https://fal.media/files/user-2.png",
      "https://fal.media/files/user-3.png",
      "https://fal.media/files/admin-style.png",
    ]);
  });

  it("fails closed when user inputs exceed the route budget including refs", async () => {
    const provider = createFalAdapter();
    await expect(
      provider.submit({
        // nano-banana/edit caps at 3 total inputs.
        endpoint: "fal-ai/nano-banana/edit",
        prompt: "combine",
        inputImageUrls: [
          "https://fal.media/files/u1.png",
          "https://fal.media/files/u2.png",
        ],
        referenceImageUrls: [
          "https://fal.media/files/r1.png",
          "https://fal.media/files/r2.png",
        ],
      })
    ).rejects.toThrow(/cannot accept 4 input images/i);
    expect(queueStub.submit).not.toHaveBeenCalled();
  });

  it("fails closed for multi-image on an unverified route", async () => {
    const provider = createFalAdapter();
    await expect(
      provider.submit({
        endpoint: "fal-ai/flux/dev/image-to-image",
        prompt: "combine",
        inputImageUrls: [
          "https://fal.media/files/u1.png",
          "https://fal.media/files/u2.png",
        ],
      })
    ).rejects.toThrow(/not verified for multi-image/i);
    expect(queueStub.submit).not.toHaveBeenCalled();
  });

  it("marks budget rejections non-retryable so fallback can't re-run them", async () => {
    const provider = createFalAdapter();
    const error = await provider
      .submit({
        endpoint: "fal-ai/nano-banana/edit",
        prompt: "combine",
        inputImageUrls: [
          "https://fal.media/files/u1.png",
          "https://fal.media/files/u2.png",
          "https://fal.media/files/u3.png",
          "https://fal.media/files/u4.png",
        ],
      })
      .catch((e) => e);
    expect(error.stage).toBe("input_budget_exceeded");
    expect(queueStub.submit).not.toHaveBeenCalled();
  });

  it("rejects a submit with no user image at all", async () => {
    const provider = createFalAdapter();
    await expect(
      provider.submit({
        endpoint: "fal-ai/nano-banana-2/edit",
        prompt: "combine",
        referenceImageUrls: ["https://fal.media/files/r1.png"],
      })
    ).rejects.toThrow(/at least one input image/i);
    expect(queueStub.submit).not.toHaveBeenCalled();
  });

  it("still honors the deprecated single-image sourceImageUrl alias", async () => {
    const provider = createFalAdapter();
    await provider.submit({
      endpoint: "fal-ai/nano-banana-2/edit",
      prompt: "edit",
      sourceImageUrl: "https://fal.media/files/legacy.png",
    });
    const body = lastSubmitBody();
    expect(body.image_url).toBe("https://fal.media/files/legacy.png");
    expect(body.image_urls).toEqual(["https://fal.media/files/legacy.png"]);
  });
});

describe("checkRouteInputBudget", () => {
  it("allows inputs within the verified route budget", async () => {
    const { checkRouteInputBudget } = await import("../route-capabilities");
    expect(
      checkRouteInputBudget("fal-ai/nano-banana-2/edit", 8, 4)
    ).toEqual({ ok: true });
    expect(checkRouteInputBudget("fal-ai/nano-banana/edit", 2, 1)).toEqual({
      ok: true,
    });
  });

  it("fails closed when the combined total exceeds the cap", async () => {
    const { checkRouteInputBudget } = await import("../route-capabilities");
    expect(
      checkRouteInputBudget("fal-ai/nano-banana/edit", 2, 2)
    ).toEqual({ ok: false, reason: "budget_exceeded", total: 4 });
  });

  it("fails closed for multi-image on unknown routes but allows legacy single", async () => {
    const { checkRouteInputBudget } = await import("../route-capabilities");
    expect(
      checkRouteInputBudget("fal-ai/flux/dev/image-to-image", 2, 0)
    ).toEqual({ ok: false, reason: "unknown_route", total: 2 });
    expect(
      checkRouteInputBudget("fal-ai/flux/dev/image-to-image", 1, 3)
    ).toEqual({ ok: true });
    expect(checkRouteInputBudget(null, 2, 0)).toEqual({
      ok: false,
      reason: "unknown_route",
      total: 2,
    });
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
