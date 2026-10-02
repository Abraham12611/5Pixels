import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { OnboardingFlow } from "../onboarding-flow";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const checkUsernameMock = vi.fn(async (u: string) => ({
  available: u !== "taken.name",
  error: u !== "taken.name" ? undefined : "That one's taken.",
}));
const completeOnboardingMock = vi
  .fn<(a: unknown) => Promise<{ ok: boolean }>>()
  .mockResolvedValue({ ok: true });
const recordEventMock = vi
  .fn<(...args: unknown[]) => Promise<void>>()
  .mockResolvedValue(undefined);
vi.mock("@/lib/onboarding/actions", () => ({
  checkUsername: (u: string) => checkUsernameMock(u),
  completeOnboarding: (a: unknown) => completeOnboardingMock(a),
  recordOnboardingEvent: (e: unknown, m: unknown) => recordEventMock(e, m),
}));

const claimCodeMock = vi.fn(async (code: string) => ({
  ok: code === "K7M2QX",
  referrerName: code === "K7M2QX" ? "maya" : undefined,
  error: code === "K7M2QX" ? undefined : "That code doesn't look right — check it and try again.",
}));
vi.mock("@/lib/referrals/actions", () => ({
  claimReferralCode: (c: string) => claimCodeMock(c),
}));

vi.mock("@/app/actions/auth", () => ({
  signOut: vi.fn(async () => undefined),
}));

const tiles = [
  { slug: "analog", name: "Analog", imageUrl: null },
  { slug: "poster", name: "Poster", imageUrl: null },
  { slug: "cinematic", name: "Cinematic", imageUrl: null },
];

function baseProps(overrides: Partial<Parameters<typeof OnboardingFlow>[0]> = {}) {
  return {
    email: "new.user@example.com",
    interests: tiles,
    referredByName: null,
    next: "/app",
    ...overrides,
  };
}

async function advanceThroughUsername() {
  fireEvent.click(screen.getByRole("button", { name: /let’s go/i }));
  const input = await screen.findByPlaceholderText("maya.creates");
  fireEvent.change(input, { target: { value: "new.user" } });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /continue/i })
    ).not.toBeDisabled()
  );
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
}

