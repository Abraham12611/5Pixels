import { describe, expect, it } from "vitest";
import { describeAdminSaveError } from "../save-errors";

describe("describeAdminSaveError (#233)", () => {
  it("explains an activation guard rejection without exposing SQL details", () => {
    const message = describeAdminSaveError({
      code: "P0001",
      message: "A product requires an active version before it can be activated",
    });
    expect(message).toMatch(/no published recipe version/i);
    expect(message).toMatch(/Status to Draft/i);
    expect(message).toMatch(/Publish version/i);
    expect(message).not.toMatch(/P0001|active version before it can/i);
  });

  it("explains the no-editable-version rejection in plain language", () => {
    const pgError = {
      code: "P0001",
      message: "Cannot save: product has no editable source version",
    };
    const msg = describeAdminSaveError(pgError);
    expect(msg).toMatch(/no saved version/i);
    expect(msg).toMatch(/repaired/i);
    expect(msg).toMatch(/replaced/i);
    expect(msg).not.toMatch(/P0001/);
  });

  it("explains a vanished source version", () => {
    expect(
      describeAdminSaveError({ message: "Source version not found" })
    ).toMatch(/no longer exists/i);
  });

  it("explains a deleted product", () => {
    expect(
      describeAdminSaveError({ message: "Product not found" })
    ).toMatch(/no longer exists/i);
  });

  it("explains permission failures", () => {
    expect(
      describeAdminSaveError({
        message: "Forbidden: admin or owner required",
      })
    ).toMatch(/permission/i);
  });

  it("falls back to a safe generic message for unknown errors", () => {
    const msg = describeAdminSaveError(
      new Error("PGRST116: secret internal detail")
    );
    expect(msg).toMatch(/unable to save/i);
    expect(msg).not.toMatch(/PGRST116|secret/i);
  });

  it("never leaks details from non-Error inputs", () => {
    const msg = describeAdminSaveError("unexpected string");
    expect(msg).toMatch(/unable to save/i);
  });
});
