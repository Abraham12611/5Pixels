import { afterEach, describe, expect, it } from "vitest";
import {
  canonicalJson,
  mintApprovalToken,
  payloadDigest,
  verifyApprovalToken,
} from "../preset-factory/approval";

/**
 * NOTE: written but intentionally UNEXECUTED per the owner's manual-only
 * test policy on #272 — run with the rest of the suite only after the owner
 * authorizes automated testing.
 */

const SECRET = "test-approval-secret-0123456789abcdef";

afterEach(() => {
  delete process.env.PRESET_FACTORY_APPROVAL_SECRET;
});

describe("canonicalJson / payloadDigest", () => {
  it("is stable across key order and ignores undefined", () => {
    const a = { b: 2, a: 1, c: [3, { y: 1, x: 2 }], drop: undefined };
    const b = { c: [{ x: 2, y: 1 }, 3].reverse().reverse(), a: 1, b: 2 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(payloadDigest(a)).toBe(payloadDigest(b));
  });

  it("changes when any payload byte changes", () => {
    expect(payloadDigest({ n: 1 })).not.toBe(payloadDigest({ n: 2 }));
  });
});

describe("approval tokens", () => {
  const base = { userId: "u-1", operation: "create_draft_batch" as const };
  const INTENT = "00000000-0000-4000-8000-0000000000a1";
  const SQL_DIGEST = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"; // A's SQL SHA-256

  it("fails closed when the secret is unset", () => {
    const res = verifyApprovalToken("anything", base);
    expect(res).toEqual({ ok: false, reason: "malformed" });
    expect(() =>
      mintApprovalToken({ ...base, intentId: INTENT, digest: SQL_DIGEST })
    ).toThrow(/APPROVAL_SECRET/);
  });

  it("mints and verifies a token bound to user + op + intent + digest", () => {
    process.env.PRESET_FACTORY_APPROVAL_SECRET = SECRET;
    const { token } = mintApprovalToken({ ...base, intentId: INTENT, digest: SQL_DIGEST });
    expect(verifyApprovalToken(token, base)).toEqual({
      ok: true,
      intentId: INTENT,
      digest: SQL_DIGEST,
    });
  });

  it("rejects tampering: different user, operation or signature", () => {
    process.env.PRESET_FACTORY_APPROVAL_SECRET = SECRET;
    const { token } = mintApprovalToken({ ...base, intentId: INTENT, digest: SQL_DIGEST });

    expect(
      verifyApprovalToken(token, { ...base, userId: "u-2" })
    ).toEqual({ ok: false, reason: "user_mismatch" });
    expect(
      verifyApprovalToken(token, { ...base, operation: "create_categories" })
    ).toEqual({ ok: false, reason: "operation_mismatch" });

    const tampered = `${token.slice(0, -2)}xx`;
    expect(verifyApprovalToken(tampered, base)).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  it("rejects expired tokens", () => {
    process.env.PRESET_FACTORY_APPROVAL_SECRET = SECRET;
    const { token } = mintApprovalToken({
      ...base,
      intentId: INTENT,
      digest: SQL_DIGEST,
      ttlSeconds: -1,
    });
    expect(verifyApprovalToken(token, base)).toEqual({
      ok: false,
      reason: "expired",
    });
  });
});

// NOTE: the owner-facing preview is now derived inside A's
// admin_stage_write_intent SQL (53cf56f) — callers cannot supply one and
// there is nothing adapter-side to unit-test here. Its sanitization is
// covered by A's DB tests under apps/web/tests/db.
