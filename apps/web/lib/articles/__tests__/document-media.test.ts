import { describe, expect, it } from "vitest";
import {
  collectDocumentAssetIds,
  prepareDocumentForEditing,
  prepareDocumentForStorage,
} from "../document-media";
import type { ArticleBlockJson } from "../document";

const ASSET_A = "33333333-3333-4333-8333-333333333333";
const ASSET_B = "44444444-4444-4444-8444-444444444444";
const GEN_ASSET = "55555555-5555-4555-8555-555555555555";

const image = (url: string): ArticleBlockJson => ({
  id: "b1",
  type: "image",
  props: { url, caption: "cap" },
});

describe("prepareDocumentForStorage", () => {
  it("rewrites proxy urls to canonical asset:// references", () => {
    const doc = [image(`/api/articles/media/${ASSET_A}?w=400`)];
    const result = prepareDocumentForStorage(doc);
    expect(result.document[0].props?.url).toBe(`asset://${ASSET_A}`);
    expect(result.assetIds).toEqual([ASSET_A]);
    expect(result.strippedUrls).toBe(0);
  });

  it("keeps existing asset:// references and lowercases ids", () => {
    const doc = [image(`asset://${ASSET_A.toUpperCase()}`)];
    const result = prepareDocumentForStorage(doc);
    expect(result.document[0].props?.url).toBe(`asset://${ASSET_A}`);
  });

  it("strips non-allowlisted remote urls instead of persisting them", () => {
    const doc = [image("https://random.example/steal.png")];
    const result = prepareDocumentForStorage(doc);
    expect(result.document[0].props?.url).toBe("");
    expect(result.strippedUrls).toBe(1);
    expect(result.assetIds).toEqual([]);
  });

  it("strips private-bucket urls that do not match the article path contract", () => {
    const doc = [
      image(
        "https://proj.supabase.co/storage/v1/object/sign/user-assets/abc/outputs/x.png?token=t"
      ),
      image("javascript:alert(1)"),
    ];
    const result = prepareDocumentForStorage(doc);
    expect(result.strippedUrls).toBe(2);
    expect(result.document.every((b) => b.props?.url === "")).toBe(true);
  });

  it("walks nested children and collects generation assetIds", () => {
    const doc: ArticleBlockJson[] = [
      {
        type: "callout",
        children: [image(`/api/articles/media/${ASSET_B}`)],
      },
      {
        type: "generation",
        props: { generationId: "g", assetId: GEN_ASSET, caption: "" },
      },
    ];
    const result = prepareDocumentForStorage(doc);
    expect(result.assetIds.sort()).toEqual([ASSET_B, GEN_ASSET].sort());
    expect(result.document[0].children?.[0].props?.url).toBe(
      `asset://${ASSET_B}`
    );
  });
});

describe("prepareDocumentForEditing", () => {
  it("expands asset:// urls to the staff-gated proxy route", () => {
    const doc = [image(`asset://${ASSET_A}`)];
    const out = prepareDocumentForEditing(doc);
    expect(out[0].props?.url).toBe(`/api/articles/media/${ASSET_A}`);
  });

  it("leaves non-asset urls untouched and recurses", () => {
    const doc: ArticleBlockJson[] = [
      image("https://cdn.example.com/x.png"),
      { type: "callout", children: [image(`asset://${ASSET_B}`)] },
    ];
    const out = prepareDocumentForEditing(doc);
    expect(out[0].props?.url).toBe("https://cdn.example.com/x.png");
    expect(out[1].children?.[0].props?.url).toBe(
      `/api/articles/media/${ASSET_B}`
    );
  });
});

describe("collectDocumentAssetIds", () => {
  it("collects ids from media urls and generation blocks", () => {
    const doc: ArticleBlockJson[] = [
      image(`asset://${ASSET_A}`),
      {
        type: "generation",
        props: { generationId: "g", assetId: GEN_ASSET, caption: "" },
      },
      { type: "video", props: { url: `asset://${ASSET_B}` } },
    ];
    expect(collectDocumentAssetIds(doc).sort()).toEqual(
      [ASSET_A, ASSET_B, GEN_ASSET].sort()
    );
  });

  it("collects promptRecipe 'asset'-kind references (#128)", () => {
    const doc: ArticleBlockJson[] = [
      {
        type: "promptRecipe",
        props: {
          presetId: "",
          recipeText: "steps",
          references: JSON.stringify([
            { id: ASSET_B, label: "Source", kind: "asset" },
            // 'generation'-kind ids are share provenance — not assets.
            { id: GEN_ASSET, label: "Shared", kind: "generation" },
          ]),
        },
      },
    ];
    expect(collectDocumentAssetIds(doc)).toEqual([ASSET_B]);
  });

  it("prepareDocumentForStorage counts promptRecipe refs as media refs", () => {
    const doc: ArticleBlockJson[] = [
      {
        type: "promptRecipe",
        props: {
          references: JSON.stringify([
            { id: ASSET_A, label: "Source", kind: "asset" },
          ]),
        },
      },
    ];
    expect(prepareDocumentForStorage(doc).assetIds).toEqual([ASSET_A]);
  });
});
