import { describe, expect, it } from "vitest";
import {
  productStatusTransitionSchema,
  publishProductVersionSchema,
  rollbackProductVersionSchema,
} from "./admin-actions";

const uuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const versionUuid = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

describe("publishProductVersionSchema", () => {
  it("accepts a normal publish request", () => {
    const result = publishProductVersionSchema.safeParse({
      productId: uuid,
      versionId: versionUuid,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid owner override reason", () => {
    const result = publishProductVersionSchema.safeParse({
      productId: uuid,
      versionId: versionUuid,
      overrideReason: "Marketing override for launch week.",
    });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data.overrideReason).toBe(
      "Marketing override for launch week."
    );
  });

  it("rejects an invalid UUID", () => {
    const result = publishProductVersionSchema.safeParse({
      productId: "not-a-uuid",
      versionId: versionUuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a short override reason", () => {
    const result = publishProductVersionSchema.safeParse({
      productId: uuid,
      versionId: versionUuid,
      overrideReason: "ok",
    });
    expect(result.success).toBe(false);
  });

  it("trims override reason", () => {
    const result = publishProductVersionSchema.safeParse({
      productId: uuid,
      versionId: versionUuid,
      overrideReason: "  Marketing override for launch week.  ",
    });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data.overrideReason).toBe(
      "Marketing override for launch week."
    );
  });
});

describe("rollbackProductVersionSchema", () => {
  it("accepts a rollback with reason", () => {
    const result = rollbackProductVersionSchema.safeParse({
      productId: uuid,
      targetVersionId: versionUuid,
      reason: "Critical regression in current version.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a rollback without reason", () => {
    const result = rollbackProductVersionSchema.safeParse({
      productId: uuid,
      targetVersionId: versionUuid,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a too-short reason", () => {
    const result = rollbackProductVersionSchema.safeParse({
      productId: uuid,
      targetVersionId: versionUuid,
      reason: "x",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched UUIDs", () => {
    const result = rollbackProductVersionSchema.safeParse({
      productId: uuid,
      targetVersionId: uuid,
      reason: "Regression",
    });
    // Same UUID string is valid format; this test documents that the schema does
    // NOT enforce that productId and targetVersionId differ.
    expect(result.success).toBe(true);
  });
});

describe("productStatusTransitionSchema", () => {
  it.each([["active"], ["paused"], ["retired"]] as const)(
    "accepts status %s",
    (status) => {
      const result = productStatusTransitionSchema.safeParse({
        productId: uuid,
        newStatus: status,
      });
      expect(result.success).toBe(true);
    }
  );

  it("rejects an invalid status", () => {
    const result = productStatusTransitionSchema.safeParse({
      productId: uuid,
      newStatus: "deleted",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid UUID", () => {
    const result = productStatusTransitionSchema.safeParse({
      productId: "not-a-uuid",
      newStatus: "active",
    });
    expect(result.success).toBe(false);
  });
});
