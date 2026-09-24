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
import { DockedActionBar } from "@/components/consumer/mobile/docked-action-bar";
import { ShareDialog } from "@/components/consumer/share-dialog";
import { regenerateGeneration } from "@/lib/generation/actions";
import {
  markGenerationDownloaded,
  setGenerationSaved,
} from "@/lib/library/actions";
import { cn } from "@/lib/utils";

interface ResultActionsProps {
  generationId: string;
  productSlug: string;
  productName: string;
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
  productName,
  creditCost,
  downloadUrl,
  initialShareId,
  initialSaved,
}: ResultActionsProps) {
  const [shareOpen, setShareOpen] = useState(false);
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
    <>
      {/* Mobile: Download is the only primary, docked in the thumb zone;
          Share/Save share a secondary row (10 §3). */}
      <DockedActionBar>
        {downloadUrl && (
          <Button asChild variant="brand" className="min-h-11 w-full">
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
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            onClick={() => setShareOpen(true)}
            aria-haspopup="dialog"
          >
            <ShareNetwork size={15} weight="bold" />
            Share
          </Button>
          <Button
            type="button"
            variant="secondary"
            className={cn("min-h-11", saved && "text-lime-300")}
            onClick={handleSave}
            disabled={isPending}
            aria-pressed={saved}
          >
            <BookmarkSimple size={15} weight={saved ? "fill" : "bold"} />
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </DockedActionBar>

      {/* Mobile: regenerate/adjust are credit-spending paths, so they live
          below the fold in a labelled section (10 §3). */}
      <section className="space-y-2.5 md:hidden">
        <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wide">
          Make it again
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            onClick={handleRegenerate}
            disabled={isPending}
          >
            <ArrowCounterClockwise size={15} weight="bold" />
            {isPending ? "Starting…" : `Regenerate · ${creditCost}`}
          </Button>
          <Button asChild variant="secondary" className="min-h-11">
            <Link href={`/app/create/${productSlug}?from=${generationId}`}>
              <SlidersHorizontal size={15} weight="bold" />
              Adjust
            </Link>
          </Button>
        </div>
        <p className="text-text-muted text-[11px] tabular-nums">
          Each run is unique — this costs {creditCost}{" "}
          {creditCost === 1 ? "credit" : "credits"}.
        </p>
      </section>

      {/* md+: the rail console keeps the full action stack. */}
      <div className="shadow-border hidden rounded-xl bg-charcoal-850 p-4 md:block">
        <div className="flex flex-col gap-2">
          {downloadUrl && (
            <Button asChild variant="brand" className="w-full">
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
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleRegenerate}
              disabled={isPending}
            >
              <ArrowCounterClockwise size={15} weight="bold" />
              {isPending ? "Starting…" : "Regenerate"}
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/app/create/${productSlug}?from=${generationId}`}>
                <SlidersHorizontal size={15} weight="bold" />
                Adjust
              </Link>
            </Button>
          </div>
          <p className="text-text-muted -mt-0.5 text-center text-[11px] tabular-nums">
            Regenerate costs {creditCost}{" "}
            {creditCost === 1 ? "credit" : "credits"}
          </p>
          <Button asChild variant="tertiary" className="w-full">
            <Link href="/explore">
              <SquaresFour size={15} weight="bold" />
              Try another look
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="tertiary"
              className="flex-1"
              onClick={() => setShareOpen(true)}
              aria-haspopup="dialog"
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
      </div>

      {regenError && (
        <p className="bg-error/10 text-error mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs md:mt-0">
          <Warning size={14} weight="fill" className="mt-0.5 shrink-0" />
          {regenError}
        </p>
      )}

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        generationId={generationId}
        initialShareId={initialShareId}
        presetName={productName}
        imageUrl={downloadUrl}
      />
    </>
  );
}
