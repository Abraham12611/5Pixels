import Link from "next/link";
import Image from "next/image";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { FivePixelMark } from "@/components/consumer/five-pixel";
import { Button } from "@/components/ui/button";
import { isFailureStatus, isTerminalStatus } from "@/lib/generation/stages";
import { cn, formatRelativeTime } from "@/lib/utils";

export interface LibraryRun {
  id: string;
  productName: string;
  status: string;
  creditCost: number;
  createdAt: string;
  thumb: string | null;
}

function statusPill(status: string): { label: string; className: string } {
  if (status === "completed") {
    return { label: "Completed", className: "bg-lime-400/15 text-lime-300" };
  }
  if (status === "cancelled") {
    return { label: "Cancelled", className: "bg-cream-100/10 text-text-muted" };
  }
  if (isFailureStatus(status)) {
    return {
      label: status === "blocked" ? "Blocked" : "Failed",
      className: "bg-error/15 text-error",
    };
  }
  return { label: "In progress", className: "bg-cream-100/10 text-cream-100" };
}

function runHref(run: LibraryRun): string {
  return run.status === "completed"
    ? `/app/results/${run.id}`
    : `/app/generations/${run.id}`;
}

/**
 * Runs segment — the accountability surface for spent credits (`11 §6`).
 * Chronological 72px rows; day grouping and the credit-history reconciliation
 * land in Phase 3.4.
 */
export function RunsList({ runs }: { runs: LibraryRun[] }) {
  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <FivePixelMark className="mb-4 opacity-70" />
        <h2 className="text-cream-50 text-lg font-semibold">
          No transformations yet.
        </h2>
        <p className="text-text-secondary mt-1.5 max-w-sm text-sm">
          Every run — finished, failed, or in progress — lands here so credits
          are never a mystery.
        </p>
        <Button asChild className="mt-5">
          <Link href="/explore">Browse looks</Link>
        </Button>
      </div>
    );
  }

  return (
    <section aria-label="Generation runs" className="flex flex-col gap-2">
      {runs.map((run) => {
        const pill = statusPill(run.status);
        return (
          <Link
            key={run.id}
            href={runHref(run)}
            className="group shadow-border hover:shadow-border-hover flex h-[72px] items-center gap-3 overflow-hidden rounded-xl bg-charcoal-850 pr-3 transition-shadow"
          >
            <span className="media-frame relative block h-[72px] w-[72px] shrink-0 bg-charcoal-800">
              {run.thumb ? (
                <Image
                  src={run.thumb}
                  alt=""
                  fill
                  unoptimized
                  sizes="72px"
                  className="object-cover"
                />
              ) : (
                <span className="absolute inset-0 grid place-items-center">
                  <span className="bg-charcoal-700 h-6 w-6 rounded-md" />
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-cream-50 block truncate text-sm font-medium">
                {run.productName}
              </span>
              <span className="mt-1 flex items-center gap-2">
                <span
                  className={cn(
                    "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold",
                    pill.className,
                    !isTerminalStatus(run.status) && "animate-pulse"
                  )}
                >
                  {pill.label}
                </span>
                <span className="text-text-muted text-xs">
                  {formatRelativeTime(run.createdAt)}
                </span>
              </span>
            </span>
            <span className="text-text-muted shrink-0 text-xs tabular-nums">
              {run.creditCost}{" "}
              {run.creditCost === 1 ? "credit" : "credits"}
            </span>
            <CaretRight
              size={16}
              className="text-text-muted group-hover:text-cream-50 shrink-0 transition-colors"
              aria-hidden
            />
          </Link>
        );
      })}
    </section>
  );
}
