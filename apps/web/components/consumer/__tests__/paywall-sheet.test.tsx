import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PaywallSheet } from "../paywall-sheet";
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
    dodo_product_id: "prod_w2",
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
];

describe("PaywallSheet", () => {
  it("leads with the weekly plans and keeps monthlies dark", () => {
    render(
      <PaywallSheet
        open
        onOpenChange={() => {}}
        plans={plans}
        required={4}
        presetName="Midnight Premiere"
      />
    );
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Plus")).toBeInTheDocument();
    expect(screen.getByText("$5")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
  });

  it("keeps Continue disabled until a plan is picked, then posts its id", () => {
    render(
      <PaywallSheet
        open
        onOpenChange={() => {}}
        plans={plans}
        required={4}
        presetName="Midnight Premiere"
      />
    );
    const submit = screen.getByRole("button", { name: "Choose a plan" });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByText("Plus"));
    const cta = screen.getByRole("button", { name: /Continue/ });
    expect(cta).toBeEnabled();

    const hidden = document.querySelector<HTMLInputElement>(
      'input[name="plan_id"]'
    );
    expect(hidden?.value).toBe("w2");
  });
});
