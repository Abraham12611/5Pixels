import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Issue #129 review — the orphan sweep's live-inventory query must be
 * paginated. PostgREST caps a response at 1000 rows; a truncated
 * liveRows set would mark legitimately published media as orphans and
 * delete it. These tests stub the service client with a 1000-row page
 * cap and seed 1500 published assets — a live key that only exists on
 * page 2 must still be protected.
 */

type Row = Record<string, unknown>;

const PAGE_CAP = 1000;

let articleAssetRows: Row[] = [];
let storagePrefixes: { id: string | null; name: string }[] = [];
let storageObjects: Record<string, { id: string | null; name: string }[]> =
  {};
let removedKeys: string[] = [];
let confirmedIds: string[] = [];

function makeQuery(rows: Row[]) {
  const filters: ((r: Row) => boolean)[] = [];
  const run = () => rows.filter((r) => filters.every((f) => f(r)));
  const q: Record<string, unknown> & {
    then: (
      res: (v: { data: Row[]; error: null }) => unknown
    ) => Promise<unknown>;
  } = {
    select: () => q,
    eq: (c: string, v: unknown) => {
      filters.push((r) => r[c] === v);
      return q;
    },
    neq: (c: string, v: unknown) => {
      filters.push((r) => r[c] !== v);
      return q;
    },
    in: (c: string, vals: unknown[]) => {
      filters.push((r) => vals.includes(r[c]));
      return q;
    },
    not: (c: string, op: string, v: unknown) => {
      if (op === "is") filters.push((r) => r[c] !== v);
      return q;
    },
    // PostgREST semantics: .range(from, to) — capped page size.
    range: (from: number, to: number) =>
      Promise.resolve({
        data: run().slice(from, Math.min(to + 1, from + PAGE_CAP)),
        error: null,
      }),
    then: (res) =>
      Promise.resolve({ data: run().slice(0, PAGE_CAP), error: null }).then(
        res
      ),
  };
  return q;
}

const service = {
  from: (table: string) =>
    makeQuery(table === "article_assets" ? articleAssetRows : []),
  rpc: (name: string, args: Row) => {
    if (name === "confirm_article_media_revocation") {
      const ids = args.p_article_asset_ids as string[];
      confirmedIds.push(...ids);
      return Promise.resolve({ data: ids.length, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  },
  storage: {
    from: () => ({
      list: (prefix: string, opts: { limit: number; offset: number }) => {
        const entries =
          prefix === "articles" ? storagePrefixes : storageObjects[prefix] ?? [];
        return Promise.resolve({
          data: entries.slice(opts.offset, opts.offset + opts.limit),
          error: null,
        });
      },
      remove: (keys: string[]) => {
        // The real Storage API rejects remove() calls over 1000 keys.
        if (keys.length > PAGE_CAP) {
          return Promise.resolve({
            data: null,
            error: { message: "exceeded maximum batch size" },
          });
        }
        removedKeys.push(...keys);
        return Promise.resolve({ data: keys, error: null });
      },
      download: async () => ({ data: null, error: { message: "no blob" } }),
      upload: async () => ({ data: null, error: null }),
    }),
  },
};

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => service,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({}),
}));

const { sweepOrphanedPublicObjects, retryRevokedArticleMedia } =
  await import("../media-lifecycle");

beforeEach(() => {
  articleAssetRows = [];
  storagePrefixes = [];
  storageObjects = {};
  removedKeys = [];
  confirmedIds = [];
});

function seedLiveKeys(count: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    keys.push(`articles/a/k${String(i).padStart(4, "0")}.png`);
    articleAssetRows.push({
      id: `aa-${i}`,
      state: "published",
      published_key: keys[i],
    });
  }
  return keys;
}

describe("sweepOrphanedPublicObjects — live-inventory pagination", () => {
  it("protects live keys found beyond the first 1000-row page", async () => {
    const live = seedLiveKeys(1500);
    storagePrefixes = [{ id: null, name: "a" }];
    storageObjects["articles/a"] = [
      { id: "o1", name: "k0000.png" }, // live — page 1 row
      { id: "o2", name: "k1499.png" }, // live — only reachable on page 2
      { id: "o3", name: "zzzz.png" }, // genuine orphan
    ];

    await sweepOrphanedPublicObjects();

    expect(removedKeys).toEqual(["articles/a/zzzz.png"]);
    expect(removedKeys).not.toContain(live[1499]);
  });

  it("deletes nothing when the live inventory cannot be established", async () => {
    const failing = {
      ...service,
      from: () => ({
        select: () => ({
          eq: () => ({
            not: () => ({
              range: () =>
                Promise.resolve({ data: null, error: { message: "down" } }),
            }),
          }),
        }),
      }),
    };
    vi.doMock("@/lib/supabase/service", () => ({
      createServiceClient: () => failing,
    }));
    vi.resetModules();
    const { sweepOrphanedPublicObjects: sweep } = await import(
      "../media-lifecycle"
    );

    storagePrefixes = [{ id: null, name: "a" }];
    storageObjects["articles/a"] = [{ id: "o1", name: "x.png" }];
    expect(await sweep()).toBe(0);
    expect(removedKeys).toEqual([]);

    vi.doMock("@/lib/supabase/service", () => ({
      createServiceClient: () => service,
    }));
    vi.resetModules();
  });
});

describe("retryRevokedArticleMedia — pagination and remove batching", () => {
  it("collects revoked rows beyond the first page and deletes in batches", async () => {
    for (let i = 0; i < 1500; i++) {
      articleAssetRows.push({
        id: `aa-${i}`,
        state: "ready",
        published_key: `articles/a/r${String(i).padStart(4, "0")}.png`,
      });
    }

    expect(await retryRevokedArticleMedia()).toBe(1500);
    // The fake rejects any remove() over PAGE_CAP keys — reaching 1500
    // removals proves the backlog was split into API-legal batches.
    expect(removedKeys).toHaveLength(1500);
    expect(confirmedIds).toHaveLength(1500);
  });
});
