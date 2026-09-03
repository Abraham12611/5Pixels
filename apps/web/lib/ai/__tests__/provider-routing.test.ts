import { describe, expect, it } from "vitest";
import { ProviderError } from "../adapter";
import {
  resolveEndpoint,
  getProviderEndpoint,
  getFallbackEndpoint,
  isRetryableSubmitError,
  type ProviderStrategy,
} from "../provider-routing";

describe("resolveEndpoint", () => {
  it("resolves fal.ai with flux-pro to the image-to-image endpoint", () => {
    expect(resolveEndpoint("fal.ai", "flux-pro")).toBe(
      "fal-ai/flux/dev/image-to-image"
    );
  });

  it("uses model directly when it already starts with fal-ai/", () => {
    expect(resolveEndpoint("fal.ai", "fal-ai/flux/dev/image-to-image")).toBe(
      "fal-ai/flux/dev/image-to-image"
    );
  });

  it("constructs fal-ai/model when provider is fal.ai", () => {
    expect(resolveEndpoint("fal.ai", "flux/dev/image-to-image")).toBe(
      "fal-ai/flux/dev/image-to-image"
    );
  });

  it("returns null when provider is empty", () => {
    expect(resolveEndpoint("", "some-model")).toBeNull();
  });

  it("returns null when model is empty", () => {
    expect(resolveEndpoint("fal.ai", "")).toBeNull();
  });

  it("returns null for unknown providers", () => {
    expect(resolveEndpoint("unknown-provider", "some-model")).toBeNull();
  });
});

describe("getProviderEndpoint", () => {
  it("resolves the primary endpoint", () => {
    const strategy: ProviderStrategy = {
      primary_provider: "fal.ai",
      primary_model: "flux/dev/image-to-image",
    };
    expect(getProviderEndpoint(strategy)).toBe(
      "fal-ai/flux/dev/image-to-image"
    );
  });

  it("returns null when primary provider is missing", () => {
    const strategy: ProviderStrategy = {
      primary_provider: "",
      primary_model: "flux",
    };
    expect(getProviderEndpoint(strategy)).toBeNull();
  });
});

describe("getFallbackEndpoint", () => {
  it("resolves the fallback endpoint when configured", () => {
    const strategy: ProviderStrategy = {
      primary_provider: "fal.ai",
      primary_model: "flux/dev/image-to-image",
      fallback_provider: "fal.ai",
      fallback_model: "flux-pro",
    };
    expect(getFallbackEndpoint(strategy)).toBe(
      "fal-ai/flux/dev/image-to-image"
    );
  });

  it("returns null when no fallback is configured", () => {
    const strategy: ProviderStrategy = {
      primary_provider: "fal.ai",
      primary_model: "flux/dev/image-to-image",
    };
    expect(getFallbackEndpoint(strategy)).toBeNull();
  });

  it("returns null when fallback provider is missing", () => {
    const strategy: ProviderStrategy = {
      primary_provider: "fal.ai",
      primary_model: "flux",
      fallback_provider: "",
      fallback_model: "flux-pro",
    };
    expect(getFallbackEndpoint(strategy)).toBeNull();
  });
});

describe("isRetryableSubmitError", () => {
  it("returns true for ProviderError with submit_failed stage", () => {
    const error = new ProviderError("Network error", "submit_failed");
    expect(isRetryableSubmitError(error)).toBe(true);
  });

  it("returns false for ProviderError with configuration stage", () => {
    const error = new ProviderError("Bad config", "configuration_missing");
    expect(isRetryableSubmitError(error)).toBe(false);
  });

  it("returns false for ProviderError with invalid_endpoint stage", () => {
    const error = new ProviderError("Bad endpoint", "invalid_endpoint");
    expect(isRetryableSubmitError(error)).toBe(false);
  });

  it("returns true for generic errors", () => {
    expect(isRetryableSubmitError(new Error("timeout"))).toBe(true);
    expect(isRetryableSubmitError("some string")).toBe(true);
  });
});
