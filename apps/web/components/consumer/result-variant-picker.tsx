"use client";

import { useState } from "react";
import { Images, Sparkle } from "@phosphor-icons/react";
import { PresetFamilySelector } from "@/components/consumer/preset-family-selector";
import { cn } from "@/lib/utils";
import type { VariantHandoff } from "@/lib/generation/variant-handoff";

export interface ResultVariantPickerProps {
  /** Sibling handoffs incl. the current member — `currentProductId` marks it. */
  handoffs: VariantHandoff[];
  currentProductId: string;
  /** The finished output can be staged as the new input (opt-in). */
  resultAsSourceAvailable: boolean;
}

/**
 * "Try another variation" on a finished result (#184). Every chip links to
 * a prepared create form for that sibling — browsing is free; the new run
 * still needs a fresh quote, consent, and Generate click. Selecting a
 * source mode only changes the link's `variant_source` param — the actual
 * carry/drop decisions are explained per member via `notices`.
 */
export function ResultVariantPicker({
  handoffs,
  currentProductId,
  resultAsSourceAvailable,
}: ResultVariantPickerProps) {
  const [sourceMode, setSourceMode] = useState<"original" | "output">(
    "original"
  );

  if (handoffs.length <= 1) return null;

  const members = handoffs.map((h) => h.member);
  const noticeById = new Map(
    handoffs.map((h) => [h.member.productId, h.notices[0] ?? null])
  );
  const hrefById = new Map(
    handoffs.map((h) => [h.member.productId, h.hrefs])
  );

  return (
    <section
      aria-label="Try another variation"
      className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-4"
    >
      <div className="flex items-center gap-2">
        <Sparkle size={15} weight="fill" className="text-lime-400" />
        <h3 className="text-cream-50 text-[13px] font-semibold">
          Try another variation
        </h3>
      </div>

      {resultAsSourceAvailable && (
        <fieldset className="mt-3">
          <legend className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
            Start from
          </legend>
          <div
            role="radiogroup"
            aria-label="Start from"
            className="bg-charcoal-800 mt-1.5 grid grid-cols-2 gap-1 rounded-lg p-1"
          >
            {(
              [
                { value: "original", label: "Original photo" },
                { value: "output", label: "This result" },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors",
                  sourceMode === opt.value
                    ? "bg-charcoal-700 text-cream-50"
                    : "text-text-secondary hover:text-cream-100"
                )}
              >
                <input
                  type="radio"
                  name="variant-source"
                  value={opt.value}
                  checked={sourceMode === opt.value}
                  onChange={() => setSourceMode(opt.value)}
                  className="sr-only"
                />
                {opt.value === "output" && (
                  <Images size={12} weight="bold" className="text-lime-400" />
                )}
                {opt.label}
              </label>
            ))}
          </div>
          {sourceMode === "output" && (
            <p className="text-text-muted mt-1.5 text-[11px] leading-snug">
              Your result becomes the new input — a derivative run, not an
              edit of this one.
            </p>
          )}
        </fieldset>
      )}

      <div className="mt-3">
        <PresetFamilySelector
          members={members}
          currentProductId={currentProductId}
          hrefFor={(member) => hrefById.get(member.productId)![sourceMode]}
          noticeFor={(member) => noticeById.get(member.productId) ?? null}
          title="Styles in this set"
        />
      </div>

      <p className="text-text-muted mt-2.5 text-[11px] leading-snug">
        Free to pick — a new run always asks for a fresh quote before
        spending credits.
      </p>
    </section>
  );
}
