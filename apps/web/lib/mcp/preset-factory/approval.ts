/**
 * Owner-bound write approval (#272) — integrated with Engineer A's
 * database-authoritative write-intent contract (#271 @26761c6).
 *
 * A's model is the authority: `preset_factory_write_intents` rows carry a
 * SQL-computed `payload_digest` + per-item canonical fingerprints, mutated
 * only through SECURITY DEFINER RPCs (no direct table writes). The draft
 * RPC itself gates OAuth-issued tokens on a matching approved intent —
 * approval is enforced at the database, not just this adapter.
 *
 * This module owns ONLY the ChatGPT-layer confirmation token:
 *
 *   1. A write tool called without a token asks A's `stageWriteIntent`
 *      (bearer context) to stage a pending intent — SQL fingerprints the
 *      exact canonical payload — and refuses with `approval_required`.
 *   2. The owner opens `/admin/preset-factory/approve?intent=<id>` —
 *      `getWriteIntent` shows the stored preview; `approveWriteIntent`
 *      performs the atomic pending→approved transition (OAuth callers are
 *      refused inside the RPC, so approval can only come from the cookie
 *      session). Only after `status='approved'` does the action mint a
 *      token bound to {owner id, operation, intent_id, A's SQL
 *      payload_digest, expiry}.
 *   3. The owner pastes the token back; the model re-calls the write tool.
 *      The adapter forwards `approval_intent_id` to `createPresetDrafts`
 *      (the RPC verifies + consumes fingerprints internally) and calls
 *      `consumeWriteIntent` per created category (categories can't be
 *      DB-gated — see A's contract doc).
 *
 * TOKEN SEMANTICS (honest): the HMAC token is a ChatGPT-layer proof that a
 * specific owner-approved intent backs this write call — it is NOT the
 * authorization authority for drafts (the DB gate is) and is NOT one-use:
 * it is repeatable until its 10-minute expiry so a dropped response can be
 * retried safely; the intent's own consumed-state plus the idempotency
 * ledger make replays safe. One mint per approval is enforced because the
 * pending→approved transition itself is atomic.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { PresetDraftItem } from "@/lib/preset-factory/contract";

export const APPROVAL_TTL_SECONDS = 600;
const TOKEN_VERSION = "pfa2";

export type ApprovableOperation = "create_draft_batch" | "create_categories";

/** Deterministic JSON serialization — sorted keys, no whitespace. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)
    .join(",")}}`;
}

/** sha256 of the canonical payload — used for deterministic batch_id
 * derivation ONLY. It is never approval authority: the DB's own canonical
 * fingerprint decides what an intent covers. */
