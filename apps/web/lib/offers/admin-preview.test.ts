import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeServiceClient } from "../billing/__tests__/helpers/fake-service-client";

const fake = new FakeServiceClient();
let currentUserId: string | null = null;

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => fake,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: currentUserId ? { id: currentUserId } : null,
        },
      }),
    },
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

// Admin preview must bypass tier/balance gating — mock them "worst case"
// (paid tier, credits in balance) so only the admin path can produce show=true.
vi.mock("@/lib/billing/entitlements", () => ({
  getUserTier: vi.fn(async () => "paid"),
  getAvailableBalance: vi.fn(async () => 500),
}));

import { getTakeoverStateForUser } from "./engine";

beforeEach(() => {
  fake.db.clear();
  currentUserId = null;
  fake.seed("profiles", [
    { id: "admin-1", email: "a@example.com", is_admin: true, is_owner: false },
    { id: "user-1", email: "u@example.com", is_admin: false, is_owner: false },
  ]);
  fake.seed("promo_campaigns", [
    {
      id: "camp-1",
      slug: "spring-drop",
      name: "Spring Drop",
      status: "live",
      audience: ["free"],
      frequency: {},
      variant_weights: { A_default: 50, B_short: 50 },
      created_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "camp-2",
      slug: "draft-campaign",
      name: "Draft Campaign",
      status: "draft",
      audience: ["free"],
      frequency: {},
      variant_weights: { A_default: 100 },
      created_at: "2026-01-02T00:00:00.000Z",
    },
  ]);
  fake.seed("promo_steps", [
    {
      id: "s1",
      campaign_id: "camp-1",
      variant: "A_default",
      position: 0,
      kind: "weekly_pair",
      payload: { headline: "A headline" },
    },
    {
      id: "s2",
      campaign_id: "camp-1",
      variant: "B_short",
      position: 0,
      kind: "discount",
      payload: { headline: "B headline" },
    },
    {
      id: "s3",
      campaign_id: "camp-2",
      variant: "A_default",
      position: 0,
      kind: "plans",
      payload: {},
    },
  ]);
});

describe("admin offer preview", () => {
  it("forces the requested variant for admins without bucketing", async () => {
    currentUserId = "admin-1";
    const state = await getTakeoverStateForUser("spring-drop:B_short");

    expect(state.show).toBe(true);
    expect(state.reason).toBe("admin_preview");
    expect(state.assignment?.variant).toBe("B_short");
    expect(state.assignment?.isAdminPreview).toBe(true);
    expect(state.assignment?.steps[0]?.payload.headline).toBe("B headline");
    // No assignment row written — previews don't pollute assignments.
    expect(fake.table("promo_assignments")).toHaveLength(0);
  });

  it("lets admins preview draft campaigns before launch", async () => {
    currentUserId = "admin-1";
    const state = await getTakeoverStateForUser("draft-campaign");

    expect(state.show).toBe(true);
    expect(state.assignment?.campaignSlug).toBe("draft-campaign");
    expect(state.assignment?.variant).toBe("A_default");
  });

  it("lists every campaign+variant for the admin switcher", async () => {
    currentUserId = "admin-1";
    const state = await getTakeoverStateForUser("spring-drop");

    const keys = (state.adminVariants ?? []).map(
      (o) => `${o.campaignSlug}:${o.variant}`
    );
    expect(keys).toContain("spring-drop:A_default");
    expect(keys).toContain("spring-drop:B_short");
    expect(keys).toContain("draft-campaign:A_default");
  });

  it("returns admin_preview_not_found for an unknown slug", async () => {
    currentUserId = "admin-1";
    const state = await getTakeoverStateForUser("nope:Z");

    expect(state.show).toBe(false);
    expect(state.reason).toBe("admin_preview_not_found");
    expect(state.adminVariants?.length).toBeGreaterThan(0);
  });

  it("ignores the preview param for non-admin users", async () => {
    currentUserId = "user-1";
    const state = await getTakeoverStateForUser("spring-drop:B_short");

    // Balance>0 + paid-tier mocks → the normal gates apply; the preview
    // param is ignored entirely.
    expect(state.show).toBe(false);
    expect(["has_credits", "not_free_tier"]).toContain(state.reason);
    expect(state.assignment?.isAdminPreview).not.toBe(true);
    // Non-admins never receive the preview index.
    expect(state.adminVariants).toBeUndefined();
  });
});
