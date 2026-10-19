import { describe, expect, it, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import type { ReactNode } from "react";
import {
  PresetFamilyFields,
  type EligibleParentOption,
} from "../preset-studio-fields";

beforeAll(() => {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  HTMLElement.prototype.scrollIntoView ??= () => {};
});

const PARENTS: EligibleParentOption[] = [
  { id: "root-a", slug: "root-a", name: "Root A", public_status: "active" },
  { id: "root-b", slug: "root-b", name: "Root B", public_status: "draft" },
];

function ParentProbe() {
  const { control } = useFormContext();
  const value = useWatch({ control, name: "parent_preset_id" });
  return <output data-testid="parent-id">{String(value ?? "")}</output>;
}

function Form({
  children,
  defaults,
}: {
  children: ReactNode;
  defaults?: Record<string, unknown>;
}) {
  const methods = useForm({
    defaultValues: {
      type: "filter",
      parent_preset_id: null,
      standalone_discoverable: false,
      variant_display_name: null,
      variant_sort_order: 0,
      ...defaults,
    },
  });
  return (
    <FormProvider {...methods}>
      <form>
        {children}
        <ParentProbe />
      </form>
    </FormProvider>
  );
}

describe("PresetFamilyFields", () => {
  it("does not auto-assign a parent when entering variant mode", () => {
    render(
      <Form>
        <PresetFamilyFields eligibleParents={PARENTS} />
      </Form>
    );

    fireEvent.click(
      screen.getByRole("radio", { name: "Variant of a root preset" })
    );

    // The variant fields appear, but parent_preset_id stays unset and a
    // deliberate choice is demanded.
    expect(screen.getByTestId("parent-id").textContent).toBe("");
    expect(screen.getByText(/No parent selected/)).toBeTruthy();
  });

  it("switches back to standalone cleanly", () => {
    render(
      <Form defaults={{ parent_preset_id: "root-a" }}>
        <PresetFamilyFields eligibleParents={PARENTS} />
      </Form>
    );
    expect(screen.getByTestId("parent-id").textContent).toBe("root-a");

    fireEvent.click(screen.getByRole("radio", { name: "Standalone preset" }));
    expect(screen.getByTestId("parent-id").textContent).toBe("");
  });

  it("lets the admin choose a parent explicitly", () => {
    render(
      <Form>
        <PresetFamilyFields eligibleParents={PARENTS} />
      </Form>
    );
    fireEvent.click(
      screen.getByRole("radio", { name: "Variant of a root preset" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Parent preset" }));
    fireEvent.click(screen.getByRole("option", { name: /Root B/ }));
    expect(screen.getByTestId("parent-id").textContent).toBe("root-b");
  });

  it("disables variant mode and points to creating a root when none are eligible", () => {
    render(
      <Form>
        <PresetFamilyFields eligibleParents={[]} />
      </Form>
    );
    expect(
      screen.getByRole("radio", { name: "Variant of a root preset" })
    ).toHaveProperty("disabled", true);
    expect(
      screen
        .getByRole("link", { name: "create a root preset" })
        .getAttribute("href")
    ).toBe("/admin/filters/new");
  });

  it("keeps variant mode disabled for a preset that already has variants", () => {
    render(
      <Form>
        <PresetFamilyFields eligibleParents={PARENTS} hasChildren />
      </Form>
    );
    expect(
      screen.getByRole("radio", { name: "Variant of a root preset" })
    ).toHaveProperty("disabled", true);
  });

  it("explains the impact when the existing parent is changed", () => {
    render(
      <Form defaults={{ parent_preset_id: "root-a" }}>
        <PresetFamilyFields
          eligibleParents={PARENTS}
          currentParent={{
            id: "root-a",
            type: "filter",
            public_status: "active",
            parent_preset_id: null,
          }}
        />
      </Form>
    );
    fireEvent.click(screen.getByRole("button", { name: "Parent preset" }));
    fireEvent.click(screen.getByRole("option", { name: /Root B/ }));
    expect(
      screen.getByText(/moves this variant into a different family/)
    ).toBeTruthy();
  });
});
