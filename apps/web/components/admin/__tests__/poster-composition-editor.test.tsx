import { describe, expect, it, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import type { ReactNode } from "react";
import { PosterCompositionEditor } from "../poster-composition-editor";

beforeAll(() => {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  HTMLElement.prototype.scrollIntoView ??= () => {};
});

function FieldCountProbe() {
  const { control } = useFormContext();
  const fields = useWatch({ control, name: "fields" });
  return <output data-testid="field-count">{(fields ?? []).length}</output>;
}

const POSTER_DEFAULTS = {
  type: "poster",
  fields: [],
  poster_config: {
    layout_template: "portrait",
    text_fields: [],
    text_layer_config: {
      position: "bottom",
      size: "medium",
      color: "#F7F2E8",
      alignment: "center",
    },
    background_handling: "replace",
  },
};

function Form({
  children,
  defaults,
}: {
  children: ReactNode;
  defaults?: Record<string, unknown>;
}) {
  const methods = useForm({
    mode: "onChange",
    defaultValues: { ...POSTER_DEFAULTS, ...defaults },
  });
  return (
    <FormProvider {...methods}>
      <form>
        {children}
        <FieldCountProbe />
      </form>
    </FormProvider>
  );
}

describe("PosterCompositionEditor", () => {
  it("renders visual layout choices and selects one", () => {
    render(
      <Form>
        <PosterCompositionEditor />
      </Form>
    );
    const square = screen.getByRole("radio", { name: /Square/ });
    expect(square).toHaveProperty("checked", false);
    fireEvent.click(square);
    expect(square).toHaveProperty("checked", true);
  });

  it("adds, edits, reorders and removes text fields", () => {
    render(
      <Form>
        <PosterCompositionEditor />
      </Form>
    );
    expect(screen.getByText(/No text fields/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Add text field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add text field" }));

    const keyInputs = screen.getAllByPlaceholderText("e.g. headline");
    const labelInputs = screen.getAllByPlaceholderText("e.g. Headline");
    fireEvent.change(keyInputs[0]!, { target: { value: "headline" } });
    fireEvent.change(labelInputs[0]!, { target: { value: "Headline" } });
    fireEvent.change(keyInputs[1]!, { target: { value: "cta" } });
    fireEvent.change(labelInputs[1]!, { target: { value: "CTA" } });

    fireEvent.click(
      screen.getByRole("button", { name: "Move text field 1 down" })
    );
    expect(
      screen
        .getAllByPlaceholderText("e.g. Headline")
        .map((i) => (i as HTMLInputElement).value)
    ).toEqual(["CTA", "Headline"]);

    fireEvent.click(
      screen.getAllByRole("button", { name: /Remove text field/ })[0]!
    );
    expect(screen.getAllByPlaceholderText("e.g. headline")).toHaveLength(1);
  });

  it("warns when a text key has no matching user control and offers to add one", () => {
    render(
      <Form>
        <PosterCompositionEditor />
      </Form>
    );
    fireEvent.click(screen.getByRole("button", { name: "Add text field" }));
    fireEvent.change(screen.getByPlaceholderText("e.g. headline"), {
      target: { value: "headline" },
    });
    expect(
      screen.getByText(/No user control submits/, { exact: false })
    ).toBeTruthy();
    expect(screen.getByTestId("field-count").textContent).toBe("0");

    fireEvent.click(
      screen.getByRole("button", { name: "Add a matching user control" })
    );
    expect(screen.getByTestId("field-count").textContent).toBe("1");
    expect(screen.getByText(/Filled by the/, { exact: false })).toBeTruthy();
  });

  it("flags duplicate text keys", () => {
    render(
      <Form>
        <PosterCompositionEditor />
      </Form>
    );
    const add = screen.getByRole("button", { name: "Add text field" });
    fireEvent.click(add);
    fireEvent.click(add);
    const keys = screen.getAllByPlaceholderText("e.g. headline");
    fireEvent.change(keys[0]!, { target: { value: "title" } });
    fireEvent.change(keys[1]!, { target: { value: "Title" } });
    expect(
      screen.getAllByText(/Another text field already uses this key/)
    ).toHaveLength(2);
  });

  it("preserves existing persisted settings on load", () => {
    render(
      <Form
        defaults={{
          poster_config: {
            layout_template: "landscape",
            font_family: "Georgia",
            text_fields: [
              {
                key: "headline",
                label: "Headline",
                required: true,
                default_value: "Sale ends Friday",
              },
            ],
            text_layer_config: {
              position: "top",
              size: "large",
              color: "#ffffff",
              alignment: "left",
            },
            background_handling: "preserve",
          },
        }}
      >
        <PosterCompositionEditor />
      </Form>
    );
    expect(screen.getByRole("radio", { name: /Landscape/ })).toHaveProperty(
      "checked",
      true
    );
    expect(
      (screen.getByPlaceholderText("e.g. Inter, Georgia") as HTMLInputElement)
        .value
    ).toBe("Georgia");
    expect(
      (screen.getByPlaceholderText("e.g. headline") as HTMLInputElement).value
    ).toBe("headline");
    expect(
      (
        screen.getByPlaceholderText(
          "Rendered when the customer leaves it blank"
        ) as HTMLInputElement
      ).value
    ).toBe("Sale ends Friday");
  });

  it("validates the hex color input", async () => {
    render(
      <Form>
        <PosterCompositionEditor />
      </Form>
    );
    const colorInput = screen.getByPlaceholderText("#F7F2E8");
    fireEvent.change(colorInput, { target: { value: "not-a-color" } });
    fireEvent.blur(colorInput);
    expect(
      await screen.findByText(/Use a hex color like #F7F2E8/)
    ).toBeTruthy();
  });
});
