"use client";

import { useState, useTransition } from "react";
import { Heart, SmileySad, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { submitGenerationFeedback } from "@/lib/db/feedback";
import { cn } from "@/lib/utils";

const NEGATIVE_REASONS = [
  "Doesn't look like me",
  "Wrong style",
  "Strange details",
  "Bad text",
  "Composition issue",
  "Other",
] as const;

interface ResultFeedbackProps {
  generationId: string;
  initialRating?: number | null;
  initialNotes?: string | null;
}

/**
 * Two-tap feedback. "Love it" submits immediately; "Not quite" reveals
 * structured reasons + an optional note. Maps onto the existing rating/notes
 * schema — no schema change needed.
 */
export function ResultFeedback({
  generationId,
  initialRating,
  initialNotes,
}: ResultFeedbackProps) {
  const [sentiment, setSentiment] = useState<"love" | "notQuite" | null>(
    initialRating == null ? null : initialRating >= 4 ? "love" : "notQuite"
  );
  const [reasons, setReasons] = useState<string[]>([]);
  const [note, setNote] = useState(initialNotes ?? "");
  const [submitted, setSubmitted] = useState(initialRating != null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (rating: number, notes?: string) => {
    setError("");
    startTransition(async () => {
      const result = await submitGenerationFeedback(
        generationId,
        rating,
        notes
      );
      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error ?? "Unable to save feedback.");
      }
    });
  };

  const toggleReason = (reason: string) => {
    setReasons((current) =>
      current.includes(reason)
        ? current.filter((r) => r !== reason)
        : [...current, reason]
    );
  };

  const handleLove = () => {
    setSentiment("love");
    submit(5);
  };

  const handleNegativeSubmit = () => {
    const summary = [
      ...reasons,
      note.trim() ? `— ${note.trim()}` : "",
    ]
      .filter(Boolean)
      .join("; ");
    submit(2, summary || undefined);
  };

  return (
    <div className="shadow-border rounded-xl bg-charcoal-850 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-cream-100 text-sm font-medium">
          {submitted ? "Thanks — noted." : "How did this turn out?"}
        </p>
        {!submitted && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant={sentiment === "love" ? "secondary" : "tertiary"}
              size="sm"
              onClick={handleLove}
              disabled={isPending}
              className={cn(
                sentiment === "love" && "text-lime-400"
              )}
            >
              <Heart size={14} weight="fill" />
              Love it
            </Button>
            <Button
              type="button"
              variant={sentiment === "notQuite" ? "secondary" : "tertiary"}
              size="sm"
              onClick={() => setSentiment("notQuite")}
              disabled={isPending}
            >
              <SmileySad size={14} weight="bold" />
              Not quite
            </Button>
          </div>
        )}
        {submitted && sentiment === "notQuite" && (
          <p className="text-text-muted text-xs">
            Try <span className="text-cream-100">Adjust</span> to tweak the
            settings, or <span className="text-cream-100">Regenerate</span> for
            a fresh take.
          </p>
        )}
      </div>

      {sentiment === "notQuite" && !submitted && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {NEGATIVE_REASONS.map((reason) => {
              const selected = reasons.includes(reason);
              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => toggleReason(reason)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                    selected
                      ? "bg-cream-100/15 text-cream-50"
                      : "bg-charcoal-800 text-text-secondary hover:text-cream-100"
                  )}
                >
                  {reason}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything else? (optional)"
            maxLength={280}
            className="border-cream-100/10 bg-charcoal-850 text-cream-50 placeholder:text-text-muted focus-visible:ring-lime-500/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleNegativeSubmit}
            disabled={isPending || (reasons.length === 0 && !note.trim())}
          >
            {isPending ? "Sending…" : "Send feedback"}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-error mt-3 flex items-center gap-1.5 text-xs">
          <Warning size={13} weight="fill" />
          {error}
        </p>
      )}
    </div>
  );
}
