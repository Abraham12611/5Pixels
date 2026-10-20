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
    // #223: no parent is auto-assigned — the select stays on its placeholder
    // and the form warns that an unchosen parent saves as standalone.
    // (Explicit parent selection is exercised in preset-family-fields.test.)
    expect(screen.queryByText(/Chrome Portrait/)).not.toBeInTheDocument();
    expect(screen.getByText(/No parent selected/)).toBeInTheDocument();
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

describe("ProductForm — dirty state after a successful save", () => {
  it("shows 'All changes saved' when zod-normalized output differs from raw values", async () => {
    // DB JSONB can carry keys the zod schema strips (model_config extras)
    // and omit keys the schema defaults (role.optional, prompt_ui.examples).
    // The save succeeds — but those raw↔normalized structural gaps are not
    // user edits, and must not masquerade as in-flight changes.
    const onSubmit = vi
      .fn()
      .mockResolvedValue({ id: "8d5cca85-0120-4e80-9487-e3ed8c66faac" });
    const dataWithRawJsonb = {
      ...BASE_DATA,
      id: "8d5cca85-0120-4e80-9487-e3ed8c66faac",
      prompt_ui: { placeholder: "Tweak the look" }, // no `examples` — schema defaults it
      version: {
        ...BASE_DATA.version,
        model_config: { width: 512, provider_specific_param: "euler" },
        input_validation_config: { min_width: 64, exotic_check: true },
        input_capability: {
          ...BASE_DATA.version.input_capability,
          input_image_roles: [{ name: "person" }], // missing `optional`
        },
      },
    } as unknown as typeof BASE_DATA & { id: string };

    render(
      <ProductForm
        type="filter"
        categories={[]}
        modelCatalog={[]}
        initialData={dataWithRawJsonb}
        onSubmit={onSubmit}
      />
    );

    // A genuine edit enables the dock button; the save must acknowledge it.
    fireEvent.change(screen.getByLabelText(/^name/i), {
      target: { value: "Renamed preset" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1), {
      timeout: 20000,
    });
    expect(await screen.findByText("All changes saved")).toBeInTheDocument();
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  }, 30_000);

  it("keeps genuine in-flight edits unsaved and visible after the save lands", async () => {
    let resolveSave: ((v: { id: string }) => void) | undefined;
    const onSubmit = vi.fn().mockImplementation(
      () =>
        new Promise<{ id: string }>((resolve) => {
          resolveSave = resolve;
        })
    );
    render(
      <ProductForm
        type="filter"
        categories={[]}
        modelCatalog={[]}
        initialData={{
          ...BASE_DATA,
          id: "8d5cca85-0120-4e80-9487-e3ed8c66faac",
        }}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/^name/i), {
      target: { value: "Saved name" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1), {
      timeout: 20000,
    });

    // Edit a different field while the save is still in flight.
    fireEvent.change(screen.getByLabelText(/short description/i), {
      target: { value: "Edited mid-flight" },
    });
    resolveSave?.({ id: "8d5cca85-0120-4e80-9487-e3ed8c66faac" });

    expect(await screen.findByText("Unsaved changes")).toBeInTheDocument();
    // The mid-flight edit is preserved, not reverted by the reset.
    expect(screen.getByLabelText(/short description/i)).toHaveValue(
      "Edited mid-flight"
    );
    // The submitted edit is part of the new clean baseline.
    expect(screen.getByLabelText(/^name/i)).toHaveValue("Saved name");
  }, 30_000);
});

describe("ProductForm — incomplete-preset save handling (#233)", () => {
  it("shows a structured { error } result and preserves unsaved edits", async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValue({
        error:
          "This preset has no saved version — it can't be saved until the " +
          "underlying record is repaired or the preset is replaced. Your " +
          "edits are preserved below.",
      });
    render(
      <ProductForm
        type="filter"
        categories={[]}
        modelCatalog={[]}
        initialData={{ ...BASE_DATA, id: "8d5cca85-0120-4e80-9487-e3ed8c66faac" }}
        onSubmit={onSubmit}
      />
    );

    const nameInput = screen.getByLabelText(/^name/i);
    fireEvent.change(nameInput, { target: { value: "Edited name" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1), {
      timeout: 20000,
    });
    // Rendered in the inline alert and the save-dock detail line.
    expect(
      (await screen.findAllByText(/no saved version/i)).length
    ).toBeGreaterThan(0);
    // Unsaved values survive — the form is never reset on failure.
    expect(screen.getByLabelText(/^name/i)).toHaveValue("Edited name");
  }, 30_000);

  it("disables save entirely when saveDisabledReason is set", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ id: "prod-1" });
    render(
      <ProductForm
        type="filter"
        categories={[]}
        modelCatalog={[]}
        initialData={{ ...BASE_DATA, id: "8d5cca85-0120-4e80-9487-e3ed8c66faac" }}
        saveDisabledReason="This preset has no saved version — it must be repaired or replaced."
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByText(/cannot save/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/no saved version — it must be repaired or replaced/i)
        .length
    ).toBeGreaterThan(0);

    // Even dirty, the submit control stays disabled.
    fireEvent.change(screen.getByLabelText(/^name/i), {
      target: { value: "Still cannot save" },
    });
    const button = screen.getByRole("button", { name: /save changes/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    await new Promise((r) => setTimeout(r, 300));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("surfaces a thrown failure as a safe message without resetting the form", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new Error("An error occurred in the Server Components render.")
      );
    render(
      <ProductForm
        type="filter"
        categories={[]}
        modelCatalog={[]}
        initialData={{ ...BASE_DATA, id: "8d5cca85-0120-4e80-9487-e3ed8c66faac" }}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/^name/i), {
      target: { value: "Kept despite failure" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1), {
      timeout: 20000,
    });
    expect(
      (await screen.findAllByText(/server components render/i)).length
    ).toBeGreaterThan(0);
    expect(screen.getByLabelText(/^name/i)).toHaveValue(
      "Kept despite failure"
    );
  }, 30_000);
});
