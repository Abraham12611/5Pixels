/**
 * Creem Moderation API client (docs.creem.io/features/moderation).
 *
 * Required for AI image/video generation products on Creem: every
 * user-supplied text input that will be routed to a generation model must be
 * screened through POST /v1/moderation/prompt BEFORE generation — before
 * queueing, billing, or the model call.
 *
 * Routing policy (per Creem guidance):
 * - "allow" → proceed.
 * - "flag"  → block (treated like deny; flagged prompts are monitored).
 * - "deny"  → block.
 * - Any transport/API error → fail closed (block), never generate anyway.
 *
 * The endpoint is marked experimental — unknown response fields are ignored
 * and an unrecognized `decision` is treated as a block.
 */

export type ModerationDecision = "allow" | "flag" | "deny";

export type ScreenOutcome =
  | { kind: "allow" }
  | { kind: "blocked"; decision: "flag" | "deny"; resultId?: string }
  | { kind: "unavailable" };

const MODERATION_TIMEOUT_MS = 5_000;

function creemApiBase(): string {
  const explicit = process.env.CREEM_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const key = process.env.CREEM_API_KEY ?? "";
  return key.startsWith("creem_test_")
    ? "https://test-api.creem.io"
    : "https://api.creem.io";
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Screen a single user-supplied text string against Creem's content policy.
 * Never throws for policy reasons — blocked decisions are returned as data.
 * Throws only when the API is unreachable/misconfigured in production.
 */
export async function screenUserText(
  text: string,
  externalId?: string
): Promise<ScreenOutcome> {
  // Paused with the Creem billing migration — set CREEM_MODERATION_ENABLED=true
  // to re-enable. Unset/false means no moderation calls are made at all.
  if (process.env.CREEM_MODERATION_ENABLED?.trim() !== "true") {
    return { kind: "allow" };
  }

  const apiKey = process.env.CREEM_API_KEY?.trim();

  if (!apiKey) {
    // Fail closed in production — a missing key must not silently allow.
    // Outside production we log and allow so local dev/test stays usable.
    if (isProduction()) {
      console.error("[moderation] CREEM_API_KEY missing in production");
      return { kind: "unavailable" };
    }
    console.warn("[moderation] CREEM_API_KEY not set — skipping screen (dev)");
    return { kind: "allow" };
  }

  let response: Response;
  try {
    response = await fetch(`${creemApiBase()}/v1/moderation/prompt`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        prompt: text,
        ...(externalId ? { external_id: externalId } : {}),
      }),
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

  let body: { id?: unknown; decision?: unknown };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    console.error("[moderation] invalid JSON response — failing closed");
    return { kind: "unavailable" };
  }

  const resultId = typeof body.id === "string" ? body.id : undefined;

  if (body.decision === "allow") {
    return { kind: "allow" };
  }
  if (body.decision === "deny" || body.decision === "flag") {
    console.warn(`[moderation] ${body.decision}`, { externalId, resultId });
    return { kind: "blocked", decision: body.decision, resultId };
  }

  // Unrecognized decision — experimental API may add values; fail closed.
  console.error("[moderation] unrecognized decision", body.decision);
  return { kind: "unavailable" };
}

/**
 * Collect every user-controlled string from a preset's option values —
 * poster text fields and free-text fields are the only user input that can
 * reach the compiled model prompt (numbers/booleans/selects are inert).
 * Walks nested objects/arrays shallowly enough to be future-proof.
 */
export function extractUserText(options: Record<string, unknown>): string[] {
  const texts: string[] = [];
  const walk = (value: unknown, depth: number) => {
    if (depth > 3) return;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) texts.push(trimmed);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((v) => walk(v, depth + 1));
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach((v) => walk(v, depth + 1));
    }
  };
  Object.values(options).forEach((v) => walk(v, 0));
  return texts;
}
