import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const updateSession = vi.fn();

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: (request: NextRequest) => updateSession(request),
}));

// Import after the mock so proxy() sees it.
const { proxy } = await import("./proxy");

const FAKE_USER = { id: "user-1", email: "qa@example.com" };

function req(path: string) {
  return new NextRequest(new URL(`http://localhost:3000${path}`));
}

function sessionFor(user: object | null, profile?: object) {
  const passthrough = NextResponse.next();
  updateSession.mockResolvedValue({
    supabaseResponse: passthrough,
    user,
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: profile ?? null }),
          }),
        }),
      }),
    },
  });
  return passthrough;
}

beforeEach(() => updateSession.mockReset());

describe("proxy auth-route handling", () => {
  it("lets an authenticated user reach /update-password (#216)", async () => {
    const passthrough = sessionFor(FAKE_USER);
    const res = await proxy(req("/update-password"));
    expect(res).toBe(passthrough);
    expect(res.headers.get("location")).toBeNull();
  });

  it("ignores a stray ?next= on /update-password instead of bouncing", async () => {
    sessionFor(FAKE_USER);
    const res = await proxy(req("/update-password?next=/presets/retro"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("does not redirect a recovery-session user to /app (#216)", async () => {
    // Post-callback recovery users hold a real session — the exact state a
    // signed-in account-security visitor is in. Same assertion, same route.
    const passthrough = sessionFor(FAKE_USER);
    const res = await proxy(req("/update-password"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("still bounces signed-in users off credential-entry surfaces", async () => {
    sessionFor(FAKE_USER);
    for (const path of ["/login", "/signup", "/forgot-password"]) {
      const res = await proxy(req(path));
      expect(res.headers.get("location")).toBe("http://localhost:3000/app");
    }
  });

  it("still honors ?next= on the remaining auth routes", async () => {
    sessionFor(FAKE_USER);
    const res = await proxy(req("/login?next=/presets/retro"));
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/presets/retro"
    );
  });

  it("passes anonymous /update-password through to the page's own guard", async () => {
    const passthrough = sessionFor(null);
    const res = await proxy(req("/update-password"));
    // No redirect: the page itself redirects anonymous visitors to
    // /forgot-password?error=link-expired — proxy must not interfere.
    expect(res).toBe(passthrough);
  });

  it("still guards /app for anonymous visitors", async () => {
    sessionFor(null);
    const res = await proxy(req("/app/account/security"));
    expect(res.headers.get("location")).toContain("/login");
  });

  it("still enforces the onboarding gate for signed-in /app visits", async () => {
    sessionFor(FAKE_USER, { onboarding_completed_at: null });
    const res = await proxy(req("/app/account/security"));
    expect(res.headers.get("location")).toContain("/onboarding");
  });
});
