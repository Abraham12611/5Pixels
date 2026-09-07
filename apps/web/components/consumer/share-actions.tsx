"use client";

import { useState } from "react";
import { createPublicShare, disablePublicShare } from "@/lib/db/share";
import { Button } from "@/components/ui/button";

interface ShareActionsProps {
  generationId: string;
  initialShareId?: string | null;
}

export function ShareActions({
  generationId,
  initialShareId,
}: ShareActionsProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(
    initialShareId
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/s/${initialShareId}`
      : null
  );
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    const result = await createPublicShare(generationId);
    if (result) {
      setShareUrl(result.shareUrl);
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    setLoading(true);
    const ok = await disablePublicShare(generationId);
    if (ok) {
      setShareUrl(null);
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-3">
      {shareUrl ? (
        <>
          <div className="bg-charcoal-800 border-cream-100/10 flex items-center gap-2 rounded-xl border px-3 py-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="bg-transparent text-cream-100 w-full text-sm outline-none"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopy}
            >
              Copy
            </Button>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDisable}
              disabled={loading}
            >
              Disable link
            </Button>
          </div>
        </>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? "Creating…" : "Share result"}
        </Button>
      )}
    </div>
  );
}
