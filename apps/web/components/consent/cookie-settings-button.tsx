"use client";

import { useCookieConsent } from "./cookie-consent-provider";

/** Reopens the Cookie Preferences modal — used from footers and legal pages. */
export function CookieSettingsButton({
  className,
  label = "Cookie Settings",
}: {
  className?: string;
  label?: string;
}) {
  const { openSettings } = useCookieConsent();
  return (
    <button type="button" onClick={openSettings} className={className}>
      {label}
    </button>
  );
}
