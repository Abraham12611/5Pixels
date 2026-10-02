import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  ReferralClaimLink,
  ReferralWelcomeTracker,
} from "../referral-welcome";
import { recordReferralWelcomeEvent } from "@/lib/referrals/actions";

vi.mock("@/lib/referrals/actions", () => ({
  recordReferralWelcomeEvent: vi.fn(async () => {}),
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

  it("claim CTA preserves ?ref= and records the claimed event", () => {
    render(<ReferralClaimLink referrerId={REF} />);
    const link = screen.getByRole("link", { name: "Claim your gift" });
    expect(link).toHaveAttribute(
      "href",
      `/signup?ref=${encodeURIComponent(REF)}`
    );
    fireEvent.click(link);
    expect(recordReferralWelcomeEvent).toHaveBeenCalledWith("accept", REF);
  });
});
