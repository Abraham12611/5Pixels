import { describe, expect, it, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import type { ReactNode } from "react";
import { FieldEditor } from "../field-editor";

beforeAll(() => {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  HTMLElement.prototype.scrollIntoView ??= () => {};
});

function Form({ children }: { children: ReactNode }) {
  const methods = useForm({
    defaultValues: { fields: [] },
  });
  return (
    <FormProvider {...methods}>
      <form>{children}</form>
    </FormProvider>
  );
}

function fieldKeyInputs() {
  return screen.getAllByPlaceholderText("e.g. background");
}

describe("FieldEditor", () => {
  it("shows an empty state and adds a field", () => {
    render(
      <Form>
        <FieldEditor />
      </Form>
    );
    expect(screen.getByText(/No fields configured/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    expect(fieldKeyInputs()[0]).toHaveProperty("value", "field_1");
  });

  it("never reuses a deleted key", () => {
    render(
      <Form>
        <FieldEditor />
      </Form>
    );
    const add = screen.getByRole("button", { name: "Add field" });
    fireEvent.click(add);
    fireEvent.click(add);
    fireEvent.click(add);
    expect(fieldKeyInputs().map((i) => (i as HTMLInputElement).value)).toEqual([
      "field_1",
      "field_2",
      "field_3",
    ]);
    // Remove the highest-numbered control, then add — scanning the current
    // array would reassign field_3; the key floor must not (#223 review).
    const removes = screen.getAllByRole("button", { name: "Remove" });
    fireEvent.click(removes[removes.length - 1]!);
    fireEvent.click(add);
    const keys = fieldKeyInputs().map((i) => (i as HTMLInputElement).value);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("field_4");
    expect(keys).not.toContain("field_3");
  });

  it("keeps deleted keys retired even when undo restores them", () => {
    render(
      <Form>
        <FieldEditor />
      </Form>
    );
    const add = screen.getByRole("button", { name: "Add field" });
    fireEvent.click(add);
    fireEvent.click(add);
    const removes = screen.getAllByRole("button", { name: "Remove" });
    fireEvent.click(removes[removes.length - 1]!); // removes field_2
    fireEvent.click(add); // gets field_3, not field_2
    fireEvent.click(screen.getByRole("button", { name: "Undo" })); // field_2 back
    fireEvent.click(add); // must be field_4 — nothing may collide
    const keys = fieldKeyInputs().map((i) => (i as HTMLInputElement).value);
    expect(new Set(keys).size).toBe(keys.length);
    // Undo reinserts field_2 at its old index; nothing collides.
    expect(keys).toEqual(["field_1", "field_2", "field_3", "field_4"]);
  });

  it("reorders controls with keyboard-accessible buttons", () => {
    render(
      <Form>
        <FieldEditor />
      </Form>
    );
    const add = screen.getByRole("button", { name: "Add field" });
    fireEvent.click(add);
    fireEvent.click(add);

    const labels = screen.getAllByLabelText("Label");
    fireEvent.change(labels[0]!, { target: { value: "First" } });
    fireEvent.change(labels[1]!, { target: { value: "Second" } });

    fireEvent.click(
      screen.getByRole("button", { name: "Move control 1 down" })
    );
    const reordered = screen.getAllByLabelText("Label");
    expect((reordered[0] as HTMLInputElement).value).toBe("Second");
    expect((reordered[1] as HTMLInputElement).value).toBe("First");
  });

  it("restores a removed control via undo", () => {
    render(
      <Form>
        <FieldEditor />
      </Form>
    );
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    fireEvent.change(screen.getByLabelText("Label"), {
      target: { value: "Backdrop" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByText(/Removed “Backdrop”/)).toBeTruthy();
    expect(screen.queryByLabelText("Label")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect((screen.getByLabelText("Label") as HTMLInputElement).value).toBe(
      "Backdrop"
    );
  });

  it("flags duplicate keys inline", () => {
    render(
      <Form>
        <FieldEditor />
      </Form>
    );
    const add = screen.getByRole("button", { name: "Add field" });
    fireEvent.click(add);
    fireEvent.click(add);
    const keys = fieldKeyInputs();
    fireEvent.change(keys[1]!, { target: { value: "field_1" } });
    expect(
      screen.getAllByText(/Another control already uses this key/).length
    ).toBe(2);
  });
});
