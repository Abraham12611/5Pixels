"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/**
 * Plan cancellation (13 §10): reachable in two taps — a quiet row on the
 * plan page opens a T1 confirm sheet stating the exact end date, what
 * happens to remaining credits, and that results stay in the Library. The
 * single alternative (downgrade via /pricing) is offered once and never
 * blocks the cancel path — which hands off to the billing portal.
 */
export function CancelSubscription({
  renewalDate,
}: {
  /** Formatted end-of-period date — "Active until X" after cancelling. */
  renewalDate: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Tap 1 — quiet row */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-visible:ring-lime-500/70 flex min-h-14 w-full items-center justify-between gap-3 px-1 py-2 text-left transition-colors focus-visible:rounded-lg focus-visible:ring-2 focus-visible:outline-none"
      >
        <span>
          <span className="text-cream-50 block text-sm font-medium">
            Cancel subscription
          </span>
          <span className="text-text-muted text-xs">
            Stay active until {renewalDate ?? "the end of the period"}
          </span>
        </span>
        <CaretRight size={16} className="text-text-muted" />
      </button>

      {/* Tap 2 — T1 confirm sheet */}
      <Sheet
        open={open}
        onOpenChange={setOpen}
        tier="action"
        title="Cancel your subscription?"
        description={
          renewalDate
            ? `You keep everything until ${renewalDate} — then the plan ends on its own.`
            : "Your plan stays active until the end of the current period."
        }
      >
        <ul className="text-text-secondary mt-3 list-disc space-y-1.5 pl-5 text-sm">
          <li>
            {renewalDate
              ? `Your plan stays active until ${renewalDate}.`
              : "Your plan stays active until the end of the current period."}
          </li>
          <li>Remaining credits stay in your balance.</li>
          <li>Your results stay in your Library — nothing is deleted.</li>
        </ul>

        {/* The single alternative, offered once, never blocking */}
        <Link
          href="/pricing"
          className="text-text-secondary hover:text-cream-100 mt-4 block text-sm underline-offset-4 transition-colors hover:underline"
        >
          Or switch to a lower plan instead
        </Link>

        <form action="/api/billing/portal" method="post">
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            className="border-error/40 text-error hover:bg-error/10 mt-5 w-full"
          >
            Continue to cancel
          </Button>
        </form>
        <p className="text-text-muted mt-2 text-center text-[11px]">
          Cancellation completes in the secure billing portal — one more tap.
        </p>
      </Sheet>
    </>
  );
}
