"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Copy,
  Paperclip,
  TextT,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { PromptReference, PromptRecipeSource } from "@/lib/articles/blocks/prompt-settings";

/**
 * Shared read-only prompt-recipe card (#128) — rendered identically in the
 * article editor preview and the public reader (#131). It only ever shows
 * the article-local recipe snapshot: approved public editorial copy or
 * author-written text. Private generation prompts are structurally absent.
 */

const SOURCE_LABEL: Record<PromptRecipeSource, string> = {
  approved_template: "From the preset's public recipe",
  manual: "Written for this article",
};

export function PromptRecipeCard({
  recipeText,
  source,
  capturedAt,
  presetName,
  presetHref,
  references,
  mediaLabels,
  className,
}: {
  recipeText: string;
  source: PromptRecipeSource;
  /** ISO timestamp — shown to readers as capture context. */
  capturedAt?: string;
  /** Resolved preset name + deep link; null when preset-less/unavailable. */
  presetName?: string | null;
  presetHref?: string | null;
  references?: PromptReference[];
  /** Display labels for asset-kind references (id → title), reader-side. */
  mediaLabels?: ReadonlyMap<string, string>;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(recipeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions) — leave the text selectable.
    }
  };

  const refs = references ?? [];
  const text = recipeText.trim();

  return (
    <figure
      className={cn(
        "border-lime-500/20 bg-charcoal-850 overflow-hidden rounded-xl border",
        className
      )}
    >
      <div className="border-cream-100/10 flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <figcaption className="flex min-w-0 items-center gap-2">
          <TextT size={14} className="text-lime-400 shrink-0" aria-hidden />
          <span className="text-text-secondary truncate text-xs font-semibold tracking-wider uppercase">
            Prompt recipe
          </span>
          <span className="text-text-muted hidden text-[11px] sm:inline">
            · {SOURCE_LABEL[source]}
          </span>
        </figcaption>
        {text ? (
          <button
            type="button"
            onClick={onCopy}
            aria-live="polite"
            className="text-text-muted hover:text-cream-100 focus-visible:ring-lime-500/70 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {copied ? (
              <>
                <Check size={13} className="text-lime-400" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy size={13} aria-hidden />
                Copy
              </>
            )}
          </button>
        ) : null}
      </div>

      {text ? (
        <pre className="text-cream-100 max-w-full overflow-x-auto px-4 py-3 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap">
          {text}
        </pre>
      ) : (
        <p className="text-text-muted px-4 py-3 text-sm">
          This recipe was left blank by the author.
        </p>
      )}

      {refs.length > 0 ? (
        <div className="border-cream-100/10 flex flex-wrap items-center gap-2 border-t px-4 py-2.5">
          <Paperclip size={13} className="text-text-muted" aria-hidden />
          {refs.map((ref) => (
            <span
              key={`${ref.kind}-${ref.id}`}
              className="border-cream-100/10 bg-charcoal-800 text-text-secondary inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
            >
              {ref.kind === "asset" ? "Image" : "Generation"} ·{" "}
              {mediaLabels?.get(ref.id) ?? ref.label}
            </span>
          ))}
        </div>
      ) : null}

      {(presetHref || capturedAt) && (
        <div className="border-cream-100/10 flex items-center justify-between gap-2 border-t px-4 py-2.5">
          <span className="text-text-muted text-[11px]">
            {presetName ? `Made with ${presetName}` : "Made with a preset"}
            {capturedAt
              ? ` · shared ${new Date(capturedAt).toLocaleDateString("en-US", { year: "numeric", month: "short" })}`
              : ""}
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
      )}
    </figure>
  );
}
