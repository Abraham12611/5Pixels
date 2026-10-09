import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Bachs billing provider. Thin REST client over sandbox-api.bachs.io /
 * api.bachs.io — mirrors whop-client.ts: our surface is small (checkout
 * sessions, refunds, subscriptions, customer portal sessions), and a
 * hand-rolled client is easier to audit than an SDK.
 *
 * Bachs is the seller-of-record platform, NOT merchant of record — the
 * merchant remains seller of record, unlike Whop/Creem.
 *
 * Products map to internal plans via `prod_*` ids, resolved per
 * environment from plans.metadata (`bachs_product_id_sandbox` /
 * `bachs_product_id_live`), with `BACHS_PRODUCT_ID_OVERRIDES` taking top
 * priority.
 *
 * Money is always a decimal string at the currency's precision ("29.00")
 * paired with an ISO 4217 currency — never minor units on the wire. We
 * convert to cents only for our internal amount_cents columns.
 */

export function bachsApiKey(): string | null {
  return process.env.BACHS_API_KEY?.trim() ?? null;
}

export function bachsWebhookSecret(): string | null {
  return process.env.BACHS_WEBHOOK_SECRET?.trim() ?? null;
}

export function isBachsConfigured(): boolean {
  return Boolean(bachsApiKey());
}

/**
 * `BACHS_ENVIRONMENT=sandbox` selects the sandbox API + sandbox metadata
 * keys; anything else (including unset) is live. Keys are also prefixed
 * (`sk_sandbox_` / `sk_live_`) so a mismatched env fails fast at the API.
 */
export function bachsEnvironment(): "sandbox" | "live" {
  return process.env.BACHS_ENVIRONMENT?.trim() === "sandbox"
    ? "sandbox"
    : "live";
}

function bachsApiBase(): string {
  return bachsEnvironment() === "sandbox"
    ? "https://sandbox-api.bachs.io"
    : "https://api.bachs.io";
}

/**
 * `BACHS_PRODUCT_ID_OVERRIDES` is an optional JSON object mapping plan
 * slug (or plan id) → Bachs product id, e.g. {"monthly-pro":"prod_abc"}.
 * Lets ids be swapped via Vercel env config without a DB update; entries
 * override plans.metadata when present.
 */
export function bachsProductIdOverrides(): Record<string, string> {
  const raw = process.env.BACHS_PRODUCT_ID_OVERRIDES?.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.length > 0) out[key] = value;
    }
    return out;
  } catch {
    console.error("[bachs] BACHS_PRODUCT_ID_OVERRIDES is not valid JSON");
    return {};
  }
}

/**
 * Reverse of the override map: returns the plan slug/id whose override
 * maps to the given Bachs product id, or null. Used by webhook
 * fulfillment to resolve plans when the env map overrode the checkout
 * product id.
 */
export function bachsPlanKeyForProductId(productId: string): string | null {
  for (const [key, id] of Object.entries(bachsProductIdOverrides())) {
    if (id === productId) return key;
  }
  return null;
}

/**
 * Resolves a plan's Bachs product id. Priority: BACHS_PRODUCT_ID_OVERRIDES
 * (keyed by plan slug or id) → env-scoped plans.metadata
 * (`bachs_product_id_sandbox` / `bachs_product_id_live`) → legacy
 * `bachs_product_id`.
 */
export function resolveBachsProductId(
  metadata: unknown,
  planKey?: string | null
): string | null {
  if (planKey) {
    const override = bachsProductIdOverrides()[planKey];
    if (override) return override;
  }

  const meta = (metadata ?? {}) as Record<string, unknown>;
  const scoped = meta[`bachs_product_id_${bachsEnvironment()}`];
  if (typeof scoped === "string" && scoped.length > 0) return scoped;

  const legacy = meta.bachs_product_id;
  return typeof legacy === "string" && legacy.length > 0 ? legacy : null;
}

const REQUEST_TIMEOUT_MS = 10_000;

export class BachsApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "BachsApiError";
  }
}

async function bachsRequest<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const apiKey = bachsApiKey();
  if (!apiKey) throw new BachsApiError(0, "BACHS_API_KEY is not set");

  const res = await fetch(`${bachsApiBase()}${path}`, {
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
      `Bachs API ${res.status}`;
    throw new BachsApiError(res.status, String(message));
  }
  return json as T;
}

/* ---------- API surfaces ---------- */

export interface BachsCheckoutSessionRequest {
  /** One or more catalog products; we always send a single-item cart. */
  productCart: { productId: string; quantity: number }[];
  /** New customer: {email, name}; existing: {customerId}. */
  customer?: { email?: string; name?: string; customerId?: string };
  /** "always" persists the buyer as a customer; default "if_required". */
  customerCreation?: "always" | "if_required";
  successUrl?: string;
  cancelUrl?: string;
  /** Our own order/charge reference — unique per org, echoes in webhooks. */
  reference?: string;
  /** Copied onto the charge; for recurring products also onto the sub. */
  metadata?: Record<string, unknown>;
}

