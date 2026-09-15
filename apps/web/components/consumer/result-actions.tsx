"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowCounterClockwise,
  BookmarkSimple,
  Download,
  ShareNetwork,
  SlidersHorizontal,
  SquaresFour,
  Warning,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ShareActions } from "@/components/consumer/share-actions";
import { regenerateGeneration } from "@/lib/generation/actions";
import {
  markGenerationDownloaded,
  setGenerationSaved,
} from "@/lib/library/actions";
import { cn } from "@/lib/utils";

interface ResultActionsProps {
  generationId: string;
  productSlug: string;
  /** Credit cost of running this transformation again. */
  creditCost: number;
  downloadUrl: string | null;
  initialShareId: string | null;
  initialSaved: boolean;
}

/**
 * The result console: every continuation path in one place. Download is the
 * primary action; Regenerate states its credit cost up front; Adjust keeps
 * the source + options; Try another look preserves nothing but momentum.
 */
export function ResultActions({
  generationId,
  productSlug,
  creditCost,
  downloadUrl,
  initialShareId,
  initialSaved,
}: ResultActionsProps) {
  const [shareOpen, setShareOpen] = useState(Boolean(initialShareId));
  const [saved, setSaved] = useState(initialSaved);
  const [regenError, setRegenError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleRegenerate = () => {
    setRegenError("");
    startTransition(async () => {
      const result = await regenerateGeneration(generationId);
      if (result?.error) setRegenError(result.error);
      // Success path redirects to the new generation's status page.
    });
  };

  const handleSave = () => {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const result = await setGenerationSaved(generationId, next);
      if (!result.success) {
        setSaved(!next);
        toast.error(result.error ?? "Could not update this result.");
      } else if (next) {
        toast("Saved to Library");
      }
    });
  };

  return (
    <div className="shadow-border rounded-xl bg-charcoal-850 p-4">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {downloadUrl && (
          <Button asChild variant="brand" className="col-span-2 sm:col-span-1">
            <a
              href={downloadUrl}
              download
              target="_blank"
              rel="noreferrer"
              onClick={() => void markGenerationDownloaded(generationId)}
            >
              <Download size={15} weight="bold" />
              Download
            </a>
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={handleRegenerate}
          disabled={isPending}
        >
          <ArrowCounterClockwise size={15} weight="bold" />
          {isPending ? "Starting…" : "Regenerate"}
          <span className="text-text-muted text-xs tabular-nums">
            · {creditCost} {creditCost === 1 ? "credit" : "credits"}
          </span>
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/app/create/${productSlug}?from=${generationId}`}>
            <SlidersHorizontal size={15} weight="bold" />
            Adjust
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/explore">
            <SquaresFour size={15} weight="bold" />
            Try another look
          </Link>
        </Button>
        <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:ml-auto">
          <Button
            type="button"
            variant={shareOpen ? "secondary" : "tertiary"}
            onClick={() => setShareOpen((v) => !v)}
            aria-expanded={shareOpen}
          >
            <ShareNetwork size={15} weight="bold" />
            Share
          </Button>
          <Button
            type="button"
            variant={saved ? "secondary" : "tertiary"}
            size="icon"
            onClick={handleSave}
            disabled={isPending}
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save to Library"}
            className={cn(saved && "text-lime-300")}
          >
            <BookmarkSimple size={15} weight={saved ? "fill" : "bold"} />
          </Button>
        </div>
      </div>

      {regenError && (
        <p className="bg-error/10 text-error mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs">
          <Warning size={14} weight="fill" className="mt-0.5 shrink-0" />
          {regenError}
        </p>
      )}

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          shareOpen
            ? "mt-3 grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <ShareActions
            generationId={generationId}
            initialShareId={initialShareId}
          />
        </div>
      </div>
    </div>
  );
}
