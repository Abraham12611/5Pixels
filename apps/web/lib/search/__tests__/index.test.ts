import { describe, expect, it } from "vitest";
import {
  filterCategories,
  filterLibrary,
  filterPresets,
  matchesQuery,
  type SearchCategory,
  type SearchLibraryItem,
  type SearchPreset,
} from "@/lib/search";

function makePreset(overrides: Partial<SearchPreset> = {}): SearchPreset {
  return {
    slug: "film-noir",
    name: "Film Noir",
    description: "Moody black-and-white portrait look",
    categoryName: "Portraits",
    categorySlug: "portraits",
    type: "filter",
    creditCost: 30,
    thumbUrl: null,
    badge: null,
    ...overrides,
  };
}

describe("matchesQuery", () => {
  it("matches case-insensitively", () => {
    expect(matchesQuery("Film Noir Portrait", "film")).toBe(true);
  });

  it("requires every whitespace-separated token to match", () => {
    expect(matchesQuery("Film Noir Portrait", "film portrait")).toBe(true);
    expect(matchesQuery("Film Noir Portrait", "film poster")).toBe(false);
  });

  it("returns true for empty or whitespace-only queries", () => {
    expect(matchesQuery("anything", "")).toBe(true);
    expect(matchesQuery("anything", "   ")).toBe(true);
  });
});

describe("filterPresets", () => {
  const presets = [
    makePreset(),
    makePreset({
      slug: "vintage-poster",
      name: "Vintage Poster",
      description: "Retro travel poster",
      type: "poster",
      categoryName: "Print",
    }),
    makePreset({
      slug: "studio-glow",
      name: "Studio Glow",
      description: "Soft studio lighting",
      categoryName: "Portraits",
    }),
  ];

  it("matches on name", () => {
    expect(filterPresets(presets, "noir").map((p) => p.slug)).toEqual([
      "film-noir",
    ]);
  });

  it("matches on description", () => {
    expect(filterPresets(presets, "retro")).toEqual([
      expect.objectContaining({ slug: "vintage-poster" }),
    ]);
  });

  it("matches on category name", () => {
    const result = filterPresets(presets, "portraits");
    expect(result.map((p) => p.slug)).toEqual(["film-noir", "studio-glow"]);
  });

  it("matches on type keywords", () => {
    const result = filterPresets(presets, "poster");
    expect(result.map((p) => p.slug)).toContain("vintage-poster");
  });

  it("returns everything for empty query", () => {
    expect(filterPresets(presets, "")).toHaveLength(3);
  });
});

describe("filterCategories", () => {
  const categories: SearchCategory[] = [
    { slug: "portraits", name: "Portraits" },
    { slug: "products", name: "Product shots" },
  ];

  it("matches on category name", () => {
    expect(filterCategories(categories, "prod")).toEqual([
      { slug: "products", name: "Product shots" },
    ]);
  });

  it("returns empty when nothing matches", () => {
    expect(filterCategories(categories, "zzz")).toEqual([]);
  });
});

describe("filterLibrary", () => {
  const items: SearchLibraryItem[] = [
    {
      id: "g1",
      productName: "Film Noir",
      productSlug: "film-noir",
      status: "completed",
      createdAt: "2026-09-01T00:00:00Z",
      thumbUrl: null,
    },
    {
      id: "g2",
      productName: "Studio Glow",
      productSlug: "studio-glow",
      status: "generating",
      createdAt: "2026-09-02T00:00:00Z",
      thumbUrl: null,
    },
  ];

  it("matches on the preset name used for the generation", () => {
    expect(filterLibrary(items, "glow").map((i) => i.id)).toEqual(["g2"]);
  });

  it("returns empty when nothing matches", () => {
    expect(filterLibrary(items, "nope")).toEqual([]);
  });
});
