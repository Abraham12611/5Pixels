"use client";

import Link from "next/link";
import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { CookieConsent } from "@/lib/consent/cookies";

const CATEGORIES = [
  {
    key: "essential" as const,
    label: "Essential",
    description:
      "Required for sign-in sessions, security, and referral attribution. Cannot be disabled.",
    locked: true,
  },
  {
    key: "functional" as const,
    label: "Preferences",
    description:
      "Remembers your choices — dismissed hints, recently viewed presets, and saved filter settings.",
    locked: false,
  },
  {
    key: "analytics" as const,
    label: "Analytics",
    description:
      "Anonymous usage statistics that help us improve the product. No analytics trackers are currently installed.",
    locked: false,
  },
  {
    key: "advertising" as const,
    label: "Advertising",
    description:
      "Marketing and cross-site tracking cookies. No advertising trackers are currently installed.",
    locked: false,
  },
];

/**
 * The cookie preference center — reachable from the first-visit banner, the
 * footer "Cookie Settings" link, and the Cookie Notice page.
 */
export function CookieSettingsModal({
  open,
  onOpenChange,
  consent,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consent: CookieConsent;
  onSave: (
    patch: Partial<Omit<CookieConsent, "essential" | "version">>
  ) => void;
}) {
  const [draft, setDraft] = useState(consent);
  const [prevOpen, setPrevOpen] = useState(open);
  // Re-sync the draft each time the modal opens — render-phase adjust.
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) setDraft(consent);
  }

  const setAll = (value: boolean) =>
    setDraft((d) => ({
      ...d,
      functional: value,
      analytics: value,
      advertising: value,
    }));

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      tier="content"
      title="Cookie Preferences"
      description="Choose which cookies 5Pixels can use."
      showClose
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAll(true)}
            className="text-text-secondary hover:text-cream-50 text-xs font-medium transition"
          >
            Select all
          </button>
          <span className="text-text-muted" aria-hidden>
            ·
          </span>
          <button
            type="button"
            onClick={() => setAll(false)}
            className="text-text-secondary hover:text-cream-50 text-xs font-medium transition"
          >
            Unselect all
          </button>
          <Button
            type="button"
            variant="brand"
            size="sm"
            className="ml-auto"
            onClick={() => onSave(draft)}
          >
            Save changes
          </Button>
        </div>
      }
    >
      <div className="divide-cream-100/10 divide-y">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.key}
            className="flex items-start justify-between gap-4 py-4"
          >
            <div className="min-w-0">
              <p className="text-cream-50 text-sm font-semibold">
                {cat.label}
                {cat.locked && (
                  <span className="text-text-muted ml-2 text-xs font-normal">
                    Always on
                  </span>
                )}
              </p>
              <p className="text-text-secondary mt-1 text-xs leading-relaxed">
                {cat.description}
              </p>
            </div>
            <Switch
              checked={cat.locked ? true : draft[cat.key]}
              disabled={cat.locked}
              onCheckedChange={(checked) =>
                setDraft((d) => ({ ...d, [cat.key]: checked }))
              }
              aria-label={cat.label}
            />
          </div>
        ))}
      </div>
      <p className="text-text-muted pt-2 pb-4 text-xs leading-relaxed">
        Details on every cookie and storage key we set are in the{" "}
        <Link
          href="/cookies"
          className="text-lime-400 underline-offset-2 hover:underline"
        >
          Cookie Notice
        </Link>
        .
      </p>
    </Sheet>
  );
}
