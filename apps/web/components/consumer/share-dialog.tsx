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
import { Button } from "@/components/ui/button";

/**
 * P53 — compact share utility. Public link creation is explicit, privacy is
 * stated plainly, and native share is used where the device supports it.
 */
export function ShareDialog({
  open,
  onOpenChange,
  generationId,
  initialShareId,
  presetName,
  imageUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generationId: string;
  initialShareId: string | null;
  presetName: string;
  imageUrl: string | null;
}) {
  const [shareUrl, setShareUrl] = useState<string | null>(
    initialShareId
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/s/${initialShareId}`
      : null
  );
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleCreate = async () => {
    setLoading(true);
    const result = await createPublicShare(generationId);
    setLoading(false);
    if (result) {
      setShareUrl(result.shareUrl);
      toast("Share link created");
    } else {
      toast.error("Couldn't create a share link. Try again.");
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    const ok = await disablePublicShare(generationId);
    setLoading(false);
    if (ok) {
      setShareUrl(null);
      toast("Share link disabled");
    } else {
      toast.error("Couldn't disable the link. Try again.");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-sm">
      <DialogContent>
        <DialogTitle>Share this result</DialogTitle>
        <DialogDescription>
          Anyone with the link can view this result. Your account and other
          creations stay private.
        </DialogDescription>

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

        {shareUrl ? (
          <div className="mt-4 space-y-3">
            <div className="bg-charcoal-800 border-cream-100/10 flex items-center gap-2 rounded-lg border px-3 py-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                aria-label="Share link"
                onFocus={(e) => e.target.select()}
                className="bg-transparent text-cream-100 w-full text-sm outline-none"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                aria-label={copied ? "Copied" : "Copy link"}
              >
                {copied ? (
                  <Check size={14} weight="bold" />
                ) : (
                  <Copy size={14} weight="bold" />
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              {canNativeShare && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleNativeShare}
                  className="flex-1"
                >
                  <ShareNetwork size={14} weight="bold" />
                  Share…
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDisable}
                disabled={loading}
                className="text-text-muted hover:text-error"
              >
                {loading ? "Working…" : "Disable link"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <Button
              type="button"
              variant="brand"
              className="w-full"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? "Creating…" : "Create public link"}
            </Button>
            <p className="text-text-muted text-center text-xs">
              You can disable the link anytime.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
