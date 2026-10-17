import { describe, expect, it, vi } from "vitest";
import type { ArticleBlockJson } from "../document";
import {
  collectEditorialPresetIds,
  collectPresetSlugs,
  estimateReadingTimeMinutes,
  extractPlainText,
  indexHeadings,
  inlineContentToText,
  resolveAssetMedia,
  resolveMediaSrc,
  sanitizeCtaHref,
  sanitizeLinkHref,
  sanitizePresetSlug,
} from "../public-document";
import type { PublicAssetRef } from "../types";

vi.mock("@/lib/supabase/env", () => ({
  supabaseUrl: () => "https://test.supabase.co",
}));

const ASSET: PublicAssetRef = {
  assetId: "11111111-1111-4111-8111-111111111111",
  bucket: "article-media-public",
  storageKey:
    "articles/22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111.png",
  mimeType: "image/png",
  width: 800,
  height: 600,
};

const MEDIA = { [ASSET.assetId]: ASSET };

describe("sanitizeLinkHref", () => {
  it("allows https, http, mailto and internal paths", () => {
    expect(sanitizeLinkHref("https://example.com/x")).toBe(
      "https://example.com/x"
    );
    expect(sanitizeLinkHref("http://example.com")).toBe("http://example.com");
    expect(sanitizeLinkHref("mailto:a@b.c")).toBe("mailto:a@b.c");
    expect(sanitizeLinkHref("/presets/foo")).toBe("/presets/foo");
  });

  it("rejects executable and smuggling schemes", () => {
    expect(sanitizeLinkHref("javascript:alert(1)")).toBeNull();
    expect(sanitizeLinkHref("JaVaScRiPt:alert(1)")).toBeNull();
    expect(sanitizeLinkHref("data:text/html,<script>")).toBeNull();
    expect(sanitizeLinkHref("vbscript:msgbox(1)")).toBeNull();
    expect(sanitizeLinkHref("//evil.com/phish")).toBeNull();
    expect(sanitizeLinkHref("file:///etc/passwd")).toBeNull();
    expect(sanitizeLinkHref("")).toBeNull();
    expect(sanitizeLinkHref("   ")).toBeNull();
    expect(sanitizeLinkHref(42)).toBeNull();
    expect(sanitizeLinkHref(`https://e.co/${"a".repeat(3000)}`)).toBeNull();
  });
});

describe("sanitizeCtaHref", () => {
  it("only allows internal paths", () => {
    expect(sanitizeCtaHref("/explore")).toBe("/explore");
    expect(sanitizeCtaHref("/presets/foo?x=1")).toBe("/presets/foo?x=1");
    expect(sanitizeCtaHref("https://example.com")).toBeNull();
    expect(sanitizeCtaHref("//evil.com")).toBeNull();
    expect(sanitizeCtaHref("javascript:alert(1)")).toBeNull();
    expect(sanitizeCtaHref("relative/path")).toBeNull();
  });
});

describe("sanitizePresetSlug", () => {
  it("accepts valid slugs and rejects the rest", () => {
    expect(sanitizePresetSlug("film-grain-portrait")).toBe(
      "film-grain-portrait"
    );
    expect(sanitizePresetSlug("Film Grain")).toBe("film-grain");
    expect(sanitizePresetSlug("")).toBeNull();
    // Normalises to "etc" — a well-formed slug; the link simply 404s safely.
    expect(sanitizePresetSlug("../../etc")).toBe("etc");
    expect(sanitizePresetSlug("!!!")).toBeNull();
    expect(sanitizePresetSlug(123)).toBeNull();
  });
});

describe("resolveMediaSrc", () => {
  it("resolves asset:// refs to public bucket URLs", () => {
    const out = resolveMediaSrc(`asset://${ASSET.assetId}`, MEDIA);
    expect(out?.src).toBe(
      `https://test.supabase.co/storage/v1/object/public/${ASSET.bucket}/${ASSET.storageKey}`
    );
    expect(out?.asset?.mimeType).toBe("image/png");
  });

  it("returns null for unpublished/missing assets and bad URLs", () => {
    expect(
      resolveMediaSrc("asset://99999999-9999-4999-8999-999999999999", MEDIA)
    ).toBeNull();
    expect(resolveMediaSrc("asset://not-a-uuid", MEDIA)).toBeNull();
    expect(resolveMediaSrc("https://untrusted.example/x.png", MEDIA)).toBeNull();
    expect(resolveMediaSrc("javascript:alert(1)", MEDIA)).toBeNull();
    expect(resolveMediaSrc("", MEDIA)).toBeNull();
  });
});

describe("resolveAssetMedia", () => {
  it("resolves bare asset ids and tolerates case", () => {
    const out = resolveAssetMedia(ASSET.assetId.toUpperCase(), MEDIA);
    expect(out?.src).toContain(ASSET.storageKey);
  });
  it("returns null for unknown ids", () => {
    expect(resolveAssetMedia("99999999-9999-4999-8999-999999999999", MEDIA)).toBeNull();
    expect(resolveAssetMedia(undefined, MEDIA)).toBeNull();
  });
});

