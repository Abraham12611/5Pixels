import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Creem billing provider (MoR). Plain REST — the official SDK's serverIdx
 * mapping proved unreliable (test keys hit prod), and our surface area is
 * small enough that a thin fetch client is easier to audit.
 *
 * Environment is derived from the key prefix: `creem_test_*` →
 * test-api.creem.io, anything else → api.creem.io. Test and live products
 * are entirely separate, so plans.metadata carries per-environment ids.
 */

export function creemApiKey(): string | null {
  return process.env.CREEM_API_KEY?.trim() ?? null;
}

export function creemEnvironment(): "test" | "live" {
  return creemApiKey()?.startsWith("creem_test_") ? "test" : "live";
}

export function creemBaseUrl(): string {
  return creemEnvironment() === "test"
    ? "https://test-api.creem.io"
    : "https://api.creem.io";
}

export function creemWebhookSecret(): string | null {
  return process.env.CREEM_WEBHOOK_SECRET?.trim() ?? null;
}

export function isCreemConfigured(): boolean {
  return Boolean(creemApiKey());
}

/**
 * Resolves a plan's Creem product id for the active environment
 * (`creem_product_id_test` / `creem_product_id_live`, with a legacy
 * `creem_product_id` fallback).
 */
export function resolveCreemProductId(metadata: unknown): string | null {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  const scoped = meta[`creem_product_id_${creemEnvironment()}`];
  if (typeof scoped === "string" && scoped.length > 0) return scoped;

  const legacy = meta.creem_product_id;
  return typeof legacy === "string" && legacy.length > 0 ? legacy : null;
}

const REQUEST_TIMEOUT_MS = 10_000;

export class CreemApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "CreemApiError";
  }
}

async function creemRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown
): Promise<T> {
  const apiKey = creemApiKey();
  if (!apiKey) throw new CreemApiError(0, "CREEM_API_KEY is not set");

  const res = await fetch(`${creemBaseUrl()}${path}`, {
    method,
    headers: {
      "x-api-key": apiKey,
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
      (json as { message?: string[] | string })?.message ??
      `Creem API ${res.status}`;
    throw new CreemApiError(
      res.status,
      Array.isArray(message) ? message.join(", ") : String(message)
    );
  }
  return json as T;
}

/* ---------- API surfaces ---------- */

export interface CreemCheckoutRequest {
  productId: string;
  requestId?: string;
  units?: number;
  customPrice?: number;
  discountCode?: string;
  customer?: { id?: string; email?: string; name?: string };
  successUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CreemCheckoutResponse {
  id: string;
  checkout_url?: string;
  status?: string;
}

export function createCreemCheckout(
  input: CreemCheckoutRequest
): Promise<CreemCheckoutResponse> {
  return creemRequest("POST", "/v1/checkouts", {
    product_id: input.productId,
    request_id: input.requestId,
    units: input.units,
    custom_price: input.customPrice,
    discount_code: input.discountCode,
    customer: input.customer,
    success_url: input.successUrl,
    metadata: input.metadata,
  });
}

export function getCreemSubscription(
  subscriptionId: string
): Promise<Record<string, unknown>> {
  return creemRequest(
    "GET",
    `/v1/subscriptions?subscription_id=${encodeURIComponent(subscriptionId)}`
  );
}

export function createCreemPortalLink(
  customerId: string
): Promise<{ customer_portal_link: string }> {
  return creemRequest("POST", "/v1/customers/billing", {
    customer_id: customerId,
  });
}

/* ---------- Webhooks ---------- */

/**
 * `creem-signature` is a plain hex HMAC-SHA256 of the RAW request body
 * (docs.creem.io/code/webhooks). No timestamp component, so no replay
 * window — the checkout/order/subscription ids provide idempotency.
 */
export function verifyCreemSignature(input: {
  rawBody: string;
  signature: string | null;
  secret: string;
}): boolean {
  const { rawBody, signature, secret } = input;
  if (!signature) return false;
  const computed = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(signature.trim(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
