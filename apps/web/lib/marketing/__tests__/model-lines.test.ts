import { describe, expect, it } from "vitest";
import {
  MODEL_LINES,
  resolveModelSection,
  resolveModelSections,
  type ModelLine,
} from "../model-lines";
import type { PublicProductSummary } from "@/types/catalog";

function makeProduct(slug: string): PublicProductSummary {
  return {
    id: `id-${slug}`,
    slug,
    name: slug,
    type: "filter",
    short_description: null,
    long_description: null,
    category_id: null,
    category_slug: null,
    category_name: null,
    featured_rank: null,
    version_id: null,
    version_number: 1,
    credit_cost: 5,
    output_sizes: [],
    metadata: null,
    hero_asset_id: null,
    poster_asset_id: null,
    preview_gif_asset_id: null,
    preview_video_asset_id: null,
    public_assets: [],
    created_at: null,
    likeness_level: null,
  };
}

describe("MODEL_LINES config", () => {
  it("has unique slugs", () => {
    const slugs = MODEL_LINES.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every ctaPresetSlug is a member of its presetSlugs", () => {
    for (const line of MODEL_LINES) {
      expect(line.presetSlugs).toContain(line.ctaPresetSlug);
    }
  });

  it("uses root-relative hrefs only", () => {
    for (const line of MODEL_LINES) {
      expect(line.presetsHref).toMatch(/^\//);
      expect(line.pageHref).toMatch(/^\//);
    }
  });
});

describe("resolveModelSection", () => {
  const line: ModelLine = {
    slug: "test-engine",
    name: "Test Engine",
    tagline: "t",
    description: "d",
    presetSlugs: ["b", "a", "missing", "c"],
    ctaPresetSlug: "a",
    presetsHref: "/explore",
    pageHref: "/explore",
  };
  const catalog = [makeProduct("a"), makeProduct("b"), makeProduct("c")];

  it("returns products in config order, dropping unresolved slugs", () => {
    const section = resolveModelSection(line, catalog);
    expect(section.products.map((p) => p.slug)).toEqual(["b", "a", "c"]);
  });

  it("drops the whole section when no slugs resolve", () => {
    const empty = resolveModelSections(catalog, [
      { ...line, slug: "ghost", presetSlugs: ["nope"], ctaPresetSlug: "nope" },
    ]);
    expect(empty).toEqual([]);
  });

  it("keeps resolving sections in config order", () => {
    const lines: ModelLine[] = [
      { ...line, slug: "one", presetSlugs: ["a"], ctaPresetSlug: "a" },
      { ...line, slug: "two", presetSlugs: ["b"], ctaPresetSlug: "b" },
    ];
    const sections = resolveModelSections(catalog, lines);
    expect(sections.map((s) => s.line.slug)).toEqual(["one", "two"]);
  });
});
