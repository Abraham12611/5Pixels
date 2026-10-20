import { describe, expect, it, beforeAll, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import type { ReactNode } from "react";
import { FieldEditor } from "../field-editor";
import { VersionList, type VersionSummary } from "../version-list";
import { FamilyPanel } from "../family-panel";
import {
  ReferenceAssetManager,
  type ReferenceAsset,
} from "../reference-asset-manager";
import { PosterCompositionEditor } from "../poster-composition-editor";
import { PromptEditFields, UserImageInputFields } from "../preset-studio-fields";
import { Dialog } from "@/components/ui/dialog";
import { RichSelect } from "@/components/ui/rich-select";

/**
 * Narrow-viewport regression coverage (#230). jsdom cannot measure real
 * layout, so these tests pin the responsive guards that keep each row from
 * forcing horizontal document scroll at 320px: `flex-wrap` on headers and
 * action rows, `min-w-0`/`wrap-anywhere` on text that can run long, and
 * viewport width caps on dialogs and dropdown panels. Browser acceptance
 * (scrollWidth <= innerWidth on real routes) is the owner's checklist.
 */

beforeAll(() => {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  HTMLElement.prototype.scrollIntoView ??= () => {};
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function Form({
  children,
  defaults,
}: {
  children: ReactNode;
  defaults?: Record<string, unknown>;
}) {
  const methods = useForm({ defaultValues: defaults ?? { fields: [] } });
  return (
    <FormProvider {...methods}>
      <form>{children}</form>
    </FormProvider>
  );
}

/** Asserts every named class is present on the element. */
function expectClasses(el: Element, classes: string[]) {
  for (const c of classes) expect(el.classList.contains(c)).toBe(true);
}

describe("editor mobile layout guards (#230)", () => {
  it("FieldEditor header, undo banner, and control row header wrap", () => {
    render(
      <Form>
        <FieldEditor />
      </Form>
    );
    const header = screen.getByText("User controls").parentElement!;
    expectClasses(header, ["flex-wrap"]);

    // Undo banner: long labels must not push Undo/Dismiss off-screen.
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    fireEvent.change(screen.getByLabelText("Label"), {
      target: {
        value:
          "An extremely long control label that will not fit one narrow row",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    const undoBanner = screen.getByRole("status");
    expectClasses(undoBanner, ["flex-wrap"]);
    expectClasses(undoBanner.firstElementChild!, ["min-w-0", "break-words"]);

    // Control row header: "Control n of m" + reorder/remove actions.
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    const rowHeader = screen.getByText(/Control 1 of 1/).parentElement!;
    expectClasses(rowHeader, ["flex-wrap"]);
  });

  it("VersionList header wraps", () => {
    const versions: VersionSummary[] = [
      {
        id: "v1",
        version_number: 1,
        state: "draft",
        published_at: null,
        credit_cost: 2,
        provider_strategy: {
          primary_provider: "fal.ai",
          primary_model: "flux-pro",
        },
        private_instruction_template: "x",
        private_negative_instruction: null,
        model_config: {},
        input_validation_config: {},
        post_process_config: {},
        safety_config: {},
      },
    ];
    render(
      <VersionList versions={versions} selectedVersionId={undefined} />
    );
    expectClasses(
      screen.getByText("Versions").parentElement!,
      ["flex-wrap"]
    );
  });

  it("FamilyPanel header and member rows wrap", () => {
    const root = {
      id: "root",
      name: "Root preset",
      slug: "root-preset",
      public_status: "active",
      parent_preset_id: null,
      standalone_discoverable: false,
      variant_display_name: null,
      variant_sort_order: 0,
      hero_asset_id: null,
    };
    const child = {
      ...root,
      id: "child",
      name: "A variant with a very long display name that should wrap",
      slug: "child-variant",
      parent_preset_id: "root",
      variant_display_name: "Child variant",
    };
    render(
      <FamilyPanel
        currentProductId="root"
        type="filter"
        root={root}
        children_={[child]}
        reorder={vi.fn()}
        createVariant={vi.fn()}
        updateVariant={vi.fn()}
      />
    );
    expectClasses(
      screen.getByText("Preset family").parentElement!,
      ["flex-wrap"]
    );
    const memberRow = screen.getByText("Child variant").closest("li")!;
    expectClasses(memberRow, ["flex-wrap"]);
  });

  it("ReferenceAssetManager asset rows wrap so Remove stays reachable", () => {
    const assets: ReferenceAsset[] = [
      {
        id: "pa-1",
        role: "style_reference",
        asset_id: "asset-1",
        sort_order: 0,
        internal_only: true,
      },
    ];
    render(
      <ReferenceAssetManager
        productId="prod-1"
        initialAssets={assets}
        onAttach={vi.fn()}
        onDetach={vi.fn()}
      />
    );
    const remove = screen.getByRole("button", { name: "Remove" });
    expectClasses(remove.parentElement!, ["flex-wrap"]);
  });

  it("PosterCompositionEditor text-fields header and row titles wrap", () => {
    render(
      <Form
        defaults={{
          type: "poster",
          fields: [],
          poster_config: {
            layout_template: "portrait",
            text_fields: [
              {
                key: "headline_with_an_extremely_long_key_name",
                label: "Headline",
                required: false,
                default_value: "",
              },
            ],
            text_layer_config: {
              position: "bottom",
              size: "medium",
              color: "#F7F2E8",
              alignment: "center",
            },
            background_handling: "replace",
          },
        }}
      >
        <PosterCompositionEditor />
      </Form>
    );
    expectClasses(
      screen.getByText("Text fields").parentElement!,
      ["flex-wrap"]
    );
    const title = screen.getByText(
      "headline_with_an_extremely_long_key_name",
      { selector: "p" }
    );
    expectClasses(title, ["wrap-anywhere", "min-w-0"]);
    expectClasses(title.parentElement!, ["flex-wrap"]);
  });

  it("PresetStudioFields role and example rows keep inputs shrinkable and wrappable", () => {
    render(
      <Form
        defaults={{
          version: {
            input_capability: {
              input_mode: "multi",
              input_min_images: 1,
              input_max_images: 3,
              input_image_roles: [
                { name: "subject", optional: false },
                { name: "style_reference", optional: true },
              ],
              prompt_override_enabled: true,
              prompt_max_chars: 200,
            },
          },
          prompt_ui: { examples: ["Make it moody"] },
        }}
      >
        <UserImageInputFields />
        <PromptEditFields />
      </Form>
    );

    // Declared input roles: index + input + Optional + Remove must be able
    // to wrap; the input needs min-w-0/flex-1 to shrink below intrinsic size.
    const roleInput = screen.getAllByPlaceholderText("role_name")[0]!;
    expectClasses(roleInput, ["min-w-0", "flex-1"]);
    expectClasses(roleInput.parentElement!, ["flex-wrap"]);
    expectClasses(
      screen.getByText("Declared input roles").parentElement!,
      ["flex-wrap"]
    );

    const exampleInput = screen.getByPlaceholderText("Example 1");
    expectClasses(exampleInput, ["min-w-0", "flex-1"]);
    expectClasses(exampleInput.parentElement!, ["flex-wrap"]);
    expectClasses(
      screen.getByText("Example prompts").parentElement!,
      ["flex-wrap"]
    );
  });

  it("Dialog panel is capped to the viewport", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <p>content</p>
      </Dialog>
    );
    const panel = screen.getByRole("dialog");
    expectClasses(panel, ["max-w-full"]);
    // Height cap + scroll for tall dialogs on short viewports.
    expect(panel.className).toContain("max-h-[calc(100dvh-2rem)]");
    expectClasses(panel, ["overflow-y-auto"]);
  });

  it("RichSelect panel cannot exceed the viewport", () => {
    render(
      <RichSelect
        aria-label="Pick"
        value=""
        onValueChange={() => {}}
        options={[{ value: "a", label: "Alpha" }]}
        panelClassName="min-w-72"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Pick" }));
    const listbox = screen.getByRole("listbox");
    expect(listbox.parentElement?.className ?? "").toContain(
      "max-w-[calc(100vw-1.5rem)]"
    );
  });
});
