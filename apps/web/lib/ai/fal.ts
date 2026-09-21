import { createFalClient } from "@fal-ai/client";
import type { InQueueQueueStatus, QueueStatus } from "@fal-ai/client";
import {
  ProviderError,
  type ImageProviderAdapter,
  type ProviderImageDownload,
  type ProviderStatusResult,
  type ProviderSubmitInput,
  type ProviderSubmitResult,
  type ProviderJobStatus,
} from "./adapter";

const ENDPOINT_PREFIX = "fal-ai/";
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 30_000;

// Explicit allowlist for trusted fal media origins to mitigate SSRF.
const ALLOWED_IMAGE_HOSTS = [
  "fal.media",
  "cdn.fal.ai",
  "r2.fal.ai",
  "storage.fal.ai",
];

function getCredentials() {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new ProviderError(
      "FAL_KEY is not configured",
      "configuration_missing"
    );
  }
  return key;
}

function assertAllowedEndpoint(endpoint: string) {
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith(ENDPOINT_PREFIX) ||
    endpoint.includes("..") ||
    endpoint.includes("//")
  ) {
    throw new ProviderError(
      `Endpoint must start with ${ENDPOINT_PREFIX}`,
      "invalid_endpoint"
    );
  }
}

function normalizeStatus(raw: string): ProviderJobStatus {
  switch (raw) {
    case "IN_QUEUE":
      return "queued";
    case "IN_PROGRESS":
      return "in_progress";
    case "COMPLETED":
      return "completed";
    default:
      return "unknown";
  }
}

// The nano-banana family only understands these ratios — "auto" preserves
// the source image's aspect, which is why outputs previously always matched
// the upload's orientation. Snap requested dims to the nearest enum value.
const NANO_ASPECT_RATIOS: ReadonlyArray<readonly [number, string]> = [
  [21 / 9, "21:9"],
  [16 / 9, "16:9"],
  [3 / 2, "3:2"],
  [4 / 3, "4:3"],
  [5 / 4, "5:4"],
  [1, "1:1"],
  [4 / 5, "4:5"],
  [3 / 4, "3:4"],
  [2 / 3, "2:3"],
  [9 / 16, "9:16"],
];

function nearestAspectRatio(width: number, height: number): string {
  const target = width / height;
  let best = "1:1";
  let bestDelta = Infinity;
  for (const [ratio, label] of NANO_ASPECT_RATIOS) {
    const delta = Math.abs(ratio - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = label;
    }
  }
  return best;
}

// Resolution tiers shared by nano-banana-2/pro (1K is also valid on -pro,
// which lacks 0.5K). Round up so the delivered pixels meet the requested
// size; extra fields are ignored by endpoints that don't support them.
function nanoResolutionTier(pixels: number): string {
  if (pixels <= 1_100_000) return "1K";
  if (pixels <= 4_500_000) return "2K";
  return "4K";
}

function isAllowedImageHost(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port !== "" && url.port !== "443") return false;
  return ALLOWED_IMAGE_HOSTS.some(
    (host) => url.host === host || url.host.endsWith(`.${host}`)
  );
}

