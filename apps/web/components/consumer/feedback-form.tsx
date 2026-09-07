"use client";

import { useState } from "react";
import { submitGenerationFeedback } from "@/lib/db/feedback";

interface FeedbackFormProps {
  generationId: string;
  initialRating?: number | null;
  initialNotes?: string | null;
}

export function FeedbackForm({
  generationId,
  initialRating,
  initialNotes,
}: FeedbackFormProps) {
  const [rating, setRating] = useState<number | null>(initialRating ?? null);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating == null) {
      setMessage("Please select a star rating.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const result = await submitGenerationFeedback(generationId, rating, notes);

    if (result.success) {
      setMessage("Thanks for your feedback!");
    } else {
      setMessage(result.error ?? "Unable to submit feedback.");
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-cream-100 font-medium">How did this turn out?</p>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className={`text-2xl transition ${
                rating && value <= rating ? "text-lime-400" : "text-text-muted"
              }`}
              aria-label={`Rate ${value} out of 5`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="feedback-notes"
          className="text-text-muted block text-xs font-medium uppercase"
        >
          Notes (optional)
        </label>
        <textarea
          id="feedback-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="border-cream-100/10 bg-charcoal-900 text-cream-50 mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          placeholder="What worked or didn’t?"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-lime-400 text-charcoal-950 hover:bg-lime-300 disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-semibold transition"
      >
        {submitting ? "Submitting…" : "Submit feedback"}
      </button>

      {message && (
        <p
          className={`text-sm ${
            message.startsWith("Thanks") ? "text-lime-400" : "text-rose-400"
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
