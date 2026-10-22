import { describe, expect, it, vi, beforeAll } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { useFormContext, type UseFormReturn } from "react-hook-form";
import { ProductForm } from "../product-form";
import { PublishButton } from "../publish-button";
import { PublishingSection } from "../publishing-section";
import { FamilyPanel } from "../family-panel";
import { UnsavedChangesGuard } from "../unsaved-changes-guard";
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

describe("admin publishing and family copy explanations (#238)", () => {
  it("explains an active catalog product with no published recipe version", () => {
    render(
      <ProductForm
        type="filter"
        categories={[]}
        modelCatalog={[]}
        initialData={{ ...BASE_DATA, id: "prod-1" }}
        onSubmit={vi.fn()}
      >
        <PublishingSection
          productId="prod-1"
          status="active"
          versionId="draft-version-1"
          isOwner
          gateFailures={[]}
          rollbackVersions={[]}
          versionSummaries={[]}
          publish={vi.fn()}
          rollback={vi.fn()}
          transitionStatus={vi.fn()}
        />
      </ProductForm>
    );
    expect(
      screen.getByText(/marked Active in the catalog, but it has no published recipe version/)
    ).toBeInTheDocument();
  });

  it("explains which source version New variant copies", () => {
    render(
      <FamilyPanel
        currentProductId="root-1"
        type="filter"
        root={{
          id: "root-1",
          name: "Retro Slam Manga",
          slug: "retro-slam-manga",
          public_status: "active",
          parent_preset_id: null,
          standalone_discoverable: true,
          variant_display_name: null,
          variant_sort_order: 0,
          hero_asset_id: null,
        }}
        children_={[]}
        reorder={vi.fn()}
        createVariant={vi.fn()}
        updateVariant={vi.fn()}
      />
    );
    expect(screen.getByText(/newest editable draft first/i)).toBeInTheDocument();
    expect(screen.getByText(/may differ from the currently published recipe/i)).toBeInTheDocument();
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

  it("keeps edits made during an in-flight save dirty and intact", async () => {
    pushMock.mockClear();
    refreshMock.mockClear();
    let resolveSave: (value: { id: string }) => void = () => {};
    const onSubmit = vi.fn(
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
          id: "00000000-0000-4000-8000-000000000001",
        }}
        onSubmit={onSubmit}
      />
    );

    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "Saved name" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    // Full-schema validation is slow in jsdom — use the repo's convention.
    await waitFor(() => expect(onSubmit).toHaveBeenCalled(), {
      timeout: 20000,
    });

    // The save request is still in flight — this edit is NOT part of it.
    fireEvent.change(nameInput, {
      target: { value: "Edited during save" },
    });

    await act(async () => {
      resolveSave({ id: "00000000-0000-4000-8000-000000000001" });
    });

    // The in-flight edit survives the rebase and stays unsaved — it must be
    // neither reverted to the submitted value nor folded into the clean
    // baseline as if it had been saved. Navigating or refreshing here would
    // discard it, so neither must fire.
    await waitFor(() =>
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
    );
    expect(nameInput).toHaveValue("Edited during save");
    expect(
      screen.queryByText(/all changes saved/i)
    ).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  }, 30_000);

  it("navigates to the saved product once the form is fully clean", async () => {
    const PRODUCT_ID = "00000000-0000-4000-8000-000000000003";
    pushMock.mockClear();
    refreshMock.mockClear();
    const onSubmit = vi.fn().mockResolvedValue({ id: PRODUCT_ID });
    render(
      <ProductForm
        type="filter"
        categories={[]}
        modelCatalog={[]}
        initialData={{ ...BASE_DATA, id: PRODUCT_ID }}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Saved name" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled(), {
      timeout: 20000,
    });

    await waitFor(
      () => expect(pushMock).toHaveBeenCalledWith(`/admin/filters/${PRODUCT_ID}`),
      { timeout: 20000 }
    );
    expect(refreshMock).toHaveBeenCalled();
    expect(screen.getByText(/all changes saved/i)).toBeInTheDocument();
  }, 30_000);

  it("stays mounted after a create save with in-flight edits, then updates instead of duplicating", async () => {
    const CREATED_ID = "00000000-0000-4000-8000-000000000002";
    pushMock.mockClear();
    refreshMock.mockClear();
    let resolveSave: (value: { id: string }) => void = () => {};
    const onSubmit = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<{ id: string }>((resolve) => {
            resolveSave = resolve;
          })
      )
      .mockResolvedValue({ id: CREATED_ID });
    // No id → create mode.
    render(
      <ProductForm
        type="filter"
        categories={[]}
        modelCatalog={[]}
        initialData={BASE_DATA}
        onSubmit={onSubmit}
      />
    );

    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "Saved name" } });
    fireEvent.click(screen.getByRole("button", { name: /create filter/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled(), {
      timeout: 20000,
    });

    // Edit while the create request is still in flight.
    fireEvent.change(nameInput, {
      target: { value: "Edited during create" },
    });
    await act(async () => {
      resolveSave({ id: CREATED_ID });
    });

    // The form stays put — navigating to the new product now would drop
    // the in-flight edit.
    await waitFor(() =>
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
    );
    expect(nameInput).toHaveValue("Edited during create");
    expect(pushMock).not.toHaveBeenCalled();

    // The next save must update the created product, not insert a second
    // one — the form now carries the server-assigned id.
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(
      () => expect(onSubmit).toHaveBeenCalledTimes(2),
      { timeout: 20000 }
    );
    expect(onSubmit.mock.calls[1][0].id).toBe(CREATED_ID);

    // Fully clean now — the deferred create → edit transition can happen.
    await waitFor(
      () =>
        expect(pushMock).toHaveBeenCalledWith(`/admin/filters/${CREATED_ID}`),
      { timeout: 20000 }
    );
  }, 30_000);

  it("keeps a mid-save revert-to-original dirty instead of discarding it", async () => {
    pushMock.mockClear();
    refreshMock.mockClear();
    let resolveSave: (value: { id: string }) => void = () => {};
    const onSubmit = vi.fn(
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
          id: "00000000-0000-4000-8000-000000000001",
        }}
        onSubmit={onSubmit}
      />
    );

    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "Saved name" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled(), {
      timeout: 20000,
    });

    // Revert to the original value while the request is in flight. Relative
    // to the old baseline this field reads as clean — the acknowledgement
    // must still treat it as a pending edit rather than resetting it to the
    // submitted value and navigating away.
    fireEvent.change(nameInput, { target: { value: BASE_DATA.name } });

    await act(async () => {
      resolveSave({ id: "00000000-0000-4000-8000-000000000001" });
    });

    await waitFor(() =>
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
    );
    expect(nameInput).toHaveValue(BASE_DATA.name);
    expect(
      screen.queryByText(/all changes saved/i)
    ).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  }, 30_000);

  it("preserves array removal and reordering made during an in-flight save", async () => {
    const PRODUCT_ID = "00000000-0000-4000-8000-000000000004";
    const SIZE_A = {
      name: "Square",
      width: 1024,
      height: 1024,
      is_default: true,
      match_source: false,
      match_reference: false,
    };
    const SIZE_B = {
      name: "Portrait",
      width: 832,
      height: 1216,
      is_default: false,
      match_source: false,
      match_reference: false,
    };
    const SIZE_C = {
      name: "Landscape",
      width: 1216,
      height: 832,
      is_default: false,
      match_source: false,
      match_reference: false,
    };
    pushMock.mockClear();
    refreshMock.mockClear();
    let resolveSave: (value: { id: string }) => void = () => {};
    const onSubmit = vi.fn(
      () =>
        new Promise<{ id: string }>((resolve) => {
          resolveSave = resolve;
        })
    );
    const probe: { current?: UseFormReturn } = {};
    render(
      <ProductForm
        type="filter"
        categories={[]}
        modelCatalog={[]}
        initialData={{
          ...BASE_DATA,
          id: PRODUCT_ID,
          version: {
            ...BASE_DATA.version,
            output_sizes: [SIZE_A, SIZE_B, SIZE_C],
          },
        }}
        onSubmit={onSubmit}
      >
        <FormContextProbe targetRef={probe} />
      </ProductForm>
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Saved name" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled(), {
      timeout: 20000,
    });

    // Remove an entry and reorder the rest while the request is in flight —
    // leaf-path dirty tracking can't represent either reliably.
    act(() => {
      probe.current?.setValue("version.output_sizes", [SIZE_C, SIZE_A]);
    });

    await act(async () => {
      resolveSave({ id: PRODUCT_ID });
    });

    // The live array wins wholesale: [C, A], not the submitted [A, B, C]
    // and not a corrupted index-wise merge of the two.
    await waitFor(() =>
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
    );
    expect(probe.current?.getValues("version.output_sizes")).toEqual([
      SIZE_C,
      SIZE_A,
    ]);
    expect(pushMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  }, 30_000);
});

