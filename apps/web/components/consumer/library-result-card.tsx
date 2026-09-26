"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowCounterClockwise,
  ArrowSquareOut,
  BookmarkSimple,
  Download,
  DotsThree,
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
import { Sheet, SheetActionRow } from "@/components/ui/sheet";
import { deleteGeneration, markGenerationDownloaded, setGenerationSaved } from "@/lib/library/actions";
import { createPublicShare } from "@/lib/db/share";
import { useIsNarrow } from "@/lib/ui/use-media-query";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { LibraryItem } from "./library-grid";

interface LibraryResultCardProps {
  item: LibraryItem;
  priority?: boolean;
  onSaved: (id: string, saved: boolean) => void;
  onDownloaded: (id: string) => void;
  onDeleted: (id: string) => void;
}

/**
 * A finished personal result. Uniform 4:5 media with preset name + relative
 * date underneath (`11 §4.2`); `⋯` opens a T1 action sheet on mobile and a
 * menu on fine pointers.
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
  const [actionsOpen, setActionsOpen] = useState(false);
  const isNarrow = useIsNarrow();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const resultHref = `/app/results/${item.id}`;

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
        setActionsOpen(false);
        onDeleted(item.id);
        toast("Result deleted");
      } else {
        toast.error(result.error ?? "Could not delete this result.");
      }
    });
  };

  const menuItems = (
    <>
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
      <DropdownMenuItem onSelect={handleShare} disabled={isPending}>
        <ShareNetwork size={15} />
        Share
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={handleSave} disabled={isPending}>
        <BookmarkSimple size={15} weight={saved ? "fill" : "regular"} />
        {saved ? "Unsave" : "Save"}
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/create/${item.productSlug}`} prefetch={false}>
          <ArrowCounterClockwise size={15} />
          Make again
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
    </>
  );

  return (
    <article className="group shadow-border hover:shadow-border-hover relative overflow-hidden rounded-xl bg-charcoal-850 transition-shadow">
      {/* Media — taps through to the canonical Result page */}
      <Link
        href={resultHref}
        prefetch={false}
        className="media-frame relative block aspect-[4/5] bg-charcoal-800"
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

      {/* ⋯ — T1 action sheet on touch, menu on fine pointers. Always visible on
          coarse pointers, revealed with the card overlay on desktop. */}
      <div className="absolute top-2.5 right-2.5 z-30 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        {isNarrow ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`More actions for ${item.productName} result`}
              aria-haspopup="dialog"
              onClick={() => setActionsOpen(true)}
              className="bg-ink-950/60 text-cream-50 hover:bg-ink-950/80 relative h-8 w-8 rounded-full backdrop-blur-sm after:absolute after:-inset-1.5 after:content-['']"
            >
              <DotsThree size={16} weight="bold" />
            </Button>
            <Sheet
              open={actionsOpen}
              onOpenChange={(open) => {
                setActionsOpen(open);
                if (!open) setConfirmDelete(false);
              }}
              tier="action"
              title={item.productName}
              ariaLabel={`Actions for ${item.productName} result`}
            >
              {confirmDelete ? (
                <div className="space-y-3">
                  <p className="text-text-secondary text-sm">
                    This permanently removes the result and its files. This
                    can&apos;t be undone.
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    onClick={handleDelete}
                    disabled={isPending}
                  >
                    {isPending ? "Deleting…" : "Delete permanently"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Keep it
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {item.outputUrl && (
                    <SheetActionRow
                      label="Download"
                      icon={<Download size={18} />}
                      onClick={() => {
                        onDownloaded(item.id);
                        void markGenerationDownloaded(item.id);
                        setActionsOpen(false);
                        const a = document.createElement("a");
                        a.href = item.outputUrl as string;
                        a.download = "";
                        a.rel = "noreferrer";
                        a.target = "_blank";
                        a.click();
                      }}
                    />
                  )}
                  <SheetActionRow
                    label="Share"
                    icon={<ShareNetwork size={18} />}
                    onClick={() => {
                      setActionsOpen(false);
                      handleShare();
                    }}
                  />
                  <SheetActionRow
                    label={saved ? "Unsave" : "Save"}
                    icon={
                      <BookmarkSimple
                        size={18}
                        weight={saved ? "fill" : "regular"}
                      />
                    }
                    onClick={() => {
                      setActionsOpen(false);
                      handleSave();
                    }}
                  />
                  <SheetActionRow
                    label="Make again"
                    icon={<ArrowCounterClockwise size={18} />}
                    onClick={() => {
                      setActionsOpen(false);
                      router.push(`/app/create/${item.productSlug}`);
                    }}
                  />
                  <SheetActionRow
                    label="Delete"
                    icon={<Trash size={18} />}
                    destructive
                    onClick={() => setConfirmDelete(true)}
                  />
                </div>
              )}
            </Sheet>
          </>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`More actions for ${item.productName} result`}
                className="bg-ink-950/60 text-cream-50 hover:bg-ink-950/80 relative h-8 w-8 rounded-full backdrop-blur-sm after:absolute after:-inset-1.5 after:content-['']"
              >
                <DotsThree size={16} weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link href={resultHref} prefetch={false}>
                  <ArrowSquareOut size={15} />
                  Open
                </Link>
              </DropdownMenuItem>
              {menuItems}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Metadata — persistent, under the media (11 §4.2) */}
      <div className="flex items-center justify-between gap-2 p-2.5">
        <div className="min-w-0">
          <p className="text-cream-50 truncate text-sm font-medium">
            {item.productName}
          </p>
          <p className="text-text-muted text-xs">
            {formatRelativeTime(item.createdAt)}
          </p>
        </div>
        {/* Desktop quick actions on hover — mobile uses the ⋯ sheet */}
        <div className="pointer-events-none hidden shrink-0 items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 md:pointer-events-auto md:flex">
          {item.outputUrl && (
            <Button
              asChild
              size="icon"
              variant="ghost"
              aria-label="Download result"
              className="text-text-secondary hover:text-cream-50 h-8 w-8"
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
                <Download size={15} weight="bold" />
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
            aria-label={saved ? "Unsave result" : "Save result"}
            className={cn(
              "h-8 w-8",
              saved
                ? "text-lime-300 hover:text-lime-200"
                : "text-text-secondary hover:text-cream-50"
            )}
          >
            <BookmarkSimple size={15} weight={saved ? "fill" : "bold"} />
          </Button>
        </div>
      </div>

      {/* Delete confirmation — desktop dialog; the mobile sheet confirms inline */}
      {!isNarrow && (
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
      )}
    </article>
  );
}
