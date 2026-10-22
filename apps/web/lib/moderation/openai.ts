/**
 * OpenAI Moderation API — the guarded screen for user-entered generation
 * text (#183 prompt path; Bachs-approved provider for the expanded
 * workflow).
 *
 * Endpoint: POST https://api.openai.com/v1/moderations with
 * `omni-moderation-latest`. `OPENAI_API_KEY` is server-only — never expose
 * it to the client bundle.
 *
 * Semantics differ from the legacy {@link screenUserText} Creem path: this
 * screen must be configured in EVERY environment that accepts custom
 * prompts. Missing key, unreachable API, timeout, non-OK status, malformed
 * JSON, and unrecognized response shape all return "unavailable" — the
 * caller rejects before quoting, credit reservation, or Fal invocation.
 *
 * Policy: categories are signals, not a complete AUP. `flagged` blocks.
 * Independently, ANY `categories.* === true` blocks even if `flagged` is
 * somehow false — provider drift can never silently widen what we accept.
 * The submitted text is never logged; only category names + result id are.
 */
export type OpenAiScreenOutcome =
  | { kind: "allow" }
  | { kind: "blocked"; categories: string[]; resultId?: string }
  | { kind: "unavailable" };

const MODERATION_MODEL = "omni-moderation-latest";
const MODERATION_TIMEOUT_MS = 5_000;

function endpoint(): string {
  const override = process.env.OPENAI_MODERATION_URL?.trim();
  if (override) return override;
  const base = process.env.OPENAI_BASE_URL?.trim().replace(/\/$/, "");
  return `${base ?? "https://api.openai.com"}/v1/moderations`;
}

/** Is the strict prompt screen configured? Requires a server-side key —
 *  the release flag alone never authorizes unscreened text. */
export function isOpenAiModerationConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

interface ModerationResultShape {
  flagged: boolean;
  categories: Record<string, boolean>;
}

/** Strict parse — anything off-shape is "unavailable" (fail closed). */
function parseResults(body: unknown): ModerationResultShape[] | null {
  if (!body || typeof body !== "object") return null;
  const results = (body as { results?: unknown }).results;
  if (!Array.isArray(results) || results.length === 0) return null;
  const parsed: ModerationResultShape[] = [];
  for (const r of results) {
    if (!r || typeof r !== "object") return null;
    const flagged = (r as { flagged?: unknown }).flagged;
    if (typeof flagged !== "boolean") return null;
    const categories = (r as { categories?: unknown }).categories;
    // A response with no category results cannot prove the content was
    // screened. Fail closed instead of treating missing signals as clear.
    if (
      !categories ||
      typeof categories !== "object" ||
      Array.isArray(categories)
    ) return null;
    const catEntries = Object.entries(categories);
    if (catEntries.length === 0) return null;
    const catMap: Record<string, boolean> = {};
    for (const [k, v] of catEntries) {
      if (typeof v !== "boolean") return null;
      catMap[k] = v;
    }
    parsed.push({ flagged, categories: catMap });
  }
  return parsed;
}

/**
 * Screen user-entered generation text — the exact normalized prompt plus
 * any free-text option values, so a legacy text field cannot bypass the
 * moderated path. Accepts a string or a batch; every input is screened and
 * ANY flagged result blocks.
 *
 * Never throws for policy reasons and never logs the submitted text.
 */
export async function screenUserPrompt(
  text: string | string[],
  externalId?: string
): Promise<OpenAiScreenOutcome> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "[moderation] user-prompt screen requested without OPENAI_API_KEY — failing closed"
    );
    return { kind: "unavailable" };
  }

  const input = (Array.isArray(text) ? text : [text]).filter(
    (t) => t.trim().length > 0
  );
  if (input.length === 0) return { kind: "allow" };

  let response: Response;
  try {
    response = await fetch(endpoint(), {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODERATION_MODEL, input }),
      signal: AbortSignal.timeout(MODERATION_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(
      "[moderation] request failed — failing closed",
      error instanceof Error ? error.message : String(error)
    );
    return { kind: "unavailable" };
  }

  if (!response.ok) {
    console.error(`[moderation] API returned ${response.status}`);
    return { kind: "unavailable" };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    console.error("[moderation] invalid JSON response — failing closed");
    return { kind: "unavailable" };
  }

  const results = parseResults(body);
  if (!results) {
    console.error("[moderation] unrecognized response shape — failing closed");
    return { kind: "unavailable" };
  }
  if (results.length !== input.length) {
    console.error(
      `[moderation] result count ${results.length} != input count ${input.length} — failing closed`
    );
    return { kind: "unavailable" };
  }

  // Explicit policy: flagged blocks, and any true category blocks even if
  // `flagged` disagreed — categories are enforced signals, not decoration.
  const blocked = new Set<string>();
  for (const r of results) {
    if (r.flagged && Object.values(r.categories).every((v) => !v)) {
      blocked.add("(flagged without a category)");
    }
    for (const [name, hit] of Object.entries(r.categories)) {
      if (hit) blocked.add(name);
    }
  }
  if (results.some((r) => r.flagged) || blocked.size > 0) {
    const resultId = (body as { id?: unknown }).id;
    console.warn("[moderation] blocked", {
      externalId,
      categories: [...blocked],
      resultId: typeof resultId === "string" ? resultId : undefined,
    });
    return {
      kind: "blocked",
      categories: [...blocked],
      resultId: typeof resultId === "string" ? resultId : undefined,
    };
  }

  return { kind: "allow" };
}
