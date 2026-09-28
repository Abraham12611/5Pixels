import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlanShop, type ShopPlan } from "../plan-shop";

const monthly: ShopPlan[] = [
  {
    id: "m1",
    name: "Creator",
    priceCents: 2000,
    creditsGrant: 2000,
    checkoutReady: true,
  },
  {
    id: "m2",
    name: "Pro",
    priceCents: 3000,
    creditsGrant: 3000,
    checkoutReady: true,
  },
];

const annual: ShopPlan[] = [
  {
    id: "a1",
    name: "Creator",
    priceCents: 12000,
    creditsGrant: 2000,
    checkoutReady: true,
    monthlyEquivalentCents: 1000,
    discountPercent: 50,
  },
  {
    id: "a2",
    name: "Pro",
    priceCents: 21600,
    creditsGrant: 3000,
    checkoutReady: true,
    monthlyEquivalentCents: 1800,
    discountPercent: 40,
  },
];

describe("PlanShop", () => {
  it("defaults to annual with savings badges (annual anchoring)", () => {
    render(<PlanShop monthly={monthly} annual={annual} />);
    expect(screen.getByText("Save 50%")).toBeInTheDocument();
    expect(screen.getByText("Save 40%")).toBeInTheDocument();
    expect(screen.getByText("$120")).toBeInTheDocument();
    expect(screen.getByText("$10/mo — billed once a year")).toBeInTheDocument();
    // Monthly prices are not shown until toggled
    expect(screen.queryByText("$30")).not.toBeInTheDocument();
  });

  it("switches to the monthly grid", () => {
    render(<PlanShop monthly={monthly} annual={annual} />);
    fireEvent.click(screen.getByRole("radio", { name: /monthly/i }));
    expect(screen.getByText("$20")).toBeInTheDocument();
    expect(screen.getByText("$30")).toBeInTheDocument();
    expect(screen.queryByText("Save 50%")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Renews monthly\. Cancel anytime/i)
    ).toBeInTheDocument();
  });

  it("marks the best-value card and posts plan_id to checkout", () => {
    render(<PlanShop monthly={monthly} annual={annual} />);
    // Creator Annual: 2000*12/12000 = 2.0 cr/cent beats Pro's 1.67
    const bestCard = screen.getByText("Best value").closest("div");
    expect(bestCard).toHaveTextContent("Creator");
    const hidden = bestCard?.querySelector('input[name="plan_id"]');
    expect(hidden).toHaveAttribute("value", "a1");
  });

  it("disables checkout for plans without a product id", () => {
    const blocked = [{ ...monthly[0], checkoutReady: false }];
    render(<PlanShop monthly={blocked} annual={[]} />);
    fireEvent.click(screen.getByRole("radio", { name: /monthly/i }));
    expect(
      screen.getByRole("button", { name: /coming soon/i })
    ).toBeDisabled();
  });
});
