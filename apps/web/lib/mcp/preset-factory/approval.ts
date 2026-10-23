/**
 * Owner-bound write approval (#272).
 *
 * `confirm: true` in a tool call proves nothing — the model itself can set
 * it. Instead, every write requires an `approval_token` that can only be
 * minted inside the authenticated 5Pixels admin UI:
 *
 *   1. A write tool called without a token refuses, returning
 *      `approval_required` + a canonical `digest` of the exact payload the
 *      backend would receive (after key derivation — nothing can shift
 *      between approval and write).
 *   2. The owner opens `/admin/preset-factory/approve` (cookie session,
 *      requireAdmin), verifies the digest matches what ChatGPT showed, and
 *      clicks Approve → the server action mints a token.
 *   3. The owner pastes the token back into the conversation; the model
 *      re-calls the write tool with `approval_token`.
 *
 * The token binds: the approving user's id · the operation · the payload
 * digest · an expiry. Verification is HMAC-SHA256 over the serialized
 * token body — the model can neither mint nor extend one, and a token for
 * a different payload/user/operation is rejected.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

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
  siteOrigin: string;
}) {
  const approvalUrl =
    `${opts.siteOrigin}/admin/preset-factory/approve` +
    `?op=${encodeURIComponent(opts.operation)}&d=${encodeURIComponent(opts.digest)}`;
  return {
    code: "approval_required" as const,
    message:
      "The owner must approve this exact payload in the 5Pixels admin UI before it can be written.",
    approval: {
      operation: opts.operation,
      digest: opts.digest,
      approval_url: approvalUrl,
      expires_in_seconds: APPROVAL_TTL_SECONDS,
      instructions_for_owner:
        "Open the approval link, confirm the digest matches the payload shown in this conversation, click Approve, and paste the returned token here as approval_token.",
    },
  };
}
