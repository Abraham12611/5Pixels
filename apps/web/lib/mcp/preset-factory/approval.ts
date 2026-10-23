/**
 * Owner-bound write approval (#272).
 *
 * `confirm: true` in a tool call proves nothing — the model itself can set
 * it. Instead, every write requires an `approval_token` that can only be
 * minted inside the authenticated 5Pixels admin UI:
 *
 *   1. A write tool called without a token STAGES a server-held pending
 *      intent (canonical payload digest + sanitized itemized summary in
 *      the dedicated `preset_factory_write_intents` table via A's
 *      SECURITY DEFINER stage RPC, 15-min TTL) and refuses.
 *   2. The owner opens `/admin/preset-factory/approve?intent=<id>` (cookie
 *      session, requireAdmin), reviews the REAL staged items — names,
 *      slugs, types, visibility/safety/composition/model settings; never
 *      recipe text — and clicks Approve → the server action runs the
 *      atomic claim RPC FIRST (exactly one pending→claimed transition)
 *      and only then mints a token bound to the claimed digest.
 *   3. The owner pastes the token back into the conversation; the model
 *      re-calls the write tool with `approval_token`.
 *
 * The token binds: the approving user's id · the operation · the payload
 * digest · an expiry. Verification is HMAC-SHA256 over the serialized
 * token body — the model can neither mint nor extend one, and a token for
 * a different payload/user/operation is rejected. Tokens are repeatable
 * until expiry (safe retries; writes are idempotent) — see TOKEN SEMANTICS
 * below for the precise boundary.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PresetDraftItem } from "@/lib/preset-factory/contract";

export const APPROVAL_TTL_SECONDS = 600;
const TOKEN_VERSION = "pfa1";

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

/** SHA-256 of the canonical payload — the digest the owner verifies. */
export function payloadDigest(payload: unknown): string {
  return createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

function approvalSecret(): string | null {
  const secret = process.env.PRESET_FACTORY_APPROVAL_SECRET;
  return secret && secret.length >= 16 ? secret : null;
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function unb64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

interface TokenPayload {
  uid: string;
  op: ApprovableOperation;
  d: string;
  exp: number;
}

/**
 * Mint a write-approval token. Only reachable from the authenticated admin
 * server action — never through MCP.
 */
export function mintApprovalToken(opts: {
  userId: string;
  operation: ApprovableOperation;
  digest: string;
  ttlSeconds?: number;
}): { token: string; expires_at: string } {
  const secret = approvalSecret();
  if (!secret) {
    throw new Error("PRESET_FACTORY_APPROVAL_SECRET is not configured.");
  }
  const exp = Math.floor(Date.now() / 1000) + (opts.ttlSeconds ?? APPROVAL_TTL_SECONDS);
  const payload: TokenPayload = { uid: opts.userId, op: opts.operation, d: opts.digest, exp };
  const body = `${TOKEN_VERSION}.${b64url(JSON.stringify(payload))}`;
  return {
    token: `${body}.${sign(body, secret)}`,
    expires_at: new Date(exp * 1000).toISOString(),
  };
}

export type ApprovalCheck =
  | { ok: true }
  | { ok: false; reason: "unconfigured" | "malformed" | "bad_signature" | "expired" | "wrong_user" | "wrong_operation" | "digest_mismatch" };

/**
 * Verify a token against the exact canonical payload about to be written,
 * the authenticated caller, and the operation — fail closed on any drift.
 */
export function verifyApprovalToken(
  token: string,
  expected: { userId: string; operation: ApprovableOperation; digest: string }
): ApprovalCheck {
  const secret = approvalSecret();
  if (!secret) return { ok: false, reason: "unconfigured" };

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) {
    return { ok: false, reason: "malformed" };
  }
  const body = `${parts[0]}.${parts[1]}`;
  const expectedSig = sign(body, secret);
  const a = Buffer.from(parts[2], "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(unb64url(parts[1])) as TokenPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof payload.exp !== "number" || payload.exp <= Date.now() / 1000) {
    return { ok: false, reason: "expired" };
  }
  if (payload.uid !== expected.userId) return { ok: false, reason: "wrong_user" };
  if (payload.op !== expected.operation) return { ok: false, reason: "wrong_operation" };
  if (payload.d !== expected.digest) return { ok: false, reason: "digest_mismatch" };
  return { ok: true };
}

/** Shape returned by write tools when the owner has not approved yet. */
export function approvalRequired(opts: {
  operation: ApprovableOperation;
  digest: string;
  intentId: string;
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
      approval_url: approvalUrl,
      expires_in_seconds: INTENT_TTL_SECONDS,
      instructions_for_owner:
        "Open the approval link — it shows the exact items this request will write. If they match what you saw here, click Approve and paste the returned token back as approval_token.",
    },
  };
}

