/**
 * Owner-bound write approval (#272).
 *
 * `confirm: true` in a tool call proves nothing — the model itself can set
 * it. Instead, every write requires an `approval_token` that can only be
 * minted inside the authenticated 5Pixels admin UI:
 *
 *   1. A write tool called without a token STAGES a server-held pending
 *      intent (canonical payload digest + sanitized itemized summary in
 *      `admin_audit_logs`, admin-only RLS, 15-min TTL) and refuses.
 *   2. The owner opens `/admin/preset-factory/approve?intent=<id>` (cookie
 *      session, requireAdmin), reviews the REAL staged items — names,
 *      slugs, types, model config, counts; never recipe text — and clicks
 *      Approve → the server action re-validates the stored intent and
 *      mints a token bound to its digest.
 *   3. The owner pastes the token back into the conversation; the model
 *      re-calls the write tool with `approval_token`.
 *
 * The token binds: the approving user's id · the operation · the payload
 * digest · an expiry. Verification is HMAC-SHA256 over the serialized
 * token body — the model can neither mint nor extend one, and a token for
 * a different payload/user/operation is rejected.
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
// Pending write intents — server-held, user-bound, short-lived.
//
// A refused write STAGES an intent row instead of asking the owner to trust
// a model-rendered summary: the canonical payload's sanitized summary and
// its digest are stored in `admin_audit_logs` (admin-only RLS, no new
// schema), keyed by a fresh intent id. The approval page reads the row back
// and displays the REAL itemized request; minting validates the stored row
// (ownership, freshness, pending state) — never a caller-supplied digest.
// ---------------------------------------------------------------------------

export const INTENT_TTL_SECONDS = 900; // 15 minutes
const INTENT_ACTION = "mcp.write_intent";
const INTENT_ENTITY = "preset_factory_write_intent";
const INTENT_PENDING = "pending";
const INTENT_APPROVED = "approved";

/** Safe preview of a draft item — names/settings only, NEVER recipe text. */
export interface IntentItemPreview {
  client_item_id: string;
  name: string;
  slug: string;
  type: string;
  category_id: string | null;
  parent_preset_id: string | null;
  provider: string;
  model: string;
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
 * private recipe material (instruction templates, negative prompts). */
export function buildIntentSummary(
  operation: ApprovableOperation,
  canonical: unknown
): IntentSummary {
  if (operation === "create_draft_batch") {
    const items = ((canonical as { items?: PresetDraftItem[] }).items ?? []).map(
      (i): IntentItemPreview => ({
        client_item_id: i.client_item_id,
        name: i.product?.name ?? "?",
        slug: i.product?.slug ?? "?",
        type: i.product?.type ?? "?",
        category_id: i.product?.category_id ?? null,
        parent_preset_id: i.product?.parent_preset_id ?? null,
        provider: i.version?.provider_strategy?.primary_provider ?? "?",
        model: i.version?.provider_strategy?.primary_model ?? "?",
        output_sizes: (i.version?.output_sizes ?? []).map((s) => ({
          width: s.width,
          height: s.height,
        })),
        field_count: i.fields?.length ?? 0,
        asset_link_count: i.asset_links?.length ?? 0,
      })
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

/** Stage a pending write intent. The row is written through the caller's
 * own scoped client — admin-only RLS means a non-admin caller can't stage. */
export async function recordWriteIntent(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    operation: ApprovableOperation;
    digest: string;
    summary: IntentSummary;
  }
): Promise<{ ok: true; intentId: string } | { ok: false; error: string }> {
  const intentId = crypto.randomUUID();
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_user_id: opts.userId,
    action: `${INTENT_ACTION}.${opts.operation}`,
    entity_type: INTENT_ENTITY,
    entity_id: intentId,
    after: {
      digest: opts.digest,
      summary: opts.summary,
      expires_at: new Date(Date.now() + INTENT_TTL_SECONDS * 1000).toISOString(),
    },
    reason: INTENT_PENDING,
  });
  if (error) {
    return { ok: false, error: `Could not stage approval request: ${error.message}` };
  }
  return { ok: true, intentId };
}

export interface StoredWriteIntent {
  intentId: string;
  operation: ApprovableOperation;
  digest: string;
  summary: IntentSummary;
  ownerId: string;
  expiresAt: string;
}

/**
 * Load + validate a staged intent for the approval page. Enforces:
 * the row is a pending intent, belongs to the viewing user, and has not
 * expired — anything else is refused.
 */
export async function loadWriteIntent(
  supabase: SupabaseClient,
  intentId: string,
  viewerUserId: string
): Promise<{ ok: true; intent: StoredWriteIntent } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("entity_id, admin_user_id, action, reason, after, created_at")
    .eq("entity_type", INTENT_ENTITY)
    .eq("entity_id", intentId)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, error: "Approval request not found." };
  }
  if (data.admin_user_id !== viewerUserId) {
    return { ok: false, error: "This approval request belongs to a different account." };
  }
  if (typeof data.action !== "string" || !data.action.startsWith(`${INTENT_ACTION}.`)) {
    return { ok: false, error: "Not a write-approval request." };
  }
  if (data.reason !== INTENT_PENDING) {
    return { ok: false, error: "This approval request was already used or is no longer pending." };
  }
  const body = (data.after ?? {}) as {
    digest?: string;
    summary?: IntentSummary;
    expires_at?: string;
  };
  const expiresAt = typeof body.expires_at === "string" ? body.expires_at : null;
  if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
    return { ok: false, error: "This approval request has expired — ask the connector to stage a new one." };
  }
  const operation = data.action.slice(INTENT_ACTION.length + 1) as ApprovableOperation;
  if (operation !== "create_draft_batch" && operation !== "create_categories") {
    return { ok: false, error: "Unknown approval operation." };
  }
  if (typeof body.digest !== "string" || !/^[0-9a-f]{64}$/.test(body.digest) || !body.summary) {
    return { ok: false, error: "Approval request is malformed." };
  }
  return {
    ok: true,
    intent: {
      intentId,
      operation,
      digest: body.digest,
      summary: body.summary,
      ownerId: data.admin_user_id as string,
      expiresAt,
    },
  };
}

/** Mark a staged intent consumed so the same row cannot mint twice. */
export async function consumeWriteIntent(
  supabase: SupabaseClient,
  intentId: string
): Promise<void> {
  await supabase
    .from("admin_audit_logs")
    .update({ reason: INTENT_APPROVED })
    .eq("entity_type", INTENT_ENTITY)
    .eq("entity_id", intentId)
    .eq("reason", INTENT_PENDING);
}
