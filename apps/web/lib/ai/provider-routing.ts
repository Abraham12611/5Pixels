import { ProviderError } from "./adapter";

export interface ProviderStrategy {
  primary_provider: string;
  primary_model?: string;
  fallback_provider?: string;
  fallback_model?: string;
}

/**
 * Resolve a provider + model pair to a concrete provider endpoint.
 *
 * The resolution rules are intentionally simple for V1:
 * - If the model already starts with a provider prefix (e.g. "fal-ai/"),
 *   use it directly.
 * - If the provider is "fal.ai" and the model is "flux-pro", map to the
 *   known image-to-image endpoint.
 * - Otherwise, construct `provider-prefix/model`.
 */
export function resolveEndpoint(provider: string, model: string): string | null {
  if (!provider || !model) return null;
  // Normalize provider name: "fal.ai" and "fal-ai" are both accepted.
  const normalizedProvider = provider.replace(".", "-");
  if (normalizedProvider === "fal-ai" && model === "flux-pro") {
    return "fal-ai/flux/dev/image-to-image";
  }
  if (model.startsWith("fal-ai/")) {
    return model;
  }
  if (normalizedProvider === "fal-ai" && model.length > 0) {
    return `fal-ai/${model}`;
  }
  return null;
}

export function getProviderEndpoint(
  strategy: ProviderStrategy
): string | null {
  return resolveEndpoint(
    strategy.primary_provider,
    strategy.primary_model ?? ""
  );
}

export function getFallbackEndpoint(
  strategy: ProviderStrategy
): string | null {
  if (!strategy.fallback_provider || !strategy.fallback_model) {
    return null;
  }
  return resolveEndpoint(
    strategy.fallback_provider,
    strategy.fallback_model
  );
}

/**
 * Determine whether a provider submit error is transient enough to
 * warrant a fallback attempt.
 *
 * Only network-level submit failures are retryable. Configuration,
 * validation, and endpoint errors are not.
 */
export function isRetryableSubmitError(error: unknown): boolean {
  if (error instanceof ProviderError) {
    return error.stage === "submit_failed";
  }
  return true;
}
