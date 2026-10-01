import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CancelSubscriptionCard } from "../cancel-subscription-card";
import { recordOfferEvent } from "@/lib/offers/actions";
import { claimRetentionCredits } from "@/lib/billing/retention";

vi.mock("@/lib/offers/actions", () => ({
  recordOfferEvent: vi.fn(async () => ({ ok: true })),
  optOutOffers: vi.fn(async () => {}),
}));

vi.mock("@/lib/billing/retention", () => ({
  claimRetentionCredits: vi.fn(async () => ({
    ok: true,
    credits: 500,
    already: false,
  })),
}));

const PROPS = {
  planName: "Creator",
  periodEnd: "Nov 1, 2026",
  loses: [
    "2,000 credits at every renewal",
    "Your lower credit cost per transformation",
  ],
  credits: 500,
};

function openDialog() {
  render(<CancelSubscriptionCard {...PROPS} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Cancel subscription" })
  );
}

describe("CancelSubscriptionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens a lose-list + retention offer, never a bare portal link", () => {
    openDialog();
    expect(
      screen.getByText("Sure you want to cancel?")
    ).toBeInTheDocument();
    expect(
      screen.getByText("2,000 credits at every renewal")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Stay and get 500 free credits")
    ).toBeInTheDocument();
    expect(screen.getByText(/ends\s+Nov 1, 2026/)).toBeInTheDocument();
  });

  it("'Keep my plan' claims the grant and shows the success state", async () => {
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: /Keep my plan/ }));
    await waitFor(() =>
      expect(screen.getByText("You're staying")).toBeInTheDocument()
    );
    expect(claimRetentionCredits).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/500 credits added/)).toBeInTheDocument();
    expect(recordOfferEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "accept", context: "cancel_flow" })
    );
  });

  it("shows the error when the grant fails and stays on the offer", async () => {
    vi.mocked(claimRetentionCredits).mockResolvedValueOnce({
      ok: false,
      error: "Couldn't add the credits — try again.",
    });
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: /Keep my plan/ }));
    await waitFor(() =>
      expect(
        screen.getByText("Couldn't add the credits — try again.")
      ).toBeInTheDocument()
    );
    expect(
      screen.getByText("Stay and get 500 free credits")
    ).toBeInTheDocument();
  });

  it("'Continue to cancel' posts to the billing portal", async () => {
    const submit = vi
      .spyOn(HTMLFormElement.prototype, "submit")
      .mockImplementation(() => {});
    openDialog();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to cancel" })
    );
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(recordOfferEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "decline", context: "cancel_flow" })
    );
    submit.mockRestore();
  });

  it("records an optional cancel reason with the decline event", async () => {
    vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(
      () => {}
    );
    openDialog();
    fireEvent.click(screen.getByText("It costs too much"));
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to cancel" })
    );
    await waitFor(() =>
      expect(recordOfferEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "decline",
          meta: expect.objectContaining({ reason: "It costs too much" }),
        })
      )
    );
  });

  it("fires cancel_flow_shown (impression) once per open", () => {
    openDialog();
    expect(recordOfferEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "impression", context: "cancel_flow" })
    );
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel subscription" })
    );
    const impressions = vi
      .mocked(recordOfferEvent)
      .mock.calls.filter(
        (c) => c[0].event === "impression" && c[0].context === "cancel_flow"
      );
    expect(impressions).toHaveLength(2);
  });
});