export interface BachsCheckoutSessionResponse {
  checkout_id: string;
  checkout_url: string;
  status?: string;
  expires_at?: string;
}

export function createBachsCheckoutSession(
  input: BachsCheckoutSessionRequest
): Promise<BachsCheckoutSessionResponse> {
  return bachsRequest("POST", "/v1/checkout-sessions", {
    product_cart: input.productCart.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
    customer: input.customer
      ? input.customer.customerId
        ? { customer_id: input.customer.customerId }
        : { email: input.customer.email, name: input.customer.name }
      : undefined,
    customer_creation: input.customerCreation,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    reference: input.reference,
    metadata: input.metadata,
  });
}

export function getBachsSubscription(
  subscriptionId: string
): Promise<Record<string, unknown>> {
  return bachsRequest(
    "GET",
    `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`
  );
}

export function cancelBachsSubscription(
  subscriptionId: string,
  input: { cancelAtPeriodEnd: boolean; reason?: string }
): Promise<Record<string, unknown>> {
  return bachsRequest(
    "DELETE",
    `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      cancel_at_period_end: input.cancelAtPeriodEnd,
      reason: input.reason,
    }
  );
}

export interface BachsRefundRequest {
  chargeId: string;
  /** Unique per refund (max 128 chars); reusing one errors. */
  reference: string;
  /** Decimal string in settlement currency; omit for a full refund. */
  amount?: string;
  reason?: string;
  /** Retries with the same key on the same charge return the first refund. */
  idempotencyKey?: string;
}

export function createBachsRefund(
  input: BachsRefundRequest
): Promise<Record<string, unknown>> {
  return bachsRequest("POST", "/v1/refunds", {
    charge_id: input.chargeId,
    reference: input.reference,
    amount: input.amount,
    reason: input.reason,
    idempotency_key: input.idempotencyKey,
  });
}

export interface BachsPortalSessionResponse {
  id: string;
  url: string;
}

/** Mints a short-lived customer portal session; redirect the buyer to `url`. */
export function createBachsPortalSession(
  customerId: string
): Promise<BachsPortalSessionResponse> {
  return bachsRequest(
    "POST",
    `/v1/customers/${encodeURIComponent(customerId)}/portal-sessions`
  );
}

/** Bachs "10.00" decimal string → cents for our internal amount_cents. */
export function decimalToCents(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/* ---------- Webhooks ---------- */

/**
 * Bachs signs `"{timestamp}.{raw body}"` with HMAC-SHA256 hex, keyed by
 * the endpoint's signing secret.
 *
 * - `X-Bachs-Signature-V2` (preferred): `t={ts},v1={hex}` — may carry
 *   multiple `v1=` entries during secret rotation; any match accepts.
 * - `X-Bachs-Signature` (legacy): bare hex digest paired with
 *   `X-Bachs-Timestamp`.
 *
 * Timestamps more than 300s out are rejected to prevent replay. The raw
 * body must be verified before JSON parsing — re-serialization can break
 * the digest.
 */
const BACHS_SIGNATURE_TOLERANCE_SECONDS = 300;

function bachsHexEqual(expected: string, candidate: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(candidate, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function bachsDigest(
  rawBody: string,
  timestampSeconds: number,
  secret: string,
  nowSeconds: number
): string | null {
  if (
    Math.abs(nowSeconds - timestampSeconds) > BACHS_SIGNATURE_TOLERANCE_SECONDS
  ) {
    return null;
  }
  return createHmac("sha256", secret)
    .update(`${timestampSeconds}.${rawBody}`)
    .digest("hex");
}

export function verifyBachsSignature(input: {
  rawBody: string;
  /** X-Bachs-Signature-V2: `t={ts},v1={hex}[,v1={hex}...]` */
  signatureV2?: string | null;
  /** X-Bachs-Signature (legacy): bare hex digest */
  signature?: string | null;
  /** X-Bachs-Timestamp (legacy pair) */
  timestamp?: string | null;
  secret: string;
  nowSeconds?: number;
}): boolean {
  const { rawBody, signatureV2, signature, timestamp, secret } = input;
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (signatureV2) {
    const parts = new Map<string, string[]>();
    for (const pair of signatureV2.split(",")) {
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const key = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      parts.set(key, [...(parts.get(key) ?? []), value]);
    }
    const ts = parts.get("t")?.[0];
    const timestampSeconds = Number(ts);
    if (!ts || !Number.isFinite(timestampSeconds)) return false;
    const expected = bachsDigest(rawBody, timestampSeconds, secret, nowSeconds);
    if (!expected) return false;
    return (parts.get("v1") ?? []).some((sig) => bachsHexEqual(expected, sig));
  }

  if (signature && timestamp) {
    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds)) return false;
    const expected = bachsDigest(rawBody, timestampSeconds, secret, nowSeconds);
    return expected !== null && bachsHexEqual(expected, signature);
  }

  return false;
}
