import { createServiceClient } from "@/lib/supabase/service";
import {
  isOpenRouterConfigured,
  openRouterChatText,
  PROMPT_RECIPE_MODELS,
  type ChatMessage,
  type MessageContentPart,
} from "@/lib/ai/openrouter";

/**
 * Auto-generated `products.public_prompt_recipe` — a consumer-friendly
 * paraphrase of the preset's private generation recipe, written only when
 * the column is empty and the product is published. The private recipe is
 * the model's *input*, never its output: generated text is rejected when
 * it contains a verbatim window of the source recipe.
 */

// Matches the CHECK constraint products_public_prompt_recipe_len.
const RECIPE_MAX_CHARS = 8_000;
const MIN_RECIPE_CHARS = 80;
const TEMPLATE_EXCERPT_CHARS = 6_000;
const NEGATIVE_EXCERPT_CHARS = 1_000;
const VERBATIM_WINDOW = 60;
const VERBATIM_STEP = 20;
const IMAGE_URL_TTL_SECONDS = 600;
const MAX_TOKENS = 2_400;

type ServiceClient = ReturnType<typeof createServiceClient>;

interface RecipeProductRow {
  id: string;
  name: string;
  type: string;
  short_description: string | null;
  long_description: string | null;
  public_status: string;
  public_prompt_recipe: string | null;
  hero_asset_id: string | null;
  poster_asset_id: string | null;
}

interface RecipeVersionRow {
  private_instruction_template: string | null;
  private_negative_instruction: string | null;
}

export type EnsureResult = "generated" | "skipped" | "failed";

const SYSTEM_PROMPT = `You are an expert prompt writer for AI image generation. You convert a commercial image-effect preset's internal generation recipe into a public, consumer-friendly "prompt recipe" — a single self-contained prompt an advanced user could paste into any image generator to produce a similar visual result.

Rules:
- NEVER copy sentences or phrases verbatim from the internal recipe. Completely rephrase and restructure it — the internal recipe is confidential.
- NEVER mention provider names, model names, API parameters, JSON keys, template placeholders, or any technical implementation detail.
- Write in a descriptive, editorial prompt style like a published poster/illustration brief: canvas and orientation, subject, composition, style and medium, color palette (approximate hex values welcome), typography and lettering details, lighting, mood, and finishing quality.
- Length: roughly 1500–3500 characters.
- Output ONLY the prompt text. No preamble, no explanation, no markdown code fences, no wrapping quotes.`;

function buildUserPrompt(
  product: RecipeProductRow,
  version: RecipeVersionRow | null,
  hasImage: boolean
): string {
  const template = (version?.private_instruction_template ?? "").slice(
    0,
    TEMPLATE_EXCERPT_CHARS
  );
  const negative = (version?.private_negative_instruction ?? "").slice(
    0,
    NEGATIVE_EXCERPT_CHARS
  );

  const lines = [
    `Preset name: ${product.name}`,
    `Preset type: ${product.type} (filter = style transformation applied to a photo; poster = complete AI visual with designed text/layout)`,
  ];
  if (product.short_description) {
    lines.push(`Short description: ${product.short_description}`);
  }
  if (product.long_description) {
    lines.push(`Long description: ${product.long_description}`);
  }
  if (template.trim()) {
    lines.push(
      "",
      "Internal generation recipe (confidential — paraphrase, never quote):",
      template
    );
  }
  if (negative.trim()) {
    lines.push(
      "",
      "Elements the result must avoid (internal negative instructions — express as positive guidance, never quote):",
      negative
    );
  }
  if (hasImage) {
    lines.push(
      "",
      "The attached image is an example output of this preset — match its visual style and composition in the recipe."
    );
  }
  lines.push("", "Write the public prompt recipe now.");
  return lines.join("\n");
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** True when `output` reproduces a VERBATIM_WINDOW slice of `source`
 *  (whitespace/case-normalized) — i.e. the model leaked private recipe
 *  text instead of paraphrasing it. */
export function containsVerbatimLeak(
  output: string,
  source: string | null | undefined
): boolean {
  if (!source) return false;
  const haystack = normalize(output);
  const needle = normalize(source);
  if (needle.length < VERBATIM_WINDOW) return false;
  for (let i = 0; i + VERBATIM_WINDOW <= needle.length; i += VERBATIM_STEP) {
    if (haystack.includes(needle.slice(i, i + VERBATIM_WINDOW))) {
      return true;
    }
  }
  return false;
}

/** Strip fences/preamble noise and bound the output to the column limit.
 *  Returns null when the model produced nothing usable. */
export function sanitizeRecipe(raw: string): string | null {
  let text = raw.trim();
  const fenced = text.match(/^```[a-z]*\s*\n([\s\S]*?)\n?\s*```$/i);
  if (fenced) text = fenced[1]!.trim();
  if (text.length < MIN_RECIPE_CHARS) return null;
  if (text.length > RECIPE_MAX_CHARS) {
    const cut = text.lastIndexOf("\n\n", RECIPE_MAX_CHARS);
    text = (
      cut >= MIN_RECIPE_CHARS ? text.slice(0, cut) : text.slice(0, RECIPE_MAX_CHARS)
    ).trimEnd();
  }
  return text;
}

async function resolveImageUrl(
  supabase: ServiceClient,
  product: RecipeProductRow
): Promise<string | null> {
  const assetId = product.hero_asset_id ?? product.poster_asset_id;
  if (!assetId) return null;

  const { data: asset } = await supabase
    .from("assets")
    .select("bucket, storage_key, mime_type")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset || !asset.mime_type?.startsWith("image/")) return null;

  // A signed URL works for public and private objects alike — safe to
  // hand to a remote model for its fetch window only.
  const { data: signed } = await supabase.storage
    .from(asset.bucket)
    .createSignedUrl(asset.storage_key, IMAGE_URL_TTL_SECONDS);
  return signed?.signedUrl ?? null;
}

