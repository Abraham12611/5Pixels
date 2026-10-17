"use client";

import Link from "next/link";
import { ArrowUpRight, Toolbox } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { SettingsFieldRow } from "@/lib/articles/blocks/prompt-settings";

/**
 * Shared read-only settings card (#128) — rendered identically in the
 * article editor preview and the public reader (#131). Shows an immutable,
 * article-local snapshot of the preset's publicly documented controls.
 * Values are labelled as examples — no exact-replay claims.
 */
export function SettingsCard({
  presetName,
  presetHref,
  rows,
  className,
}: {
  /** Resolved preset name; "This preset" fallback when unavailable. */
  presetName?: string | null;
  /** Public preset deep link; null when the preset is unavailable. */
  presetHref?: string | null;
  rows: SettingsFieldRow[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-cream-100/10 bg-charcoal-850 overflow-hidden rounded-xl border",
        className
      )}
    >
      <div className="border-cream-100/10 flex items-center gap-2 border-b px-4 py-3">
        <Toolbox size={15} className="text-lime-400 shrink-0" aria-hidden />
        <p className="text-cream-50 min-w-0 truncate text-sm font-semibold">
          {presetName ? `${presetName} settings` : "Preset settings"}
        </p>
        <span className="text-text-muted ml-auto shrink-0 text-[11px]">
          Example values
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-text-muted px-4 py-3 text-sm">
          This preset uses default settings — no extra controls.
        </p>
      ) : (
        <dl className="divide-cream-100/10 divide-y">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <dt className="text-cream-100 w-40 shrink-0 text-sm font-medium">
                {row.label}
              </dt>
              <dd className="text-text-secondary min-w-0 text-sm">
                {row.value || (
                  <span className="text-text-muted italic">default</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="border-cream-100/10 flex items-center justify-between gap-2 border-t px-4 py-2.5">
        <span className="text-text-muted text-[11px]">
          Values shown are examples — not an exact replay.
        </span>
        {presetHref ? (
          <Link
            href={presetHref}
            prefetch={false}
            className="text-lime-400 hover:text-lime-300 focus-visible:ring-lime-500/70 inline-flex shrink-0 items-center gap-1.5 rounded-md text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Try this preset
            <ArrowUpRight size={13} aria-hidden />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
