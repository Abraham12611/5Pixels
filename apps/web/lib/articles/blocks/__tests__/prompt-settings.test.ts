import { describe, expect, it } from "vitest";
import {
  buildRecipeTemplate,
  parsePromptReferences,
  parseSettingsFields,
  promptReferencesPropSchema,
  serializePromptReferences,
  serializeSettingsFields,
  settingsFieldsFromPublic,
  settingsFieldsPropSchema,
  settingsValueError,
  type PromptReference,
  type SettingsFieldRow,
} from "../prompt-settings";
import type { PublicProductField } from "@/types/catalog";

/**
 * #128 — pure contract helpers for the promptRecipe + settings blocks.
 * The privacy boundary is structural: everything here consumes only public
 * catalog shapes, and malformed serialized props degrade to empty
 * snapshots rather than throwing.
 */

const AID = "11111111-2222-4333-8444-555555555555";
const BID = "66666666-7777-4888-8999-000000000000";

function field(
  overrides: Partial<PublicProductField> = {}
): PublicProductField {
  return {
    id: "f1",
    field_key: "style",
    label: "Style",
    help_text: null,
    field_type: "select",
    required: null,
    sort_order: 1,
    config: { options: [{ value: "film", label: "Film" }] },
    validation: null,
    ...overrides,
  };
}

describe("prompt reference codec", () => {
  const refs: PromptReference[] = [
    { id: AID, label: "My portrait", kind: "asset" },
    { id: BID, label: "Shared result", kind: "generation" },
  ];

  it("round-trips a valid reference list", () => {
    expect(parsePromptReferences(serializePromptReferences(refs))).toEqual(
      refs
    );
  });

  it("serializes an empty list to the empty string", () => {
    expect(serializePromptReferences([])).toBe("");
    expect(parsePromptReferences("")).toEqual([]);
  });

  it("degrades malformed JSON and invalid shapes to []", () => {
    expect(parsePromptReferences("{not json")).toEqual([]);
    expect(parsePromptReferences('{"a":1}')).toEqual([]);
    expect(
      parsePromptReferences(JSON.stringify([{ id: "x", label: "", kind: "q" }]))
    ).toEqual([]);
    expect(
      parsePromptReferences(JSON.stringify([{ id: AID, kind: "asset" }]))
    ).toEqual([]);
  });

  it("rejects more than 10 references", () => {
    const many = Array.from({ length: 11 }, (_, i) => ({
      id: AID,
      label: `r${i}`,
      kind: "asset" as const,
    }));
    expect(parsePromptReferences(JSON.stringify(many))).toEqual([]);
  });
});

describe("settings fields codec", () => {
  const rows: SettingsFieldRow[] = [
    { key: "style", label: "Style", value: "Film" },
    { key: "grain", label: "Grain", value: "40" },
  ];

  it("round-trips a valid row list", () => {
    expect(parseSettingsFields(serializeSettingsFields(rows))).toEqual(rows);
  });

  it("degrades malformed input to []", () => {
    expect(parseSettingsFields("oops")).toEqual([]);
    expect(parseSettingsFields("[1,2]")).toEqual([]);
    expect(parseSettingsFields("")).toEqual([]);
  });
});

describe("settingsFieldsFromPublic", () => {
  it("snapshots public fields sorted, with documented defaults", () => {
    const fields = [
      field({
        field_key: "b",
        label: "Beta",
        sort_order: 2,
        field_type: "toggle",
        config: { default: true },
      }),
      field({
        field_key: "a",
        label: "Alpha",
        sort_order: 1,
        config: { options: [{ value: "x", label: "X" }], default: "x" },
      }),
    ];
    const rows = settingsFieldsFromPublic(fields);
    expect(rows[0].key).toBe("a");
    expect(rows[0].value).toBe("x");
    expect(rows[1].key).toBe("b");
    expect(rows[1].value).toBe("On");
  });
});

describe("settingsValueError", () => {
  it("rejects values outside a choice field's documented options", () => {
    const f = field({
      config: {
        options: [
          { value: "film", label: "Film" },
          { value: "neon", label: "Neon" },
        ],
      },
    });
    expect(settingsValueError(f, "film")).toBeNull();
    expect(settingsValueError(f, "midnight")).toContain("documented options");
  });

  it("enforces intensity ranges", () => {
    const f = field({
      field_type: "intensity",
      config: { min: 0, max: 100 },
    });
    expect(settingsValueError(f, "50")).toBeNull();
    expect(settingsValueError(f, "120")).toContain("between 0 and 100");
    expect(settingsValueError(f, "loud")).toContain("number");
  });

  it("validates toggles and colors", () => {
    const t = field({ field_type: "toggle" });
    expect(settingsValueError(t, "On")).toBeNull();
    expect(settingsValueError(t, "maybe")).toContain("On or Off");
    const c = field({ field_type: "color" });
    expect(settingsValueError(c, "#82ea3a")).toBeNull();
    expect(settingsValueError(c, "greenish")).toContain("hex");
  });

  it("bounds free-text fields", () => {
    const f = field({ field_type: "short_text", config: {} });
    expect(settingsValueError(f, "fine")).toBeNull();
    expect(settingsValueError(f, "x".repeat(201))).toContain("too long");
  });
});

describe("buildRecipeTemplate", () => {
  it("builds from public name/description/controls only", () => {
    const text = buildRecipeTemplate({
      name: "Film Grain Portrait",
      shortDescription: "Analog grain, soft skin tones",
      fields: [field({ label: "Grain" })],
    });
    expect(text).toContain("Film Grain Portrait");
    expect(text).toContain("Analog grain, soft skin tones");
    expect(text).toContain("Grain");
    // The template is a writing scaffold, never a disguised system prompt.
    expect(text.toLowerCase()).toContain("steps you took");
  });
});

describe("prop schemas", () => {
  it("accepts empty and valid serialized references", () => {
    expect(promptReferencesPropSchema.safeParse("").success).toBe(true);
    expect(promptReferencesPropSchema.safeParse("[]").success).toBe(true);
    expect(
      promptReferencesPropSchema.safeParse(
        serializePromptReferences([
          { id: AID, label: "ok", kind: "asset" },
        ])
      ).success
    ).toBe(true);
  });

  it("rejects malformed serialized references", () => {
    expect(promptReferencesPropSchema.safeParse("{broken").success).toBe(false);
    expect(promptReferencesPropSchema.safeParse('[{"id":"x"}]').success).toBe(
      false
    );
  });

  it("accepts empty and valid serialized settings rows", () => {
    expect(settingsFieldsPropSchema.safeParse("").success).toBe(true);
    expect(
      settingsFieldsPropSchema.safeParse(
        serializeSettingsFields([{ key: "k", label: "L", value: "v" }])
      ).success
    ).toBe(true);
  });

  it("rejects malformed serialized settings rows", () => {
    expect(settingsFieldsPropSchema.safeParse("not-json").success).toBe(false);
  });
});
