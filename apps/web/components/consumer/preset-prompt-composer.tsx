"use client";

import { useId } from "react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface PresetPromptComposerProps {
  /** Whether the "Describe your changes" editor is expanded. */
  enabled: boolean;
  value: string;
  maxChars: number;
  /** Deemphasize until a source image exists / while submitting. */
  disabled?: boolean;
  /** Pinned message — moderation blocks and over-length live here. */
  error?: string | null;
  onToggle: (on: boolean) => void;
  onChange: (value: string) => void;
}

/** Starter phrasing — taps append to the draft, nothing submits until
 *  Generate. Kept generic so any prompt-eligible preset can show them. */
const SUGGESTIONS = [
  "add neon glow",
  "change outfit to black suit",
  "make it black & white",
];

/**
 * Opt-in prompt composer for prompt-eligible presets (#182). OFF is a
 * compact row; ON expands a bordered textarea under a divider. The text
 * only ever *refines* the curated recipe — the server composes it into the
 * private prompt and can still reject it (moderation), so the composer is
 * always honest about what happened rather than implying free-form control.
 */
export function PresetPromptComposer({
  enabled,
  value,
  maxChars,
  disabled = false,
  error = null,
  onToggle,
  onChange,
}: PresetPromptComposerProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const countId = `${uid}-count`;
  const errorId = `${uid}-error`;
  const over = value.length > maxChars;

  return (
    <div
      className={cn(
        "shadow-border rounded-lg bg-charcoal-800/80 p-3.5 transition-opacity",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p id={titleId} className="text-cream-50 text-[13px] font-medium">
            Prompt
          </p>
          <p className="text-text-muted mt-0.5 text-[11px]">
            Your changes are added to this look
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={disabled}
          aria-labelledby={titleId}
        />
      </div>

      {enabled && (
        <>
          <div
            className="border-cream-100/10 my-3 border-t"
            role="presentation"
          />
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Describe your changes, e.g. add neon glow or change outfit to black suit"
            maxLength={Math.max(maxChars, 1)}
            rows={3}
            aria-label="Describe your changes"
            aria-describedby={
              error || over ? `${countId} ${errorId}` : countId
            }
            aria-invalid={over || Boolean(error)}
            className="min-h-[88px] resize-none"
          />
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onChange(value ? `${value.replace(/\s+$/, "")} ${s}` : s)
                  }
                  className="border-cream-100/10 text-text-secondary hover:border-cream-100/25 hover:text-cream-50 min-h-8 rounded-full border px-2.5 text-[11px] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
            <span
              id={countId}
              className={cn(
                "shrink-0 text-[11px] tabular-nums",
                over ? "text-error font-semibold" : "text-text-muted"
              )}
            >
              {value.length} / {maxChars}
            </span>
          </div>
          {(error || over) && (
            <p id={errorId} role="alert" className="text-error mt-2 text-[12px]">
              {error ?? `Keep it under ${maxChars} characters.`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
