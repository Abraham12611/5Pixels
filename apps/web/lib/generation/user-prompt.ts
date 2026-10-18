import { MAX_PROMPT_CHARS } from "@5pixels/shared";

/**
 * User-edited preset prompts (#183) — validation, normalization, and the
 * release gate.
 *
 * A custom prompt is a scoped, opt-in addition to an admin-authored recipe:
 * it is only accepted when the PINNED product_version carries
 * `prompt_override_enabled = true`, and only while the server-side release
 * flag is on (held OFF until written provider/merchant approval, the policy
 * update in #172, and owner signoff). An absent/false capability or an
 * unset flag means disabled — a hand-crafted request cannot bypass it.
 *
 * Canonical form: `normalizeUserPrompt` output is the single representation
 * used for moderation, the quote `prompt_hash`, the `create_generation`
 * `p_user_prompt` argument, persistence, and provider composition. The RPC
 * canonicalizes with `btrim` + sha256; because normalized text is always
 * pre-trimmed here, both sides hash the identical byte sequence.
 */

/** Server-only release gate — OFF by default until #172/#173/signoff land. */
export function isUserPromptReleased(): boolean {
  return process.env.PRESET_USER_PROMPT_ENABLED?.trim() === "true";
}

/** Per-version capability, projected from product_versions (#176). */
export interface PromptCapability {
  enabled: boolean;
  maxChars: number;
}

export const PROMPT_CAPABILITY_DISABLED: PromptCapability = {
  enabled: false,
  maxChars: 0,
};

export function promptCapabilityOf(version: {
  prompt_override_enabled?: boolean | null;
  prompt_max_chars?: number | null;
}): PromptCapability {
  const enabled = version.prompt_override_enabled === true;
  const maxChars = enabled
    ? Math.min(
        Math.max(0, Math.floor(version.prompt_max_chars ?? 0)),
        MAX_PROMPT_CHARS
      )
    : 0;
  return { enabled: enabled && maxChars > 0, maxChars };
}

/**
 * The canonical representation of a user prompt. Deterministic and
 * idempotent — normalizing twice yields the same string.
 *
 * - Unicode NFC so canonically-equivalent input hashes identically.
 * - CR/CRLF line endings collapse to LF.
 * - ASCII/C1 control characters (except tab/newline) are removed — a stray
 *   \u0000 or escape sequence can never reach the recipe or the database.
 * - Unicode format characters (Cf: zero-width spaces, bidi overrides,
 *   soft hyphens…) are removed; they can smuggle invisible instructions
 *   into otherwise harmless-looking text.
 * - Leading/trailing whitespace is trimmed so the value survives the RPC's
 *   `NULLIF(btrim(...), '')` canonicalization unchanged.
 */
export function normalizeUserPrompt(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .replace(/\p{Cf}/gu, "")
    .trim();
}

/** Postgres `length()` counts characters; JS `.length` counts UTF-16 units
 *  (astral chars = 2). Count code points so the app-side cap agrees with
 *  the RPC's `length(v_prompt_text) > prompt_max_chars` check. */
export function userPromptLength(text: string): number {
  return [...text].length;
}

/**
 * Recipe templates interpolate `{{field_key}}` markers. A user prompt must
 * never carry template syntax — it could inject control values or spoof
 * recipe structure downstream.
 */
const TEMPLATE_MARKER = /\{\{|\}\}/;

export type UserPromptValidation =
  | { ok: true; prompt: string | null }
  | { ok: false; error: string };

/**
 * Validate an optional `prompt` request field against the pinned version's
 * capability and the release gate. Returns the normalized canonical text to
 * use for moderation/quote/submission/persistence, or a rejection reason.
 *
 * `null`/empty is always allowed and normalizes to `null` — prompt-less
 * generations are behaviorally unchanged.
 */
export function validateUserPrompt(
  raw: string | null | undefined,
  capability: PromptCapability | null | undefined,
  opts?: { released?: boolean }
): UserPromptValidation {
  const normalized = typeof raw === "string" ? normalizeUserPrompt(raw) : "";
  if (!normalized) {
    return { ok: true, prompt: null };
  }

  const released = opts?.released ?? isUserPromptReleased();
  const cap = capability ?? PROMPT_CAPABILITY_DISABLED;
  if (!released || !cap.enabled) {
    return {
      ok: false,
      error: "Custom prompts are not enabled for this preset.",
    };
  }

  if (userPromptLength(normalized) > cap.maxChars) {
    return {
      ok: false,
      error: `Custom prompts are limited to ${cap.maxChars} characters.`,
    };
  }

  if (TEMPLATE_MARKER.test(normalized)) {
    return {
      ok: false,
      error:
        "Custom prompts can't contain template markers. Please describe your changes in plain text.",
    };
  }

  return { ok: true, prompt: normalized };
}
