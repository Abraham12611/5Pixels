import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const getUser = vi.fn();
const updateUser = vi.fn();
const signOut = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser, updateUser, signOut },
  })),
}));

vi.mock("../update-password-form", () => ({
  UpdatePasswordForm: () => <div data-testid="update-password-form" />,
}));

const { default: UpdatePasswordPage } = await import("../page");
const { updatePassword } = await import("@/app/actions/auth");

describe("update-password page guard", () => {
  it("renders the form for a signed-in visitor (#216)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const ui = await UpdatePasswordPage();
    render(ui);
    expect(screen.getByTestId("update-password-form")).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("renders for a recovery session — post-callback users are signed in", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u2", app_metadata: { provider: "email" } } },
    });
    const ui = await UpdatePasswordPage();
    render(ui);
    expect(screen.getByTestId("update-password-form")).toBeInTheDocument();
  });

  it("bounces anonymous visitors to the expired-link resend path", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(UpdatePasswordPage()).rejects.toThrow(
      "REDIRECT:/forgot-password?error=link-expired"
    );
  });

  it("unauthenticated users cannot submit a password change", async () => {
    // The page guard never lets anonymous visitors reach the form, and the
    // action itself double-checks via GoTrue: updateUser without a session
    // must surface an error rather than succeeding.
    updateUser.mockResolvedValue({
      error: { message: "Auth session missing!" },
    });
    const fd = new FormData();
    fd.set("password", "new-password-123");
    fd.set("confirmPassword", "new-password-123");
    const result = await updatePassword(undefined, fd);
    expect(result?.success).toBe(false);
    expect(signOut).not.toHaveBeenCalled();
  });
});
