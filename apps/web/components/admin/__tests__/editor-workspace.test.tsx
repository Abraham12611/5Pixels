import { describe, expect, it, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProductForm } from "../product-form";
import { PublishButton } from "../publish-button";
import {
  editorSectionForField,
  FORM_SECTIONS,
} from "../editor-shell";
import { flattenFormErrors } from "../form-error-summary";

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
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
      primary_model: "flux-pro",
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

describe("editorSectionForField", () => {
  it("maps field paths to their owning section", () => {
    expect(editorSectionForField("name")).toBe("overview");
    expect(editorSectionForField("parent_preset_id")).toBe("overview");
    expect(editorSectionForField("standalone_discoverable")).toBe("overview");
    expect(editorSectionForField("hero_asset_id")).toBe("media");
    expect(editorSectionForField("poster_config.layout_template")).toBe(
      "creative"
    );
    expect(
      editorSectionForField("version.provider_strategy.primary_model")
    ).toBe("ai-routing");
    expect(
      editorSectionForField("version.input_capability.input_mode")
    ).toBe("inputs");
    expect(editorSectionForField("fields.tone")).toBe("inputs");
    expect(editorSectionForField("fields.2.label")).toBe("inputs");
    expect(
      editorSectionForField("version.safety_config.block_minors")
    ).toBe("advanced");
    expect(
      editorSectionForField("version.post_process_config.quality")
    ).toBe("advanced");
    expect(editorSectionForField("version.state")).toBe("publishing");
    expect(editorSectionForField(undefined)).toBe("overview");
    expect(editorSectionForField("unknown_field")).toBe("overview");
  });
});

describe("flattenFormErrors", () => {
  it("flattens nested and field-array error trees into leaf paths", () => {
    const flat = flattenFormErrors({
      name: { type: "too_small", message: "Name is required" },
      version: {
        private_instruction_template: {
          type: "too_small",
          message: "Instructions are required",
        },
        safety_config: {
          block_minors: { type: "custom", message: "Must be a boolean" },
        },
      },
      fields: [
        undefined,
        { label: { type: "too_small", message: "Label required" } },
      ],
    } as never);
    expect(flat).toEqual([
      { path: "name", message: "Name is required" },
      {
        path: "version.private_instruction_template",
        message: "Instructions are required",
      },
      {
        path: "version.safety_config.block_minors",
        message: "Must be a boolean",
      },
      { path: "fields.1.label", message: "Label required" },
    ]);
  });
});

describe("ProductForm editor shell (#222)", () => {
  it("renders a section nav with anchored chips and no duplicate h1", () => {
    render(
      <ProductForm
        type="filter"
        categories={[]}
        modelCatalog={[]}
        initialData={BASE_DATA}
        onSubmit={vi.fn()}
      />
    );

    const nav = screen.getByRole("navigation", { name: /editor sections/i });
    expect(nav).toBeInTheDocument();
    for (const section of FORM_SECTIONS) {
      expect(
        screen.getByRole("link", { name: section.label })
      ).toHaveAttribute("href", `#${section.id}`);
    }
    // The form must not render its own h1 — the route page owns it.
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("shows 'Unsaved changes' in the save dock once the form is dirty", async () => {
    render(
      <ProductForm
        type="filter"
        categories={[]}
        modelCatalog={[]}
        initialData={{ ...BASE_DATA, id: "prod-1" }}
        onSubmit={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Chrome Portrait v2" },
    });

    await waitFor(() =>
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
    );
    expect(
      screen.getByRole("button", { name: /save changes/i })
    ).toBeEnabled();
  });

  it("surfaces an actionable error summary on invalid submit", async () => {
    render(
      <ProductForm
        type="filter"
        categories={[]}
        modelCatalog={[]}
        onSubmit={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /create filter/i }));

    await waitFor(
      () => expect(screen.getByRole("alert")).toBeInTheDocument(),
      { timeout: 20000 }
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      /issues? needs? attention before saving/i
    );
  }, 30_000);

  it("guards same-origin link navigation while dirty", async () => {
    render(
      <>
        <ProductForm
          type="filter"
          categories={[]}
          modelCatalog={[]}
          initialData={{ ...BASE_DATA, id: "prod-1" }}
          onSubmit={vi.fn()}
        />
        {/* A link outside the form, e.g. the global admin nav — a raw
            anchor exercises the same click path the guard intercepts. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/admin/filters">Back to filters</a>
      </>
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Edited" },
    });
    await waitFor(() =>
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("link", { name: /back to filters/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("dialog")
      ).toHaveTextContent(/discard unsaved changes/i)
    );
    expect(pushMock).not.toHaveBeenCalled();

    // Stay keeps edits and closes the dialog.
    fireEvent.click(screen.getByRole("button", { name: /^stay$/i }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(pushMock).not.toHaveBeenCalled();

    // Discard navigates.
    fireEvent.click(screen.getByRole("link", { name: /back to filters/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(
      screen.getByRole("button", { name: /discard changes/i })
    );
    expect(pushMock).toHaveBeenCalledWith("/admin/filters");
  });

  it("does not guard navigation once the form is clean", async () => {
    render(
      <>
        <ProductForm
          type="filter"
          categories={[]}
          modelCatalog={[]}
          initialData={{ ...BASE_DATA, id: "prod-1" }}
          onSubmit={vi.fn()}
        />
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/admin/filters">Back to filters</a>
      </>
    );

    fireEvent.click(screen.getByRole("link", { name: /back to filters/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("PublishButton readiness (#222)", () => {
  const failures = [
    {
      code: "MISSING_HERO_ASSET" as const,
      message: "A hero visual asset is required.",
      field: "hero_asset_id",
    },
    {
      code: "MISSING_PRIMARY_MODEL" as const,
      message: "Primary AI model is required.",
      field: "version.provider_strategy.primary_model",
    },
  ];

  it("shows publish blockers without needing to click a disabled button", () => {
    render(
      <PublishButton
        productId="p1"
        versionId="v1"
        isOwner={false}
        gateFailures={failures}
        action={vi.fn()}
      />
    );

    expect(
      screen.getByText(/requirements block publishing/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/hero visual asset is required/i)
    ).toBeInTheDocument();
    // Blockers link back to the owning sections.
    expect(
      screen.getByRole("link", { name: /media & preview/i })
    ).toHaveAttribute("href", "#media");
    expect(
      screen.getByRole("link", { name: /ai & routing/i })
    ).toHaveAttribute("href", "#ai-routing");
    // Non-owner stays disabled — but the reasons are already visible.
    expect(
      screen.getByRole("button", { name: /publish version/i })
    ).toBeDisabled();
  });

  it("guards against publishing unsaved changes", async () => {
    const action = vi.fn();
    render(
      <PublishButton
        productId="p1"
        versionId="v1"
        isOwner={true}
        gateFailures={[]}
        hasUnsavedChanges
        action={action}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /publish version/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/save first — publishing always uses/i)
      ).toBeInTheDocument()
    );
    expect(action).not.toHaveBeenCalled();
  });
});
