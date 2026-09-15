"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle,
  CircleDashed,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  getGenerationContext,
  pollGenerationStatus,
} from "@/lib/generation/poll";
import {
  GENERATION_STAGES,
  LONG_WAIT_MESSAGE,
  LONG_WAIT_THRESHOLD_MS,
  isTerminalStatus,
  pixelCountForStatus,
  stageIndexForStatus,
  statusCopy,
} from "@/lib/generation/stages";
import { GenerationPixelProgress } from "@/components/consumer/five-pixel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SafeGenerationDetail } from "@/lib/generation/types";

export default function GenerationStatusPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [generation, setGeneration] = useState<SafeGenerationDetail | null>(
    null
  );
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const inFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    getGenerationContext(id)
      .then((ctx) => {
        if (!cancelled) setSourceUrl(ctx.sourceUrl);
      })
      .catch(() => undefined);

    async function check() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const result = await pollGenerationStatus(id);
        if (cancelled) return;
        setError(result.error ?? "");
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

    const ticker = setInterval(() => setNow(Date.now()), 5000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      clearInterval(ticker);
    };
  }, [id]);

  // Completed generations hand off to the result surface.
  useEffect(() => {
    if (generation?.status !== "completed") return;
    const timeout = setTimeout(
      () => router.replace(`/app/results/${generation.id}`),
      1200
    );
    return () => clearTimeout(timeout);
  }, [generation?.status, generation?.id, router]);

  const terminal = generation && isTerminalStatus(generation.status);
  const stageIndex = generation ? stageIndexForStatus(generation.status) : -1;
  const copy = generation
    ? statusCopy(generation.status, generation.statusDetail)
    : null;
  const longWait =
    generation &&
    !terminal &&
    now - new Date(generation.createdAt).getTime() > LONG_WAIT_THRESHOLD_MS;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md space-y-5">
        {/* Context: what is being transformed */}
        {generation && (
          <div className="shadow-border flex items-center gap-3 rounded-lg bg-charcoal-800/80 p-3">
            {sourceUrl ? (
              <div className="media-frame relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
                <Image
                  src={sourceUrl}
                  alt="Your photo"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="media-frame h-12 w-12 shrink-0 rounded-md bg-charcoal-700" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wide">
                Transformation
              </p>
              <p className="text-cream-50 truncate text-sm font-semibold">
                {generation.productName}
              </p>
            </div>
            {generation.creditCost > 0 && (
              <span className="text-text-muted shrink-0 text-xs tabular-nums">
                {generation.creditCost}{" "}
                {generation.creditCost === 1 ? "credit" : "credits"}
              </span>
            )}
          </div>
        )}

        <div className="shadow-border rounded-xl bg-charcoal-850 p-6 text-center sm:p-8">
          {loading && !generation && (
            <>
              <GenerationPixelProgress
                filled={0}
                active={0}
                className="justify-center"
              />
              <p className="text-text-secondary mt-5 text-sm">
                Checking your transformation…
              </p>
            </>
          )}

          {generation && copy && (
            <>
              <GenerationPixelProgress
                filled={pixelCountForStatus(generation.status)}
                active={terminal ? -1 : Math.min(stageIndex, 4)}
                className="justify-center"
              />

              <h1 className="text-cream-50 mt-5 text-xl font-semibold">
                {copy.title}
              </h1>
              <p className="text-text-secondary mt-1.5 text-sm">{copy.body}</p>
              {longWait && (
                <p className="text-warning mt-3 text-xs">{LONG_WAIT_MESSAGE}</p>
              )}

              {/* Stage list for active runs */}
              {!terminal && (
                <ol className="mt-6 space-y-1 text-left">
                  {GENERATION_STAGES.map((stage, i) => {
                    const done = i < stageIndex;
                    const current = i === stageIndex;
                    return (
                      <li
                        key={stage.id}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-[13px]",
                          current && "bg-cream-100/5"
                        )}
                      >
                        {done ? (
                          <CheckCircle
                            size={16}
                            weight="fill"
                            className="text-lime-400 shrink-0"
                          />
                        ) : (
                          <CircleDashed
                            size={16}
                            className={cn(
                              "shrink-0",
                              current
                                ? "text-lime-400 animate-pulse"
                                : "text-text-muted"
                            )}
                          />
                        )}
                        <span
                          className={cn(
                            current
                              ? "text-cream-50 font-medium"
                              : done
                                ? "text-text-secondary"
                                : "text-text-muted"
                          )}
                        >
                          {stage.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}

              {/* Terminal: completed */}
              {generation.status === "completed" && (
                <div className="mt-6">
                  <Button asChild variant="brand" className="w-full">
                    <Link href={`/app/results/${generation.id}`}>
                      View result
                      <ArrowRight size={15} weight="bold" />
                    </Link>
                  </Button>
                </div>
              )}

              {/* Terminal: failed / blocked / cancelled */}
              {(generation.status === "failed" ||
                generation.status === "blocked" ||
                generation.status === "cancelled") && (
                <div className="mt-6 space-y-3">
                  {copy.credit && (
                    <p className="bg-charcoal-800 text-text-secondary inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs">
                      <CheckCircle
                        size={13}
                        weight="fill"
                        className="text-lime-400"
                      />
                      {copy.credit}
                    </p>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild variant="brand" className="flex-1">
                      <Link
                        href={`/app/create/${generation.productSlug}?from=${generation.id}`}
                      >
                        Try again
                      </Link>
                    </Button>
                    <Button asChild variant="secondary" className="flex-1">
                      <Link href="/explore">Choose another look</Link>
                    </Button>
                  </div>
                </div>
              )}

              {!terminal && (
                <p className="text-text-muted mt-6 text-xs">
                  You can leave this page — your result will be waiting in
                  Library.
                </p>
              )}
            </>
          )}

          {error && (
            <p className="text-warning mt-5 flex items-center justify-center gap-1.5 text-xs">
              <WarningCircle size={14} weight="fill" />
              {error}
            </p>
          )}

          {!generation && !loading && !error && (
            <p className="text-text-secondary text-sm">
              Generation not found.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
