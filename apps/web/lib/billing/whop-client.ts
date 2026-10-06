import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Whop billing provider (merchant of record). Thin REST client over
 * api.whop.com — mirrors creem-client.ts: our surface is small (checkout
 * configurations, payments refund, membership read), and a hand-rolled
 * client is easier to audit than the SDK.
 *
 * products map to internal plans via Whop *variants* (the `plan_…` ids),
 * resolved per environment from plans.metadata
 * (`whop_variant_id_sandbox` / `whop_variant_id_live`), with
 * `WHOP_VARIANT_ID_OVERRIDES` taking top priority.
 */

export function whopApiKey(): string | null {
  return process.env.WHOP_API_KEY?.trim() ?? null;
}

export function whopAccountId(): string | null {
  return process.env.WHOP_ACCOUNT_ID?.trim() ?? null;
}

export function whopWebhookSecret(): string | null {
  return process.env.WHOP_WEBHOOK_SECRET?.trim() ?? null;
}

export function isWhopConfigured(): boolean {
  return Boolean(whopApiKey() && whopAccountId());
}

/**
 * Whop doesn't scope keys by prefix. `WHOP_ENVIRONMENT=sandbox` selects the
 * sandbox metadata keys; anything else (including unset) is live.
 */
export function whopEnvironment(): "sandbox" | "live" {
  return process.env.WHOP_ENVIRONMENT?.trim() === "sandbox"
    ? "sandbox"
    : "live";
}

const WHOP_API_BASE = "https://api.whop.com/api/v1";

/**
 * `WHOP_VARIANT_ID_OVERRIDES` is an optional JSON object mapping plan slug
 * (or plan id) → Whop variant id, e.g. {"monthly-pro":"plan_abc"}.
 * Lets ids be swapped via Vercel env config without a DB update; entries
 * override plans.metadata when present.
 */
export function whopVariantIdOverrides(): Record<string, string> {
  const raw = process.env.WHOP_VARIANT_ID_OVERRIDES?.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.length > 0) out[key] = value;
    }
    return out;
  } catch {
    console.error("[whop] WHOP_VARIANT_ID_OVERRIDES is not valid JSON");
    return {};
  }
}

/**
 * Reverse of the override map: returns the plan slug/id whose override
 * maps to the given Whop variant id, or null. Used by webhook fulfillment
 * to resolve plans when the env map overrode the checkout variant id.
 */
export function whopPlanKeyForVariantId(variantId: string): string | null {
  for (const [key, id] of Object.entries(whopVariantIdOverrides())) {
    if (id === variantId) return key;
  }
  return null;
}

/**
 * Resolves a plan's Whop variant id. Priority: WHOP_VARIANT_ID_OVERRIDES
 * (keyed by plan slug or id) → env-scoped plans.metadata
 * (`whop_variant_id_sandbox` / `whop_variant_id_live`) → legacy
 * `whop_variant_id`.
 */
export function resolveWhopVariantId(
  metadata: unknown,
  planKey?: string | null
): string | null {
  if (planKey) {
    const override = whopVariantIdOverrides()[planKey];
    if (override) return override;
  }

  const meta = (metadata ?? {}) as Record<string, unknown>;
  const scoped = meta[`whop_variant_id_${whopEnvironment()}`];
  if (typeof scoped === "string" && scoped.length > 0) return scoped;

  const legacy = meta.whop_variant_id;
  return typeof legacy === "string" && legacy.length > 0 ? legacy : null;
}

const REQUEST_TIMEOUT_MS = 10_000;

export class WhopApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "WhopApiError";
  }
}

async function whopRequest<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown
): Promise<T> {
  const apiKey = whopApiKey();
  if (!apiKey) throw new WhopApiError(0, "WHOP_API_KEY is not set");

  const res = await fetch(`${WHOP_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error body */
  }

  if (!res.ok) {
    const message =
      (json as { message?: string; error?: { message?: string } })?.message ??
      (json as { error?: { message?: string } })?.error?.message ??
      `Whop API ${res.status}`;
    throw new WhopApiError(res.status, String(message));
  }
  return json as T;
}

/* ---------- API surfaces ---------- */

export interface WhopCheckoutConfigurationRequest {
  /** Whop variant id (plan_…) the buyer is purchasing. */
  planId: string;
  /** Where Whop sends the buyer after checkout, whatever the outcome. */
  redirectUrl?: string;
  /** Copied onto the payment and its webhooks — carries user_id/plan_id. */
  metadata?: Record<string, unknown>;
}

export interface WhopCheckoutConfigurationResponse {
  id: string;
  purchase_url?: string;
  metadata?: Record<string, unknown>;
}

export function createWhopCheckoutConfiguration(
  input: WhopCheckoutConfigurationRequest
): Promise<WhopCheckoutConfigurationResponse> {
  const accountId = whopAccountId();
  if (!accountId) throw new WhopApiError(0, "WHOP_ACCOUNT_ID is not set");
  return whopRequest("POST", "/checkout_configurations", {
    account_id: accountId,
    plan_id: input.planId,
    redirect_url: input.redirectUrl,
    metadata: input.metadata,
  });
}

export function getWhopMembership(
  membershipId: string
): Promise<Record<string, unknown>> {
  return whopRequest("GET", `/memberships/${encodeURIComponent(membershipId)}`);
}

export function refundWhopPayment(
  paymentId: string,
  partialAmount?: number
): Promise<Record<string, unknown>> {
  return whopRequest(
    "POST",
    `/payments/${encodeURIComponent(paymentId)}/refunds`,
    partialAmount === undefined ? {} : { partial_amount: partialAmount }
  );
}

/* ---------- Webhooks (Standard Webhooks spec) ---------- */

/**
 * Whop signs `{webhook-id}.{webhook-timestamp}.{raw body}` with HMAC-SHA256,
 * keyed by the `ws_…` webhook secret (base64-decoded after the prefix).
 * The `webhook-signature` header carries `v1,<base64>` (possibly multiple
 * space-separated signatures). Timestamps more than 5 minutes out are
 * rejected to prevent replay.
 *
 * `unwrapWebhook` from `@whop/sdk/helpers` was unreleased when this was
 * written — this manual verifier follows the documented spec exactly.
 */
const WHOP_SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

function whopSigningKey(secret: string): Buffer {
  // `ws_`-prefixed secrets are base64 payloads; a bare secret is used as-is.
  const raw = secret.startsWith("ws_") ? secret.slice(3) : secret;
  try {
    return Buffer.from(raw, "base64");
  } catch {
    return Buffer.from(raw, "utf8");
  }
}

export function verifyWhopSignature(input: {
  rawBody: string;
  webhookId: string | null;
  webhookTimestamp: string | null;
  signature: string | null;
  secret: string;
  nowSeconds?: number;
}): boolean {
  const { rawBody, webhookId, webhookTimestamp, signature, secret } = input;
  if (!webhookId || !webhookTimestamp || !signature) return false;

  const timestampSeconds = Number(webhookTimestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (
    Math.abs(now - timestampSeconds) > WHOP_SIGNATURE_TOLERANCE_SECONDS
  ) {
    return false;
  }

  const expected = createHmac("sha256", whopSigningKey(secret))
    .update(`${webhookId}.${webhookTimestamp}.${rawBody}`)
    .digest("base64");

  // Header can carry several `v1,...` signatures separated by spaces.
  for (const candidate of signature.split(" ")) {
    const trimmed = candidate.trim();
    if (!trimmed.startsWith("v1,")) continue;
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(trimmed.slice(3), "utf8");
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}
