"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { updateUserSettings } from "@/lib/db/settings";
import { cn } from "@/lib/utils";

interface ToggleRowProps {
  title: string;
  /** One full sentence explaining the consequence. */
  description: string;
  /** UserSettings key persisted on toggle. Omit + use `locked` for system-managed rows. */
  settingKey?:
    | "notifyGenerationCompleted"
    | "notifyBilling"
    | "productUpdatesOptIn"
    | "marketingOptIn";
  defaultChecked?: boolean;
  /** Locked rows render a disabled switch + static state copy. */
  locked?: boolean;
  lockedLabel?: string;
}

/**
 * Notification/preference toggle row — title, full explanatory sentence,
 * right-aligned switch with textual state so nothing is color-only.
 */
export function ToggleRow({
  title,
  description,
  settingKey,
  defaultChecked = false,
  locked = false,
  lockedLabel,
}: ToggleRowProps) {
  const [checked, setChecked] = useState(defaultChecked);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleChange = (next: boolean) => {
    if (!settingKey) return;
    const previous = checked;
    setChecked(next);
    setError(null);
    startTransition(async () => {
      const result = await updateUserSettings({ [settingKey]: next });
      if (!result.success) {
        setChecked(previous);
        setError(result.error ?? "Unable to save. Try again.");
      }
    });
  };

  const stateLabel = locked
    ? (lockedLabel ?? "Always on")
    : checked
      ? "On"
      : "Off";

  return (
    <div className="border-cream-100/10 flex items-start justify-between gap-6 border-t py-5 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-cream-50 text-sm font-medium">{title}</p>
        <p className="text-text-secondary mt-1 text-sm leading-relaxed">
          {description}
        </p>
        {error && <p className="text-error mt-1.5 text-xs">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2.5 pt-0.5">
        <span
          className={cn(
            "text-xs font-medium",
            checked || locked ? "text-cream-100" : "text-text-muted"
          )}
        >
          {stateLabel}
        </span>
        <Switch
          checked={locked ? true : checked}
          disabled={locked || pending}
          onCheckedChange={handleChange}
          aria-label={title}
        />
      </div>
    </div>
  );
}
