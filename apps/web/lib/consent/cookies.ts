/**
 * Cookie consent state, persisted to localStorage under `5px:cookie-consent`.
 * Today the app sets only essential storage (auth session, referral
 * attribution, UI preferences) — no analytics or advertising trackers are
 * installed. The categories below are honoured the moment such a tracker
 * would ever be added, and the record itself is the audit trail Creem /
 * GDPR-style reviews ask for.
 */

export const COOKIE_CONSENT_KEY = "5px:cookie-consent";
export const COOKIE_CONSENT_VERSION = 1;

export interface CookieConsent {
  version: number;
  /** Always true — auth session and security cookies are not optional. */
  essential: true;
  /** UI preferences (theme hints, recent presets, dismissal flags). */
  functional: boolean;
  /** Product analytics — none installed today. */
  analytics: boolean;
  /** Advertising / cross-site tracking — none installed today. */
  advertising: boolean;
  updatedAt: string;
}

export function defaultConsent(): CookieConsent {
  return {
    version: COOKIE_CONSENT_VERSION,
    essential: true,
    functional: true,
    analytics: false,
    advertising: false,
    updatedAt: new Date().toISOString(),
  };
}

export function readConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    return { ...defaultConsent(), ...parsed, essential: true };
  } catch {
    return null;
  }
}

export function writeConsent(consent: CookieConsent) {
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // Private-mode storage failures are non-fatal — the banner simply
    // reappears on the next visit.
  }
}

export function clearConsent() {
  try {
    window.localStorage.removeItem(COOKIE_CONSENT_KEY);
  } catch {
    // ignore
  }
}
