import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { toHaveNoViolations } from "vitest-axe/dist/matchers.js";
import { AuthModal } from "../auth/auth-modal";
import { RouteError } from "../ui/route-error";
import { MobileBottomNav } from "../consumer/mobile-bottom-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/explore",
}));
vi.mock("@/app/actions/auth", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

// axe-core color-contrast needs canvas — jsdom doesn't implement it.
const AXE_OPTS = { rules: { "color-contrast": { enabled: false } } };

// vitest-axe's typings are broken; assert on the matcher result directly.
async function expectNoViolations(html: Element) {
  const result = toHaveNoViolations(await axe(html, AXE_OPTS));
  expect(result.pass, result.message()).toBe(true);
}

describe("a11y — axe on core surfaces", () => {
  it("auth sheet", async () => {
    render(<AuthModal open onOpenChange={vi.fn()} next="/app" />);
    // Overlay portals to document.body.
    await expectNoViolations(document.body);
  });

  it("route error boundary", async () => {
    render(<RouteError error={new Error("x")} reset={vi.fn()} />);
    await expectNoViolations(document.body);
  });

  it("mobile bottom nav", async () => {
    const { container } = render(<MobileBottomNav />);
    await expectNoViolations(container);
  });
});
