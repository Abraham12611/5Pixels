import { afterEach, describe, expect, it } from "vitest";
import {
  buildIntentSummary,
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

describe("buildIntentSummary", () => {
  it("previews items without leaking private recipe material", () => {
    const summary = buildIntentSummary("create_draft_batch", {
      batch_id: "b1",
      items: [
        {
          client_item_id: "item-1",
          idempotency_key: "k",
          product: {
            name: "Neon Bloom",
            slug: "neon-bloom",
            type: "filter",
            category_id: "c1",
            visibility: "public",
            filter_config: { style_archetype: "neon-noir", identity_preservation: "high" },
          },
          version: {
            private_instruction_template: "SECRET RECIPE TEXT — must never appear",
            private_negative_instruction: "also-secret",
            provider_strategy: { primary_provider: "fal", primary_model: "nano-banana-2" },
            safety_config: { allowed_nsfw: false, block_public_figures: true, block_minors: true },
            post_process_config: { format: "webp", quality: 90, crop: false },
            output_sizes: [{ width: 1024, height: 1024 }],
          },
          fields: [{}, {}],
          asset_links: [{}],
        },
      ],
    });
    const item = summary.items![0];
    expect(item).toMatchObject({
      name: "Neon Bloom",
      slug: "neon-bloom",
      type: "filter",
      provider: "fal",
      model: "nano-banana-2",
      visibility: "public",
      style_archetype: "neon-noir",
      safety: { allowed_nsfw: false, block_minors: true },
      post_process: { format: "webp" },
      field_count: 2,
      asset_link_count: 1,
    });
    // No private recipe text anywhere in the serialized summary.
    expect(JSON.stringify(summary)).not.toContain("SECRET RECIPE TEXT");
    expect(JSON.stringify(summary)).not.toContain("also-secret");
    expect(JSON.stringify(summary)).not.toContain("private_instruction_template");
  });

  it("previews category creates", () => {
    const summary = buildIntentSummary("create_categories", {
      categories: [
        { name: "Retro Futurism", slug: "retro-futurism", sort_order: 40, idempotency_key: "k" },
      ],
    });
    expect(summary.categories).toHaveLength(1);
    expect(summary.categories![0]).toMatchObject({ name: "Retro Futurism", slug: "retro-futurism" });
  });
});
