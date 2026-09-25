"use client";

import { useState } from "react";
import Link from "next/link";
import { SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { replayPendingGeneration } from "@/lib/teaser/pending";

/**
 * "Finish your result" card for the saved teaser intent (08 §5). Shows when
 * the user has an unconsumed pending generation — the replay path needs no
 * re-upload or re-entry. Zero-credit users get the unlock CTA instead.
 */
export function PendingGenerationCard({
  pendingId,
  productName,
  productSlug,
  creditCost,
  balance,
}: {
  pendingId: string;
  productName: string;
  productSlug: string;
  creditCost: number;
  balance: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canAfford = balance >= creditCost;

  async function handleReplay() {
    setLoading(true);
    setError(null);
    try {
      const result = await replayPendingGeneration(pendingId);
      if (result?.error) setError(result.error);
      // Success path redirects server-side to the generation page.
    } catch (err) {
      if (
        err instanceof Error &&
        ((err as { digest?: string }).digest === "NEXT_REDIRECT" ||
          err.message === "NEXT_REDIRECT")
      ) {
        throw err;
      }
      setError("Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="shadow-border from-charcoal-850 to-charcoal-850 relative overflow-hidden rounded-xl bg-gradient-to-br p-6 sm:p-8">
      <p className="text-lime-400 text-[11px] font-semibold uppercase tracking-wide">
        Saved result
      </p>
      <h2 className="text-cream-50 mt-2 text-xl font-bold sm:text-2xl">
        Your {productName} transformation is waiting
      </h2>
      <p className="text-text-secondary mt-2 max-w-md text-sm">
        Your photo and settings are saved — no need to upload again.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {canAfford ? (
          <Button
            variant="brand"
            size="lg"
            onClick={() => void handleReplay()}
            disabled={loading}
          >
            {loading ? (
              <>
                <SpinnerGap size={16} className="mr-2 animate-spin" weight="bold" />
                Starting…
              </>
            ) : (
              `Generate my result · ${creditCost} ${
                creditCost === 1 ? "credit" : "credits"
              }`
            )}
          </Button>
        ) : (
          <Button asChild variant="brand" size="lg">
            <Link href="/pricing">See plans to unlock it</Link>
          </Button>
        )}
        <Link
          href={`/presets/${productSlug}`}
          className="text-text-secondary hover:text-cream-50 text-sm font-medium transition-colors"
        >
          View preset
        </Link>
      </div>
      {error && (
        <p role="alert" className="text-error mt-3 text-xs">
          {error}
        </p>
      )}
    </section>
  );
}
