import { describe, expect, it, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import type { ReactNode } from "react";
import { FilterStyleEditor } from "../filter-style-editor";

beforeAll(() => {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  HTMLElement.prototype.scrollIntoView ??= () => {};
});

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
      filter_config: { style_archetype: "", identity_preservation: "high" },
      ...defaults,
    },
  });
  return (
    <FormProvider {...methods}>
      <form>{children}</form>
    </FormProvider>
  );
}

describe("FilterStyleEditor", () => {
  it("keeps style archetype a free string with suggestions", () => {
    render(
      <Form>
        <FilterStyleEditor />
      </Form>
    );
    const input = screen.getByLabelText("Style archetype");
    expect(input).toHaveProperty("list", expect.anything());
    fireEvent.change(input, { target: { value: "halftone print" } });
    expect((input as HTMLInputElement).value).toBe("halftone print");
    // The help copy must be honest: the archetype is metadata, not a prompt.
    expect(screen.getByText(/not.*sent to the model/i)).toBeTruthy();
  });

  it("selects identity preservation via accessible radio cards", () => {
    render(
      <Form>
        <FilterStyleEditor />
      </Form>
    );
    expect(screen.getByRole("radio", { name: /High/ })).toHaveProperty(
      "checked",
      true
    );
    const creative = screen.getByRole("radio", { name: /Creative/ });
    fireEvent.click(creative);
    expect(creative).toHaveProperty("checked", true);
    expect(screen.getByRole("radio", { name: /High/ })).toHaveProperty(
      "checked",
      false
    );
  });

  it("warns when likeness_level contradicts identity preservation", () => {
    render(
      <Form defaults={{ likeness_level: "very_high" }}>
        <FilterStyleEditor />
      </Form>
    );
    expect(
      screen.getByText(/Public fidelity label doesn't match/i)
    ).toBeTruthy();
  });

  it("does not warn when likeness_level agrees or is unset", () => {
    const { unmount } = render(
      <Form defaults={{ likeness_level: "high" }}>
        <FilterStyleEditor />
      </Form>
    );
    expect(
      screen.queryByText(/Public fidelity label doesn't match/i)
    ).toBeNull();
    unmount();

    render(
      <Form>
        <FilterStyleEditor />
      </Form>
    );
    expect(
      screen.queryByText(/Public fidelity label doesn't match/i)
    ).toBeNull();
  });
});
