import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SpecialOfferTakeover } from "../special-offer-takeover";
import { recordOfferEvent } from "@/lib/offers/actions";
import type { OfferAssignment } from "@/lib/offers/engine";
import type { PlanForPurchase } from "@/lib/db/plans";

vi.mock("@/lib/offers/actions", () => ({
  recordOfferEvent: vi.fn(async () => ({ ok: true })),
  optOutOffers: vi.fn(async () => {}),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const ASSIGNMENT: OfferAssignment = {
  campaignId: "camp-1",
  campaignSlug: "post_signup",
  variant: "v1",
  steps: [
    { position: 1, kind: "weekly_pair", payload: { headline: "Start with a weekly pass" } },
    { position: 2, kind: "plans", payload: { headline: "Unlock every look" } },
    { position: 3, kind: "exit", payload: {} },
  ],
};

const PLAN_DEFAULTS = {
  interval: "month",
  is_trial: false,
  can_repurchase: true,
  checkout_ready: true,
  metadata: null,
};

const PLANS: PlanForPurchase[] = [
  {
    ...PLAN_DEFAULTS,
    id: "w1",
    slug: "weekly-starter",
    name: "Starter",
    type: "weekly_trial",
    credits_grant: 500,
    price_cents: 500,
    markup_multiplier: 4,
    interval: "week",
    is_trial: true,
  },
  {
    ...PLAN_DEFAULTS,
    id: "w2",
    slug: "weekly-pro",
    name: "Pro",
    type: "weekly_trial",
    credits_grant: 1500,
    price_cents: 1200,
    markup_multiplier: 4,
    interval: "week",
    is_trial: true,
  },
  {
    ...PLAN_DEFAULTS,
    id: "m1",
    slug: "monthly-creator",
    name: "Creator",
    type: "monthly",
    credits_grant: 2000,
    price_cents: 1500,
    markup_multiplier: 3,
  },
  {
    ...PLAN_DEFAULTS,
    id: "a1",
    slug: "annual-creator",
    name: "Creator Annual",
    type: "annual",
    credits_grant: 2000,
    price_cents: 12000,
    markup_multiplier: 3,
    interval: "year",
  },
];

function renderTakeover(onClose = vi.fn()) {
  render(
    <SpecialOfferTakeover
      assignment={ASSIGNMENT}
      plans={PLANS}
      onClose={onClose}
    />
  );
  return onClose;
}

describe("SpecialOfferTakeover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders as a centered dialog card, not a fullscreen takeover", () => {
    renderTakeover();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // Compact card — not the old fixed inset-0 bg-ink-950 takeover.
    expect(dialog.className).toContain("max-w-[500px]");
    expect(screen.getByText("Special offer")).toBeInTheDocument();
    expect(screen.getByText("Start with a weekly pass")).toBeInTheDocument();
  });

  it("decline advances to the next step inside the same card", () => {
    renderTakeover();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.getByText("Unlock every look")).toBeInTheDocument();
    expect(recordOfferEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "decline", surface: "takeover" })
    );
  });

  it("last-step 'No thanks' dismisses and closes", () => {
    const onClose = renderTakeover();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    // Now on the exit step — "Back to the app" is the close path.
    fireEvent.click(screen.getByRole("button", { name: "Back to the app" }));
    expect(onClose).toHaveBeenCalled();
    expect(recordOfferEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "dismiss" })
    );
  });

  it("keeps the opt-out link inside the card footer", () => {
    renderTakeover();
    const optOut = screen.getByRole("button", {
      name: /show offers again/i,
    });
    expect(optOut).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toContainElement(optOut);
  });

  it("accept posts the plan to the checkout endpoint", async () => {
    const submit = vi
      .spyOn(HTMLFormElement.prototype, "submit")
      .mockImplementation(() => {});
    renderTakeover();
    fireEvent.click(screen.getByRole("button", { name: /Starter/ }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(recordOfferEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "checkout_started",
        meta: expect.objectContaining({ plan_id: "w1" }),
      })
    );
    submit.mockRestore();
  });
});
