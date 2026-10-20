import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { PosterCompositionEditor } from "../poster-composition-editor";
import { FieldEditor } from "../field-editor";

/**
 * Integration coverage for the shared `fields` array (#223 review):
 * PosterCompositionEditor's "add matching user control" action and
 * FieldEditor's `useFieldArray` must read and write the same array while
 * mounted under one FormProvider — a second useFieldArray on `fields` in
 * the poster editor was replaced by `setValue` precisely because parallel
 * field-array hooks do not resync each other's row state.
 */

const POSTER_DEFAULTS = {
  type: "poster",
  fields: [],
  poster_config: {
    layout_template: "portrait",
    background_handling: "replace",
    font_family: "sans-serif",
    text_layer_config: {
      position: "bottom",
      size: "medium",
      color: "#F7F2E8",
      alignment: "center",
    },
    text_fields: [],
  },
};

function FieldsProbe() {
  const { control, getValues } = useFormContext();
  const watched = useWatch({ control, name: "fields" });
  return (
    <>
      <output data-testid="fields-json">{JSON.stringify(watched ?? [])}</output>
      <button
        type="button"
        data-testid="snapshot"
        onClick={(e) => {
          e.currentTarget.dataset.values = JSON.stringify(
            getValues("fields") ?? []
          );
        }}
      />
    </>
  );
}

function Form() {
  const methods = useForm({ defaultValues: POSTER_DEFAULTS });
  return (
    <FormProvider {...methods}>
      <form>
        <PosterCompositionEditor />
        <FieldEditor />
        <FieldsProbe />
      </form>
    </FormProvider>
  );
}

function fieldsJson(): Array<{ field_key?: string; sort_order?: number }> {
  return JSON.parse(screen.getByTestId("fields-json").textContent ?? "[]");
}

function fieldKeys(): string[] {
  return fieldsJson().map((f) => f.field_key ?? "");
}

/** Creates a poster text field row and gives it a valid key. */
function addPosterTextField(key: string) {
  fireEvent.click(screen.getByRole("button", { name: "Add text field" }));
  const keyInput = document.getElementById(
    "poster_config.text_fields.0.key"
  ) as HTMLInputElement;
  fireEvent.change(keyInput, { target: { value: key } });
}

describe("shared `fields` array — Poster editor + FieldEditor", () => {
  it("a matching user control added from the poster editor appears in FieldEditor", () => {
    render(<Form />);

    addPosterTextField("headline");

    // With no user control for `headline`, the poster editor offers to add it.
    fireEvent.click(
      screen.getByRole("button", { name: "Add a matching user control" })
    );

    // FieldEditor's field array reflects the append immediately.
    expect(screen.getByText("Control 1 of 1")).toBeTruthy();
    const fields = fieldsJson();
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      field_key: "headline",
      field_type: "short_text",
      sort_order: 0,
    });
    // The poster editor now sees the key as covered.
    expect(screen.getByText(/Filled by the/)).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Add a matching user control" })
    ).toBeNull();
  });

  it("reorder in FieldEditor stays visible to the poster editor and normalizes sort_order", () => {
    render(<Form />);

    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    expect(fieldKeys()).toEqual(["field_1", "field_2"]);

    fireEvent.click(screen.getByRole("button", { name: "Move control 2 up" }));

    expect(fieldKeys()).toEqual(["field_2", "field_1"]);
    expect(fieldsJson().map((f) => f.sort_order)).toEqual([0, 1]);
    // Both editors are still looking at one array.
    expect(screen.getByText("Control 1 of 2")).toBeTruthy();
  });

  it("remove + undo restores the exact field both editors see", () => {
    render(<Form />);

    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    const keyInput = document.getElementById(
      "fields.0.field_key"
    ) as HTMLInputElement;
    fireEvent.change(keyInput, { target: { value: "headline" } });

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(fieldsJson()).toHaveLength(0);
    expect(screen.getByText(/No fields configured/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(fieldsJson()).toHaveLength(1);
    expect(fieldsJson()[0]).toMatchObject({ field_key: "headline" });
    expect(screen.getByText("Control 1 of 1")).toBeTruthy();
  });

  it("never reissues a key after the highest-numbered field is deleted (#223)", () => {
    render(<Form />);

    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    expect(fieldKeys()).toEqual(["field_1", "field_2", "field_3"]);

    // Delete the highest-numbered row, then add — the old scan-based logic
    // would reassign field_3 here.
    const removes = screen.getAllByRole("button", { name: "Remove" });
    fireEvent.click(removes[removes.length - 1]);
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));

    expect(fieldKeys()).toEqual(["field_1", "field_2", "field_4"]);
    expect(new Set(fieldKeys()).size).toBe(3);
  });

  it("deleted keys stay retired even after Undo restores one", () => {
    render(<Form />);

    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));

    // Remove field_3, then add while it's "gone" — gets field_4.
    const removes = screen.getAllByRole("button", { name: "Remove" });
    fireEvent.click(removes[removes.length - 1]);
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    expect(fieldKeys()).toEqual(["field_1", "field_2", "field_4"]);

    // Undo reinserts field_3 at its old index, shifting field_4 — no clash.
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(fieldKeys()).toEqual(["field_1", "field_2", "field_3", "field_4"]);

    // Next add must still not collide.
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    const keys = fieldKeys();
    expect(keys).toHaveLength(5);
    expect(new Set(keys).size).toBe(5);
    expect(keys[keys.length - 1]).toBe("field_5");
  });

  it("form values persist the merged array in displayed order", () => {
    render(<Form />);

    addPosterTextField("tagline");
    fireEvent.click(
      screen.getByRole("button", { name: "Add a matching user control" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));

    const snapshot = screen.getByTestId("snapshot");
    fireEvent.click(snapshot);
    const persisted = JSON.parse(snapshot.dataset.values ?? "[]");

    expect(persisted.map((f: { field_key: string }) => f.field_key)).toEqual([
      "tagline",
      "field_1",
    ]);
    expect(persisted.map((f: { sort_order: number }) => f.sort_order)).toEqual([
      0, 1,
    ]);
  });
});
