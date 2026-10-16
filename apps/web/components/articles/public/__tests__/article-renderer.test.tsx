import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArticleBlockJson } from "@/lib/articles/document";
import { indexHeadings } from "@/lib/articles/public-document";
import type { PublicAssetRef } from "@/lib/articles/types";
import type { PublicProductDetail } from "@/types/catalog";
import { ArticleRenderer } from "../article-renderer";

vi.mock("@/lib/supabase/env", () => ({
  supabaseUrl: () => "https://test.supabase.co",
}));

afterEach(cleanup);

const ASSET_ID = "11111111-1111-4111-8111-111111111111";
const ASSET: PublicAssetRef = {
  assetId: ASSET_ID,
  bucket: "article-media-public",
  storageKey: `articles/22222222-2222-4222-8222-222222222222/${ASSET_ID}.png`,
  mimeType: "image/png",
  width: 800,
  height: 600,
};
const MEDIA = { [ASSET_ID]: ASSET };
const PUBLIC_URL = `https://test.supabase.co/storage/v1/object/public/${ASSET.bucket}/${ASSET.storageKey}`;

const PRODUCT: PublicProductDetail = {
  id: "prod-1",
  slug: "film-grain",
  name: "Film Grain",
  type: "filter",
  short_description: "Analog grain and tones.",
  long_description: null,
  category_id: null,
  category_slug: null,
  category_name: "Portrait",
  featured_rank: null,
  version_id: "v1",
  version_number: 1,
  credit_cost: 25,
  output_sizes: [],
  metadata: null,
  hero_asset_id: null,
  poster_asset_id: null,
  preview_gif_asset_id: null,
  preview_video_asset_id: null,
  public_assets: [],
  created_at: null,
  likeness_level: null,
  active_fields: [
    {
      id: "f1",
      field_key: "intensity",
      label: "Intensity",
      help_text: "How strong the grain reads.",
      field_type: "slider",
      required: null,
      sort_order: 1,
      config: null,
      validation: null,
    },
  ],
};

function renderArticle(content: ArticleBlockJson[], presets = new Map()) {
  const headings = indexHeadings(content);
  return render(
    <ArticleRenderer
      content={content}
      media={MEDIA}
      presets={presets}
      headings={headings}
    />
  );
}

describe("ArticleRenderer — standard blocks", () => {
  it("renders paragraphs, headings with unique anchors, quotes and code", () => {
    const content: ArticleBlockJson[] = [
      {
        type: "heading",
        props: { level: 1 },
        content: [{ type: "text", text: "Intro" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Hello article" }],
      },
      {
        type: "heading",
        props: { level: 1 },
        content: [{ type: "text", text: "Intro" }],
      },
      {
        type: "quote",
        content: [{ type: "text", text: "wise words" }],
      },
      {
        type: "codeBlock",
        props: { language: "ts" },
        content: [{ type: "text", text: "const x = 1;" }],
      },
    ];
    renderArticle(content);

    expect(screen.getByText("Hello article")).toBeInTheDocument();
    const headings = screen.getAllByRole("heading", { name: "Intro" });
    expect(headings).toHaveLength(2);
    expect(headings[0]).toHaveAttribute("id", "intro");
    expect(headings[1]).toHaveAttribute("id", "intro-2");
    expect(screen.getByText("wise words").closest("blockquote")).not.toBeNull();
    expect(screen.getByText("const x = 1;").closest("pre")).not.toBeNull();
  });

  it("renders styled inline text and sanitizes link protocols", () => {
    const content: ArticleBlockJson[] = [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "bold", styles: { bold: true } },
          {
            type: "link",
            href: "https://example.com",
            content: [{ type: "text", text: "good link" }],
          },
          {
            type: "link",
            href: "javascript:alert(1)",
            content: [{ type: "text", text: "evil link" }],
          },
        ],
      },
    ];
    renderArticle(content);

    expect(screen.getByText("bold").tagName).toBe("STRONG");
    const good = screen.getByRole("link", { name: "good link" });
    expect(good).toHaveAttribute("href", "https://example.com");
    expect(good).toHaveAttribute("rel", expect.stringContaining("noopener"));
    // Disallowed scheme — text stays, anchor never forms.
    const evil = screen.getByText("evil link");
    expect(evil.tagName).not.toBe("A");
    expect(evil.closest("a")).toBeNull();
  });

  it("groups consecutive list items and renders nested lists", () => {
    const content: ArticleBlockJson[] = [
      {
        type: "bulletListItem",
        content: [{ type: "text", text: "one" }],
        children: [
          {
            type: "bulletListItem",
            content: [{ type: "text", text: "nested" }],
          },
        ],
      },
      {
        type: "bulletListItem",
        content: [{ type: "text", text: "two" }],
      },
      {
        type: "numberedListItem",
        content: [{ type: "text", text: "first" }],
      },
    ];
    const { container } = renderArticle(content);

    const uls = container.querySelectorAll("ul");
    const ols = container.querySelectorAll("ol");
    expect(uls.length).toBe(2); // outer + nested
    expect(ols.length).toBe(1);
    expect(screen.getByText("first").closest("ol")).not.toBeNull();
  });

  it("renders checkListItem checkboxes and tables", () => {
    const content: ArticleBlockJson[] = [
      {
        type: "checkListItem",
        props: { checked: true },
        content: [{ type: "text", text: "done item" }],
      },
      {
        type: "table",
        content: {
          type: "tableContent",
          headerRows: 1,
          rows: [
            {
              cells: [
                [{ type: "text", text: "Name" }],
                [{ type: "text", text: "Value" }],
              ],
            },
            {
              cells: [
                [{ type: "text", text: "iso" }],
                [{ type: "text", text: "400" }],
              ],
            },
          ],
        },
      },
    ];
    renderArticle(content);

    expect(
      screen.getByRole("checkbox", { name: "Completed item" })
    ).toBeChecked();
    expect(screen.getByRole("cell", { name: "iso" })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Name" })
    ).toBeInTheDocument();
  });

  it("renders divider and graceful unknown blocks", () => {
    const content: ArticleBlockJson[] = [
      { type: "divider" },
      {
        type: "futureBlock",
        props: { mystery: "<script>alert(1)</script>" },
        content: [{ type: "text", text: "legacy content" }],
      },
      { type: "totally-empty-unknown", props: {} },
    ];
    const { container } = renderArticle(content);

    expect(container.querySelector("hr")).not.toBeNull();
    expect(screen.getByText("legacy content")).toBeInTheDocument();
    // Unknown props never reach the DOM.
    expect(container.innerHTML).not.toContain("mystery");
    expect(container.innerHTML).not.toContain("<script>");
  });
});

