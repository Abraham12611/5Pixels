import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

let mockPathname: string | null = "/presets/warm-look";
let mockSearch: URLSearchParams | null = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearch,
}));

vi.mock("@/app/actions/auth", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

import { AuthModalLink } from "../auth-modal-link";

const nextValues = () =>
  Array.from(
    document.querySelectorAll<HTMLInputElement>('input[name="next"]')
  ).map((input) => input.value);

describe("AuthModalLink", () => {
  it("opens the modal on the requested tab without navigating", () => {
    render(<AuthModalLink tab="signup">Try 5Pixels</AuthModalLink>);
    fireEvent.click(screen.getByRole("button", { name: "Try 5Pixels" }));
    expect(
      screen.getByRole("dialog", { name: /create your account/i })
    ).toBeInTheDocument();
    expect(window.location.pathname).not.toBe("/signup");
  });

  it("carries the current path as the return target", () => {
    mockPathname = "/explore";
    mockSearch = new URLSearchParams("type=filter");
    render(<AuthModalLink tab="login">Log in</AuthModalLink>);
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(nextValues()).toContain("/explore?type=filter");
  });

  it("honours an explicit next over the current path", () => {
    render(
      <AuthModalLink tab="signup" next="/pricing">
        Get a week
      </AuthModalLink>
    );
    fireEvent.click(screen.getByRole("button", { name: "Get a week" }));
    expect(nextValues()).toContain("/pricing");
    expect(nextValues()).not.toContain("/explore?type=filter");
  });

  it("falls back to /app on non-returnable surfaces", () => {
    mockPathname = "/login";
    mockSearch = new URLSearchParams();
    render(<AuthModalLink tab="login">Log in</AuthModalLink>);
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(nextValues()).toContain("/app");
  });
});
