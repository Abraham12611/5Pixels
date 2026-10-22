"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface PresetPromptCardProps {
  /**
   * Card body — the preset's `public_prompt_recipe` when set, otherwise the
   * short/long description. Only approved public editorial copy ever lands
   * here; private generation prompts are structurally absent.
   */
  text: string;
  /** Whether `text` is the public recipe — drives the section label. */
  isRecipe: boolean;
  className?: string;
}

const COLLAPSED_MAX = "max-h-40";

/**
 * Preset-console prompt card — collapsed scrollable body with a bottom
 * fade + See all toggle and a clipboard copy affordance, mirroring the
 * recipe card in the articles surface.
 */
export function PresetPromptCard({
  text,
  isRecipe,
  className,
}: PresetPromptCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions) — leave the text selectable.
    }
  };

  return (
    <section
      className={cn(
        "border-cream-100/10 bg-charcoal-850 overflow-hidden rounded-2xl border",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 pt-3.5">
        <h2 className="text-text-muted text-xs font-medium uppercase tracking-wider">
          {isRecipe ? "Prompt" : "About this look"}
        </h2>
        <button
          type="button"
          onClick={onCopy}
          className="text-text-secondary hover:text-cream-50 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors"
          aria-label={copied ? "Copied" : "Copy to clipboard"}
        >
          {copied ? (
            <Check size={14} weight="bold" className="text-lime-400" />
          ) : (
            <Copy size={14} />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="relative">
        <p
          ref={bodyRef}
          className={cn(
            "text-text-secondary whitespace-pre-wrap px-4 pb-4 pt-2 text-[0.875rem] leading-5",
            !expanded && `${COLLAPSED_MAX} overflow-hidden`
          )}
        >
          {text}
        </p>
        {!expanded && overflows && (
          <div
            aria-hidden
            className="from-charcoal-850/0 to-charcoal-850 pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b"
          />
        )}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-text-secondary hover:text-cream-50 w-full px-4 pb-3 text-left text-xs font-medium transition-colors"
        >
          {expanded ? "Show less" : "See all"}
        </button>
      )}
    </section>
  );
}