export function parseFalImageUrl(data: unknown): string | undefined {
  if (data === null || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;

  if (Array.isArray(record.images)) {
    const first = record.images[0] as Record<string, unknown> | undefined;
    if (first && typeof first.url === "string") return first.url;
  }

  if (typeof record.image === "string") return record.image;
  if (typeof record.url === "string") return record.url;

  return undefined;
}

export function createFalAdapter(): ImageProviderAdapter {
  const client = createFalClient({
    credentials: () => getCredentials(),
  });

  const queue = client.queue as unknown as {
    submit(
      endpointId: string,
      options: { input?: Record<string, unknown> }
    ): Promise<InQueueQueueStatus>;
    status(
      endpointId: string,
      options: { requestId: string }
    ): Promise<QueueStatus>;
    result(
      endpointId: string,
      options: { requestId: string }
    ): Promise<{ data: unknown }>;
  };

  return {
    name: "fal",

    async submit(input: ProviderSubmitInput): Promise<ProviderSubmitResult> {
      assertAllowedEndpoint(input.endpoint);

      const body: Record<string, unknown> = {
        // Endpoints differ on the source-image field: flux-style models take
        // `image_url`, the nano-banana family requires `image_urls` (array).
        // Send both — providers ignore fields their schema doesn't use.
        image_url: input.sourceImageUrl,
        // Reference assets ride along in image_urls: multi-image endpoints
        // (nano-banana, gpt-image) use them as style/composition context,
        // single-image endpoints just read the first entry.
        image_urls: [
          input.sourceImageUrl,
          ...(input.referenceImageUrls ?? []),
        ],
        prompt: input.prompt,
      };

      if (input.negativePrompt) {
        body.negative_prompt = input.negativePrompt;
      }

      const merged = { ...input.modelConfig, ...body };

      // Endpoints disagree on size fields: flux/gpt-image/qwen honor
      // `image_size` {width,height}, while nano-banana models ignore it and
      // only read `aspect_ratio` + `resolution`. Translate so the chosen size
      // reaches every endpoint; unknown fields are ignored elsewhere. An
      // explicit model_config value always wins.
      const size = merged.image_size;
      if (size !== null && typeof size === "object") {
        const { width: w, height: h } = size as Record<string, unknown>;
        if (
          typeof w === "number" &&
          typeof h === "number" &&
          w > 0 &&
          h > 0
        ) {
          merged.aspect_ratio ??= nearestAspectRatio(w, h);
          merged.resolution ??= nanoResolutionTier(w * h);
        }
      }

      try {
        const result = await queue.submit(input.endpoint, {
          input: merged,
        });

        if (!result || typeof result.request_id !== "string") {
          throw new ProviderError(
            "Provider response missing request_id",
            "submit_malformed"
          );
        }

        return {
          requestId: result.request_id,
          statusUrl: result.status_url,
        };
      } catch (error) {
        if (error instanceof ProviderError) throw error;
        const message =
          error instanceof Error ? error.message : "Provider submit failed";
        throw new ProviderError(message, "submit_failed", error);
      }
    },

    async status(
      endpoint: string,
      requestId: string
    ): Promise<ProviderStatusResult> {
      assertAllowedEndpoint(endpoint);

      try {
        const statusResult = await queue.status(endpoint, { requestId });
        const logs = (statusResult as { logs?: unknown[] }).logs;

        const status = normalizeStatus(statusResult.status);

        // fal reports provider-side failures as COMPLETED + error fields.
        if (
          status === "completed" &&
          (statusResult as { error?: unknown }).error
        ) {
          return { status: "failed", logs };
        }

        if (status !== "completed") {
          return { status, logs };
        }

        let result: { data: unknown };
        try {
          result = await queue.result(endpoint, { requestId });
        } catch (resultError) {
          // A 4xx on the result fetch means the stored response can never be
          // retrieved (e.g. the request's input was invalid for the endpoint).
          // That is terminal — return 'failed' so the run refunds instead of
          // retrying 'unknown' forever.
          const statusCode = (resultError as { status?: number }).status;
          if (
            typeof statusCode === "number" &&
            statusCode >= 400 &&
            statusCode < 500
          ) {
            console.error(
              "[fal status] result fetch rejected",
              statusCode,
              resultError instanceof Error
                ? resultError.message
                : String(resultError)
            );
            return { status: "failed", logs };
          }
          throw resultError;
        }
        const imageUrl = parseFalImageUrl(result.data);

        if (!imageUrl) {
          return {
            status: "failed",
            logs,
          };
        }

        const computeSeconds =
          (statusResult as unknown as { metrics?: { inference_time?: number | null } }).metrics
            ?.inference_time ?? undefined;

        return { status: "completed", imageUrl, logs, computeSeconds };
      } catch (error) {
        // Network/transient errors remain retryable; do not leak provider text
        // and do not trigger an immediate refund.
        console.error(
          "[fal status] provider status call failed",
          error instanceof Error ? error.message : String(error)
        );
        return { status: "unknown" };
      }
    },

    async downloadImage(
      url: string,
      options: { maxBytes?: number; timeoutMs?: number } = {}
    ): Promise<ProviderImageDownload> {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new ProviderError("Invalid image URL", "download_invalid_url");
      }

      if (!isAllowedImageHost(parsed)) {
        throw new ProviderError(
          "Untrusted image host",
          "download_untrusted_host"
        );
      }

      const maxBytes = options.maxBytes ?? MAX_DOWNLOAD_BYTES;
      const timeoutMs = options.timeoutMs ?? DOWNLOAD_TIMEOUT_MS;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const head = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
        });
        if (!head.ok) {
          throw new ProviderError(
            `Provider image unavailable: ${head.status}`,
            "download_head_failed"
          );
        }

        const contentType = head.headers.get("content-type") ?? "";
        if (!contentType.startsWith("image/")) {
          throw new ProviderError(
            `Unexpected content type: ${contentType}`,
            "download_content_type"
          );
        }

        const contentLength = head.headers.get("content-length");
        if (contentLength) {
          const length = Number(contentLength);
          if (!Number.isFinite(length) || length > maxBytes) {
            throw new ProviderError(
              "Provider image exceeds maximum size",
              "download_too_large"
            );
          }
        }

        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new ProviderError(
            `Provider image download failed: ${response.status}`,
            "download_failed"
          );
        }

        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > maxBytes) {
          throw new ProviderError(
            "Provider image exceeds maximum size",
            "download_too_large"
          );
        }

        return {
          buffer,
          contentType,
          size: buffer.byteLength,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
