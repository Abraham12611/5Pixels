import { outputSizeKey } from "@/components/consumer/aspect-ratio-menu";
import type { OutputSizeOption } from "@/types/catalog";

/**
 * Everything that prices a generation is cost-bearing input. The client
 * serializes this shape to prove that a displayed or confirmed price still
 * matches the configured run; the server recomputes the same dimensions and
 * remains authoritative on charge.
 *
 * Preset Studio 2.0 extends this with per-input asset counts and roles,
 * preset-variant ids, prompt/options contributions, and model settings —
 * add fields here rather than forking the comparison.
 */
export interface QuoteFingerprintInput {
  productVersionId: string;
  /** The resolved estimate size — match_source uses measured photo dims. */
  outputSize: OutputSizeOption;
  /** A match_source pick whose real photo dims haven't decoded yet — the
   *  fallback dims can't safely price this run. */
  sourceDimsPending?: boolean;
  /** Ordered input references as submitted — ordinal is semantically
   *  significant (subject vs reference), and the server quote binds the
   *  ordered ids + roles, so a swap must invalidate client consent too.
   *  `id` is the finalized asset id when known, else a local slot id so a
   *  pending upload still shifts the fingerprint (#178). */
  inputs?: { id: string; role?: string | null }[];
  /** The normalized user prompt — bound into the server quote hash; only
   *  present on presets with prompt_override_enabled (#182). */
  prompt?: string;
}

/** Stable serialization — same priced inputs always produce the same key. */
export function quoteFingerprintKey(input: QuoteFingerprintInput): string {
  return JSON.stringify({
    v: input.productVersionId,
    size: outputSizeKey(input.outputSize),
    pending: input.sourceDimsPending === true,
    inputs: (input.inputs ?? []).map((i) => [i.id, i.role ?? null]),
    prompt: input.prompt ?? null,
  });
}
