import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthModal } from "../auth-modal";

vi.mock("@/app/actions/auth", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

const preset = { name: "Cyber Punk", thumbUrl: "https://x.test/t.jpg" };

describe("AuthModal", () => {
  it("shows preset context and the reason line", () => {
    render(
      <AuthModal open onOpenChange={vi.fn()} next="/app/create/cyber-punk?draft=1" preset={preset} />
    );
    expect(screen.getByText(/continue to cyber punk/i)).toBeInTheDocument();
    expect(
      screen.getByText(/results in your library and your credits with your account/i)
    ).toBeInTheDocument();
  });

  it("renders Google before the email field (12 §3 order)", () => {
    render(<AuthModal open onOpenChange={vi.fn()} next="/app" />);
    const google = screen.getByRole("button", { name: /continue with google/i });
    const email = screen.getByLabelText(/email/i);
    expect(
      google.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("switches sign-in/sign-up inside the sheet without navigating", () => {
    render(<AuthModal open onOpenChange={vi.fn()} next="/app" />);
    fireEvent.click(
      screen.getByRole("button", { name: /create an account/i })
    );
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(
      screen.queryByText(/at least 8 characters/i)
    ).not.toBeInTheDocument();
  });

  it("shows the live password checklist on the signup tab", () => {
    render(
      <AuthModal open onOpenChange={vi.fn()} next="/app" initialTab="signup" />
    );
    const pw = screen.getByLabelText(/^password$/i);
    const lenRule = screen.getByText(/at least 8 characters/i);
    expect(lenRule).toBeInTheDocument();
    fireEvent.change(pw, { target: { value: "abc" } });
    expect(lenRule.className).toContain("text-text-muted");
    fireEvent.change(pw, { target: { value: "abcdefg8" } });
    expect(screen.getByText(/at least 8 characters/i).className).toContain(
      "text-lime-300"
    );
    expect(screen.getByText(/letters and numbers/i).className).toContain(
      "text-lime-300"
    );
  });

  it("resets to the caller's default tab on each open", () => {
    const { rerender } = render(
      <AuthModal open={false} onOpenChange={vi.fn()} next="/app" initialTab="signup" />
    );
    rerender(
      <AuthModal open onOpenChange={vi.fn()} next="/app" initialTab="signup" />
    );
    // signup tab active — checklist present
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it("requires the legal consent checkbox on the signup tab", () => {
    render(
      <AuthModal open onOpenChange={vi.fn()} next="/app" initialTab="signup" />
    );
    const checkbox = screen.getByRole("checkbox", {
      name: /terms of service/i,
    });
    expect(checkbox).toBeRequired();
    expect(screen.getByText(/acceptable use policy/i)).toBeInTheDocument();
  });

  it("does not show the consent checkbox on the login tab by default", () => {
    render(<AuthModal open onOpenChange={vi.fn()} next="/app" />);
    expect(
      screen.queryByRole("checkbox", { name: /terms of service/i })
    ).not.toBeInTheDocument();
  });

  it("renders the showcase slideshow with jump controls", () => {
    render(<AuthModal open onOpenChange={vi.fn()} next="/app" />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.click(tabs[2]);
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
  });
});
