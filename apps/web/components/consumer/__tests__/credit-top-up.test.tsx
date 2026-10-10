import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreditTopUp } from "../credit-top-up";

const packs = [
  { planId: "pack-1000", priceCents: 1000, credits: 6060, checkoutReady: true },
  { planId: "pack-2500", priceCents: 2500, credits: 15150, checkoutReady: true },
  { planId: "pack-5000", priceCents: 5000, credits: 30300, checkoutReady: true },
  {
    planId: "pack-10000",
    priceCents: 10000,
    credits: 60600,
    checkoutReady: true,
  },
];

const props = {
  packs,
  creditsPerTransformation: 5,
};

describe("CreditTopUp", () => {
  it("renders the fixed packs with what-they-buy lines", () => {
    render(<CreditTopUp {...props} />);
    expect(screen.getByText("6,060 credits")).toBeInTheDocument();
    expect(screen.getByText("60,600 credits")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /buy for \$50/i })
    ).toBeInTheDocument();
    // $50 pack = 30,300 credits / 5 = 6,060 transformations
    expect(
      screen.getByText("≈ up to 6,060 transformations")
    ).toBeInTheDocument();
  });

  it("posts only the pack plan_id — no amount field exists", () => {
    const { container } = render(<CreditTopUp {...props} />);
    const forms = container.querySelectorAll("form");
    expect(forms).toHaveLength(4);
    for (const form of forms) {
      expect(form.querySelector('input[name="amount"]')).toBeNull();
      expect(
        form.querySelector('input[name="plan_id"]')
      ).toBeInTheDocument();
    }
    // No custom-amount input anywhere.
    expect(screen.queryByLabelText(/any amount/i)).toBeNull();
  });

  it("omits the ≈N claim when nothing is quotable", () => {
    render(<CreditTopUp packs={packs} creditsPerTransformation={null} />);
    expect(screen.queryByText(/≈ up to/)).toBeNull();
    expect(screen.getByText("6,060 credits")).toBeInTheDocument();
  });

  it("disables a pack whose checkout product is not configured", () => {
    render(
      <CreditTopUp
        {...props}
        packs={[{ ...packs[0], checkoutReady: false }]}
      />
    );
    expect(
      screen.getByRole("button", { name: /coming soon/i })
    ).toBeDisabled();
  });

  it("renders nothing when no packs are configured", () => {
    const { container } = render(
      <CreditTopUp packs={[]} creditsPerTransformation={5} />
    );
    expect(container.firstChild).toBeNull();
  });
});