describe("ArticleRenderer — media blocks", () => {
  it("resolves asset:// image blocks to public URLs", () => {
    const content: ArticleBlockJson[] = [
      {
        type: "image",
        props: { url: `asset://${ASSET_ID}`, caption: "Studio shot" },
      },
    ];
    renderArticle(content);
    const img = screen.getByRole("img", { name: "Studio shot" });
    expect(img).toHaveAttribute("src", PUBLIC_URL);
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("renders an empty slot for unpublished or stripped media", () => {
    const content: ArticleBlockJson[] = [
      {
        type: "image",
        props: { url: "asset://99999999-9999-4999-8999-999999999999" },
      },
      { type: "video", props: { url: "https://untrusted.example/x.mp4" } },
    ];
    renderArticle(content);
    expect(screen.getByRole("img", { name: "Media unavailable" }));
    expect(screen.getByRole("img", { name: "Video unavailable" }));
    expect(screen.queryByRole("video")).toBeNull();
  });

  it("renders generation blocks from the published media map", () => {
    const content: ArticleBlockJson[] = [
      {
        type: "generation",
        props: {
          generationId: "gen-secret-id",
          assetId: ASSET_ID,
          caption: "Final look",
        },
      },
    ];
    const { container } = renderArticle(content);
    expect(screen.getByRole("img", { name: "Final look" })).toHaveAttribute(
      "src",
      PUBLIC_URL
    );
    // The private generation id must never appear in the markup.
    expect(container.innerHTML).not.toContain("gen-secret-id");
  });

  it("renders a side-by-side comparison", () => {
    const otherId = "33333333-3333-4333-8333-333333333333";
    const media = {
      ...MEDIA,
      [otherId]: {
        ...ASSET,
        assetId: otherId,
        storageKey: `articles/x/${otherId}.png`,
      },
    };
    const content: ArticleBlockJson[] = [
      {
        type: "comparison",
        props: {
          beforeAssetId: ASSET_ID,
          afterAssetId: otherId,
          mode: "side-by-side",
        },
      },
    ];
    const headings = indexHeadings(content);
    render(
      <ArticleRenderer
        content={content}
        media={media}
        presets={new Map()}
        headings={headings}
      />
    );
    expect(screen.getByRole("img", { name: "Before" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "After" })).toBeInTheDocument();
  });
});

describe("ArticleRenderer — custom blocks", () => {
  it("renders preset cards linking to the preset page", () => {
    const content: ArticleBlockJson[] = [
      { type: "preset", props: { productSlug: "film-grain" } },
    ];
    renderArticle(content, new Map([["film-grain", PRODUCT]]));
    const link = screen.getByRole("link", { name: /Film Grain/ });
    expect(link).toHaveAttribute("href", "/presets/film-grain");
  });

  it("shows an unavailable card for retired presets", () => {
    renderArticle(
      [{ type: "preset", props: { productSlug: "gone" } }],
      new Map([["gone", null]])
    );
    expect(
      screen.getByText("This preset is no longer available.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders prompt recipes with copy + preset CTA", () => {
    const content: ArticleBlockJson[] = [
      {
        type: "promptRecipe",
        props: { recipe: "warm tones, soft light", presetSlug: "film-grain" },
      },
    ];
    renderArticle(content, new Map([["film-grain", PRODUCT]]));
    expect(screen.getByText("warm tones, soft light")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Try this preset/i })
    ).toHaveAttribute("href", "/presets/film-grain");
  });

  it("renders settings, workflow, callout and cta blocks", () => {
    const content: ArticleBlockJson[] = [
      { type: "settings", props: { productSlug: "film-grain" } },
      {
        type: "workflow",
        props: { steps: ["Upload photo", "Pick preset", "Generate"] },
      },
      {
        type: "callout",
        props: { tone: "warning" },
        content: [{ type: "text", text: "Watch exposure" }],
      },
      {
        type: "cta",
        props: { label: "Browse presets", href: "/explore", presetSlug: "" },
      },
      {
        type: "cta",
        props: { label: "evil", href: "javascript:alert(1)", presetSlug: "" },
      },
    ];
    renderArticle(content, new Map([["film-grain", PRODUCT]]));

    expect(screen.getByText("Film Grain settings")).toBeInTheDocument();
    expect(screen.getByText("How strong the grain reads.")).toBeInTheDocument();
    expect(screen.getByText("Upload photo")).toBeInTheDocument();
    expect(screen.getByText("Watch exposure")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Browse presets/ })
    ).toHaveAttribute("href", "/explore");
    // Unsafe CTA href renders nothing — no anchor at all.
    expect(screen.queryByRole("link", { name: /evil/ })).toBeNull();
  });
});
