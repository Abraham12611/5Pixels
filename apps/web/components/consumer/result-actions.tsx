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
import { Sheet } from "@/components/ui/sheet";
import { DockedActionBar } from "@/components/consumer/mobile/docked-action-bar";
import { ShareDialog } from "@/components/consumer/share-dialog";
import { regenerateGeneration } from "@/lib/generation/actions";
import { getResultDownloadUrls } from "@/lib/generation/poll";
import {
  checkDownloadUrl,
  isIosSafari,
  resultFilename,
  triggerDownload,
} from "@/lib/generation/download";
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
  /** Signed URLs for every output — enables "Download all" when >1. */
  downloadUrls?: string[];
  /** MIME type of the output, for the saved filename's extension. */
  downloadMimeType?: string | null;
  initialShareId: string | null;
  initialSaved: boolean;
}

const IOS_HINT_KEY = "sp_ios_download_hint_seen";

function iosHintSeen(): boolean {
  try {
    return window.localStorage.getItem(IOS_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function markIosHintSeen() {
  try {
    window.localStorage.setItem(IOS_HINT_KEY, "1");
  } catch {
    // Private mode — the hint simply shows again.
  }
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
  downloadUrls,
  downloadMimeType,
  initialShareId,
  initialSaved,
}: ResultActionsProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [iosHintOpen, setIosHintOpen] = useState(false);
  const [saved, setSaved] = useState(initialSaved);
  const [regenError, setRegenError] = useState("");
  const [savingCount, setSavingCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const urls =
    downloadUrls && downloadUrls.length > 0
      ? downloadUrls
      : downloadUrl
        ? [downloadUrl]
        : [];
  const multiOutput = urls.length > 1;

  /**
   * One download, honestly reported (10 §5): probe the signed URL, re-mint
   * and retry once when it has expired, then mark the generation downloaded
   * and confirm with the filename.
   */
  const downloadOne = async (
    url: string,
    filename: string,
    { mark = true, quiet = false }: { mark?: boolean; quiet?: boolean } = {}
  ): Promise<boolean> => {
    let href = url;
    if ((await checkDownloadUrl(href)) === "expired") {
      const index = Math.max(0, urls.indexOf(url));
      const fresh = await getResultDownloadUrls(generationId);
      const replacement = fresh[index] ?? fresh[0];
      if (
        replacement &&
        (await checkDownloadUrl(replacement)) !== "expired"
      ) {
        href = replacement;
      } else {
        if (!quiet) {
          toast.error("Couldn't download this image. Try again in a moment.");
        }
        return false;
      }
    }
    triggerDownload(href, filename);
    if (mark) void markGenerationDownloaded(generationId);
    if (!quiet) toast(`Downloading ${filename}`);
    return true;
  };

  const handleDownload = () => {
    const url = urls[0];
    if (!url) return;
    // iOS Safari opens the file in a new tab instead of downloading —
    // explain once, then hand off (10 §5).
    if (isIosSafari() && !iosHintSeen()) {
      setIosHintOpen(true);
      return;
    }
    void downloadOne(url, resultFilename(productSlug, generationId, downloadMimeType));
  };

  const openOnIos = () => {
    markIosHintSeen();
    setIosHintOpen(false);
    const url = urls[0];
    if (!url) return;
    window.open(url, "_blank", "noreferrer");
    void markGenerationDownloaded(generationId);
  };

  const handleDownloadAll = async () => {
    if (savingCount > 0 || !multiOutput) return;
    let savedCount = 0;
    for (let i = 0; i < urls.length; i++) {
      setSavingCount(i + 1);
      const ok = await downloadOne(
        urls[i]!,
        resultFilename(productSlug, generationId, downloadMimeType, i),
        { mark: false, quiet: true }
      );
      if (ok) savedCount += 1;
      // Space the taps so the browser doesn't drop later downloads.
      if (i < urls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
    setSavingCount(0);
    void markGenerationDownloaded(generationId);
    if (savedCount === urls.length) {
      toast(`Saved all ${urls.length} images`);
    } else {
      toast.error(`Saved ${savedCount} of ${urls.length} images`);
    }
  };

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
        {urls.length > 0 && (
          <Button
            type="button"
            variant="brand"
            className="min-h-11 w-full"
            onClick={handleDownload}
          >
            <Download size={15} weight="bold" />
            Download
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
        {multiOutput && (
          <Button
            type="button"
            variant="ghost"
            className="mt-1 min-h-11 w-full"
            onClick={() => void handleDownloadAll()}
            disabled={savingCount > 0}
          >
            {savingCount > 0
              ? `Saving ${savingCount} of ${urls.length}…`
              : `Download all ${urls.length} images`}
          </Button>
        )}
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
          {urls.length > 0 && (
            <Button
              type="button"
              variant="brand"
              className="w-full"
              onClick={handleDownload}
            >
              <Download size={15} weight="bold" />
              Download
            </Button>
          )}
          {multiOutput && (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => void handleDownloadAll()}
              disabled={savingCount > 0}
            >
              {savingCount > 0
                ? `Saving ${savingCount} of ${urls.length}…`
                : `Download all ${urls.length} images`}
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

      {/* iOS download hint — one-time, since the file opens in a tab (10 §5). */}
      <Sheet
        open={iosHintOpen}
        onOpenChange={setIosHintOpen}
        tier="action"
        title="Saving on iOS"
        description="The image opens in a new tab — tap the Share icon, then Save Image to keep it in Photos."
      >
        <Button
          type="button"
          variant="brand"
          className="mt-4 min-h-11 w-full"
          onClick={openOnIos}
        >
          Open image
        </Button>
      </Sheet>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        generationId={generationId}
        initialShareId={initialShareId}
        presetName={productName}
        imageUrl={urls[0] ?? null}
        onDownloadInstead={() => {
          setShareOpen(false);
          handleDownload();
        }}
      />
    </>
  );
}