// ---------------------------------------------------------------------------
// Pending write intents — server-held, user-bound, short-lived, one-shot.
//
// Storage: `preset_factory_write_intents`, a dedicated table owned by
// Engineer A's migration (spec posted on #271) — deliberately NOT
// `admin_audit_logs`, whose `is_admin()`-wide ALL policy lets any admin
// mutate any admin's rows. The table has no direct INSERT/UPDATE for
// `authenticated`; all mutations go through two SECURITY DEFINER RPCs:
//
//   preset_factory_stage_write_intent(operation, digest, summary, ttl)
//     → inserts with requester = auth.uid() server-side; returns intent id.
//   preset_factory_claim_write_intent(intent_id)
//     → single conditional UPDATE … RETURNING (requester = auth.uid(),
//       status='pending', unexpired): the atomic one-shot claim. The mint
//       action signs ONLY the digest/operation returned by this claim.
//
// Reads (approve-page display) use a requester-scoped SELECT policy —
// a viewer can only ever read their own intents.
//
// TOKEN SEMANTICS (honest): one successful mint per intent is enforced
// atomically by the claim; the resulting token is REPEATABLE until its
// 10-minute expiry so a dropped response can be retried safely — replay
// cannot double-write because the underlying draft RPC is idempotent on
// (batch_id, item idempotency keys, server-computed fingerprint). The
// token is NOT one-use and does not create a new privilege: it gates the
// MCP tool surface only. An admin's own Supabase JWT already carries the
// same PostgREST/RPC rights the admin UI uses — see README § boundary.
// ---------------------------------------------------------------------------

export const INTENT_TTL_SECONDS = 900; // 15 minutes
const INTENTS_TABLE = "preset_factory_write_intents";
const STAGE_RPC = "preset_factory_stage_write_intent";
const CLAIM_RPC = "preset_factory_claim_write_intent";
export const INTENT_STATUS_PENDING = "pending";
const INTENT_STATUS_CLAIMED = "claimed";

/** Safe preview of a draft item — identity + VISIBILITY/SAFETY/COMPOSITION
 * settings only, NEVER private recipe text (instruction templates,
 * negative prompts, model_config internals, field copy, asset payloads). */
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

/** Build the owner-facing preview from the canonical payload — strips all
 * private recipe material (instruction templates, negative prompts,
 * model_config internals, product-field copy, asset link payloads). */
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

/**
 * Stage a pending write intent via A's SECURITY DEFINER staging RPC — the
 * server binds `requester = auth.uid()` (never caller-supplied) and the
 * RPC applies the same `is_admin()` gate as the write RPCs. Callers use
 * their own token-scoped client, so a non-admin stage attempt fails at the
 * RPC, not in JS. Fails closed if A's intent migration is not deployed.
 */
