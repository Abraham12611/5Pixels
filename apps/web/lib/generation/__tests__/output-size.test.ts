import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveOutputSize } from "../output-size";

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

function mockLookups(opts: {
  productAssetRows?: Array<{ asset_id: string }>;
  asset: {
    width: number | null;
    height: number | null;
    bucket: string;
    storage_key: string;
  } | null;
  objectMetadata?: Record<string, unknown> | null;
}) {
  serviceStub.from.mockImplementation((table: string) => {
    if (table === "product_assets") {
      return {
        select: () => ({
          eq: () => ({
            in: () => ({
              order: () => ({
                limit: () =>
                  Promise.resolve({ data: opts.productAssetRows ?? [] }),
              }),
            }),
          }),
        }),
      };
    }
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: opts.asset }),
        }),
      }),
    };
  });
  serviceStub.storageFrom.mockReturnValue({
    list: () =>
      Promise.resolve({
        data:
          opts.objectMetadata === undefined
            ? []
            : [{ metadata: opts.objectMetadata }],
      }),
  });
}

function mockAssetLookup(
  asset: {
    width: number | null;
    height: number | null;
    bucket: string;
    storage_key: string;
  } | null,
  objectMetadata?: Record<string, unknown> | null
) {
  mockLookups({ asset, objectMetadata });
}

beforeEach(() => {
  serviceStub.from.mockReset();
  serviceStub.storageFrom.mockReset();
});

describe("resolveOutputSize — fixed sizes", () => {
  it("passes a valid fixed size through unchanged", async () => {
    const result = await resolveOutputSize(
      { name: "Square", width: 1024, height: 1024 },
      "asset-1"
    );
    expect(result).toEqual({ width: 1024, height: 1024, matchSource: false });
    expect(serviceStub.from).not.toHaveBeenCalled();
  });

  it("rejects sizes over the 4 MP cap", async () => {
    const result = await resolveOutputSize(
      { name: "Huge", width: 3000, height: 2000 },
      "asset-1"
    );
    expect(result).toBeNull();
  });

  it("rejects malformed sizes", async () => {
    expect(await resolveOutputSize(null, "a")).toBeNull();
    expect(
      await resolveOutputSize({ name: "x", width: 0, height: 100 }, "a")
    ).toBeNull();
  });
});

describe("resolveOutputSize — match_source", () => {
  const matchOption = {
    name: "Match photo",
    width: 1024,
    height: 1024,
    match_source: true,
  };

  it("resolves dims from the source asset row", async () => {
    mockAssetLookup({
      width: 3000,
      height: 4000,
      bucket: "user-assets",
      storage_key: "u/sources/a.jpg",
    });
    const result = await resolveOutputSize(matchOption, "asset-1");
    // 12 MP source clamps to the 4 MP cap at the same 3:4 aspect.
    expect(result?.matchSource).toBe(true);
    expect(result!.width * result!.height).toBeLessThanOrEqual(4_000_000);
    expect(result!.width / result!.height).toBeCloseTo(0.75, 2);
  });

  it("keeps small sources at their native dims", async () => {
    mockAssetLookup({
      width: 1536,
      height: 1024,
      bucket: "user-assets",
      storage_key: "u/sources/b.jpg",
    });
    const result = await resolveOutputSize(matchOption, "asset-1");
    expect(result).toEqual({ width: 1536, height: 1024, matchSource: true });
  });

  it("falls back to storage object metadata when asset dims are null", async () => {
    mockAssetLookup(
      {
        width: null,
        height: null,
        bucket: "user-assets",
        storage_key: "u/sources/c.jpg",
      },
      { width: 2048, height: 1152 }
    );
    const result = await resolveOutputSize(matchOption, "asset-1");
    expect(result).toEqual({ width: 2048, height: 1152, matchSource: true });
  });

  it("falls back to the option's own dims when nothing is readable", async () => {
    mockAssetLookup({
      width: null,
      height: null,
      bucket: "user-assets",
      storage_key: "u/sources/d.jpg",
    });
    const result = await resolveOutputSize(matchOption, "asset-1");
    expect(result).toEqual({ width: 1024, height: 1024, matchSource: true });
  });
});

describe("resolveOutputSize — match_reference", () => {
  const matchRefOption = {
    name: "Match reference",
    width: 1536,
    height: 1024,
    match_reference: true,
  };

  it("resolves dims from the preset's first reference asset", async () => {
    mockLookups({
      productAssetRows: [{ asset_id: "ref-1" }],
      asset: {
        width: 2048,
        height: 2730,
        bucket: "preset-media",
        storage_key: "refs/art.png",
      },
    });
    const result = await resolveOutputSize(
      matchRefOption,
      "source-1",
      "product-1"
    );
    // Reference portrait aspect preserved under the 4 MP cap.
    expect(result?.matchSource).toBe(false);
    expect(result!.width / result!.height).toBeCloseTo(2048 / 2730, 2);
    expect(result!.width * result!.height).toBeLessThanOrEqual(4_000_000);
  });

  it("falls back to source dims when the preset has no reference", async () => {
    mockLookups({
      productAssetRows: [],
      asset: {
        width: 1536,
        height: 1024,
        bucket: "user-assets",
        storage_key: "u/sources/e.jpg",
      },
    });
    const result = await resolveOutputSize(
      matchRefOption,
      "source-1",
      "product-1"
    );
    expect(result).toEqual({
      width: 1536,
      height: 1024,
      matchSource: false,
    });
  });

  it("falls back to the option's own dims when nothing is readable", async () => {
    mockLookups({
      productAssetRows: [],
      asset: {
        width: null,
        height: null,
        bucket: "user-assets",
        storage_key: "u/sources/f.jpg",
      },
    });
    const result = await resolveOutputSize(
      matchRefOption,
      "source-1",
      "product-1"
    );
    expect(result).toEqual({
      width: 1536,
      height: 1024,
      matchSource: false,
    });
  });
});
