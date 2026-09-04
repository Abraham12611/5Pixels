export interface ProviderSubmitInput {
  endpoint: string;
  prompt: string;
  negativePrompt?: string;
  sourceImageUrl: string;
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
