import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeServiceClient } from "@/lib/billing/__tests__/helpers/fake-service-client";

const fake = new FakeServiceClient();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => fake,
}));

import { sweepExpiredPendingGenerations } from "./cleanup";

const PAST = "2026-09-20T00:00:00Z";
const FUTURE = "2099-01-01T00:00:00Z";
const NOW = new Date("2026-09-29T00:00:00Z");

function seedRows() {
  fake.seed("pending_generations", [
    // expired + unconsumed + anon → sweep row + asset
    { id: "p-exp-anon", source_asset_id: "a-exp-anon", consumed_at: null, expires_at: PAST, anon_session_id: "anon-1", user_id: null },
    // expired + unconsumed + user-owned → sweep row, keep asset
    { id: "p-exp-user", source_asset_id: "a-user-owned", consumed_at: null, expires_at: PAST, anon_session_id: null, user_id: "u-1" },
    // consumed + expired → keep (replay already happened)
    { id: "p-consumed", source_asset_id: "a-consumed", consumed_at: PAST, expires_at: PAST, anon_session_id: "anon-2", user_id: null },
    // unconsumed + unexpired → keep (user may still come back)
    { id: "p-live", source_asset_id: "a-live", consumed_at: null, expires_at: FUTURE, anon_session_id: "anon-3", user_id: null },
  ]);
  fake.seed("assets", [
    { id: "a-exp-anon", bucket: "user-assets", storage_key: "anon/anon-1/sources/x.png", owner_user_id: null, anon_session_id: "anon-1", deleted_at: null },
    { id: "a-user-owned", bucket: "user-assets", storage_key: "u-1/sources/x.png", owner_user_id: "u-1", anon_session_id: null, deleted_at: null },
    { id: "a-consumed", bucket: "user-assets", storage_key: "anon/anon-2/sources/y.png", owner_user_id: null, anon_session_id: "anon-2", deleted_at: null },
    { id: "a-live", bucket: "user-assets", storage_key: "anon/anon-3/sources/z.png", owner_user_id: null, anon_session_id: "anon-3", deleted_at: null },
  ]);
}

beforeEach(() => {
  fake.db.clear();
  fake.removedObjects.length = 0;
  seedRows();
});

describe("sweepExpiredPendingGenerations", () => {
  it("deletes expired unconsumed pending rows and their anon assets", async () => {
    const result = await sweepExpiredPendingGenerations(NOW);

    expect(result.errors).toHaveLength(0);
    expect(result.pendingDeleted).toBe(2); // p-exp-anon + p-exp-user

    const remaining = fake.table("pending_generations").map((r) => r.id);
    expect(remaining.sort()).toEqual(["p-consumed", "p-live"]);
  });

  it("removes the anon storage object and soft-deletes the asset", async () => {
    await sweepExpiredPendingGenerations(NOW);

    expect(fake.removedObjects).toEqual([
      "user-assets:anon/anon-1/sources/x.png",
    ]);

    const asset = fake
      .table("assets")
      .find((a) => a.id === "a-exp-anon")!;
    expect(asset.deleted_at).toBe(NOW.toISOString());
    expect(asset.anon_session_id).toBeNull();
    expect(asset.retention_expires_at).toBeNull();
  });

  it("keeps user-owned source assets under their own retention", async () => {
    await sweepExpiredPendingGenerations(NOW);

    expect(fake.removedObjects).not.toContain("user-assets:u-1/sources/x.png");
    const asset = fake
      .table("assets")
      .find((a) => a.id === "a-user-owned")!;
    expect(asset.deleted_at).toBeNull();
    expect(asset.owner_user_id).toBe("u-1");
  });

  it("never touches consumed or unexpired pending rows or their assets", async () => {
    await sweepExpiredPendingGenerations(NOW);

    const pending = fake.table("pending_generations");
    expect(pending.find((p) => p.id === "p-consumed")).toBeTruthy();
    expect(pending.find((p) => p.id === "p-live")).toBeTruthy();

    const assets = fake.table("assets");
    for (const id of ["a-consumed", "a-live"]) {
      expect(assets.find((a) => a.id === id)?.deleted_at).toBeNull();
    }
    expect(fake.removedObjects).toHaveLength(1);
  });

  it("is idempotent — a second run deletes nothing", async () => {
    const first = await sweepExpiredPendingGenerations(NOW);
    expect(first.pendingDeleted).toBe(2);

    const second = await sweepExpiredPendingGenerations(NOW);
    expect(second.pendingDeleted).toBe(0);
    expect(second.assetsDeleted).toBe(0);
    expect(fake.table("pending_generations")).toHaveLength(2);
  });
});
