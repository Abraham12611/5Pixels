"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowCounterClockwise,
  ArrowSquareOut,
  BookmarkSimple,
  Download,
  DotsThreeVertical,
  ShareNetwork,
  Trash,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteGeneration, markGenerationDownloaded, setGenerationSaved } from "@/lib/library/actions";
import { createPublicShare } from "@/lib/db/share";
import { cn } from "@/lib/utils";
import type { LibraryItem } from "./library-grid";

function formatDate(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  return new Date(time).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface LibraryResultCardProps {
  item: LibraryItem;
  priority?: boolean;
  onSaved: (id: string, saved: boolean) => void;
  onDownloaded: (id: string) => void;
  onDeleted: (id: string) => void;
}

/**
 * A finished personal result. Distinct from preset cards: the media is the
 * user's own, metadata stays quiet at rest, and hover reveals the action
 * row (Open / Download / Save) plus a persistent overflow menu.
 */
export function LibraryResultCard({
  item,
  priority = false,
  onSaved,
  onDownloaded,
  onDeleted,
}: LibraryResultCardProps) {
  const [saved, setSaved] = useState(Boolean(item.savedAt));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const resultHref = `/app/results/${item.id}`;
  const aspect =
    item.outputWidth && item.outputHeight
      ? `${item.outputWidth} / ${item.outputHeight}`
      : "4 / 5";

  const handleSave = () => {
    const next = !saved;
    setSaved(next);
    onSaved(item.id, next);
    startTransition(async () => {
      const result = await setGenerationSaved(item.id, next);
      if (!result.success) {
        setSaved(!next);
        onSaved(item.id, !next);
        toast.error(result.error ?? "Could not update this result.");
      } else if (next) {
        toast("Saved to Library");
      }
    });
  };

  const handleShare = () => {
    startTransition(async () => {
      const share = await createPublicShare(item.id);
      if (!share) {
        toast.error("Could not create a share link.");
        return;
      }
      try {
        await navigator.clipboard.writeText(share.shareUrl);
        toast("Link copied to clipboard");
      } catch {
        toast(share.shareUrl);
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteGeneration(item.id);
      if (result.success) {
        setConfirmDelete(false);
        onDeleted(item.id);
        toast("Result deleted");
      } else {
        toast.error(result.error ?? "Could not delete this result.");
      }
    });
  };

  return (
    <article className="group shadow-border hover:shadow-border-hover relative mb-5 break-inside-avoid overflow-hidden rounded-xl bg-charcoal-850 transition-shadow">
      {/* Media — taps through to the canonical Result page */}
      <Link
        href={resultHref}
        prefetch={false}
        className="media-frame relative block bg-charcoal-800"
        style={{ aspectRatio: aspect }}
        aria-label={`Open result made with ${item.productName}`}
      >
        {item.outputUrl ? (
          <Image
            src={item.outputUrl}
            alt={`Result made with ${item.productName}`}
            fill
            unoptimized
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <span className="text-text-muted absolute inset-0 grid place-items-center text-xs">
            No preview
          </span>
        )}
      </Link>

      {/* Saved marker — the only permanent overlay */}
      {saved && (
        <span className="bg-ink-950/70 text-lime-300 pointer-events-none absolute top-2.5 left-2.5 z-20 grid h-7 w-7 place-items-center rounded-full backdrop-blur-sm">
          <BookmarkSimple size={14} weight="fill" />
        </span>
      )}

      {/* Overflow menu — visible on coarse pointers, revealed with the card
          overlay on fine pointers so touch users always reach it. */}
      <div className="absolute top-2.5 right-2.5 z-30 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`More actions for ${item.productName} result`}
              className="bg-ink-950/60 text-cream-50 hover:bg-ink-950/80 relative h-8 w-8 rounded-full backdrop-blur-sm after:absolute after:-inset-1.5 after:content-['']"
            >
              <DotsThreeVertical size={15} weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem asChild>
              <Link href={resultHref} prefetch={false}>
                <ArrowSquareOut size={15} />
                Open
              </Link>
            </DropdownMenuItem>
            {item.outputUrl && (
              <DropdownMenuItem asChild>
                <a
                  href={item.outputUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    onDownloaded(item.id);
                    void markGenerationDownloaded(item.id);
                  }}
                >
                  <Download size={15} />
                  Download
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={handleSave} disabled={isPending}>
              <BookmarkSimple size={15} weight={saved ? "fill" : "regular"} />
              {saved ? "Remove from saved" : "Save to Library"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleShare} disabled={isPending}>
              <ShareNetwork size={15} />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/app/create/${item.productSlug}`} prefetch={false}>
                <ArrowCounterClockwise size={15} />
                Try this look again
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setConfirmDelete(true)}
              className="text-error focus:text-error"
            >
              <Trash size={15} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hover action row + quiet metadata */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
        <p className="text-cream-50 truncate text-[13px] font-medium">
          {item.productName}
        </p>
        <p className="text-cream-100/60 text-[11px]">{formatDate(item.createdAt)}</p>
        <div className="pointer-events-auto mt-2.5 flex items-center gap-1.5">
          <Button
            asChild
            size="sm"
            className="bg-cream-50 text-ink-950 hover:bg-cream-100 h-8 rounded-md px-3 text-xs font-semibold"
          >
            <Link href={resultHref} prefetch={false}>
              <ArrowSquareOut size={13} weight="bold" />
              Open
            </Link>
          </Button>
          {item.outputUrl && (
            <Button
              asChild
              size="icon"
              variant="ghost"
              aria-label="Download result"
              className="bg-ink-950/60 text-cream-50 hover:bg-ink-950/80 h-8 w-8 rounded-md backdrop-blur-sm"
            >
              <a
                href={item.outputUrl}
                download
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  onDownloaded(item.id);
                  void markGenerationDownloaded(item.id);
                }}
              >
                <Download size={14} weight="bold" />
              </a>
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleSave}
            disabled={isPending}
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save to Library"}
            className={cn(
              "h-8 w-8 rounded-md backdrop-blur-sm",
              saved
                ? "bg-lime-400/20 text-lime-300 hover:bg-lime-400/30"
                : "bg-ink-950/60 text-cream-50 hover:bg-ink-950/80"
            )}
          >
            <BookmarkSimple size={14} weight={saved ? "fill" : "bold"} />
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="bg-charcoal-850 border-cream-100/10 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-cream-50">
              Delete this result?
            </DialogTitle>
            <DialogDescription className="text-text-secondary">
              This permanently removes the result and its files. This
              can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
