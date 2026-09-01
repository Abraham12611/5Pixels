import { describe, expect, it } from "vitest";
import {
  parseCatalogSearchParams,
  buildCatalogSearchParams,
} from "@/lib/catalog/filters";

describe("parseCatalogSearchParams", () => {
  it("returns null filters for empty params", () => {
    const result = parseCatalogSearchParams({});
    expect(result.type).toBeNull();
    expect(result.category).toBeNull();
    expect(result.errors).toEqual([]);
  });

  it("accepts valid filter type", () => {
    const result = parseCatalogSearchParams({ type: "filter" });
    expect(result.type).toBe("filter");
    expect(result.category).toBeNull();
    expect(result.errors).toEqual([]);
  });

  it("accepts valid poster type", () => {
    const result = parseCatalogSearchParams({ type: "poster" });
    expect(result.type).toBe("poster");
    expect(result.errors).toEqual([]);
  });

  it("rejects invalid type", () => {
    const result = parseCatalogSearchParams({ type: "invalid" });
    expect(result.type).toBeNull();
    expect(result.errors).toContain('"invalid" is not a valid product type.');
  });

  it("normalizes type case", () => {
    const result = parseCatalogSearchParams({ type: "Filter" });
    expect(result.type).toBe("filter");
  });

  it("accepts a valid category slug", () => {
    const result = parseCatalogSearchParams({ category: "vintage-portraits" });
    expect(result.category).toBe("vintage-portraits");
    expect(result.errors).toEqual([]);
  });

  it("rejects a malformed category slug", () => {
    const result = parseCatalogSearchParams({ category: "Bad Slug!" });
    expect(result.category).toBeNull();
    expect(result.errors).toContain(
      '"Bad Slug!" is not a valid category slug.'
    );
  });

  it("uses the first value when params are arrays", () => {
    const result = parseCatalogSearchParams({
      type: ["filter", "poster"],
      category: ["cinematic", "vintage"],
    });
    expect(result.type).toBe("filter");
    expect(result.category).toBe("cinematic");
  });
});

describe("buildCatalogSearchParams", () => {
  it("returns an empty string with no filters", () => {
    expect(buildCatalogSearchParams({ type: null, category: null })).toBe("");
  });

  it("builds a type-only query", () => {
    expect(buildCatalogSearchParams({ type: "poster", category: null })).toBe(
      "type=poster"
    );
  });

  it("builds a query with both filters", () => {
    const qs = buildCatalogSearchParams({
      type: "filter",
      category: "vintage",
    });
    expect(qs).toContain("type=filter");
    expect(qs).toContain("category=vintage");
  });
});
