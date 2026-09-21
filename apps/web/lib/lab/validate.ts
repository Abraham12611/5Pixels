import type { OutputSizeOption } from "@/types/catalog";

const ENDPOINT_PATTERN = /^[a-z0-9][a-z0-9\-_/.]+$/i;
const MAX_OUTPUT_PIXELS = 4_000_000;

/** Provider endpoint ids look like "fal-ai/flux/dev/image-to-image". */
export function isValidLabEndpoint(endpointId: unknown): boolean {
  return (
    typeof endpointId === "string" && ENDPOINT_PATTERN.test(endpointId)
  );
}

/** Lab output sizes must be positive and stay under the provider cap. */
export function isValidLabOutputSize(size: unknown): size is OutputSizeOption {
  if (!size || typeof size !== "object") return false;
  const { width, height } = size as { width?: unknown; height?: unknown };
  return (
    typeof width === "number" &&
    typeof height === "number" &&
    width > 0 &&
    height > 0 &&
    width * height <= MAX_OUTPUT_PIXELS
  );
}
