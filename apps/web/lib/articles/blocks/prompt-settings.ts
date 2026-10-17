import { z } from "zod";
import {
  getFieldDefaultValue,
  getFieldOptions,
  getFieldRange,
  sortFields,
} from "@/lib/catalog/fields";
import type { PublicProductField } from "@/types/catalog";

/**
 * Shared contract helpers for the promptRecipe + settings article blocks
 * (#128). Client-safe: pure functions over public catalog shapes only.
 *
 * CANONICAL READER CONTRACT (#131 owns the public reader wiring):
 *
 *   promptRecipe props:
 *     presetId     — canonical products.id; '' = preset-less manual copy.
 *                    Reader resolves live via get_public_product_editorial /
 *                    the preset-card resolver; never trusts `slug` for copy.
 *     slug         — cached display/deep-link slug (may be stale).
 *     recipeText   — article-local recipe copy (<= 4000 chars).
 *     source       — 'approved_template' | 'manual' provenance label.
 *     capturedAt   — ISO timestamp of last approved-template capture, '' ok.
 *     references   — JSON STRING of PromptReference[] (<= 10):
 *                    { id: uuid, label: 1..200, kind: 'asset'|'generation' }.
 *                    'asset' ids are this article's media; 'generation' ids
 *                    are publicly shared generations (reader links, never
 *                    copies). Parse with parsePromptReferences / decode via
 *                    promptReferencesPropSchema — malformed input => [].
 *     recipe / presetSlug — LEGACY props from pre-#128 docs; keep declared
 *                    and fall back to them when recipeText/slug are empty.
 *
 *   settings props:
 *     presetId     — canonical products.id, required at publish.
 *     slug         — cached display/deep-link slug (may be stale).
 *     fields       — JSON STRING of SettingsFieldRow[] (<= 30):
 *                    { key: <=80, label: <=200, value: <=200 } — values are
 *                    validated at publish against the product's CURRENT
 *                    public field schema (options/range/toggle/color).
 *                    Parse with parseSettingsFieldRows — malformed => [].
 *                    Reader must label values as examples, not replay data.
 *     productSlug  — LEGACY prop; fall back when slug is empty.
 *
 * Rendering: components/articles/blocks/{prompt-recipe-card,settings-card}
 * are the shared read-only cards — same component for editor preview and
 * the public reader, matching the ArticlePresetCard contract from #127.
 *
 * BlockNote props are primitive-only, so the structured snapshots these
 * blocks carry (references, settings rows) persist as JSON strings. The
 * codecs below are the single parse/validate point used by the editor, the
 * persistence schema (registry) and the public reader — a malformed string
 * always degrades to an empty snapshot, never a crash or a leak.
 */

/* --------------------------------------------------------------------------
 * promptRecipe — provenance + recipe text
 * ------------------------------------------------------------------------ */

export const PROMPT_RECIPE_SOURCES = ["approved_template", "manual"] as const;
export type PromptRecipeSource = (typeof PROMPT_RECIPE_SOURCES)[number];

export const PROMPT_RECIPE_MAX_LENGTH = 4000;

export const promptRecipeSourceSchema = z.enum(PROMPT_RECIPE_SOURCES);

/* --------------------------------------------------------------------------
 * promptRecipe — references (@reference attachments)
 * ------------------------------------------------------------------------ */

export const promptReferenceSchema = z.object({
  /** asset_id of a published article asset, or a generation id. */
  id: z.string().uuid(),
  /** Author-facing chip label — plain text only. */
  label: z.string().min(1).max(200),
  /** 'asset' = article media (published copy); 'generation' = share link. */
  kind: z.enum(["asset", "generation"]),
});
export type PromptReference = z.infer<typeof promptReferenceSchema>;

export const promptReferencesSchema = z
  .array(promptReferenceSchema)
  .max(10);

export function serializePromptReferences(refs: PromptReference[]): string {
  return refs.length === 0 ? "" : JSON.stringify(refs);
}

