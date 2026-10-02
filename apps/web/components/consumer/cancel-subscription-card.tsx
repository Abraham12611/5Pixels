"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Sparkle, X } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { recordOfferEvent } from "@/lib/offers/actions";
import { claimRetentionCredits } from "@/lib/billing/retention";

const REASONS = [
  "It costs too much",
  "I'm not using it enough",
  "I expected different results",
  "Just taking a break",
  "Something else",
] as const;

type Phase = "ask" | "success";

/**
 * Cancel-retention card (06 §3.5 — Linktree/Medium pattern). Replaces the
 * bare portal link on /app/billing/plan: the cancel path now passes through
 * one in-dialog step — what-you-lose list, optional reason, and a lime
 * "stay and get free credits" offer — before the billing portal opens.
 * "Keep my plan" claims a one-shot credit grant; "Continue to cancel"
 * proceeds to the portal. Events ride the promo_events table with
 * context="cancel_flow" (impression/accept/decline/dismiss).
 */
export function CancelSubscriptionCard({
  planName,
  periodEnd,
  loses,
  credits,
}: {
  planName: string;
  periodEnd: string | null;
  loses: string[];
  credits: number;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("ask");
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState(0);
  const portalFormRef = useRef<HTMLFormElement>(null);
  const impressionSent = useRef(false);

  // cancel_flow_shown — once per open, reset on close.
  useEffect(() => {
    if (!open) {
      impressionSent.current = false;
      return;
    }
    if (impressionSent.current) return;
    impressionSent.current = true;
    void recordOfferEvent({
      surface: "paywall",
      event: "impression",
      context: "cancel_flow",
      meta: { plan: planName },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    if (phase === "ask") {
      void recordOfferEvent({
        surface: "paywall",
        event: "dismiss",
        context: "cancel_flow",
        meta: { plan: planName, reason },
      });
    }
    setOpen(false);
    setPhase("ask");
    setError(null);
  }

  async function keepPlan() {
    setBusy(true);
    setError(null);
    const res = await claimRetentionCredits();
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setGranted(res.credits);
    setPhase("success");
    void recordOfferEvent({
      surface: "paywall",
      event: "accept",
      context: "cancel_flow",
      meta: { plan: planName, credits: res.credits, already: res.already },
    });
  }

  async function continueToCancel() {
    setBusy(true);
    await recordOfferEvent({
      surface: "paywall",
      event: "decline",
      context: "cancel_flow",
      meta: { plan: planName, reason },
    }).catch(() => ({ ok: false }));
    portalFormRef.current?.submit();
  }

  return (
    <div className="border-cream-100/10 rounded-[15px] border p-5">
      <p className="text-cream-50 text-sm font-medium">
        Cancel your subscription
      </p>
      <p className="text-text-secondary mt-1 text-sm leading-relaxed">
        Your plan stays active until{" "}
        {periodEnd ?? "the end of the current period"}, and unused credits
        remain in your balance.
      </p>
      <div className="mt-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
          Cancel subscription
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())} className="max-w-md">
        <DialogContent>
          {phase === "success" ? (
            <div className="py-2 text-center">
              <span className="bg-lime-500/10 text-lime-400 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                <Check size={24} weight="bold" />
              </span>
              <DialogTitle className="mt-4">You&apos;re staying</DialogTitle>
              <DialogDescription className="mt-2">
                {granted.toLocaleString()} credits added to your balance —
                they never expire. Your {planName} plan continues as normal.
              </DialogDescription>
              <Button
                type="button"
                variant="brand"
                className="mt-6 w-full"
                onClick={() => {
                  setOpen(false);
                  setPhase("ask");
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              <DialogTitle>Sure you want to cancel?</DialogTitle>
              <DialogDescription className="mt-1.5">
                Your {planName} plan ends{" "}
                {periodEnd ?? "at the end of the current period"}. Here&apos;s
                what you&apos;ll lose after that:
              </DialogDescription>

              <ul className="mt-4 space-y-2">
                {loses.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <X
                      size={15}
                      weight="bold"
                      className="text-error mt-0.5 shrink-0"
                    />
                    <span className="text-text-secondary text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-text-muted mt-2.5 text-xs">
                Anything already in your balance is yours to keep.
              </p>

              <fieldset className="mt-5">
                <legend className="text-text-muted text-xs font-medium">
                  Mind telling us why? (optional)
                </legend>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(reason === r ? null : r)}
                      aria-pressed={reason === r}
                      className={
                        reason === r
                          ? "border-lime-400/40 bg-lime-500/10 text-lime-300 rounded-full border px-3 py-1.5 text-xs font-medium"
                          : "border-cream-100/10 text-text-secondary hover:border-cream-100/25 rounded-full border px-3 py-1.5 text-xs transition-colors"
                      }
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Retention offer — Medium-style lime coupon card */}
              <div className="border-lime-500/30 bg-lime-500/[0.06] relative mt-5 overflow-hidden rounded-[12px] border p-4">
                <span
                  aria-hidden="true"
                  className="bg-lime-500/50 absolute inset-x-0 top-0 h-px"
                />
                <p className="text-cream-50 flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkle size={14} weight="fill" className="text-lime-400" />
                  Stay and get {credits.toLocaleString()} free credits
                </p>
                <p className="text-text-secondary mt-1 text-xs leading-relaxed">
                  They land instantly and never expire — enough for a stretch
                  of transformations while you decide.
                </p>
              </div>

              {error && (
                <p role="alert" className="text-error mt-3 text-xs">
                  {error}
                </p>
              )}

              <div className="mt-5 flex flex-col gap-2.5">
                <Button
                  type="button"
                  variant="brand"
                  className="w-full"
                  disabled={busy}
                  onClick={keepPlan}
                >
                  Keep my plan — get {credits.toLocaleString()} credits
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={busy}
                  onClick={continueToCancel}
                >
                  Continue to cancel
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* "Continue to cancel" posts to the portal session endpoint. */}
      <form
        ref={portalFormRef}
        action="/api/billing/portal"
        method="post"
        className="hidden"
      />
    </div>
  );
}
