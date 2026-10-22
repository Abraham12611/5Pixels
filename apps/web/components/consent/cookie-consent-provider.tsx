"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  COOKIE_CONSENT_VERSION,
  defaultConsent,
  readConsent,
  writeConsent,
  type CookieConsent,
} from "@/lib/consent/cookies";
import { CookieSettingsModal } from "./cookie-settings-modal";
import { CookieBanner } from "./cookie-banner";

interface CookieConsentContextValue {
  consent: CookieConsent | null;
  /** False until the user has made any choice (drives the banner). */
  hasConsented: boolean;
  settingsOpen: boolean;
  openSettings: () => void;
  saveConsent: (patch: Partial<Omit<CookieConsent, "essential" | "version">>) => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
}

const CookieConsentContext =
  createContext<CookieConsentContextValue | null>(null);

// Mount-only subscription — the banner cares that hydration finished, not
// about storage events from other tabs.
const subscribeNoop = () => () => {};
const clientMounted = () => true;
const serverMounted = () => false;

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error(
      "useCookieConsent must be used inside <CookieConsentProvider>"
    );
  }
  return ctx;
}

/**
 * Owns the cookie-consent record and renders the first-visit banner plus
 * the settings modal. Mounted once in the root layout so the footer, legal
 * pages, and in-app settings can all reopen preferences.
 */
export function CookieConsentProvider({ children }: { children: ReactNode }) {
  // Mounted via useSyncExternalStore so the first client render matches
  // the server HTML — a render-phase `typeof window` branch hydrated the
  // tree with the banner mounted while SSR had none (#418). The stored
  // record is read lazily once mounted; `choice` holds the in-session pick.
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    clientMounted,
    serverMounted
  );
  const [choice, setChoice] = useState<CookieConsent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const consent = useMemo(
    () => (hydrated ? (choice ?? readConsent()) : null),
    [hydrated, choice]
  );

  const persist = useCallback((next: CookieConsent) => {
    writeConsent(next);
    setChoice(next);
  }, []);

  const saveConsent = useCallback(
    (patch: Partial<Omit<CookieConsent, "essential" | "version">>) => {
      persist({
        ...(consent ?? defaultConsent()),
        ...patch,
        essential: true,
        version: COOKIE_CONSENT_VERSION,
        updatedAt: new Date().toISOString(),
      });
      setSettingsOpen(false);
    },
    [consent, persist]
  );

  const acceptAll = useCallback(() => {
    persist({
      ...defaultConsent(),
      functional: true,
      analytics: true,
      advertising: true,
    });
    setSettingsOpen(false);
  }, [persist]);

  const rejectNonEssential = useCallback(() => {
    persist({
      ...defaultConsent(),
      functional: false,
      analytics: false,
      advertising: false,
    });
    setSettingsOpen(false);
  }, [persist]);

  const openSettings = useCallback(() => setSettingsOpen(true), []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      hasConsented: consent !== null,
      settingsOpen,
      openSettings,
      saveConsent,
      acceptAll,
      rejectNonEssential,
    }),
    [
      consent,
      settingsOpen,
      openSettings,
      saveConsent,
      acceptAll,
      rejectNonEssential,
    ]
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {hydrated && consent === null && !settingsOpen ? (
        <CookieBanner
          onAcceptAll={acceptAll}
          onReject={rejectNonEssential}
          onCustomize={openSettings}
        />
      ) : null}
      <CookieSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        consent={consent ?? defaultConsent()}
        onSave={saveConsent}
      />
    </CookieConsentContext.Provider>
  );
}
