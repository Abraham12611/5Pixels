export interface ProviderSubmitInput {
  endpoint: string;
  prompt: string;
  negativePrompt?: string;
  /**
   * Ordered user-supplied input images — ordinal-1 first. Every URL here is
   * a user photo that MUST be transmitted in its declared slot; callers are
   * responsible for checking the endpoint's input budget (see
   * `checkRouteInputBudget`) so no requested image is silently dropped.
   */
  inputImageUrls?: string[];
  /**
   * @deprecated Single-image alias for `inputImageUrls[0]` — kept for the
   * legacy callers (admin lab, pre-#179 flows). New code passes
   * `inputImageUrls`.
   */
  sourceImageUrl?: string;
  /** Private preset reference images — style/composition/layout guides the
   *  model should adapt the source photo toward. Transmitted AFTER the user
   *  inputs and counted against the endpoint's total input budget. */
  referenceImageUrls?: string[];
  options?: Record<string, unknown>;
  modelConfig?: Record<string, unknown>;
}

export interface ProviderSubmitResult {
  requestId: string;
  statusUrl?: string;
}

export type ProviderJobStatus =
  "queued" | "in_progress" | "completed" | "failed" | "cancelled" | "unknown";

export interface ProviderStatusResult {
  status: ProviderJobStatus;
  imageUrl?: string;
  logs?: unknown[];
  computeSeconds?: number;
  error?: string;
}

export interface ProviderImageDownload {
  buffer: ArrayBuffer;
  contentType: string;
  size: number;
}

export interface ImageProviderAdapter {
  readonly name: string;
  submit(input: ProviderSubmitInput): Promise<ProviderSubmitResult>;
  status(endpoint: string, requestId: string): Promise<ProviderStatusResult>;
  downloadImage(
    url: string,
    options?: { maxBytes?: number; timeoutMs?: number }
  ): Promise<ProviderImageDownload>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly stage: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
