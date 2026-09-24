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
import { pollIntervalMs } from "@/lib/generation/poll-schedule";
import {
  GENERATION_STAGES,
  LONG_WAIT_MESSAGE,
  LONG_WAIT_THRESHOLD_MS,
  elapsedLabel,
  isTerminalStatus,
  pixelCountForStatus,
  stageIndexForStatus,
  statusCopy,
} from "@/lib/generation/stages";
import { GenerationPixelProgress } from "@/components/consumer/five-pixel";
import { StateBlock } from "@/components/ui/state-block";
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
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [pollFailures, setPollFailures] = useState(0);
  const [resultVisible, setResultVisible] = useState(false);
  const inFlightRef = useRef(false);
  const terminalRef = useRef(false);
  // Backoff clock: page mount until the run's createdAt arrives.
  const ageStartRef = useRef(0);
  const checkRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    ageStartRef.current = Date.now();

    getGenerationContext(id)
      .then((ctx) => {
        if (cancelled) return;
        setSourceUrl(ctx.sourceUrl);
        setOutputUrl(ctx.outputUrl);
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
        setPollFailures(result.error ? (n) => n + 1 : 0);
        if (result.generation) {
          ageStartRef.current = new Date(
            result.generation.createdAt
          ).getTime();
          if (isTerminalStatus(result.generation.status)) {
            terminalRef.current = true;
          }
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Unable to check status."
        );
        setPollFailures((n) => n + 1);
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
    }
    checkRef.current = check;

    // 09 §4.1: 4 s while fresh, backing off as the run ages; the loop stops
    // while the tab is hidden and re-checks immediately on re-visibility.
    function scheduleNext() {
      if (cancelled || terminalRef.current) return;
      timeoutId = setTimeout(() => {
        if (document.visibilityState === "hidden") {
          timeoutId = null;
          return; // resumed by the visibilitychange listener
        }
        void check().finally(scheduleNext);
      }, pollIntervalMs(Date.now() - ageStartRef.current));
    }

    void check().finally(scheduleNext);

    const onVisible = () => {
      if (cancelled || terminalRef.current) return;
      if (document.visibilityState !== "visible") return;
      if (timeoutId) clearTimeout(timeoutId);
      void check().finally(scheduleNext);
    };
    document.addEventListener("visibilitychange", onVisible);

    const ticker = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(ticker);
      checkRef.current = null;
    };
  }, [id]);

  // Completed generations hand off to the result surface: the result
  // cross-fades in over the source, then the route changes (09 §4.3).
  useEffect(() => {
    if (generation?.status !== "completed") return;
    let cancelled = false;
    getGenerationContext(id)
      .then((ctx) => {
        if (!cancelled) setOutputUrl(ctx.outputUrl);
      })
      .catch(() => undefined);
    const timeout = setTimeout(
      () => router.replace(`/app/results/${generation.id}`),
      800
    );
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [generation?.status, generation?.id, id, router]);

  // Fade the signed result in one frame after it arrives.
  useEffect(() => {
    if (!outputUrl) return;
    const frame = requestAnimationFrame(() => setResultVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [outputUrl]);

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
    <main className="flex flex-1 flex-col md:items-center md:justify-center md:px-6 md:py-12">
      {/* Mobile: the photo is the context — full-width, dimmed, with the
          pixel motif and a preset/cost chip overlaid (09 §3). */}
      {generation && (
        <div className="bg-charcoal-800 relative aspect-[4/5] w-full overflow-hidden md:hidden">
          {sourceUrl && (
            <Image
              src={sourceUrl}
              alt="Your photo"
              fill
              className={cn(
                "object-cover motion-safe:transition-[filter] motion-safe:duration-200",
                generation.status === "completed"
                  ? "brightness-100"
                  : "brightness-[0.55]"
              )}
              unoptimized
            />
          )}
          {/* Completion handoff: the result cross-fades in over the source
              (09 §4.3); the result page renders it in the same spot. */}
          {generation.status === "completed" && outputUrl && (
            <Image
              src={outputUrl}
              alt="Your result"
              fill
              className={cn(
                "object-cover motion-safe:transition-opacity motion-safe:duration-200",
                resultVisible ? "opacity-100" : "opacity-0"
              )}
              unoptimized
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <GenerationPixelProgress
              filled={pixelCountForStatus(generation.status)}
              active={terminal ? -1 : Math.min(stageIndex, 4)}
            />
          </div>
          <p className="bg-ink-950/70 text-cream-50 absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur">
            {generation.productName}
            {generation.creditCost > 0 &&
              ` · ${generation.creditCost} ${
                generation.creditCost === 1 ? "credit" : "credits"
              }`}
          </p>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-5 md:flex-none md:gap-0 md:space-y-5 md:px-0 md:py-0">
        {/* Desktop context card: what is being transformed */}
        {generation && (
          <div className="shadow-border hidden items-center gap-3 rounded-lg bg-charcoal-800/80 p-3 md:flex">
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

        {/* Status panel — flat column on mobile, card on md+. */}
        <div className="md:shadow-border flex flex-1 flex-col md:rounded-xl md:bg-charcoal-850 md:p-8 md:text-center">
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
            <div aria-live="polite" className="flex flex-1 flex-col">
              <GenerationPixelProgress
                filled={pixelCountForStatus(generation.status)}
                active={terminal ? -1 : Math.min(stageIndex, 4)}
                className="hidden justify-center md:flex"
              />

              <h1 className="text-cream-50 mt-5 text-xl font-semibold">
                {copy.title}
              </h1>
              <p className="text-text-secondary mt-1.5 text-sm">{copy.body}</p>
              {!terminal && (
                <p
                  aria-hidden="true"
                  className="text-text-muted mt-1 text-[13px] tabular-nums"
                >
                  {elapsedLabel(
                    new Date(generation.createdAt).getTime(),
                    now
                  )}
                </p>
              )}
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
                                ? "text-lime-400 motion-safe:animate-pulse"
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

              {/* Completed: the checklist collapses into a single ✓ row
                  while the handoff plays (09 §4.3). */}
              {generation.status === "completed" && (
                <ol className="mt-6 space-y-1 text-left">
                  <li className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px]">
                    <CheckCircle
                      size={16}
                      weight="fill"
                      className="text-lime-400 shrink-0"
                    />
                    <span className="text-text-secondary">
                      Done — opening your result
                    </span>
                  </li>
                </ol>
              )}

              {/* Actions pinned to the thumb zone on mobile (09 §3). */}
              <div className="mt-auto pt-6">
                {/* Terminal: completed */}
                {generation.status === "completed" && (
                  <Button asChild variant="brand" className="w-full">
                    <Link href={`/app/results/${generation.id}`}>
                      View result
                      <ArrowRight size={15} weight="bold" />
                    </Link>
                  </Button>
                )}

                {/* Terminal: failed / blocked / cancelled */}
                {(generation.status === "failed" ||
                  generation.status === "blocked" ||
                  generation.status === "cancelled") && (
                  <div className="space-y-3">
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
                      <Button asChild variant="brand" className="min-h-11 flex-1">
                        <Link
                          href={`/app/create/${generation.productSlug}?from=${generation.id}`}
                        >
                          Try again
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="secondary"
                        className="min-h-11 flex-1"
                      >
                        <Link href="/explore">Choose another look</Link>
                      </Button>
                    </div>
                  </div>
                )}

                {!terminal && (
                  <div className="space-y-3">
                    <p className="text-text-muted text-xs">
                      You can leave this page — your result will be waiting in
                      Library.
                    </p>
                    <Button
                      asChild
                      variant="secondary"
                      className="min-h-11 w-full md:hidden"
                    >
                      <Link href="/app/library">Go to Library</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Three consecutive poll failures: the inline warning becomes a
              recovery panel — the run itself is still executing (09 §4.1). */}
          {!terminal && pollFailures >= 3 ? (
            <div className="mt-6">
              <StateBlock
                variant="error"
                icon={<WarningCircle size={22} weight="fill" />}
                title="We can't reach the status service"
                body="Your transformation is still running — it'll be waiting in your Library."
                primary={
                  <Button
                    variant="secondary"
                    className="min-h-11 w-full"
                    onClick={() => {
                      setPollFailures(0);
                      void checkRef.current?.();
                    }}
                  >
                    Check again
                  </Button>
                }
                secondary={
                  <Link
                    href="/app/library"
                    className="text-text-muted hover:text-cream-100 text-xs underline underline-offset-2 transition-colors"
                  >
                    Go to Library
                  </Link>
                }
              />
            </div>
          ) : (
            error && (
              <p
                role="status"
                className="text-warning mt-5 flex items-center gap-1.5 text-xs md:justify-center"
              >
                <WarningCircle size={14} weight="fill" />
                {error}
              </p>
            )
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
