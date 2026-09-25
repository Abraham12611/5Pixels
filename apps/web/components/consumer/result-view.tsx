"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretLeft, SquaresFour } from "@phosphor-icons/react";
import { ResultCompare, type CompareMode } from "./result-compare";
import { ResultViewSwitch } from "./result-view-switch";
import { ResultActions } from "./result-actions";
import { ResultFeedback } from "./result-feedback";
import { ResultDetails, type ResultDetailsData } from "./result-details";
import { MobilePageBottomSpacer } from "@/components/consumer/mobile/docked-action-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ResultViewProps {
  resultUrl: string;
  originalUrl: string | null;
  resultAlt: string;
  generationId: string;
  productSlug: string;
  productName: string;
  creditCost: number;
  initialShareId: string | null;
  initialSaved: boolean;
  initialRating: number | null;
  initialNotes: string | null;
  details: ResultDetailsData;
  /** Signed URLs for every output — enables "Download all" when >1. */
  downloadUrls?: string[];
  stageClassName?: string;
}

/**
 * Owns the shared view-mode state between the media stage and the action
 * rail. On mobile the stage is immersive — full-bleed, ≥70% of the first
 * viewport, with floating back + view-switch chrome and a docked action bar
 * (10 §3); the credit-spending paths sit below the fold. On lg+ it keeps the
 * stage + side-rail split.
 */
export function ResultView({
  resultUrl,
  originalUrl,
  resultAlt,
  generationId,
  productSlug,
  productName,
  creditCost,
  initialShareId,
  initialSaved,
  initialRating,
  initialNotes,
  details,
  downloadUrls,
  stageClassName,
}: ResultViewProps) {
  const [mode, setMode] = useState<CompareMode>("result");

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:mt-4 lg:flex-row lg:gap-4">
      {/* Stage — full-bleed on mobile, card-framed on lg+. */}
      <div className="relative -mx-4 h-[74dvh] shrink-0 sm:-mx-6 lg:mx-0 lg:h-auto lg:min-h-0 lg:flex-1">
        <ResultCompare
          resultUrl={resultUrl}
          originalUrl={originalUrl}
          resultAlt={resultAlt}
          mode={mode}
          className={cn("h-full w-full lg:rounded-2xl", stageClassName)}
        />
        {/* Floating chrome over the media (10 §3). */}
        <Link
          href="/app/library"
          aria-label="Back to Library"
          className="bg-ink-950/70 text-cream-50 hover:bg-ink-950/90 absolute top-3 left-3 flex h-11 w-11 items-center justify-center rounded-full backdrop-blur transition-colors md:hidden"
        >
          <CaretLeft size={18} weight="bold" />
        </Link>
        {originalUrl && (
          <ResultViewSwitch
            mode={mode}
            onChange={setMode}
            className="absolute inset-x-4 bottom-4 md:hidden"
          />
        )}
      </div>

      <aside className="mt-4 flex w-full shrink-0 flex-col gap-3 lg:mt-0 lg:w-[320px] lg:overflow-y-auto lg:pr-1 xl:w-[350px]">
        <ResultActions
          generationId={generationId}
          productSlug={productSlug}
          productName={productName}
          creditCost={creditCost}
          downloadUrl={resultUrl}
          downloadUrls={downloadUrls}
          downloadMimeType={details.mimeType}
          initialShareId={initialShareId}
          initialSaved={initialSaved}
        />
        {originalUrl && (
          <ResultViewSwitch
            mode={mode}
            onChange={setMode}
            className="order-2 hidden md:flex"
          />
        )}
        {/* Mobile order per 10 §3: Make it again → feedback → details →
            Try another look. Desktop keeps actions → switch → details →
            feedback. */}
        <div className="order-3 md:order-4">
          <ResultFeedback
            generationId={generationId}
            initialRating={initialRating}
            initialNotes={initialNotes}
          />
        </div>
        <div className="order-4 md:order-3">
          <ResultDetails details={details} />
        </div>
        <Button
          asChild
          variant="tertiary"
          className="order-5 min-h-11 w-full md:hidden"
        >
          <Link href="/explore">
            <SquaresFour size={15} weight="bold" />
            Try another look
          </Link>
        </Button>
        <div className="order-6">
          <MobilePageBottomSpacer withDockedBar />
        </div>
      </aside>
    </div>
  );
}
