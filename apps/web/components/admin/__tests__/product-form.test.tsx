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
  standalone_discoverable: false,
  variant_sort_order: 0,
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
    input_capability: {
      input_mode: "single" as const,
      input_min_images: 1,
      input_max_images: 1,
      input_image_roles: [],
      prompt_override_enabled: false,
      prompt_max_chars: 0,
    },
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

describe("ProductForm — Preset Studio 2.0 defaults (#177)", () => {
  const parents = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      slug: "chrome-portrait",
      name: "Chrome Portrait",
      public_status: "published",
    },
  ];

  it("defaults to standalone, single-image, prompt edits OFF", async () => {
    render(
      <ProductForm
        type="filter"
        categories={[]}
        modelCatalog={[]}
        eligibleParents={parents}
        initialData={BASE_DATA}
        onSubmit={vi.fn()}
      />
    );

    // Family: standalone selected; no parent-picker UI.
    expect(
      screen.getByRole("radio", { name: /standalone preset/i })
    ).toBeChecked();
    expect(
      screen.queryByLabelText(/variant display name/i)
    ).not.toBeInTheDocument();

    // Images: single mode → no min/max/roles controls.
    expect(
      screen.queryByLabelText(/min images/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/declared input roles/i)).not.toBeInTheDocument();

    // Prompt: the enable switch exists but is OFF and hides its config.
    const promptToggle = screen.getByRole("checkbox", {
      name: /allow custom prompt edits/i,
    });
    expect(promptToggle).not.toBeChecked();
    expect(
      screen.queryByLabelText(/max characters/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/placeholder text/i)
    ).not.toBeInTheDocument();
  });

  it("reveals variant controls when family mode switches to variant", async () => {
    render(
      <ProductForm
        type="filter"
        categories={[]}
        modelCatalog={[]}
        eligibleParents={parents}
        initialData={BASE_DATA}
        onSubmit={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("radio", { name: /variant of a root preset/i })
    );

    await waitFor(() =>
      expect(
        screen.getByLabelText(/variant display name/i)
      ).toBeInTheDocument()
    );
    expect(
      screen.getByRole("checkbox", {
        name: /also show this variant independently in explore/i,
      })
    ).toBeInTheDocument();
    // The first eligible parent is auto-selected.
    expect(screen.getByText(/Chrome Portrait/)).toBeInTheDocument();
  });

  it("reveals prompt configuration when the enable switch turns on", async () => {
    render(
      <ProductForm
        type="filter"
        categories={[]}
        modelCatalog={[]}
        eligibleParents={parents}
        initialData={BASE_DATA}
        onSubmit={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("checkbox", { name: /allow custom prompt edits/i })
    );

    await waitFor(() =>
      expect(screen.getByLabelText(/max characters/i)).toBeInTheDocument()
    );
    expect(screen.getByLabelText(/placeholder text/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/allowed scope/i)
    ).toBeInTheDocument();
  });
});