export async function recordWriteIntent(
  supabase: SupabaseClient,
  opts: {
    operation: ApprovableOperation;
    digest: string;
    summary: IntentSummary;
  }
): Promise<{ ok: true; intentId: string } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc(STAGE_RPC, {
    p_operation: opts.operation,
    p_digest: opts.digest,
    p_summary: opts.summary as unknown as Record<string, unknown>,
    p_ttl_seconds: INTENT_TTL_SECONDS,
  });
  if (error || typeof data !== "string") {
    return {
      ok: false,
      error: `Could not stage approval request: ${error?.message ?? "intent RPC unavailable (requires A's preset_factory_write_intents migration)"}`,
    };
  }
  return { ok: true, intentId: data };
}

export interface StoredWriteIntent {
  intentId: string;
  operation: ApprovableOperation;
  digest: string;
  summary: IntentSummary;
  ownerId: string;
  status: string;
  expiresAt: string;
}

interface IntentRow {
  id: string;
  requester: string;
  operation: string;
  digest: string;
  summary: IntentSummary;
  status: string;
  expires_at: string;
}

function validateIntentRow(
  row: IntentRow | null,
  viewerUserId: string,
  intentId: string
): { ok: true; intent: StoredWriteIntent } | { ok: false; error: string } {
  if (!row) return { ok: false, error: "Approval request not found." };
  // Defense in depth on top of the requester-scoped SELECT policy.
  if (row.requester !== viewerUserId) {
    return { ok: false, error: "This approval request belongs to a different account." };
  }
  if (
    row.operation !== "create_draft_batch" &&
    row.operation !== "create_categories"
  ) {
    return { ok: false, error: "Unknown approval operation." };
  }
  if (
    typeof row.digest !== "string" ||
    !/^[0-9a-f]{64}$/.test(row.digest) ||
    !row.summary
  ) {
    return { ok: false, error: "Approval request is malformed." };
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return {
      ok: false,
      error: "This approval request has expired — ask the connector to stage a new one.",
    };
  }
  return {
    ok: true,
    intent: {
      intentId,
      operation: row.operation,
      digest: row.digest,
      summary: row.summary,
      ownerId: row.requester,
      status: row.status,
      expiresAt: row.expires_at,
    },
  };
}

/**
 * Load a staged intent for DISPLAY on the approval page (requester-scoped
 * SELECT policy — a viewer can only read their own intents). Only pending,
 * unexpired intents are approvable.
 */
export async function loadWriteIntent(
  supabase: SupabaseClient,
  intentId: string,
  viewerUserId: string
): Promise<{ ok: true; intent: StoredWriteIntent } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from(INTENTS_TABLE)
    .select("id, requester, operation, digest, summary, status, expires_at")
    .eq("id", intentId)
    .maybeSingle();
  if (error) {
    return { ok: false, error: `Approval request lookup failed: ${error.message}` };
  }
  const checked = validateIntentRow(data as IntentRow | null, viewerUserId, intentId);
  if (!checked.ok) return checked;
  if (checked.intent.status !== INTENT_STATUS_PENDING) {
    return {
      ok: false,
      error: "This approval request was already used or is no longer pending.",
    };
  }
  return checked;
}

/**
 * Atomically claim a pending intent — single conditional
 * `UPDATE … RETURNING` inside A's SECURITY DEFINER RPC
 * (requester = auth.uid(), status='pending', unexpired). Returns the
 * CLAIMED row whose digest the caller must sign — never a request-supplied
 * value. Empty result = already claimed, expired, or not yours.
 */
export async function claimWriteIntent(
  supabase: SupabaseClient,
  intentId: string,
  sessionUserId: string
): Promise<
  | { ok: true; intent: StoredWriteIntent }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase.rpc(CLAIM_RPC, {
    p_intent_id: intentId,
  });
  if (error) {
    return { ok: false, error: `Approval claim failed: ${error.message}` };
  }
  const rows = (data ?? []) as IntentRow[];
  if (rows.length !== 1) {
    return {
      ok: false,
      error:
        "Approval request is not claimable — already used, expired, or owned by another account.",
    };
  }
  const checked = validateIntentRow(
    { ...rows[0], status: INTENT_STATUS_CLAIMED },
    sessionUserId,
    intentId
  );
  return checked;
}
