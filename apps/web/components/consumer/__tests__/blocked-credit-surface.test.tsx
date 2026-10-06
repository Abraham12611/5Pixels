import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BlockedCreditSurface } from "../blocked-credit-surface";
import type { PlanForPurchase } from "@/lib/db/plans";
import type { BlockedSegment } from "@/lib/billing/segments";

vi.mock("@/lib/offers/actions", () => ({
  recordOfferEvent: vi.fn(async () => ({ ok: true })),
  optOutOffers: vi.fn(async () => {}),
}));

// jsdom has no matchMedia — the surface uses it to pick dialog vs sheet.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }),
});

const plans: PlanForPurchase[] = [
  {
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
  },
  {
    id: "w2",
    slug: "weekly-plus",
    name: "Weekly Trial — Plus",
    type: "weekly_trial",
    price_cents: 1000,
    credits_grant: 1000,
    markup_multiplier: 3.5,
    interval: "one_time",
    is_trial: true,
    can_repurchase: false,
    checkout_ready: true,
  },
  {
    id: "m1",
    slug: "monthly-creator",
    name: "Creator",
    type: "monthly",
    price_cents: 2000,
    credits_grant: 2000,
    markup_multiplier: 3,
    interval: "monthly",
    is_trial: false,
    can_repurchase: true,
    checkout_ready: true,
  },
];

const topUp = {
  packs: [
    {
      planId: "pack-1000",
      priceCents: 1000,
      credits: 1000,
      checkoutReady: true,
    },
  ],
  creditsPerTransformation: 5,
};

function renderSurface(segment: BlockedSegment, extra = {}) {
  return render(
    <BlockedCreditSurface
      open
      onOpenChange={() => {}}
      segment={segment}
      offer={null}
      plans={plans}
      required={4}
      balance={0}
      presetName="Midnight Premiere"
      topUp={topUp}
      {...extra}
    />
  );
}

describe("BlockedCreditSurface", () => {
  it("free_history: leads with weekly passes and monthlies", () => {
    renderSurface("free_history");
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Plus")).toBeInTheDocument();
    expect(screen.getByText("$5")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
    expect(
      screen.getByText("You need credits to generate")
    ).toBeInTheDocument();
  });

  it("free_history: Continue stays disabled until a plan is picked", () => {
    renderSurface("free_history");
    const submit = screen.getByRole("button", { name: "Choose a plan" });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByText("Plus"));
    expect(
      screen.getByRole("button", { name: /Continue/ })
    ).toBeEnabled();
  });

  it("subscriber: shows only the top-up — never weekly plans", () => {
    renderSurface("subscriber", { activePlanName: "Creator" });
    expect(screen.getByText(/out of credits/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /buy for \$10/i })
    ).toBeInTheDocument();
    expect(screen.queryByText("Starter")).not.toBeInTheDocument();
    expect(screen.queryByText("Choose a plan")).not.toBeInTheDocument();
  });

  it("canceling: adds the plan-end nudge with a restart link", () => {
    renderSurface("canceling", {
      activePlanName: "Pro",
      planEndsAt: "2026-10-15T00:00:00Z",
    });
    expect(screen.getByText(/ends Oct 15/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /plan page/i })).toHaveAttribute(
      "href",
      "/app/billing/plan"
    );
  });

  it("weekly_buyer: reframes as 'Get another week', no trial wording", () => {
    renderSurface("weekly_buyer");
    expect(screen.getByText("Get another week")).toBeInTheDocument();
    expect(screen.getByText(/doesn.t renew/i)).toBeInTheDocument();
    expect(screen.queryByText(/trial/i)).not.toBeInTheDocument();
  });

  it("lapsed: preselects the last plan for one-click restart", () => {
    renderSurface("lapsed", {
      resumePlan: {
        id: "m1",
        name: "Creator",
        priceCents: 2000,
        creditsGrant: 2000,
        interval: "monthly",
      },
    });
    expect(
      screen.getByRole("button", { name: /Restart Creator — \$20\/mo/i })
    ).toBeEnabled();
    expect(screen.getByText(/Or just buy credits/i)).toBeInTheDocument();
  });
});
