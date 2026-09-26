import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Paywall } from "../paywall-sheet";
import type { PlanForPurchase } from "@/lib/db/plans";

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
    dodo_product_id: "prod_w1",
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
    dodo_product_id: "prod_m1",
  },
  {
    id: "p1",
    slug: "extra-credits",
    name: "Extra credits",
    type: "extra_credit",
    price_cents: 800,
    credits_grant: 800,
    markup_multiplier: 4,
    interval: "one_time",
    is_trial: false,
    can_repurchase: true,
    dodo_product_id: "prod_p1",
  },
];

function renderPaywall() {
  return render(
    <Paywall
      open
      onOpenChange={() => {}}
      plans={plans}
      required={4}
      balance={2}
      presetName="Midnight Premiere"
      presetThumbUrl={null}
      returnPath="/app/create/midnight-premiere"
    />
  );
}

describe("Paywall", () => {
  it("keeps the interrupted intent visible: preset name + exact shortfall", () => {
    renderPaywall();
    expect(screen.getByText("Midnight Premiere")).toBeInTheDocument();
    expect(
      screen.getByText(/You need 4 credits — you have 2/)
    ).toBeInTheDocument();
  });

  it("lists every option with price, cadence, credits and cost-per-image", () => {
    renderPaywall();
    // Weekly trial (stripped name), monthly, one-time pack — all rows.
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Creator")).toBeInTheDocument();
    expect(screen.getByText("Extra credits")).toBeInTheDocument();
    // 4 credits × $0.01 = $0.04/image on the weekly trial
    expect(screen.getAllByText(/~\$0\.0\d\/image/).length).toBeGreaterThan(0);
  });

  it("default-selects the trial and labels the CTA for it", () => {
    renderPaywall();
    expect(
      screen.getByRole("button", { name: /Start free trial — \$5/ })
    ).toBeEnabled();
    // The trial id is already posted as plan_id.
    expect(
      document.querySelector<HTMLInputElement>('input[name="plan_id"]')?.value
    ).toBe("w1");
  });

  it("switches the CTA label per option kind and posts return_path", () => {
    renderPaywall();
    fireEvent.click(screen.getByText("Creator"));
    expect(
      screen.getByRole("button", { name: /Subscribe — \$20/ })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Extra credits"));
    expect(
      screen.getByRole("button", { name: /Buy 800 credits — \$8/ })
    ).toBeInTheDocument();
    expect(
      document.querySelector<HTMLInputElement>('input[name="return_path"]')
        ?.value
    ).toBe("/app/create/midnight-premiere");
  });

  it("shows the trial promise and the secure-checkout line", () => {
    renderPaywall();
    expect(
      screen.getByText(/Cancel any time/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/card details never touch 5Pixels/)
    ).toBeInTheDocument();
  });
});
