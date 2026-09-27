import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeleteAccountFlow } from "../delete-account-flow";

vi.mock("@/lib/db/account", () => ({
  deleteAccount: vi.fn(async () => ({ error: "Please type DELETE to confirm." })),
}));

const plan = {
  planId: "p1",
  slug: "monthly",
  name: "Monthly",
  type: "subscription",
  markupMultiplier: 1,
  creditsGrant: 500,
  currentPeriodEnd: "2026-10-01T00:00:00.000Z",
};

describe("DeleteAccountFlow", () => {
  it("lists what is deleted, the forfeited-credit consequence, and what is retained", () => {
    render(<DeleteAccountFlow activePlan={null} creditBalance={120} />);
    expect(screen.getByText(/results and generated images/i)).toBeInTheDocument();
    expect(screen.getByText(/uploaded photos/i)).toBeInTheDocument();
    expect(screen.getByText(/120 credits/)).toBeInTheDocument();
    expect(screen.getByText(/forfeited/i)).toBeInTheDocument();
    expect(screen.getByText(/billing records and invoices/i)).toBeInTheDocument();
  });

  it("suggests downloading results first via the Library", () => {
    render(<DeleteAccountFlow activePlan={null} creditBalance={0} />);
    expect(
      screen.getByRole("link", { name: /download your results first/i })
    ).toHaveAttribute("href", "/app/library");
  });

  it("surfaces an active subscription with a cancel-first link", () => {
    render(<DeleteAccountFlow activePlan={plan} creditBalance={0} />);
    expect(
      screen.getByText((_, el) =>
        el?.tagName === "SPAN"
          ? (el.textContent ?? "").includes("active Monthly plan")
          : false
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /cancel it now/i })).toHaveAttribute(
      "href",
      "/app/billing/plan"
    );
  });

  it("gates the destructive CTA behind typing DELETE in a T1 sheet", () => {
    render(<DeleteAccountFlow activePlan={null} creditBalance={0} />);

    fireEvent.click(
      screen.getAllByRole("button", { name: /delete my account/i })[0]
    );
    expect(screen.getByText(/delete your account\?/i)).toBeInTheDocument();

    const confirm = screen.getAllByRole("button", {
      name: /delete my account/i,
    })[1];
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "DELETE" },
    });
    expect(confirm).not.toBeDisabled();
  });
});
