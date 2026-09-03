import {
  ProviderError,
  type ImageProviderAdapter,
  type ProviderImageDownload,
  type ProviderStatusResult,
  type ProviderSubmitInput,
  type ProviderSubmitResult,
} from "./adapter";

export interface MockProviderScenario {
  /** If set, submit() will reject with this stage. */
  submitFailureStage?: string;
  /** If set, status() will return failed on the first call. */
  statusFailureError?: string;
  /** Number of status() calls before returning completed. */
  pendingStatusCalls?: number;
  /** If true, status() returns unknown (simulating a transient network issue). */
  unknownStatus?: boolean;
  /** Optional explicit result image URL override. */
  resultImageUrl?: string;
  /** Optional explicit downloaded image bytes. */
  resultImageBuffer?: ArrayBuffer;
  /** Content-Type for the downloaded image. */
  resultImageContentType?: string;
}

export function createMockProvider(
  scenario: MockProviderScenario = {}
): ImageProviderAdapter {
  let statusCallCount = 0;

  return {
    name: "mock",

    async submit(input: ProviderSubmitInput): Promise<ProviderSubmitResult> {
      if (
        !input.endpoint.startsWith("fal-ai/") &&
        !input.endpoint.startsWith("mock/")
      ) {
        throw new ProviderError("Invalid mock endpoint", "invalid_endpoint");
      }
      if (scenario.submitFailureStage) {
        throw new ProviderError(
          "Mock submit failure",
          scenario.submitFailureStage
        );
      }
      const requestId = crypto.randomUUID();
      return {
        requestId,
        statusUrl: `https://mock.fal.ai/status/${requestId}`,
      };
    },

    async status(
      _endpoint: string,
      requestId: string
    ): Promise<ProviderStatusResult> {
      if (scenario.statusFailureError) {
        return {
          status: "failed",
          error: scenario.statusFailureError,
        };
      }

      if (scenario.unknownStatus) {
        return { status: "unknown" };
      }

      statusCallCount += 1;
      const pending = scenario.pendingStatusCalls ?? 0;
      if (statusCallCount <= pending) {
        return { status: "in_progress" };
      }

      return {
        status: "completed",
        imageUrl:
          scenario.resultImageUrl ??
          `https://mock.fal.ai/result/${requestId}.png`,
      };
    },

    async downloadImage(url: string): Promise<ProviderImageDownload> {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new ProviderError("Invalid image URL", "download_invalid_url");
      }
      if (parsed.protocol !== "https:") {
        throw new ProviderError("Image URL must use HTTPS", "download_http");
      }
      if (scenario.resultImageBuffer) {
        return {
          buffer: scenario.resultImageBuffer,
          contentType: scenario.resultImageContentType ?? "image/png",
          size: scenario.resultImageBuffer.byteLength,
        };
      }
      return {
        buffer: new ArrayBuffer(0),
        contentType: "image/png",
        size: 0,
      };
    },
  };
}
