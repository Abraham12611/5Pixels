import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectDocumentPresetIds,
  isPinnedVersionStale,
} from "../preset-card";
import {
  resolvePresetCardById,
  resolvePresetCardBySlug,
  resolvePresetCardMap,
} from "../presets";
import {
  getPublicProductBySlug,
  getPublicProducts,
} from "@/lib/db/explore";
import { deserializeArticleDocument } from "../document";
import type { PublicProductSummary } from "@/types/catalog";

/**
 * #127 — the server-side reader contract the public article renderer (#131)
 * consumes: serialized preset blocks → collectDocumentPresetIds →
 * resolvePresetCardMap → ArticlePresetCard data. These tests pin the
 * privacy boundary (public catalog RPCs only) and the degradation contract
 * (tampered/retired/missing → null, never private data, never an error).
 */

vi.mock("@/lib/db/explore", () => ({
  getPublicProducts: vi.fn(),
  getPublicProductBySlug: vi.fn(),
}));

const productsMock = vi.mocked(getPublicProducts);
const bySlugMock = vi.mocked(getPublicProductBySlug);

const PID = "11111111-2222-4333-8444-555555555555";
const VID = "66666666-7777-4888-8999-000000000000";

function row(overrides: Partial<PublicProductSummary> = {}): PublicProductSummary {
  return {
    id: PID,
    slug: "film-grain-portrait",
    name: "Film Grain Portrait",
    type: "filter",
    short_description: "Analog grain",
    long_description: null,
    category_id: null,
    category_slug: null,
    category_name: "Portrait",
    featured_rank: 1,
    version_id: VID,
    version_number: 2,
    credit_cost: 4,
    output_sizes: [],
    metadata: null,
    hero_asset_id: null,
    poster_asset_id: null,
    preview_gif_asset_id: null,
    preview_video_asset_id: null,
    public_assets: [],
    created_at: null,
    likeness_level: null,
    ...overrides,
  };
}

beforeEach(() => {
  productsMock.mockReset();
  bySlugMock.mockReset();
});

describe("resolvePresetCardById", () => {
  it("rejects non-uuid input without touching the catalog", async () => {
    for (const bad of ["", "not-a-uuid", "film-grain-portrait", "42"]) {
      expect(await resolvePresetCardById(bad)).toBeNull();
    }
    expect(productsMock).not.toHaveBeenCalled();
  });

  it("returns null when the product is retired/private — no error", async () => {
    productsMock.mockResolvedValue({ data: [] } as never);
    expect(await resolvePresetCardById(PID)).toBeNull();
  });

  it("maps a live product to public card data", async () => {
    productsMock.mockResolvedValue({ data: [row()] } as never);
    const card = await resolvePresetCardById(PID);
    expect(card).toMatchObject({
      productId: PID,
      slug: "film-grain-portrait",
      href: "/presets/film-grain-portrait",
      activeVersionId: VID,
    });
  });
});

describe("resolvePresetCardBySlug", () => {
  it("rejects empty/oversized slugs and maps real ones", async () => {
    expect(await resolvePresetCardBySlug("")).toBeNull();
    expect(await resolvePresetCardBySlug("x".repeat(121))).toBeNull();
    bySlugMock.mockResolvedValue({ data: row() } as never);
    const card = await resolvePresetCardBySlug("film-grain-portrait");
    expect(card?.productId).toBe(PID);
  });
});

describe("resolvePresetCardMap", () => {
  it("dedupes ids, chunks over 50, and omits unresolved ids", async () => {
    const other = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const ids = Array.from({ length: 51 }, (_, i) =>
      `00000000-0000-4000-8000-${String(i + 100000000000).slice(-12)}`
    );
    ids[0] = PID;
    ids.push(PID, other); // dupes + extra
    productsMock
      .mockResolvedValueOnce({
        data: [row(), row({ id: other, slug: "other", name: "Other" })],
      } as never)
      .mockResolvedValueOnce({ data: [] } as never);

    const map = await resolvePresetCardMap(ids);
    // Two catalog pages: ids were chunked at the RPC's 50-row bound.
    expect(productsMock).toHaveBeenCalledTimes(2);
    expect(productsMock.mock.calls[0][2]).toHaveLength(50);
    expect(productsMock.mock.calls[1][2]).toHaveLength(2);
    expect(map.has(PID)).toBe(true);
    expect(map.has(other)).toBe(true);
    expect(map.size).toBe(2); // unresolved ids are simply absent
  });

  it("filters non-uuid refs before querying — tampering never hits the DB", async () => {
    productsMock.mockResolvedValue({ data: [row()] } as never);
    const map = await resolvePresetCardMap(["not-a-uuid", PID]);
    expect(productsMock).toHaveBeenCalledTimes(1);
    expect(productsMock.mock.calls[0][2]).toEqual([PID]);
    expect(map.size).toBe(1);
    expect(map.has(PID)).toBe(true);
  });
});

/**
 * Cross-feature contract (#131): the reader consumes exactly what the
 * editor persists. A serialized BlockNote document round-trips through the
 * same validation the publish gate runs, then resolves to the card map the
 * public renderer will pass to ArticlePresetCard.
 */
describe("reader contract — serialized block → resolved card", () => {
  const doc = [
    {
      id: "b1",
      type: "paragraph",
      props: {},
      content: [{ type: "text", text: "Try this:" }],
      children: [],
    },
    {
      id: "b2",
      type: "preset",
      props: {
        presetId: PID,
        slug: "film-grain-portrait",
        selectedPublicVersionId: VID,
        displayVariant: "compact",
      },
      children: [],
    },
    {
      id: "b3",
      type: "preset",
      // Tampered/forged props — must survive validation as data but resolve
      // to nothing (the reader renders the safe fallback).
      props: {
        presetId: "99999999-9999-4999-8999-999999999999",
        slug: "forged-slug",
        selectedPublicVersionId: "not-a-uuid-at-all",
        displayVariant: "card",
      },
      children: [],
    },
  ];

  it("a published-shape document validates and resolves through the public map", async () => {
    // The same validation path as persistence — forged props must not crash
    // the schema boundary... note: selectedPublicVersionId "not-a-uuid-at-all"
    // fails the zod uuid union, which is the DESIRED rejection point. Use a
    // forged-but-well-formed uuid for the resolve-path check instead.
    const valid = doc.map((b) =>
      b.id === "b3"
        ? {
            ...b,
            props: {
              ...b.props,
              selectedPublicVersionId:
                "99999999-9999-4999-8999-999999999999",
            },
          }
        : b
    );
    const parsed = deserializeArticleDocument(JSON.parse(JSON.stringify(valid)));
    const ids = collectDocumentPresetIds(parsed);
    expect(ids).toEqual([PID, "99999999-9999-4999-8999-999999999999"]);

    productsMock.mockResolvedValue({ data: [row()] } as never);
    const map = await resolvePresetCardMap(ids);

    // The real preset resolves; the retired/forged one is absent → fallback.
    const card = map.get(PID)!;
    expect(card.href).toBe("/presets/film-grain-portrait");
    expect(map.has("99999999-9999-4999-8999-999999999999")).toBe(false);

    // The reader's per-block render decision, end to end.
    const block = parsed.find((b) => b.id === "b2")!;
    const blockProps = block.props as Record<string, unknown>;
    expect(blockProps.displayVariant).toBe("compact");
    expect(
      isPinnedVersionStale(card, blockProps.selectedPublicVersionId as string)
    ).toBe(false);
  });

  it("a forged non-uuid prop is rejected at the schema boundary", () => {
    expect(() => deserializeArticleDocument(doc)).toThrow();
  });
});