export function payloadDigest(payload: unknown): string {
  return createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

// ---------------------------------------------------------------------------
// HMAC approval token — binds {approver, operation, intent, SQL digest, exp}
// ---------------------------------------------------------------------------

function approvalSecret(): string {
  const secret = process.env.PRESET_FACTORY_APPROVAL_SECRET;
  if (!secret) {
    throw new Error(
      "PRESET_FACTORY_APPROVAL_SECRET is not configured — write approvals are disabled."
    );
  }
  return secret;
}

function sign(body: string): string {
  return createHmac("sha256", approvalSecret()).update(body).digest("base64url");
}

export function mintApprovalToken(opts: {
  userId: string;
  operation: ApprovableOperation;
  intentId: string;
  /** A's SQL-computed `payload_digest` for the staged intent — provenance,
   *  not a separately calculated check value. */
  digest: string;
  ttlSeconds?: number;
}): { token: string; expires_at: string } {
  const exp = Math.floor(Date.now() / 1000) + (opts.ttlSeconds ?? APPROVAL_TTL_SECONDS);
  const body = canonicalJson({
    v: TOKEN_VERSION,
    uid: opts.userId,
    op: opts.operation,
    iid: opts.intentId,
    dg: opts.digest,
    exp,
  });
  const token = `${TOKEN_VERSION}.${Buffer.from(body, "utf8").toString("base64url")}.${sign(body)}`;
  return { token, expires_at: new Date(exp * 1000).toISOString() };
}

export type ApprovalRejection =
  | "malformed"
  | "bad_signature"
  | "expired"
  | "user_mismatch"
  | "operation_mismatch";

export function verifyApprovalToken(
  token: string,
  expected: { userId: string; operation: ApprovableOperation }
): { ok: true; intentId: string; digest: string } | { ok: false; reason: ApprovalRejection } {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) {
    return { ok: false, reason: "malformed" };
  }
  let payload: {
    v?: string;
    uid?: string;
    op?: string;
    iid?: string;
    dg?: string;
    exp?: number;
  };
  try {
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const body = canonicalJson({
    v: payload.v,
    uid: payload.uid,
    op: payload.op,
    iid: payload.iid,
    dg: payload.dg,
    exp: payload.exp,
  });
  const expectedSig = Buffer.from(sign(body));
  const actualSig = Buffer.from(parts[2]);
  if (
    expectedSig.length !== actualSig.length ||
    !timingSafeEqual(expectedSig, actualSig)
  ) {
    return { ok: false, reason: "bad_signature" };
  }
  if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (payload.uid !== expected.userId) return { ok: false, reason: "user_mismatch" };
  if (payload.op !== expected.operation) {
    return { ok: false, reason: "operation_mismatch" };
  }
  if (typeof payload.iid !== "string" || !payload.iid || typeof payload.dg !== "string") {
    return { ok: false, reason: "malformed" };
  }
  return { ok: true, intentId: payload.iid, digest: payload.dg };
}

/** Shape returned by write tools when the owner has not approved yet. */
export function approvalRequired(opts: {
  operation: ApprovableOperation;
  intentId: string;
  /** A's SQL-computed digest over the staged canonical payload. */
  digest: string;
  /** Per-item SQL fingerprints — the model echoes these back so the
   *  adapter can consume each approved unit (categories only; drafts are
   *  consumed inside A's draft RPC via approval_intent_id). */
  itemFingerprints: string[];
  expiresAt: string;
  siteOrigin: string;
}) {
  const approvalUrl =
    `${opts.siteOrigin}/admin/preset-factory/approve` +
    `?intent=${encodeURIComponent(opts.intentId)}`;
  return {
    code: "approval_required" as const,
    message:
      "The owner must approve this exact request in the 5Pixels admin UI before it can be written.",
    approval: {
      operation: opts.operation,
      intent_id: opts.intentId,
      digest: opts.digest,
      item_fingerprints: opts.itemFingerprints,
      approval_url: approvalUrl,
      expires_at: opts.expiresAt,
      instructions_for_owner:
        "Open the approval link — it shows the exact items this request will write. If they match what you saw here, click Approve and paste the returned token back as approval_token (re-call with the SAME payload).",
    },
  };
}

// ---------------------------------------------------------------------------
// Owner-facing preview — sanitized summary stored as the intent's `preview`.
// Identity + visibility/safety/composition settings only; the stage RPC
// additionally rejects recipe-field names as defense-in-depth.
// ---------------------------------------------------------------------------

/** Safe preview of a draft item — NEVER private recipe text (instruction
 * templates, negative prompts, model_config internals, field copy, asset
 * payloads). */
export interface IntentItemPreview {
  client_item_id: string;
  name: string;
  slug: string;
  type: string;
  short_description: string | null;
  category_id: string | null;
  parent_preset_id: string | null;
  variant_display_name: string | null;
  visibility: string;
  standalone_discoverable: boolean;
  featured_rank: number | null;
  /** Composition hints — safe scalars, not recipe text. */
  style_archetype: string | null;
  identity_preservation: string | null;
  layout_template: string | null;
  provider: string;
  model: string;
  input_mode: string | null;
  input_image_range: string | null;
  safety: {
    allowed_nsfw: boolean | null;
    block_public_figures: boolean | null;
    block_minors: boolean | null;
    policy_version: string | null;
  };
  post_process: {
    format: string | null;
    quality: number | null;
    crop: boolean | null;
  };
  credit_cost: number | null;
  output_sizes: { width: number; height: number }[];
  field_count: number;
  asset_link_count: number;
}

export interface IntentCategoryPreview {
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
}

export interface IntentSummary {
  operation: ApprovableOperation;
  items?: IntentItemPreview[];
  categories?: IntentCategoryPreview[];
  total_items: number;
}

/** Build the owner-facing preview from the canonical payload — the same
 * normalized items the stage RPC fingerprints, so the preview the owner
 * sees always describes the payload the approval binds. */
export function buildIntentSummary(
  operation: ApprovableOperation,
  canonical: unknown
): IntentSummary {
  if (operation === "create_draft_batch") {
    const items = ((canonical as { items?: PresetDraftItem[] }).items ?? []).map(
      (i): IntentItemPreview => {
        const cap = i.version?.input_capability;
        return {
          client_item_id: i.client_item_id,
          name: i.product?.name ?? "?",
          slug: i.product?.slug ?? "?",
          type: i.product?.type ?? "?",
          short_description: i.product?.short_description ?? null,
          category_id: i.product?.category_id ?? null,
          parent_preset_id: i.product?.parent_preset_id ?? null,
          variant_display_name: i.product?.variant_display_name ?? null,
          visibility: i.product?.visibility ?? "public",
          standalone_discoverable: i.product?.standalone_discoverable ?? false,
          featured_rank: i.product?.featured_rank ?? null,
          style_archetype: i.product?.filter_config?.style_archetype ?? null,
          identity_preservation:
            i.product?.filter_config?.identity_preservation ?? null,
          layout_template: i.product?.poster_config?.layout_template ?? null,
          provider: i.version?.provider_strategy?.primary_provider ?? "?",
          model: i.version?.provider_strategy?.primary_model ?? "?",
          input_mode: cap?.input_mode ?? null,
          input_image_range:
            cap != null ? `${cap.input_min_images}–${cap.input_max_images}` : null,
          safety: {
            allowed_nsfw: i.version?.safety_config?.allowed_nsfw ?? null,
            block_public_figures:
              i.version?.safety_config?.block_public_figures ?? null,
            block_minors: i.version?.safety_config?.block_minors ?? null,
            policy_version: i.version?.safety_config?.policy_version ?? null,
          },
          post_process: {
            format: i.version?.post_process_config?.format ?? null,
            quality: i.version?.post_process_config?.quality ?? null,
            crop: i.version?.post_process_config?.crop ?? null,
          },
          credit_cost: i.version?.credit_cost ?? null,
          output_sizes: (i.version?.output_sizes ?? []).map((s) => ({
            width: s.width,
            height: s.height,
          })),
          field_count: i.fields?.length ?? 0,
          asset_link_count: i.asset_links?.length ?? 0,
        };
      }
    );
    return { operation, items, total_items: items.length };
  }
  const categories = (
    (canonical as { categories?: { name: string; slug: string; description?: string; sort_order: number }[] })
      .categories ?? []
  ).map(
    (c): IntentCategoryPreview => ({
      name: c.name,
      slug: c.slug,
      description: c.description ?? null,
      sort_order: c.sort_order ?? 0,
    })
  );
  return { operation, categories, total_items: categories.length };
}
