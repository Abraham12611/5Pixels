import Link from "next/link";
import Image from "next/image";
import { ArrowCounterClockwise, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { FivePixelMark } from "@/components/consumer/five-pixel";
import { Button } from "@/components/ui/button";
import { isFailureStatus, isTerminalStatus } from "@/lib/generation/stages";
import { cn, formatRelativeTime } from "@/lib/utils";

export interface LibraryRun {
  id: string;
  productName: string;
  productSlug: string;
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
 * Credit cell — reconciles with `/app/billing/history` ledger semantics:
 * completed runs were debited, failures were refunded, in-progress runs hold
 * a reservation (11 §6).
 */
function CreditCell({ run }: { run: LibraryRun }) {
  if (isFailureStatus(run.status)) {
    return (
      <span className="text-text-muted shrink-0 text-xs">Refunded</span>
    );
  }
  return (
    <span
      className={cn(
        "shrink-0 text-xs tabular-nums",
        run.status === "completed" ? "text-cream-100" : "text-text-muted"
      )}
    >
      {run.creditCost} {run.creditCost === 1 ? "credit" : "credits"}
    </span>
  );
}

function dayKey(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Earlier";
  const now = new Date();
  const todayKey = dayKey(now.toISOString());
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey(iso) === todayKey) return "Today";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

interface DayGroup {
  key: string;
  label: string;
  runs: LibraryRun[];
}

function groupByDay(runs: LibraryRun[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const run of runs) {
    const key = dayKey(run.createdAt) ?? "unknown";
    const existing = groups.get(key);
    if (existing) {
      existing.runs.push(run);
    } else {
      groups.set(key, { key, label: dayLabel(run.createdAt), runs: [run] });
    }
  }
  return [...groups.values()];
}

/**
 * Runs segment — the accountability surface for spent credits (`11 §6`).
 * 72px rows grouped by day under sticky headers; failed rows offer an
 * inline Try again; the credit cell mirrors the ledger (charged / held /
 * refunded) so it reconciles with `/app/billing/history`.
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

  const groups = groupByDay(runs);
  const spent = runs
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + r.creditCost, 0);

  return (
    <div>
      <section aria-label="Generation runs" className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.key}>
            <h2 className="text-text-muted bg-ink-950 sticky top-[120px] z-20 -mx-4 flex items-center px-4 py-2 text-[11px] font-semibold tracking-wider uppercase sm:-mx-6 sm:px-6">
              {group.label}
              <span className="bg-cream-100/10 ml-3 h-px flex-1" aria-hidden />
            </h2>
            <div className="flex flex-col gap-2">
              {group.runs.map((run) => {
                const pill = statusPill(run.status);
                const failed = isFailureStatus(run.status);
                return (
                  <article
                    key={run.id}
                    className="group shadow-border hover:shadow-border-hover relative flex h-[72px] items-center gap-3 rounded-xl bg-charcoal-850 transition-shadow"
                  >
                    {/* Stretched link keeps the row tappable while Try again
                        stays independently clickable above it */}
                    <Link
                      href={runHref(run)}
                      prefetch={false}
                      aria-label={`${run.productName} — ${pill.label}, ${formatRelativeTime(run.createdAt)}`}
                      className="absolute inset-0 z-10 rounded-xl"
                    />
                    <span className="media-frame relative block h-[72px] w-[72px] shrink-0 overflow-hidden rounded-l-xl bg-charcoal-800">
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
                    <span className="relative min-w-0 flex-1">
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
                    <span className="relative flex shrink-0 flex-col items-end gap-1 pr-2">
                      <CreditCell run={run} />
                      {failed && (
                        <Link
                          href={`/app/create/${run.productSlug}`}
                          prefetch={false}
                          className="text-lime-400 hover:text-lime-300 relative z-20 -mx-2 inline-flex min-h-11 items-center gap-1 px-2 text-xs font-semibold transition-colors"
                        >
                          <ArrowCounterClockwise size={12} weight="bold" />
                          Try again
                        </Link>
                      )}
                    </span>
                    <CaretRight
                      size={16}
                      className="text-text-muted group-hover:text-cream-50 relative mr-3 shrink-0 transition-colors"
                      aria-hidden
                    />
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Reconciliation footer — debits/refunds live in Billing history */}
      <p className="text-text-muted mt-8 text-center text-xs">
        {spent > 0 ? (
          <>
            {spent} {spent === 1 ? "credit" : "credits"} spent on completed
            runs ·{" "}
          </>
        ) : null}
        <Link
          href="/app/billing/history"
          className="text-text-secondary hover:text-cream-50 underline underline-offset-2 transition-colors"
        >
          See billing history
        </Link>
      </p>
    </div>
  );
}
