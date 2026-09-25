"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, ShareNetwork } from "@phosphor-icons/react";
import { createPublicShare, disablePublicShare } from "@/lib/db/share";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useIsNarrow } from "@/lib/ui/use-media-query";

const SHARE_PRIVACY_TEXT =
  "Anyone with the link can view this result. Your account and other creations stay private.";

/**
 * Share surface (10 §6): a T2 sheet on mobile, the centred dialog on
 * desktop. The public link is created and revoked by one explicit toggle
 * with the consequence stated plainly; native share prefers the image file
 * itself when the device supports it, falling back to the URL.
 */
export function ShareDialog({
  open,
  onOpenChange,
  generationId,
  initialShareId,
  presetName,
  imageUrl,
  onDownloadInstead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generationId: string;
  initialShareId: string | null;
  presetName: string;
  imageUrl: string | null;
  /** Mobile-only escape in the sheet — closes and runs the download flow. */
  onDownloadInstead?: () => void;
}) {
  const isNarrow = useIsNarrow();
  const [shareUrl, setShareUrl] = useState<string | null>(
    initialShareId
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/s/${initialShareId}`
      : null
  );
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const setPublicLink = async (enabled: boolean) => {
    setLoading(true);
    if (enabled) {
      const result = await createPublicShare(generationId);
      setLoading(false);
      if (result) {
        setShareUrl(result.shareUrl);
        toast("Share link created");
      } else {
        toast.error("Couldn't create a share link. Try again.");
      }
    } else {
      const ok = await disablePublicShare(generationId);
      setLoading(false);
      if (ok) {
        setShareUrl(null);
        toast("Share link disabled");
      } else {
        toast.error("Couldn't disable the link. Try again.");
      }
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  const handleNativeShare = async () => {
    // Prefer the image file itself when the device can share files (10 §6).
    if (imageUrl) {
      try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const file = new File([blob], `${presetName} result.jpg`, {
          type: blob.type || "image/jpeg",
        });
        if (
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            files: [file],
            title: `${presetName} — 5Pixels`,
            text: "Made with 5Pixels",
          });
          return;
        }
      } catch {
        // fall through to URL sharing
      }
    }
    if (!shareUrl) return;
    try {
      await navigator.share({
        title: `${presetName} — 5Pixels`,
        text: "Made with 5Pixels",
        url: shareUrl,
      });
    } catch {
      // user dismissed the sheet — not an error
    }
  };

  const body = (
    <>
      {/* Preview */}
      <div className="border-cream-100/10 bg-charcoal-800 mt-4 flex items-center gap-3 rounded-lg border p-3">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${presetName} result preview`}
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-md object-cover"
            unoptimized
          />
        ) : (
          <div className="bg-charcoal-700 h-14 w-14 shrink-0 rounded-md" />
        )}
        <div className="min-w-0">
          <p className="text-cream-50 truncate text-sm font-semibold">
            {presetName}
          </p>
          <p className="text-text-muted text-xs">Made with 5Pixels</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {canNativeShare && (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full"
            onClick={handleNativeShare}
            disabled={!shareUrl && !imageUrl}
          >
            <ShareNetwork size={15} weight="bold" />
            Share…
          </Button>
        )}
        {shareUrl && (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full"
            onClick={handleCopy}
          >
            {copied ? (
              <Check size={15} weight="bold" />
            ) : (
              <Copy size={15} weight="bold" />
            )}
            {copied ? "Copied" : "Copy link"}
          </Button>
        )}
      </div>

      {/* Public link — explicit, reversible, consequence stated (10 §6). */}
      <div className="border-cream-100/10 bg-charcoal-800 mt-4 flex items-center justify-between gap-3 rounded-lg border p-3">
        <div className="min-w-0">
          <p className="text-cream-50 text-sm font-medium">Public link</p>
          <p className="text-text-muted mt-0.5 text-xs">
            Anyone with this link can view this image.
            {shareUrl ? " Turning it off breaks existing links." : ""}
          </p>
        </div>
        <Switch
          checked={Boolean(shareUrl)}
          onCheckedChange={(v) => void setPublicLink(v)}
          disabled={loading}
          aria-label="Public link"
        />
      </div>

      {shareUrl && (
        <input
          type="text"
          readOnly
          value={shareUrl}
          aria-label="Share link"
          onFocus={(e) => e.target.select()}
          className="bg-charcoal-800 border-cream-100/10 text-cream-100 mt-3 w-full rounded-lg border px-3 py-2 text-sm outline-none"
        />
      )}

      {onDownloadInstead && (
        <button
          type="button"
          onClick={onDownloadInstead}
          className="text-text-muted hover:text-cream-100 mx-auto mt-4 block text-xs underline underline-offset-2 transition-colors"
        >
          Download instead
        </button>
      )}
    </>
  );

  if (isNarrow) {
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        tier="content"
        title="Share your result"
        description={SHARE_PRIVACY_TEXT}
      >
        {body}
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-sm">
      <DialogContent>
        <DialogTitle>Share your result</DialogTitle>
        <DialogDescription>{SHARE_PRIVACY_TEXT}</DialogDescription>
        {body}
      </DialogContent>
    </Dialog>
  );
}
