"use client";

import { useState } from "react";
import { CaretDown, Info } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface ResultDetailsData {
  createdAt: string | null;
  productName: string;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  bytes: number | null;
  creditCost: number;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
}

function formatMime(mimeType: string): string {
  const subtype = mimeType.split("/")[1]?.toUpperCase();
  if (subtype === "JPEG" || subtype === "JPG") return "JPEG";
  return subtype || mimeType.toUpperCase();
}

/**
 * Collapsible details card in the result rail — creation metadata for the
 * finished transformation. Hidden rows are skipped when data is missing.
 */
export function ResultDetails({ details }: { details: ResultDetailsData }) {
  const [open, setOpen] = useState(false);

  const rows: Array<{ label: string; value: string }> = [];

  if (details.createdAt) {
    rows.push({
      label: "Created",
      value: new Date(details.createdAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    });
  }
  rows.push({ label: "Preset", value: details.productName });
  if (details.width && details.height) {
    const mp = ((details.width * details.height) / 1_000_000).toFixed(1);
    rows.push({
      label: "Resolution",
      value: `${details.width} × ${details.height} · ${mp} MP`,
    });
  }
  if (details.mimeType) {
    rows.push({ label: "Format", value: formatMime(details.mimeType) });
  }
  if (details.bytes && details.bytes > 0) {
    rows.push({ label: "File size", value: formatBytes(details.bytes) });
  }
  if (details.creditCost > 0) {
    rows.push({
      label: "Cost",
      value: `${details.creditCost} ${details.creditCost === 1 ? "credit" : "credits"}`,
    });
  }

  return (
    <div className="border-cream-100/10 bg-charcoal-850 rounded-2xl border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-text-secondary hover:text-cream-100 focus-visible:ring-lime-500/50 flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2"
      >
        <Info size={15} weight="bold" className="text-text-muted" />
        <span className="flex-1 text-left">Details</span>
        <CaretDown
          size={13}
          weight="bold"
          className={cn(
            "text-text-muted transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <dl className="border-cream-100/10 space-y-2 border-t px-4 pb-4 pt-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3 text-[13px]"
            >
              <dt className="text-text-muted shrink-0">{row.label}</dt>
              <dd className="text-cream-50 truncate text-right tabular-nums">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
