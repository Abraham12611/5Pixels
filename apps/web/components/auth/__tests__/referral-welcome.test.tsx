import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  ReferralClaimLink,
  ReferralWelcomeTracker,
} from "../referral-welcome";
import {
  captureReferral,
  recordReferralWelcomeEvent,
} from "@/lib/referrals/actions";

vi.mock("@/lib/referrals/actions", () => ({
  recordReferralWelcomeEvent: vi.fn(async () => {}),
  captureReferral: vi.fn(async () => {}),
}));

vi.mock("@/app/actions/auth", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

const REF = "11111111-2222-3333-4444-555555555555";

describe("referral welcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fires referral_welcome_shown (impression) once on mount", () => {
    render(<ReferralWelcomeTracker referrerId={REF} />);
    expect(recordReferralWelcomeEvent).toHaveBeenCalledTimes(1);
    expect(recordReferralWelcomeEvent).toHaveBeenCalledWith(
      "impression",
      REF
    );
  });

  it("claim CTA opens the signup modal, records accept, and captures the referral", () => {
    render(<ReferralClaimLink referrerId={REF} />);
    fireEvent.click(screen.getByRole("button", { name: "Claim your gift" }));
    expect(recordReferralWelcomeEvent).toHaveBeenCalledWith("accept", REF);
    // Modal opens on the signup tab with the attribution cookie drop.
    expect(
      screen.getByRole("dialog", { name: /create your account/i })
    ).toBeInTheDocument();
    expect(captureReferral).toHaveBeenCalledWith(REF);
  });
});