async function generateRecipeText(
  product: RecipeProductRow,
  version: RecipeVersionRow | null,
  imageUrl: string | null
): Promise<string | null> {
  const userText = buildUserPrompt(product, version, Boolean(imageUrl));

  // Pass 1: models that can consume the example image. Pass 2: text-only
  // fallback when every vision attempt failed.
  for (const withImage of [true, false]) {
    if (withImage && !imageUrl) continue;
    for (const model of PROMPT_RECIPE_MODELS) {
      try {
        const content: MessageContentPart[] = [{ type: "text", text: userText }];
        if (withImage && imageUrl) {
          content.push({ type: "image_url", image_url: { url: imageUrl } });
        }
        const messages: ChatMessage[] = [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ];
        const raw = await openRouterChatText({
          model,
          messages,
          maxTokens: MAX_TOKENS,
        });
        const cleaned = sanitizeRecipe(raw);
        if (!cleaned) continue;
        if (
          containsVerbatimLeak(
            cleaned,
            version?.private_instruction_template
          ) ||
          containsVerbatimLeak(cleaned, version?.private_negative_instruction)
        ) {
          console.warn(
            `[prompt-recipe] ${model} reproduced recipe text — rejected`
          );
          continue;
        }
        return cleaned;
      } catch (err) {
        console.warn(
          `[prompt-recipe] ${model} failed:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }
  }
  return null;
}

/**
 * Generate + persist the public recipe for one product. No-ops
 * ("skipped") unless the product is published AND the column is empty —
 * hand-written admin copy is never overwritten. The write itself is a
 * conditional update so a concurrent admin save can never be clobbered.
 */
export async function ensurePromptRecipe(
  productId: string
): Promise<EnsureResult> {
  if (!isOpenRouterConfigured()) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const supabase = createServiceClient();
  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, type, short_description, long_description, public_status, public_prompt_recipe, hero_asset_id, poster_asset_id"
    )
    .eq("id", productId)
    .maybeSingle();

  if (
    !product ||
    product.public_status !== "active" ||
    product.public_prompt_recipe
  ) {
    return "skipped";
  }

  const { data: version } = await supabase
    .from("product_versions")
    .select("private_instruction_template, private_negative_instruction")
    .eq("product_id", productId)
    .eq("state", "active")
    .maybeSingle();

  const imageUrl = await resolveImageUrl(supabase, product);

  let recipe: string | null;
  try {
    recipe = await generateRecipeText(product, version ?? null, imageUrl);
  } catch (err) {
    console.error(
      `[prompt-recipe] generation threw for ${productId}:`,
      err instanceof Error ? err.message : String(err)
    );
    return "failed";
  }
  if (!recipe) return "failed";

  const { error } = await supabase
    .from("products")
    .update({ public_prompt_recipe: recipe })
    .eq("id", productId)
    .is("public_prompt_recipe", null);
  if (error) {
    console.error(
      `[prompt-recipe] write failed for ${productId}:`,
      error.message
    );
    return "failed";
  }
  return "generated";
}
