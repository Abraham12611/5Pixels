import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BlockedCreditSurface } from "@/components/consumer/blocked-credit-surface";
import { CancelSubscriptionCard } from "@/components/consumer/cancel-subscription-card";
import { DeleteAccountFlow } from "@/app/(app)/app/account/delete/delete-account-flow";
import { EditAccountDialog } from "@/components/consumer/edit-account-dialog";
import { UiReviewProvider } from "@/lib/ui-review/context";
import {
  PLANS,
  OFFER_ASSIGNMENT,
  CREDIT_PACKS,
  ACTIVE_PLAN,
} from "@/lib/ui-review/fixtures";
import { recordOfferEvent } from "@/lib/offers/actions";
import { claimRetentionCredits } from "@/lib/billing/retention";
import { deleteAccount } from "@/lib/db/account";
import { updateProfile } from "@/lib/profile/actions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/admin/popups",
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/offers/actions", () => ({
  recordOfferEvent: vi.fn(async () => ({ ok: true })),
  optOutOffers: vi.fn(async () => {}),
}));
vi.mock("@/lib/billing/retention", () => ({
  claimRetentionCredits: vi.fn(async () => ({ ok: true, credits: 500 })),
}));
vi.mock("@/lib/profile/actions", () => ({
  updateProfile: vi.fn(async () => ({ success: true })),
}));
vi.mock("@/lib/db/account", () => ({
  deleteAccount: vi.fn(async () => ({})),
}));

function Preview({ children }: { children: React.ReactNode }) {
  return <UiReviewProvider value={true}>{children}</UiReviewProvider>;
}

describe("preview mounts are inert", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocked surface records no promo events on open", () => {
    render(
      <Preview>
        <BlockedCreditSurface
          open
          onOpenChange={() => {}}
          segment="subscriber"
          offer={OFFER_ASSIGNMENT}
          plans={PLANS}
          required={3}
          balance={0}
          presetName="Cinematic Cat"
          topUp={{ packs: CREDIT_PACKS, creditsPerTransformation: 3 }}
        />
      </Preview>
    );
    expect(recordOfferEvent).not.toHaveBeenCalled();
  });

  it("blocked surface accept never submits the checkout form", async () => {
    const submitSpy = vi
      .spyOn(HTMLFormElement.prototype, "submit")
      .mockImplementation(() => {});
    render(
      <Preview>
        <BlockedCreditSurface
          open
          onOpenChange={() => {}}
          segment="weekly_buyer"
          offer={null}
          plans={PLANS}
          required={3}
          balance={0}
          presetName="Cinematic Cat"
          topUp={{ packs: CREDIT_PACKS, creditsPerTransformation: 3 }}
        />
      </Preview>
    );
    // Click any plan-accept CTA the surface renders.
    const buttons = screen
      .getAllByRole("button")
      .filter((b) => /get another week|continue|start/i.test(b.textContent ?? ""));
    if (buttons.length > 0) fireEvent.click(buttons[0]!);
    await waitFor(() => expect(submitSpy).not.toHaveBeenCalled());
    submitSpy.mockRestore();
  });

  it("cancel card keep-plan does not claim retention credits", async () => {
    render(
      <Preview>
        <CancelSubscriptionCard
          planName="Pro Annual"
          periodEnd="July 1"
          loses={["Credits"]}
          credits={500}
        />
      </Preview>
    );
    fireEvent.click(
      screen.getByRole("button", { name: /cancel subscription/i })
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /keep my plan/i })
    );
    await waitFor(() =>
      expect(claimRetentionCredits).not.toHaveBeenCalled()
    );
    // The success phase still renders for inspection.
    await screen.findByText(/staying/i);
  });

  it("delete-account never calls the deletion action", async () => {
    render(
      <Preview>
        <DeleteAccountFlow activePlan={ACTIVE_PLAN} creditBalance={240} />
      </Preview>
    );
    fireEvent.click(
      screen.getByRole("button", { name: /delete my account/i })
    );
    const input = document.getElementById(
      "delete-confirmation"
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    fireEvent.change(input, { target: { value: "DELETE" } });
    const confirms = screen.getAllByRole("button", {
      name: /delete my account/i,
    });
    fireEvent.click(confirms[confirms.length - 1]!);
    await waitFor(() => expect(deleteAccount).not.toHaveBeenCalled());
  });

  it("edit profile never calls updateProfile", async () => {
    render(
      <Preview>
        <EditAccountDialog
          profile={{ display_name: "Admin", avatar_asset_id: null }}
          avatarUrl={null}
          open
          onOpenChange={() => {}}
        />
      </Preview>
    );
    const name = screen.getByLabelText(/display name/i);
    fireEvent.change(name, { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(updateProfile).not.toHaveBeenCalled());
  });
});
