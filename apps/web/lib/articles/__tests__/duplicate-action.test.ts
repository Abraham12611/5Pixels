import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * duplicateArticleAction orchestration (#126): the RPC creates the draft +
 * pending media clones and returns a copy plan; the action must physically
 * copy each staging object in the PRIVATE bucket and then finalize the clone
 * (pending -> ready). Copy/finalize failures never block the duplicate —
 * they surface as warnings and leave the row pending for the sweep.
 */

const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
let duplicateResult: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};
let finalizeError: { message: string } | null = null;
const copyMock = vi.fn(
  async (
    _from: string,
    _to: string
  ): Promise<{ data: unknown; error: { message: string } | null }> => ({
    data: {},
    error: null,
  })
);
const auditMock = vi.fn(async (_args: unknown) => {});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      if (name === "duplicate_article") return Promise.resolve(duplicateResult);
      if (name === "finalize_article_media_upload") {
        return Promise.resolve({
          data: { id: "aa-new" },
          error: finalizeError,
        });
      }
      return Promise.resolve({ data: null, error: null });
    },
  }),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    storage: { from: () => ({ copy: copyMock }) },
  }),
}));
vi.mock("@/lib/db/audit", () => ({
  logAdminAction: (args: unknown) => auditMock(args),
}));
vi.mock("@/lib/db/admin", () => ({ requireAdminOrOwner: vi.fn() }));
vi.mock("../queries", () => ({ getArticleForEditor: vi.fn() }));

const { duplicateArticleAction } = await import("../actions");

const COPIES = [
  {
    asset_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    from_key: "staff/u1/articles/old/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png",
    to_key: "staff/u1/articles/new/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png",
    mime_type: "image/png",
    bytes: 1234,
    width: 640,
    height: 480,
    duration_ms: null,
  },
  {
    asset_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    from_key: "staff/u1/articles/old/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.png",
    to_key: "staff/u1/articles/new/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.png",
    mime_type: "image/png",
    bytes: 5678,
    width: 640,
    height: 480,
    duration_ms: null,
  },
];

const NEW_ARTICLE = {
  id: "article-new",
  slug: "guide-copy",
  title: "Guide (copy)",
  status: "draft",
  edit_version: 1,
};

beforeEach(() => {
  rpcCalls.length = 0;
  finalizeError = null;
  copyMock.mockClear();
  copyMock.mockResolvedValue({ data: {}, error: null });
  auditMock.mockClear();
  duplicateResult = {
    data: { article: NEW_ARTICLE, copies: COPIES },
    error: null,
  };
});

describe("duplicateArticleAction", () => {
  it("copies every planned object in the private bucket and finalizes each clone", async () => {
    const result = await duplicateArticleAction("article-old");

    expect(result.ok).toBe(true);
    expect(result.article?.id).toBe("article-new");
    expect(result.warning).toBeUndefined();

    expect(copyMock).toHaveBeenCalledTimes(2);
    expect(copyMock).toHaveBeenCalledWith(COPIES[0].from_key, COPIES[0].to_key);
    expect(copyMock).toHaveBeenCalledWith(COPIES[1].from_key, COPIES[1].to_key);

    const finalized = rpcCalls.filter(
      (c) => c.name === "finalize_article_media_upload"
    );
    expect(finalized).toHaveLength(2);
    expect(finalized[0].args).toMatchObject({
      p_asset_id: COPIES[0].asset_id,
      p_verified_mime_type: "image/png",
      p_verified_bytes: 1234,
    });
  });

  it("a failed object copy skips finalize for that asset and returns a warning", async () => {
    copyMock
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "object missing" },
      });

    const result = await duplicateArticleAction("article-old");

    expect(result.ok).toBe(true);
    expect(result.warning).toContain("1 media item");
    const finalized = rpcCalls.filter(
      (c) => c.name === "finalize_article_media_upload"
    );
    expect(finalized).toHaveLength(1);
    expect(finalized[0].args.p_asset_id).toBe(COPIES[0].asset_id);
  });

  it("a failed finalize keeps the clone pending and warns", async () => {
    finalizeError = { message: "upload_metadata_mismatch" };

    const result = await duplicateArticleAction("article-old");

    expect(result.ok).toBe(true);
    expect(result.warning).toContain("2 media items");
  });

  it("RPC failure surfaces the mapped error and copies nothing", async () => {
    duplicateResult = {
      data: null,
      error: { message: "Forbidden: editorial staff only", code: "42501" },
    };

    const result = await duplicateArticleAction("article-old");

    expect(result.ok).toBe(false);
    expect(result.code).toBe("forbidden");
    expect(copyMock).not.toHaveBeenCalled();
  });

  it("writes an audit entry for the duplicate", async () => {
    await duplicateArticleAction("article-old");
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "article.duplicate",
        entityType: "article",
        entityId: "article-old",
      })
    );
  });
});
