import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreditMeter, GenerationPixelProgress } from "../five-pixel";

describe("CreditMeter", () => {
  it("labels the exact balance, never 'X of Y'", () => {
    render(<CreditMeter balance={248} max={300} />);
    const meter = screen.getByRole("img");
    expect(meter).toHaveAccessibleName("248 credits");
  });

  it("uses the singular for a balance of 1", () => {
    render(<CreditMeter balance={1} />);
    expect(screen.getByRole("img")).toHaveAccessibleName("1 credit");
  });

  it("reports the real balance when it exceeds the plan grant (credits persist)", () => {
    // A cancelled/accumulating user can hold more than one period's grant —
    // the a11y label must not collapse that into "300 of 300".
    render(<CreditMeter balance={4200} max={3000} />);
    expect(screen.getByRole("img")).toHaveAccessibleName("4200 credits");
  });

  it("renders a full meter when the balance exceeds the max scale", () => {
    const { container } = render(<CreditMeter balance={4200} max={3000} />);
    const fills = container.querySelectorAll("[style]");
    fills.forEach((fill) => {
      expect(fill).toHaveStyle({ height: "100%" });
    });
  });

  it("works without a max (fixed fallback scale)", () => {
    render(<CreditMeter balance={25} />);
    const meter = screen.getByRole("img");
    expect(meter).toHaveAccessibleName("25 credits");
  });
});

describe("GenerationPixelProgress", () => {
  it("labels its fill state out of five", () => {
    render(<GenerationPixelProgress filled={3} active={3} />);
    expect(screen.getByRole("img")).toHaveAccessibleName("Progress 3 of 5");
  });
});
