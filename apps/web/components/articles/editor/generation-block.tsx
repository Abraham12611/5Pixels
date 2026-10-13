"use client";

import { useCallback, useEffect, useState } from "react";
import { Image as ImageIcon, Link as LinkIcon, PencilSimple } from "@phosphor-icons/react";
import type { BlockNoteEditor } from "@blocknote/core";
import { Button } from "@/components/ui/button";
import {
  resolveSharedGeneration,
  type SharedGenerationInfo,
} from "@/lib/articles/media-actions";
import { articleMediaProxyUrl } from "@/lib/articles/media";
import { GenerationChooser } from "../media/generation-chooser";
import { useArticleMediaContext } from "./article-media-context";

interface GenerationBlockProps {
  block: {
    id: string;
    props: {
      generationId: string;
      assetId: string;
      caption: string;
    };
  };
  editor: BlockNoteEditor;
}

/**
 * Generation block renderer for the article editor (#129).
 *
 * props.assetId     — a derived article asset (author's own published output);
 *                     previewed through the staff proxy.
 * props.generationId alone — a third-party shared result; shown as a linked
 *                     card resolved through the live share (unshare removes it).
 * Neither prop      — picker prompt.
 */
export function GenerationBlock({ block, editor }: GenerationBlockProps) {
  const { articleId } = useArticleMediaContext();
  const { generationId, assetId, caption } = block.props;
  const [chooserOpen, setChooserOpen] = useState(false);
  const [shared, setShared] = useState<SharedGenerationInfo | null>(null);
  const [sharedGone, setSharedGone] = useState(false);

  useEffect(() => {
    if (assetId || !generationId) return;
    let alive = true;
    void (async () => {
      const result = await resolveSharedGeneration(generationId);
      if (!alive) return;
      if (result.ok && result.data) setShared(result.data);
      else setSharedGone(true);
    })();
    return () => {
      alive = false;
    };
  }, [assetId, generationId]);

  const updateProps = useCallback(
    (props: Partial<GenerationBlockProps["block"]["props"]>) => {
      editor.updateBlock(block, { props: { ...block.props, ...props } });
    },
    [editor, block]
  );

  if (!generationId && !assetId) {
    return (
      <div className="border-cream-100/15 bg-charcoal-850 pointer-events-auto my-1 w-full rounded-[15px] border border-dashed px-4 py-6 select-none">
        <div className="flex flex-col items-center gap-2">
          <ImageIcon size={22} className="text-text-muted" weight="duotone" />
          <Button
            type="button"
            variant="secondary"
            disabled={!articleId}
            onClick={() => setChooserOpen(true)}
          >
            {articleId ? "Choose a generation" : "Save the article first"}
          </Button>
        </div>
        <GenerationChooser
          open={chooserOpen}
          onOpenChange={setChooserOpen}
          articleId={articleId}
          onPick={(pick) => {
            updateProps({
              generationId: pick.generationId,
              assetId: pick.assetId ?? "",
            });
          }}
        />
      </div>
    );
  }

  if (assetId) {
    return (
      <figure className="pointer-events-auto my-1 w-full select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={articleMediaProxyUrl(assetId, { width: 1200 })}
          alt={caption || "Published generation"}
          className="bg-charcoal-800 w-full rounded-[15px] object-cover"
        />
        <figcaption className="text-text-muted mt-1.5 flex items-center justify-between text-xs">
          <span>{caption || "Published generation"}</span>
          <button
            type="button"
            aria-label="Replace generation"
            onClick={() => setChooserOpen(true)}
            className="text-text-muted hover:text-cream-100 inline-flex items-center gap-1"
          >
            <PencilSimple size={12} /> Replace
          </button>
        </figcaption>
        <GenerationChooser
          open={chooserOpen}
          onOpenChange={setChooserOpen}
          articleId={articleId}
          onPick={(pick) => {
            updateProps({
              generationId: pick.generationId,
              assetId: pick.assetId ?? "",
            });
          }}
        />
      </figure>
    );
  }

  // Third-party shared result — linked card, no copied media.
  return (
    <div className="border-cream-100/15 bg-charcoal-850 pointer-events-auto my-1 flex w-full items-center gap-3 rounded-[15px] border px-4 py-3 select-none">
      {shared?.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shared.previewUrl}
          alt={shared.productName}
          className="h-14 w-14 rounded-lg object-cover"
        />
      ) : (
        <span className="bg-charcoal-800 text-lime-400 rounded-[10px] p-2">
          <ImageIcon size={18} weight="duotone" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-cream-50 truncate text-sm font-medium">
          {shared?.productName ?? (sharedGone ? "Shared result" : "Shared result")}
        </p>
        <p className="text-text-muted mt-0.5 flex items-center gap-1 text-xs">
          <LinkIcon size={11} />
          {sharedGone
            ? "The creator unshared this result — it will not render publicly."
            : "Linked share — renders only while the creator keeps it public."}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="h-8 text-xs"
        onClick={() => setChooserOpen(true)}
      >
        Replace
      </Button>
      <GenerationChooser
        open={chooserOpen}
        onOpenChange={setChooserOpen}
        articleId={articleId}
        onPick={(pick) => {
          updateProps({
            generationId: pick.generationId,
            assetId: pick.assetId ?? "",
          });
        }}
      />
    </div>
  );
}