describe("indexHeadings", () => {
  const doc: ArticleBlockJson[] = [
    {
      type: "heading",
      props: { level: 1 },
      content: [{ type: "text", text: "Getting Started" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "intro" }],
      children: [
        {
          type: "heading",
          props: { level: 2 },
          content: [{ type: "text", text: "Getting Started" }],
        },
      ],
    },
    {
      type: "heading",
      props: { level: 3 },
      content: [{ type: "text", text: "!!!" }],
    },
    {
      type: "heading",
      props: {},
      content: [],
    },
  ];

  it("assigns deterministic, unique, slugified anchor ids", () => {
    const idx = indexHeadings(doc);
    expect(idx.entries.map((e) => e.id)).toEqual([
      "getting-started",
      "getting-started-2",
      "section",
    ]);
    expect(idx.entries.map((e) => e.level)).toEqual([1, 2, 3]);
  });

  it("indexes nested headings and skips empty headings", () => {
    const idx = indexHeadings(doc);
    expect(idx.entries).toHaveLength(3);
    const nested = doc[1].children![0];
    expect(idx.byBlock.get(nested)).toBe("getting-started-2");
  });
});

describe("collectPresetSlugs", () => {
  it("collects unique slugs across preset-bearing blocks", () => {
    const doc: ArticleBlockJson[] = [
      { type: "preset", props: { productSlug: "a-b" } },
      { type: "settings", props: { productSlug: "a-b" } },
      { type: "cta", props: { presetSlug: "c-d", href: "/x" } },
      { type: "promptRecipe", props: { presetSlug: "c-d", recipe: "r" } },
      { type: "preset", props: { productSlug: "!!!" } },
      {
        type: "paragraph",
        children: [{ type: "preset", props: { productSlug: "e-f" } }],
      },
    ];
    expect(collectPresetSlugs(doc)).toEqual(["a-b", "c-d", "e-f"]);
  });

  it("skips presetId-keyed blocks — those resolve via collectDocumentPresetIds", () => {
    const doc: ArticleBlockJson[] = [
      {
        type: "preset",
        props: {
          presetId: "aaaaaaaa-1111-4111-8111-111111111111",
          slug: "should-not-be-collected",
        },
      },
      { type: "preset", props: { presetId: "", slug: "fallback-slug" } },
    ];
    expect(collectPresetSlugs(doc)).toEqual(["fallback-slug"]);
  });

  it("collects #128 editorial slug props only when presetId is absent", () => {
    const doc: ArticleBlockJson[] = [
      {
        type: "promptRecipe",
        props: { presetId: "", slug: "recipe-preset" },
      },
      {
        type: "settings",
        props: { presetId: "", slug: "settings-preset" },
      },
      {
        type: "settings",
        props: {
          presetId: "aaaaaaaa-1111-4111-8111-111111111111",
          slug: "not-collected",
        },
      },
    ];
    expect(collectPresetSlugs(doc)).toEqual([
      "recipe-preset",
      "settings-preset",
    ]);
  });
});

describe("collectEditorialPresetIds", () => {
  it("collects presetIds from promptRecipe/settings, skipping legacy blocks", () => {
    const doc: ArticleBlockJson[] = [
      {
        type: "promptRecipe",
        props: { presetId: "aaaaaaaa-1111-4111-8111-111111111111" },
      },
      {
        type: "settings",
        props: { presetId: "aaaaaaaa-1111-4111-8111-111111111111" },
      },
      { type: "settings", props: { presetId: "", slug: "legacy" } },
      {
        type: "paragraph",
        children: [
          {
            type: "promptRecipe",
            props: { presetId: "bbbbbbbb-2222-4333-8444-555555555555" },
          },
        ],
      },
      {
        type: "preset",
        props: { presetId: "cccccccc-3333-4333-8444-555555555555" },
      },
    ];
    expect(collectEditorialPresetIds(doc)).toEqual([
      "aaaaaaaa-1111-4111-8111-111111111111",
      "bbbbbbbb-2222-4333-8444-555555555555",
    ]);
  });
});

describe("extractPlainText / reading time", () => {
  it("extracts text from inline content, tables and props", () => {
    const doc: ArticleBlockJson[] = [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Hello " },
          {
            type: "link",
            href: "https://x.co",
            content: [{ type: "text", text: "world" }],
          },
        ],
      },
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: [[{ type: "text", text: "cell" }]] }],
        },
      },
      { type: "workflow", props: { steps: ["step one", "step two"] } },
      { type: "promptRecipe", props: { recipe: "a recipe" } },
    ];
    const text = extractPlainText(doc);
    expect(text).toContain("Hello world");
    expect(text).toContain("cell");
    expect(text).toContain("step one");
    expect(text).toContain("a recipe");
  });

  it("estimates reading time with a 1-minute floor", () => {
    const doc: ArticleBlockJson[] = [
      {
        type: "paragraph",
        content: [{ type: "text", text: "word ".repeat(500) }],
      },
    ];
    expect(estimateReadingTimeMinutes(doc)).toBe(3);
    expect(
      estimateReadingTimeMinutes([
        { type: "paragraph", content: [{ type: "text", text: "short" }] },
      ])
    ).toBe(1);
  });
});

describe("inlineContentToText", () => {
  it("walks nested link content", () => {
    expect(
      inlineContentToText([
        { type: "text", text: "a" },
        { type: "link", href: "/x", content: [{ type: "text", text: "b" }] },
      ])
    ).toBe("ab");
    expect(inlineContentToText("not-an-array")).toBe("");
  });
});
