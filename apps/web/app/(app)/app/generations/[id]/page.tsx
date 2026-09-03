"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { pollGenerationStatus } from "@/lib/generation/poll";
import { Button } from "@/components/ui/button";
import type { SafeGenerationDetail } from "@/lib/generation/types";

export default function GenerationStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [generation, setGeneration] = useState<SafeGenerationDetail | null>(
    null
  );
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function check() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const result = await pollGenerationStatus(id);
        if (cancelled) return;
        if (result.error) setError(result.error);
        setGeneration(result.generation);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Unable to check status."
        );
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
    }

    check();

    intervalId = setInterval(() => {
      if (cancelled) return;
      setGeneration((current) => {
        if (current && isTerminalStatus(current.status)) {
          return current;
        }
        check();
        return current;
      });
    }, 4000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [id]);

  const isGenerationTerminal =
    generation && isTerminalStatus(generation.status);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="text-cream-50 text-3xl font-bold">Generation status</h1>

      {loading && !generation && (
        <p className="text-text-secondary mt-4">Loading...</p>
      )}

      {error && (
        <div className="mt-6 max-w-md rounded-lg border-l-4 border-red-500 bg-red-950/20 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {generation && (
        <div className="border-cream-100/10 bg-charcoal-850 mt-8 w-full max-w-md rounded-2xl border p-6 text-left">
          <p className="text-text-secondary text-sm">Preset</p>
          <p className="text-cream-50 font-medium">{generation.productName}</p>

          <p className="text-text-secondary mt-4 text-sm">Status</p>
          <p className="text-cream-50 text-lg font-semibold capitalize">
            {generation.status.replace(/_/g, " ")}
          </p>
          {generation.statusDetail && (
            <p className="text-text-secondary mt-1 text-sm">
              {generation.statusDetail}
            </p>
          )}

          {generation.status === "completed" && (
            <div className="mt-6">
              <Button asChild className="w-full">
                <Link href={`/app/results/${generation.id}`}>View result</Link>
              </Button>
            </div>
          )}

          {generation.status === "failed" && (
            <div className="mt-6">
              <Button asChild variant="secondary" className="w-full">
                <Link href={`/app/create/${generation.productSlug}`}>
                  Try again
                </Link>
              </Button>
            </div>
          )}

          {!isGenerationTerminal && (
            <p className="text-text-muted mt-6 text-xs">
              This page refreshes automatically. You can close it and come back
              later.
            </p>
          )}
        </div>
      )}
    </main>
  );
}

function isTerminalStatus(status: string): boolean {
  return ["completed", "failed", "cancelled", "blocked"].includes(status);
}
