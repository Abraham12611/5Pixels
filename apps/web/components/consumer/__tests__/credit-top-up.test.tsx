import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CreditTopUp } from "../credit-top-up";

const packs = [
  { planId: "pack-1000", priceCents: 1000, credits: 606, checkoutReady: true },
  { planId: "pack-2500", priceCents: 2500, credits: 1515, checkoutReady: true },
  { planId: "pack-5000", priceCents: 5000, credits: 3030, checkoutReady: true },
  {
    planId: "pack-10000",
    priceCents: 10000,
    credits: 6060,
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
    expect(screen.getByText("606 credits")).toBeInTheDocument();
    expect(screen.getByText("6,060 credits")).toBeInTheDocument();
    // $50 pack = 3,030 credits / 5 = 606 transformations
    expect(
      screen.getByText("≈ up to 606 transformations")
    ).toBeInTheDocument();
  });

  it("selects a pack, then the CTA restates the deal", () => {
    render(<CreditTopUp {...props} />);
    const cta = screen.getByRole("button", { name: "Get credits" });
    expect(cta).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /3,030 credits/i }));
    expect(
      screen.getByRole("button", { name: /get 3,030 credits — \$50/i })
    ).toBeEnabled();
  });

  it("posts only the pack plan_id — no amount field exists", () => {
    const { container } = render(<CreditTopUp {...props} />);
    const forms = container.querySelectorAll("form");
    expect(forms).toHaveLength(1);
    const form = forms[0]!;
    expect(form.querySelector('input[name="amount"]')).toBeNull();
    expect(form.querySelector('input[name="plan_id"]')).toBeInTheDocument();
    // No custom-amount input anywhere.
    expect(screen.queryByLabelText(/any amount/i)).toBeNull();
  });

  it("writes the selected pack's plan_id into the post", () => {
    const { container } = render(<CreditTopUp {...props} />);
    fireEvent.click(screen.getByRole("radio", { name: /606 credits/i }));
    const input = container.querySelector<HTMLInputElement>(
      'input[name="plan_id"]'
    );
    expect(input?.value).toBe("pack-1000");
  });

  it("omits the ≈N claim when nothing is quotable", () => {
    render(<CreditTopUp packs={packs} creditsPerTransformation={null} />);
    expect(screen.queryByText(/≈ up to/)).toBeNull();
    expect(screen.getByText("606 credits")).toBeInTheDocument();
  });

  it("disables a pack whose checkout product is not configured", () => {
    render(
      <CreditTopUp
        {...props}
        packs={[{ ...packs[0], checkoutReady: false }]}
      />
    );
    const card = screen.getByRole("radio", { name: /606 credits/i });
    expect(card).toBeDisabled();
    fireEvent.click(card);
    expect(
      screen.getByRole("button", { name: "Get credits" })
    ).toBeDisabled();
  });

  it("renders nothing when no packs are configured", () => {
    const { container } = render(
      <CreditTopUp packs={[]} creditsPerTransformation={5} />
    );
    expect(container.firstChild).toBeNull();
  });
});