/** Parse the persisted JSON-string prop. Malformed input → []. */
export function parsePromptReferences(json: string): PromptReference[] {
  if (!json) return [];
  try {
    const result = promptReferencesSchema.safeParse(JSON.parse(json));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

/* --------------------------------------------------------------------------
 * settings — structured snapshot rows
 * ------------------------------------------------------------------------ */

export const settingsFieldRowSchema = z.object({
  /** Public product_fields.field_key the row was captured from. */
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  /** Display string the author picked — never raw config internals. */
  value: z.string().max(200),
});
export type SettingsFieldRow = z.infer<typeof settingsFieldRowSchema>;

export const settingsFieldsSchema = z
  .array(settingsFieldRowSchema)
  .max(30);

export function serializeSettingsFields(rows: SettingsFieldRow[]): string {
  return rows.length === 0 ? "" : JSON.stringify(rows);
}

/** Parse the persisted JSON-string prop. Malformed input → []. */
export function parseSettingsFields(json: string): SettingsFieldRow[] {
  if (!json) return [];
  try {
    const result = settingsFieldsSchema.safeParse(JSON.parse(json));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

/**
 * The example value a settings row starts with — the field's documented
 * default, rendered as display text. Readers see these labeled as examples,
 * never as a replayable recipe.
 */
export function settingsFieldExampleValue(
  field: PublicProductField
): string {
  const def = getFieldDefaultValue(field);
  if (typeof def === "boolean") return def ? "On" : "Off";
  if (typeof def === "number") return String(def);
  return typeof def === "string" ? def : "";
}

/** Snapshot rows built from a preset's publicly documented controls. */
export function settingsFieldsFromPublic(
  fields: PublicProductField[]
): SettingsFieldRow[] {
  return sortFields(fields).map((f) => ({
    key: f.field_key,
    label: f.label,
    value: settingsFieldExampleValue(f),
  }));
}

/* --------------------------------------------------------------------------
 * Settings value validation — author overrides stay inside the documented
 * public control schema. Returns an error string, or null when valid.
 * ------------------------------------------------------------------------ */

const CHOICE_TYPES = new Set([
  "select",
  "radio",
  "layout",
  "background",
  "wardrobe",
  "era",
  "mood",
]);

export function settingsValueError(
  field: PublicProductField,
  value: string
): string | null {
  if (value.length > 200) return "Value is too long.";

  if (CHOICE_TYPES.has(field.field_type)) {
    const options = getFieldOptions(field);
    if (options.length > 0 && !options.some((o) => o.value === value)) {
      return `Value must be one of the documented options (${options
        .map((o) => o.label)
        .join(", ")}).`;
    }
    return null;
  }

  if (field.field_type === "intensity") {
    const n = Number(value);
    if (value.trim() === "" || !Number.isFinite(n)) {
      return "Value must be a number.";
    }
    const { min, max } = getFieldRange(field);
    if (n < min || n > max) return `Value must be between ${min} and ${max}.`;
    return null;
  }

  if (field.field_type === "toggle") {
    return value === "On" || value === "Off" || value === ""
      ? null
      : "Value must be On or Off.";
  }

  if (field.field_type === "color") {
    return value === "" || /^#[0-9a-fA-F]{3,8}$/.test(value)
      ? null
      : "Value must be a hex colour like #82ea3a.";
  }

  // short_text, aspect_ratio and anything else: free text, bounded above.
  return null;
}

/* --------------------------------------------------------------------------
 * Recipe prefill — approved public recipe, or a labelled public-safe template
 * ------------------------------------------------------------------------ */

/**
 * Template used when a preset has no approved public recipe. Explicitly
 * labelled as an author prompt — it is built ONLY from the preset's public
 * name, description and documented controls, and is never presented as the
 * real system prompt.
 */
export function buildRecipeTemplate(input: {
  name: string;
  shortDescription: string | null;
  fields: PublicProductField[];
}): string {
  const controls = sortFields(input.fields)
    .map((f) => f.label)
    .filter(Boolean)
    .slice(0, 8);

  const lines = [
    "Write the steps/creative prompt you used.",
    "",
    `Preset: ${input.name}`,
  ];
  if (input.shortDescription) {
    lines.push(`What it does: ${input.shortDescription}`);
  }
  if (controls.length > 0) {
    lines.push(`Controls you can mention: ${controls.join(", ")}`);
  }
  lines.push(
    "",
    "Describe the look, the steps you took, and any settings you changed —",
    "for example: 'I uploaded a portrait, picked the {preset} preset, set",
    "{control} to {value}, and generated.'"
  );
  return lines.join("\n");
}

/* --------------------------------------------------------------------------
 * Zod prop schemas shared with the block registry — a JSON-string prop is
 * valid when it is empty or decodes to a fully valid snapshot.
 * ------------------------------------------------------------------------ */

export const promptReferencesPropSchema = z
  .string()
  .max(8000)
  .default("")
  .refine((s) => s === "" || parsePromptReferences(s).length > 0 || s === "[]", {
    message: "references must be a JSON array of {id,label,kind} entries",
  });

export const settingsFieldsPropSchema = z
  .string()
  .max(12000)
  .default("")
  .refine((s) => s === "" || parseSettingsFields(s).length > 0 || s === "[]", {
    message: "fields must be a JSON array of {key,label,value} rows",
  });
