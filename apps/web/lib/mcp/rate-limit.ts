/**
 * Per-user token-bucket rate limiter for the MCP endpoint (#272).
 *
 * In-memory per serverless instance — a soft guardrail against runaway tool
 * loops, not a hard security boundary (documented limitation: limits are
 * per-instance on Vercel, so effective ceilings scale with concurrency).
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

const LIMITS = {
  /** Reads + protocol traffic: generous so planning flows stay fluid. */
  default: { capacity: 120, refillPerSec: 2 },
  /** Write tools: tight cap — every write needs explicit confirmation anyway. */
  write: { capacity: 20, refillPerSec: 0.5 },
} as const;

export type RateLimitClass = keyof typeof LIMITS;

export function checkRateLimit(
  userId: string,
  klass: RateLimitClass = "default"
): { allowed: boolean; retryAfterSec: number } {
  const { capacity, refillPerSec } = LIMITS[klass];
  const key = `${userId}:${klass}`;
  const now = Date.now() / 1000;
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: capacity, lastRefill: now };
    buckets.set(key, bucket);
  }
  bucket.tokens = Math.min(capacity, bucket.tokens + (now - bucket.lastRefill) * refillPerSec);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    // Opportunistic sweep so a long-lived instance doesn't grow the map.
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) {
        if (now - b.lastRefill > 3600) buckets.delete(k);
      }
    }
    return { allowed: true, retryAfterSec: 0 };
  }
  return { allowed: false, retryAfterSec: Math.ceil((1 - bucket.tokens) / refillPerSec) };
}
