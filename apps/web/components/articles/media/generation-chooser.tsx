"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Link as LinkIcon, ShieldCheck, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  listOwnGenerationsForArticle,
  publishGenerationToArticle,
  resolveSharedGeneration,
  type PickerGeneration,
  type SharedGenerationInfo,
} from "@/lib/articles/media-actions";

/**
 * /generation chooser (#129).
 *
 * Two intentionally separate paths:
 *   - "My generations": the author's OWN completed outputs. Picking one does
 *     not publish it — a second explicit click ("Publish this output in the
 *     article") derives a publishable copy into article storage.
 *   - "Shared link": a third party's publicly shared result. Nothing is
 *     copied; the block stores the generation id and the renderer links to
 *     the live /s/{shareId} page, so unsharing removes it automatically.
 */
export interface GenerationPick {
  /** Set when the author's own generation was published as a derivative. */
  assetId?: string;
  /** Always set — generation provenance. */
  generationId: string;
  /** Set only for third-party shared results (linked, not copied). */
  shareId?: string;
}

interface GenerationChooserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleId: string | null;
  onPick: (pick: GenerationPick) => void;
}

export function GenerationChooser({
  open,
  onOpenChange,
  articleId,
  onPick,
}: GenerationChooserProps) {
  const [generations, setGenerations] = useState<PickerGeneration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [publishingId, setPublishingId] = useState<string>();
  const [shareInput, setShareInput] = useState("");
  const [shared, setShared] = useState<SharedGenerationInfo | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!open || !articleId) return;
    void (async () => {
      setLoading(true);
      setError(undefined);
      const result = await listOwnGenerationsForArticle(articleId);
      if (result.ok) setGenerations(result.data ?? []);
      else setError(result.error);
      setLoading(false);
    })();
  }, [open, articleId]);

  const publish = useCallback(
    async (gen: PickerGeneration) => {
      if (!articleId) return;
      setPublishingId(gen.generationId);
      setError(undefined);
      const result = await publishGenerationToArticle({
        articleId,
        generationId: gen.generationId,
        confirmPublish: true,
      });
      setPublishingId(undefined);
      if (!result.ok || !result.data) {
        setError(result.error ?? "Publishing failed");
        return;
      }
      onPick({
        assetId: result.data.assetId,
        generationId: gen.generationId,
      });
      onOpenChange(false);
    },
    [articleId, onPick, onOpenChange]
  );

  const resolveShare = useCallback(async () => {
    if (!shareInput.trim()) return;
    setResolving(true);
    setError(undefined);
    setShared(null);
    const result = await resolveSharedGeneration(shareInput);
    setResolving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!result.data) {
      setError(
        "That result isn't publicly shared (or the share was removed). Only results shared by their creator can be embedded."
      );
      return;
    }
    setShared(result.data);
  }, [shareInput]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Embed a generation</DialogTitle>
        <DialogDescription>
          Your own results publish a copy into the article; other people&rsquo;s
          results embed only when publicly shared by their creator.
        </DialogDescription>
      </DialogHeader>
      <DialogContent className="max-w-2xl">
        <Tabs defaultValue="mine">
          <TabsList>
            <TabsTrigger value="mine">My generations</TabsTrigger>
            <TabsTrigger value="shared">Shared link</TabsTrigger>
          </TabsList>

          <TabsContent value="mine">
            {loading ? (
              <p className="text-text-muted py-6 text-sm">Loading…</p>
            ) : generations.length === 0 ? (
              <p className="text-text-muted py-6 text-sm">
                No completed generations yet.
              </p>
            ) : (
              <ul className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto py-3 sm:grid-cols-3">
                {generations.map((gen) => (
                  <li
                    key={gen.generationId}
                    className={cn(
                      "border-cream-100/10 bg-charcoal-800 space-y-2 rounded-xl border p-2",
                      gen.attached && "opacity-60"
                    )}
                  >
                    {gen.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={gen.previewUrl}
                        alt={gen.productName}
                        loading="lazy"
                        className="bg-charcoal-850 h-24 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="bg-charcoal-850 h-24 w-full rounded-lg" />
                    )}
                    <p className="text-cream-100 truncate text-xs">
                      {gen.productName}
                    </p>
                    {gen.attached ? (
                      <p className="text-text-muted flex items-center gap-1 text-[11px]">
                        <Check size={12} className="text-lime-400" />
                        Already in article
                      </p>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-7 w-full text-[11px]"
                        disabled={publishingId === gen.generationId}
                        onClick={() => void publish(gen)}
                      >
                        {publishingId === gen.generationId
                          ? "Publishing…"
                          : "Publish this output in the article"}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-text-muted flex items-center gap-1.5 text-[11px]">
              <ShieldCheck size={13} className="text-lime-400" />
              Publishing creates a derived copy — your private original and its
              source photo are never made public.
            </p>
          </TabsContent>

          <TabsContent value="shared">
            <div className="space-y-3 py-3">
              <div className="flex gap-2">
                <Input
                  aria-label="Share link"
                  placeholder="Paste a /s/… share link or id"
                  value={shareInput}
                  onChange={(e) => setShareInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void resolveShare();
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={resolving || !shareInput.trim()}
                  onClick={() => void resolveShare()}
                >
                  {resolving ? "Checking…" : "Check"}
                </Button>
              </div>

              {shared && (
                <div className="border-cream-100/10 bg-charcoal-800 flex items-center gap-3 rounded-xl border p-3">
                  {shared.previewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shared.previewUrl}
                      alt={shared.productName}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-cream-100 truncate text-sm">
                      {shared.productName}
                    </p>
                    <p className="text-text-muted flex items-center gap-1 text-[11px]">
                      <LinkIcon size={11} />
                      Links to the live share page — disappears if the creator
                      unshares it.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 text-xs"
                    onClick={() => {
                      onPick({
                        generationId: shared.generationId,
                        shareId: shared.shareId,
                      });
                      onOpenChange(false);
                    }}
                  >
                    Embed link
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <p role="alert" className="text-error mt-3 flex items-center gap-1.5 text-sm">
            <Warning size={14} />
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
