import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSignedReferenceAssets } from "../reference-assets";

const serviceStub = vi.hoisted(() => ({
  from: vi.fn(),
  storageFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: serviceStub.from,
    storage: { from: serviceStub.storageFrom },
  }),
}));

interface Row {
  role: string;
  asset_id: string;
  sort_order: number;
  assets: {
    bucket: string;
    storage_key: string;
    mime_type: string | null;
    bytes: number | null;
  };
}

const PNG = (bytes: number, key: string, bucket = "preset-media") => ({
  bucket,
  storage_key: key,
  mime_type: "image/png",
  bytes,
});

function mockQuery(rows: Row[], signed: Record<string, string | null>) {
  serviceStub.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        in: () => ({
          order: () => Promise.resolve({ data: rows, error: null }),
        }),
      }),
    }),
  });
  serviceStub.storageFrom.mockImplementation((bucket: string) => ({
    createSignedUrl: (key: string) =>
      Promise.resolve({
        data: { signedUrl: signed[`${bucket}/${key}`] ?? null },
        error: signed[`${bucket}/${key}`] ? null : { message: "no sign" },
      }),
  }));
}

beforeEach(() => {
  serviceStub.from.mockReset();
  serviceStub.storageFrom.mockReset();
});

describe("getSignedReferenceAssets", () => {
  it("collapses the same image attached under multiple roles into one URL", async () => {
    // The Retro Slam Manga bug: one artwork uploaded twice, attached as both
    // style and composition → provider received [source, ref, ref].
    mockQuery(
      [
        {
          role: "style_reference",
          asset_id: "a1",
          sort_order: 0,
          assets: PNG(4522281, "refs/a.png"),
        },
        {
          role: "composition_reference",
          asset_id: "a2",
          sort_order: 1,
          assets: PNG(4522281, "refs/b.png"),
        },
      ],
      {
        "preset-media/refs/a.png": "https://signed/a",
        "preset-media/refs/b.png": "https://signed/b",
      }
    );

    const result = await getSignedReferenceAssets("prod-1");
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://signed/a");
    expect(result[0].roles.sort()).toEqual([
      "composition_reference",
      "style_reference",
    ]);
  });

  it("keeps genuinely different references as separate URLs", async () => {
    mockQuery(
      [
        {
          role: "style_reference",
          asset_id: "a1",
          sort_order: 0,
          assets: PNG(1000, "refs/style.png"),
        },
        {
          role: "layout_reference",
          asset_id: "a2",
          sort_order: 1,
          assets: PNG(2000, "refs/layout.png"),
        },
      ],
      {
        "preset-media/refs/style.png": "https://signed/style",
        "preset-media/refs/layout.png": "https://signed/layout",
      }
    );

    const result = await getSignedReferenceAssets("prod-1");
    expect(result.map((r) => r.url)).toEqual([
      "https://signed/style",
      "https://signed/layout",
    ]);
  });

  it("skips a reference whose signed URL fails without sinking the rest", async () => {
    mockQuery(
      [
        {
          role: "style_reference",
          asset_id: "a1",
          sort_order: 0,
          assets: PNG(1000, "refs/ok.png"),
        },
        {
          role: "layout_reference",
          asset_id: "a2",
          sort_order: 1,
          assets: PNG(2000, "refs/broken.png"),
        },
      ],
      { "preset-media/refs/ok.png": "https://signed/ok" }
    );

    const result = await getSignedReferenceAssets("prod-1");
    expect(result).toEqual([
      { url: "https://signed/ok", roles: ["style_reference"] },
    ]);
  });
});
