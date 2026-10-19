import { describe, expect, it, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productCreateSchema } from "@5pixels/shared";
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

function ParentErrorProbe() {
  const {
    formState: { errors },
  } = useFormContext();
  const message = (errors as { parent_preset_id?: { message?: string } })
    .parent_preset_id?.message;
  return <output data-testid="parent-error">{message ?? ""}</output>;
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

    // No eligible parent was copied in — the field holds a pending sentinel,
    // never a real id, and the form warns instead of silently saving.
    expect(PARENTS.map((p) => p.id)).not.toContain(
      screen.getByTestId("parent-id").textContent
    );
    expect(screen.getByText(/No parent selected/)).toBeTruthy();
  });

  it(
    "blocks an incomplete variant selection at submit (#223)",
    { timeout: 30_000 },
    async () => {
      function StrictForm() {
        const methods = useForm({
          resolver: zodResolver(productCreateSchema),
          defaultValues: {
            type: "filter",
            name: "Test",
            slug: "test",
            parent_preset_id: null,
            standalone_discoverable: false,
            variant_sort_order: 0,
            fields: [],
          },
        });
        return (
          <FormProvider {...methods}>
            <form
              onSubmit={methods.handleSubmit(
                () => {},
                () => {}
              )}
            >
              <PresetFamilyFields eligibleParents={PARENTS} />
              <ParentErrorProbe />
              <button type="submit">Save</button>
            </form>
          </FormProvider>
        );
      }
      render(<StrictForm />);

      fireEvent.click(
        screen.getByRole("radio", { name: "Variant of a root preset" })
      );
      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      // The pending sentinel fails schema validation — the incomplete variant
      // can never be committed as a standalone preset.
      await waitFor(() =>
        expect(screen.getByTestId("parent-error").textContent).not.toBe("")
      );
    }
  );

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

  it("lets the admin choose a parent explicitly", { timeout: 30_000 }, () => {
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

  it(
    "explains the impact when the existing parent is changed",
    { timeout: 30_000 },
    () => {
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
    }
  );
});
