"use client";

import { useState, useSyncExternalStore } from "react";
import { Copy, Check } from "@phosphor-icons/react";

const IN_APP_UA =
  /Instagram|FBAN|FBAV|TikTok|Musical_ly|Snapchat|Twitter|Line\/|KAKAOTALK|Pinterest|MicroMessenger/i;

/**
 * Detects common social-app webviews where OAuth popups/redirects fail.
 * Renders a notice steering the user to email auth or an external browser,
 * per the deferred-auth spec. Invisible everywhere else.
 */
export function InAppBrowserNotice() {
  // UA never changes at runtime — a no-op subscribe keeps SSR output null
  // (getServerSnapshot) while the client reads the real value on mount.
  const inApp = useSyncExternalStore(
    () => () => {},
    () => IN_APP_UA.test(navigator.userAgent),
    () => false
  );
  const [copied, setCopied] = useState(false);

  if (!inApp) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the URL bar text below still lets users copy.
    }
  };

  return (
    <div
      role="status"
      className="border-lime-500/20 bg-lime-500/10 mb-4 rounded-xl border px-3 py-3 text-left"
    >
      <p className="text-cream-50 text-sm font-medium">
        You&apos;re in an in-app browser
      </p>
      <p className="text-text-secondary mt-0.5 text-xs leading-relaxed">
        For Google sign-in, open this page in your browser. Email sign-in works
        right here.
      </p>
      <button
        type="button"
        onClick={copyLink}
        className="text-lime-400 hover:text-lime-300 mt-2 inline-flex items-center gap-1.5 text-xs font-medium transition"
      >
        {copied ? (
          <Check size={14} weight="bold" />
        ) : (
          <Copy size={14} weight="bold" />
        )}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
