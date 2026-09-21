import { describe, expect, it, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProductForm } from "../product-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

beforeAll(() => {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  HTMLElement.prototype.scrollIntoView ??= () => {};
});

const BASE_DATA = {
  type: "filter" as const,
  name: "Chrome Portrait",
  slug: "chrome-portrait",
  public_status: "draft" as const,
  visibility: "public" as const,
  credit_cost: 2,
  version: {
    version_number: 1,
    state: "draft" as const,
    private_instruction_template: "Turn this photo into chrome editorial art.",
    provider_strategy: {
      primary_provider: "fal.ai",
      primary_model: "flux-pro", // legacy value — exercises manual-entry mode
    },
    model_config: {},
    output_sizes: [],
    input_validation_config: {},
    post_process_config: {
      crop: false,
      format: "webp" as const,
      quality: 90,
      metadata_stripped: true,
    },
    safety_config: {
      allowed_nsfw: false,
      block_public_figures: true,
      block_minors: true,
    },
    credit_cost: 2,
  },
  fields: [],
  filter_config: {
    style_archetype: "liquid_chrome_editorial",
    identity_preservation: "very_high" as const,
  },
};

describe("ProductForm", () => {
  it(
    "submits with optional number fields left blank (no NaN poisoning)",
    async () => {
      const onSubmit = vi.fn().mockResolvedValue({ id: "prod-1" });
      render(
        <ProductForm
          type="filter"
          categories={[]}
          modelCatalog={[]}
          initialData={BASE_DATA}
          onSubmit={onSubmit}
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: /create filter/i })
      );

      await waitFor(
        () => expect(onSubmit).toHaveBeenCalledTimes(1),
        { timeout: 20000 }
      );

      const data = onSubmit.mock.calls[0][0];
      // Blank optional numbers must come through as undefined, not NaN.
      expect(data.version.model_config.width).toBeUndefined();
      expect(data.version.model_config.guidance_scale).toBeUndefined();
      expect(data.version.input_validation_config.min_width).toBeUndefined();
      expect(data.version.credit_cost).toBe(2);
    },
    30_000
  );
});
