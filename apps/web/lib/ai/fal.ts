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
        image_url: input.sourceImageUrl,
        prompt: input.prompt,
      };

      if (input.negativePrompt) {
        body.negative_prompt = input.negativePrompt;
      }

      const merged = { ...input.modelConfig, ...body };

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

        if (status !== "completed") {
          return { status, logs };
        }

        const result = await queue.result(endpoint, { requestId });
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
