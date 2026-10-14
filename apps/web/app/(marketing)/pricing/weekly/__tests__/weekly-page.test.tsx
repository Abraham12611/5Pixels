import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PlanForPurchase } from "@/lib/db/plans";

const getUser = vi.fn();
const canPurchaseWeeklyPass = vi.fn();
const hasEverPaid = vi.fn();
const getPlansForPurchase = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: (table: string) => {
      expect(table).toBe("provider_pricing_snapshots");
      return {
        select: () => ({
          gt: () => ({
            order: () => ({
              limit: () =>
                Promise.resolve({
                  data: [
                    {
                      payload: {
                        pricing_type: "flat_per_request",
                        unit_price: 0.08,
                      },
                    },
                  ],
                }),
            }),
          }),
        }),
      };
    },
  })),
}));

vi.mock("@/lib/db/plans", () => ({
  getPlansForPurchase: () => getPlansForPurchase(),
}));

vi.mock("@/lib/billing/entitlements", () => ({
  canPurchaseWeeklyPass: () => canPurchaseWeeklyPass(),
  hasEverPaid: () => hasEverPaid(),
}));

import WeeklyPassPage from "../page";

const weeklyStarter: PlanForPurchase = {
  id: "w1",
  slug: "weekly-starter",
  name: "Weekly Trial — Starter",
  type: "weekly_trial",
  price_cents: 500,
  credits_grant: 500,
  markup_multiplier: 4,
  interval: "one_time",
  is_trial: true,
  can_repurchase: false,
  checkout_ready: true,
};

const weeklyPlus: PlanForPurchase = {
  ...weeklyStarter,
  id: "w2",
  slug: "weekly-plus",
  name: "Weekly Trial — Plus",
  price_cents: 1000,
  credits_grant: 1000,
};

const monthlyCreator: PlanForPurchase = {
  ...weeklyStarter,
  id: "m1",
  slug: "creator-monthly",
  name: "Creator",
  type: "monthly",
  price_cents: 2000,
  credits_grant: 2000,
  interval: "month",
  is_trial: false,
};

function signedOut() {
  getUser.mockResolvedValue({ data: { user: null } });
}

function signedIn() {
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
}

async function renderPage() {
  render(await WeeklyPassPage());
}

describe("WeeklyPassPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPlansForPurchase.mockResolvedValue([
      monthlyCreator,
      weeklyPlus,
      weeklyStarter,
    ]);

    canPurchaseWeeklyPass.mockResolvedValue({ allowed: true, reason: "" });
    hasEverPaid.mockResolvedValue(false);
  });

  it("renders both weekly tiers and filters out monthly plans", async () => {
    signedOut();
    await renderPage();
    expect(screen.getByText("Starter week")).toBeInTheDocument();
    expect(screen.getByText("Plus week")).toBeInTheDocument();
    expect(screen.queryByText("Creator")).not.toBeInTheDocument();
    expect(screen.getByText(/From \$5/)).toBeInTheDocument();
  });

  it("links anonymous users to signup with the weekly page as return target", async () => {
    signedOut();
    await renderPage();
    const links = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href")?.startsWith("/signup"));
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.getAttribute("href")).toBe("/signup?next=/pricing/weekly");
    }
  });

  it("submits eligible signed-in users straight to checkout", async () => {
    signedIn();
    await renderPage();
    const forms = document.querySelectorAll(
      'form[action="/api/billing/checkout"]'
    );
    expect(forms).toHaveLength(2);
    const planIds = [...document.querySelectorAll('input[name="plan_id"]')].map(
      (i) => (i as HTMLInputElement).value
    );
    expect(planIds).toEqual(["w1", "w2"]);
    expect(screen.queryByRole("link", { name: /get a week/i })).toBeNull();
  });

  it("redirects signed-in users who no longer qualify to /pricing", async () => {
    signedIn();
    canPurchaseWeeklyPass.mockResolvedValue({
      allowed: false,
      reason: "Weekly passes are only for first-time plans.",
    });
    await expect(WeeklyPassPage()).rejects.toThrow("REDIRECT:/pricing");
    expect(redirect).toHaveBeenCalledWith("/pricing");
  });

  it("frames the page as repurchase for weekly buyers", async () => {
    signedIn();
    hasEverPaid.mockResolvedValue(true);
    await renderPage();
    expect(screen.getByText("Get another week")).toBeInTheDocument();
    expect(screen.queryByText(/trial/i)).not.toBeInTheDocument();
  });

  it("keeps one-time framing and never says trial for first-timers", async () => {
    signedOut();
    await renderPage();
    expect(screen.getByText("One week of creating")).toBeInTheDocument();
    expect(screen.getAllByText(/one-time/).length).toBeGreaterThan(1);
    expect(screen.queryByText(/trial/i)).not.toBeInTheDocument();
  });

  it("redirects to /pricing when no weekly plans exist", async () => {
    signedOut();
    getPlansForPurchase.mockResolvedValue([monthlyCreator]);
    await expect(WeeklyPassPage()).rejects.toThrow("REDIRECT:/pricing");
  });
});
