import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Publication-integrity tests for the article media publish path (#129).
 *
 * The critical invariant: a failed republish must NEVER take the existing
 * live publication offline. The publish flow is:
 *   validate refs -> stage public object copies -> publish_article RPC
 *     (the RPC re-verifies refs + object presence and marks assets atomically)
 * `unpublish_article` must never appear in a failure path.
 */

const rpcCalls: string[] = [];
let rpcError: { message: string; code?: string } | null = null;
let articlesRow: { draft_content: unknown; cover_asset_id: string | null } = {
  draft_content: [],
  cover_asset_id: null,
};
let articleAssetsRows: { asset_id: string }[] = [];

const STAGE_IDS = ["11111111-1111-1111-1111-111111111111"];
const stageMock = vi.fn(async () => [
  "articles/x/11111111-1111-1111-1111-111111111111.png",
]);
const removeMock = vi.fn(async () => {});
const revokeMock = vi.fn(async () => {});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function thenable(result: { data: unknown; error: unknown }) {
  const q = {
    select: () => q,
    eq: () => q,
    neq: () => q,
    in: () => q,
    is: () => q,
    not: () => q,
    order: () => q,
    limit: () => q,
    maybeSingle: async () => result,
    single: async () => result,
    then: <T>(res: (v: typeof result) => T, rej?: (e: unknown) => T) =>
      Promise.resolve(result).then(res, rej),
  };
  return q;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) =>
      thenable(
        table === "articles"
          ? { data: articlesRow, error: null }
          : { data: articleAssetsRows, error: null }
      ),
    rpc: (name: string) => {
      rpcCalls.push(name);
      if (rpcError) return Promise.resolve({ data: null, error: rpcError });
      return Promise.resolve({
        data: { id: "article-1", slug: "guide", status: "published" },
        error: null,
      });
    },
  }),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({}),
}));
vi.mock("../media-lifecycle", () => ({
  stageArticleMediaPublicCopies: (...args: unknown[]) =>
    stageMock(...(args as [string, string[]])),
  removeStagedPublicCopies: (...args: unknown[]) =>
    removeMock(...(args as [string[]])),
  revokeArticleMedia: () => revokeMock(),
}));

const { publishArticleAction } = await import("../actions");

const MEDIA_DOC = [
  {
    type: "image",
    props: { url: "asset://11111111-1111-1111-1111-111111111111" },
    children: [],
  },
];

beforeEach(() => {
  rpcCalls.length = 0;
  rpcError = null;
  articlesRow = { draft_content: [], cover_asset_id: null };
  articleAssetsRows = [{ asset_id: STAGE_IDS[0] }];
  stageMock.mockClear();
  removeMock.mockClear();
  revokeMock.mockClear();
});

describe("publishArticleAction media safety", () => {
  it("publishes: refs validated, objects staged, then the RPC commits", async () => {
    articlesRow = { draft_content: MEDIA_DOC, cover_asset_id: null };
    const result = await publishArticleAction("article-1", 3);
    expect(result.ok).toBe(true);
    expect(stageMock).toHaveBeenCalledWith("article-1", STAGE_IDS);
    expect(rpcCalls).toContain("publish_article");
    expect(rpcCalls).not.toContain("unpublish_article");
  });

  it("a staging failure never calls publish or unpublish — the live publication stays up", async () => {
    articlesRow = { draft_content: MEDIA_DOC, cover_asset_id: null };
    stageMock.mockRejectedValueOnce(new Error("storage down"));
    const result = await publishArticleAction("article-1", 3);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("media_not_promoted");
    // The article RPC was never reached — nothing changed server-side.
    expect(rpcCalls).toEqual([]);
    expect(revokeMock).not.toHaveBeenCalled();
  });

  it("an RPC failure removes staged objects and never unpublishes", async () => {
    articlesRow = { draft_content: MEDIA_DOC, cover_asset_id: null };
    rpcError = { message: "media_not_promoted", code: "P0001" };
    const result = await publishArticleAction("article-1", 3);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("media_not_promoted");
    expect(removeMock).toHaveBeenCalledWith([
      "articles/x/11111111-1111-1111-1111-111111111111.png",
    ]);
    expect(rpcCalls).not.toContain("unpublish_article");
  });

  it("rejects publishing when a referenced asset is not registered for the article", async () => {
    articlesRow = { draft_content: MEDIA_DOC, cover_asset_id: null };
    articleAssetsRows = []; // asset belongs to another article
    const result = await publishArticleAction("article-1", 3);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("invalid_content");
    expect(stageMock).not.toHaveBeenCalled();
    expect(rpcCalls).toEqual([]);
  });

  it("includes the cover asset in the promoted reference set", async () => {
    articlesRow = {
      draft_content: MEDIA_DOC,
      cover_asset_id: "22222222-2222-2222-2222-222222222222",
    };
    articleAssetsRows = [
      { asset_id: STAGE_IDS[0] },
      { asset_id: "22222222-2222-2222-2222-222222222222" },
    ];
    const result = await publishArticleAction("article-1", 3);
    expect(result.ok).toBe(true);
    expect(stageMock).toHaveBeenCalledWith(
      "article-1",
      expect.arrayContaining([
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
      ])
    );
  });
});
