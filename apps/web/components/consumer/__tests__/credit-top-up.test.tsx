import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreditTopUp } from "../credit-top-up";

const props = {
  planId: "extra-1",
  checkoutReady: true,
  creditsPerTransformation: 5,
  creditsPerDollar: 606,
};

describe("CreditTopUp", () => {
  it("renders the four pack shortcuts with what-they-buy lines", () => {
    render(<CreditTopUp {...props} />);
    // Pack labels — the $10 pack also matches the default custom amount
    expect(screen.getAllByText(/6,060\s+credits/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("60,600 credits")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buy for \$50/i })).toBeInTheDocument();
    // $50 pack = 30,300 credits / 5 = 6,060 transformations
    expect(
      screen.getByText("≈ up to 6,060 transformations")
    ).toBeInTheDocument();
  });

  it("translates a custom amount into credits and transformations live", () => {
    render(<CreditTopUp {...props} />);
    const input = screen.getByLabelText(/any amount/i);
    fireEvent.change(input, { target: { value: "30" } });
    expect(screen.getByText("18,180 credits")).toBeInTheDocument();
    expect(
      screen.getByText("≈ up to 3,636 transformations")
    ).toBeInTheDocument();
  });

  it("blocks the custom buy below the minimum", () => {
    render(<CreditTopUp {...props} />);
    const input = screen.getByLabelText(/any amount/i);
    fireEvent.change(input, { target: { value: "5" } });
    expect(screen.getByText("Minimum $10")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^buy credits$/i })
    ).toBeDisabled();
  });

  it("disables all buys when no product id is configured", () => {
    render(<CreditTopUp {...props} checkoutReady={false} />);
    expect(
      screen.getAllByRole("button", { name: /coming soon|buy for/i })[0]
    ).toBeDisabled();
  });
});
