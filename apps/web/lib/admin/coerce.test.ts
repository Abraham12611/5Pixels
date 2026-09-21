import { describe, expect, it } from "vitest";
import { coerceCreditCost } from "./coerce";

describe("coerceCreditCost", () => {
  it("converts Postgres NUMERIC strings to numbers", () => {
    expect(coerceCreditCost("1.0000")).toBe(1);
    expect(coerceCreditCost("2.5")).toBe(2.5);
    expect(coerceCreditCost("0")).toBe(0);
  });

  it("passes real numbers through", () => {
    expect(coerceCreditCost(1)).toBe(1);
    expect(coerceCreditCost(2.5)).toBe(2.5);
  });

  it("returns null for absent values", () => {
    expect(coerceCreditCost(null)).toBeNull();
    expect(coerceCreditCost(undefined)).toBeNull();
  });

  it("returns null for unparseable and non-finite values", () => {
    expect(coerceCreditCost("abc")).toBeNull();
    expect(coerceCreditCost("")).toBeNull();
    expect(coerceCreditCost(Number.NaN)).toBeNull();
    expect(coerceCreditCost(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
