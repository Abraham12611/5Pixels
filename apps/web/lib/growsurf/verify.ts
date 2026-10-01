import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * GrowSurf webhook signature verification (docs/growsurf/Webhooks.md §
 * "Validating payloads").
 *
 * Header:  GrowSurf-Signature: ts=<unix-ms>,v=<hex hmac-sha256>
 * Signed:  `${ts}.${rawBody}` keyed by the webhook secret.
 *
 * The raw request body MUST be used (not a re-serialized JSON object) —
 * key order/whitespace differences would otherwise produce false rejects.
 * The timestamp tolerance guards replayed deliveries; GrowSurf retries
 * legitimately for days, so the tolerance applies to when the request was
 * *sent*, not the event's createdAt.
 */

const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000;

export function verifyGrowSurfSignature(input: {
  rawBody: string;
  header: string | null;
  secret: string;
  now?: number;
  toleranceMs?: number;
}): boolean {
  const { rawBody, header, secret } = input;
  if (!header || !secret) return false;

  // "ts=...,v=..." — comma-separated k=v pairs.
  const parts = new Map<string, string>();
  for (const piece of header.split(",")) {
    const eq = piece.indexOf("=");
    if (eq === -1) continue;
    parts.set(piece.slice(0, eq).trim(), piece.slice(eq + 1).trim());
  }
  const ts = parts.get("ts");
  const presented = parts.get("v");
  if (!ts || !presented) return false;

  const timestamp = Number(ts);
  if (!Number.isFinite(timestamp)) return false;

  const expected = createHmac("sha256", secret)
    .update(`${ts}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(presented, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const now = input.now ?? Date.now();
  const tolerance = input.toleranceMs ?? DEFAULT_TOLERANCE_MS;
  return Math.abs(now - timestamp) <= tolerance;
}
