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

  it("fails closed when the secret is unset", () => {
    const res = verifyApprovalToken("anything", { ...base, digest: "x" });
    expect(res).toEqual({ ok: false, reason: "unconfigured" });
    expect(() =>
      mintApprovalToken({ ...base, digest: "x" })
    ).toThrow(/APPROVAL_SECRET/);
  });

  it("mints and verifies a token bound to user + op + digest", () => {
    process.env.PRESET_FACTORY_APPROVAL_SECRET = SECRET;
    const digest = payloadDigest({ batch_id: "b", items: [] });
    const { token } = mintApprovalToken({ ...base, digest });
    expect(verifyApprovalToken(token, { ...base, digest })).toEqual({ ok: true });
  });

  it("rejects tampering: different digest, user, operation or signature", () => {
    process.env.PRESET_FACTORY_APPROVAL_SECRET = SECRET;
    const digest = payloadDigest({ batch_id: "b" });
    const { token } = mintApprovalToken({ ...base, digest });

    expect(
      verifyApprovalToken(token, { ...base, digest: payloadDigest({ other: 1 }) })
    ).toEqual({ ok: false, reason: "digest_mismatch" });
    expect(
      verifyApprovalToken(token, { ...base, userId: "u-2", digest })
    ).toEqual({ ok: false, reason: "wrong_user" });
    expect(
      verifyApprovalToken(token, { ...base, operation: "create_categories", digest })
    ).toEqual({ ok: false, reason: "wrong_operation" });

    const tampered = `${token.slice(0, -2)}xx`;
    expect(
      verifyApprovalToken(tampered, { ...base, digest })
    ).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects expired tokens", () => {
    process.env.PRESET_FACTORY_APPROVAL_SECRET = SECRET;
    const digest = payloadDigest({});
    const { token } = mintApprovalToken({ ...base, digest, ttlSeconds: -1 });
    expect(verifyApprovalToken(token, { ...base, digest })).toEqual({
      ok: false,
      reason: "expired",
    });
  });
});
