import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  COOKIE_CONSENT_KEY,
  readConsent,
  writeConsent,
  defaultConsent,
} from "@/lib/consent/cookies";
import { CookieConsentProvider } from "../cookie-consent-provider";

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("consent store", () => {
  it("round-trips a saved consent record", () => {
    writeConsent({ ...defaultConsent(), analytics: true });
    const stored = readConsent();
    expect(stored?.analytics).toBe(true);
    expect(stored?.essential).toBe(true);
  });

  it("returns null for missing or malformed storage", () => {
    expect(readConsent()).toBeNull();
    window.localStorage.setItem(COOKIE_CONSENT_KEY, "{broken");
    expect(readConsent()).toBeNull();
  });
});

describe("CookieConsentProvider", () => {
  it("shows the banner on first visit and hides it after accept all", () => {
    render(<CookieConsentProvider>app</CookieConsentProvider>);
    expect(screen.getByRole("region", { name: /cookie notice/i }))
      .toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /accept all/i }));
    expect(
      screen.queryByRole("region", { name: /cookie notice/i })
    ).not.toBeInTheDocument();
    expect(readConsent()?.advertising).toBe(true);
  });

  it("opens the settings modal and saves a custom mix", () => {
    render(<CookieConsentProvider>app</CookieConsentProvider>);
    fireEvent.click(screen.getByRole("button", { name: /customize/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Essential is locked on; analytics off by default — flip it on.
    fireEvent.click(screen.getByRole("switch", { name: /^analytics$/i }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    const stored = readConsent();
    expect(stored?.analytics).toBe(true);
    expect(stored?.advertising).toBe(false);
    expect(stored?.essential).toBe(true);
  });

  it("essential switch cannot be toggled off", () => {
    render(<CookieConsentProvider>app</CookieConsentProvider>);
    fireEvent.click(screen.getByRole("button", { name: /customize/i }));
    const essential = screen.getByRole("switch", { name: /^essential$/i });
    expect(essential).toBeDisabled();
    expect(essential).toBeChecked();
  });

  it("does not show the banner when a stored consent exists", () => {
    writeConsent(defaultConsent());
    render(<CookieConsentProvider>app</CookieConsentProvider>);
    expect(
      screen.queryByRole("region", { name: /cookie notice/i })
    ).not.toBeInTheDocument();
  });
});