describe("OnboardingFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens on the welcome step and requires a username to proceed", async () => {
    render(<OnboardingFlow {...baseProps()} />);
    expect(screen.getByText("Welcome to 5Pixels")).toBeInTheDocument();
    await advanceThroughUsername();
    expect(
      screen.getByText("What will you create?")
    ).toBeInTheDocument();
  });

  it("auto-advances single-select questions after the selection beat", async () => {
    render(<OnboardingFlow {...baseProps()} />);
    await advanceThroughUsername();
    fireEvent.click(screen.getByText("Social posts"));
    await screen.findByText("Which looks catch your eye?");
  });

  it("gates the interests Continue on at least one pick and reports the count", async () => {
    render(<OnboardingFlow {...baseProps()} />);
    await advanceThroughUsername();
    fireEvent.click(screen.getByText("Social posts"));
    await screen.findByText("Which looks catch your eye?");

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).toBeDisabled();
    fireEvent.click(screen.getByText("Analog"));
    fireEvent.click(screen.getByText("Poster"));
    await screen.findByRole("button", { name: /continue · 2/i });
    fireEvent.click(screen.getByRole("button", { name: /continue · 2/i }));
    await screen.findByText("How did you hear about us?");
  });

  it("routes 'a friend sent me' into the code step", async () => {
    render(<OnboardingFlow {...baseProps()} />);
    await advanceThroughUsername();
    fireEvent.click(screen.getByText("Social posts"));
    await screen.findByText("Which looks catch your eye?");
    fireEvent.click(screen.getByText("Show me everything"));
    await screen.findByText("How did you hear about us?");
    fireEvent.click(screen.getByText("A friend sent me"));
    await screen.findByText("Enter their code");
  });

  it("skips the code step for non-referral sources", async () => {
    render(<OnboardingFlow {...baseProps()} />);
    await advanceThroughUsername();
    fireEvent.click(screen.getByText("Social posts"));
    await screen.findByText("Which looks catch your eye?");
    fireEvent.click(screen.getByText("Show me everything"));
    await screen.findByText("How did you hear about us?");
    fireEvent.click(screen.getByText("Instagram"));
    await screen.findByText(/you’re set/i);
    expect(screen.queryByText("Enter their code")).not.toBeInTheDocument();
  });

  it("claims a valid code, shows the gift, then completes on finish", async () => {
    render(<OnboardingFlow {...baseProps()} />);
    await advanceThroughUsername();
    fireEvent.click(screen.getByText("Social posts"));
    await screen.findByText("Which looks catch your eye?");
    fireEvent.click(screen.getByText("Show me everything"));
    await screen.findByText("How did you hear about us?");
    fireEvent.click(screen.getByText("A friend sent me"));

    const codeInput = await screen.findByPlaceholderText("K7M-2QX");
    fireEvent.change(codeInput, { target: { value: "k7m-2qx" } });
    fireEvent.click(screen.getByRole("button", { name: /claim gift/i }));
    await screen.findByText(/maya's gift is yours/i);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await screen.findByText(/you’re set/i);
    fireEvent.click(screen.getByRole("button", { name: /start creating/i }));
    await waitFor(() => expect(completeOnboardingMock).toHaveBeenCalled());
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/app"));

    const answers = completeOnboardingMock.mock.calls[0][0] as {
      username: string;
      referralCodeUsed: string | null;
      skipped: string[];
    } | undefined;
    if (!answers) throw new Error("completeOnboarding not called");
    expect(answers.username).toBe("new.user");
    expect(answers.referralCodeUsed).toBe("K7M2QX");
    expect(answers.skipped).toContain("interests");
  });

  it("shows an inline error for an invalid code without losing the step", async () => {
    render(<OnboardingFlow {...baseProps()} />);
    await advanceThroughUsername();
    fireEvent.click(screen.getByText("Social posts"));
    await screen.findByText("Which looks catch your eye?");
    fireEvent.click(screen.getByText("Show me everything"));
    await screen.findByText("How did you hear about us?");
    fireEvent.click(screen.getByText("A friend sent me"));

    const codeInput = await screen.findByPlaceholderText("K7M-2QX");
    fireEvent.change(codeInput, { target: { value: "BADZZZ" } });
    fireEvent.click(screen.getByRole("button", { name: /claim gift/i }));
    await screen.findByText(/doesn't look right/i);
    expect(screen.getByPlaceholderText("K7M-2QX")).toBeInTheDocument();
  });

  it("shows the already-applied gift state when attribution came via link", async () => {
    render(<OnboardingFlow {...baseProps({ referredByName: "maya" })} />);
    await advanceThroughUsername();
    fireEvent.click(screen.getByText("Social posts"));
    await screen.findByText("Which looks catch your eye?");
    fireEvent.click(screen.getByText("Show me everything"));
    await screen.findByText("How did you hear about us?");
    fireEvent.click(screen.getByText("A friend sent me"));

    // Confirmation instead of an input — no double-claim prompt (08 §3).
    await screen.findByText(/maya's gift is yours/i);
    expect(screen.queryByPlaceholderText("K7M-2QX")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByText(/you’re set/i);
    expect(claimCodeMock).not.toHaveBeenCalled();
  });

  it("blocks progress on a taken username", async () => {
    render(<OnboardingFlow {...baseProps()} />);
    fireEvent.click(screen.getByRole("button", { name: /let’s go/i }));
    const input = await screen.findByPlaceholderText("maya.creates");
    fireEvent.change(input, { target: { value: "taken.name" } });
    await screen.findByText("That one's taken.");
    expect(
      screen.getByRole("button", { name: /continue/i })
    ).toBeDisabled();
  });
});
