"use client";

import { useState } from "react";
import { ResultCompare, type CompareMode } from "./result-compare";
import { ResultViewSwitch } from "./result-view-switch";
import { ResultActions } from "./result-actions";
import { ResultFeedback } from "./result-feedback";
import { ResultDetails, type ResultDetailsData } from "./result-details";
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
  stageClassName?: string;
}

/**
 * Owns the shared view-mode state between the media stage and the action
 * rail. The stage fills the viewport; the rail carries actions, the
 * Result/Original/Compare pill (below the action tabs), then feedback.
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
  stageClassName,
}: ResultViewProps) {
  const [mode, setMode] = useState<CompareMode>("result");

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <ResultCompare
        resultUrl={resultUrl}
        originalUrl={originalUrl}
        resultAlt={resultAlt}
        mode={mode}
        className={cn("min-h-[52dvh] flex-1 rounded-2xl lg:min-h-0", stageClassName)}
      />

      <aside className="w-full shrink-0 space-y-3 lg:w-[320px] lg:overflow-y-auto lg:pr-1 xl:w-[350px]">
        <ResultActions
          generationId={generationId}
          productSlug={productSlug}
          productName={productName}
          creditCost={creditCost}
          downloadUrl={resultUrl}
          initialShareId={initialShareId}
          initialSaved={initialSaved}
        />
        {originalUrl && (
          <ResultViewSwitch mode={mode} onChange={setMode} />
        )}
        <ResultDetails details={details} />
        <ResultFeedback
          generationId={generationId}
          initialRating={initialRating}
          initialNotes={initialNotes}
        />
      </aside>
    </div>
  );
}