function FormContextProbe({
  targetRef,
}: {
  targetRef: { current?: UseFormReturn };
}) {
  const methods = useFormContext();
  useEffect(() => {
    targetRef.current = methods;
  });
  return null;
}

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

describe("UnsavedChangesGuard history navigation (#222)", () => {
  const PREV_PATH = "/admin/filters";
  const EDITOR_PATH = "/admin/filters/prod-1";

  // Simulate arriving at the editor from the list page; the guard pushes
  // its own sentinel entry on mount, giving [prev, editor, sentinel].
  const seedHistory = () => {
    window.history.replaceState({}, "", PREV_PATH);
    window.history.pushState({}, "", EDITOR_PATH);
  };

  const pressBack = async () => {
    await act(async () => {
      window.history.back();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };

  it("Back → Stay keeps the user on the editor and re-arms", async () => {
    seedHistory();
    render(<UnsavedChangesGuard active />);

    await pressBack();
    await waitFor(() =>
      expect(screen.getByRole("dialog")).toHaveTextContent(
        /discard unsaved changes/i
      )
    );

    fireEvent.click(screen.getByRole("button", { name: /^stay$/i }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(window.location.pathname).toBe(EDITOR_PATH);
  });

  it("Back → Discard navigates to the previous page", async () => {
    seedHistory();
    render(<UnsavedChangesGuard active />);

    await pressBack();
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /discard changes/i })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() =>
      expect(window.location.pathname).toBe(PREV_PATH)
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("prompts again on a repeated Back attempt", async () => {
    seedHistory();
    render(<UnsavedChangesGuard active />);

    await pressBack();
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^stay$/i }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );

    await pressBack();
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(window.location.pathname).toBe(EDITOR_PATH);
  });

  it("does not disturb forward navigation after leaving", async () => {
    seedHistory();
    const { unmount } = render(<UnsavedChangesGuard active />);

    await pressBack();
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /discard changes/i })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await waitFor(() => expect(window.location.pathname).toBe(PREV_PATH));

    // Leaving the editor unmounts the guard; Forward must traverse freely.
    unmount();
    await act(async () => {
      window.history.forward();
    });
    // jsdom queues history traversals — allow several task turns.
    await waitFor(
      () => expect(window.location.pathname).toBe(EDITOR_PATH),
      { timeout: 5000 }
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
