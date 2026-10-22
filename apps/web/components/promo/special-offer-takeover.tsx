"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, LockSimple, X } from "@phosphor-icons/react";
import {
  Dialog,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { OfferBadge } from "./offer-badge";
import {
  ExitStep,
  PlansStep,
  ReferralStep,
  TopUpStep,
  WeeklyPairStep,
  type OfferDeadlineDisplay,
} from "./offer-steps";
import { recordOfferEvent, optOutOffers } from "@/lib/offers/actions";
import type {
  AdminPreviewOption,
  OfferAssignment,
  OfferStep,
} from "@/lib/offers/engine";
import type { PlanForPurchase } from "@/lib/db/plans";

const RAIL_BENEFITS = [
  "Credits refreshed every month",
  "Every filter and poster preset",
  "HD downloads",
  "Cancel anytime",
] as const;

/**
 * S7 — special-offer card: a centered dialog over a dimmed backdrop instead
 * of the old fullscreen takeover. On desktop it's a two-column paywall
 * (Cycle pattern — benefit rail left, step ladder right); on mobile a single
 * compact card. Same ladder mechanics — decline advances the step inside the
 * same card (cross-fade), never stacked modals. Accept posts to the normal
 * checkout endpoint with promo attribution; every transition is a validated
 * promo event. Client never writes `converted` — the webhook does (09 §2).
 */
export function SpecialOfferTakeover({
  assignment,
  plans,
  context = "signup_completed_no_credits",
  pendingProductName,
  referralCode,
  adminVariants,
  onClose,
}: {
  assignment: OfferAssignment;
  plans: PlanForPurchase[];
  context?: string;
  /** Set when a saved teaser exists — copy leans on the pending result. */
  pendingProductName?: string;
  referralCode?: string;
  /** Admin preview switcher — every campaign+variant the admin can load. */
  adminVariants?: AdminPreviewOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { campaignId, variant } = assignment;
  const isAdminPreview = assignment.isAdminPreview === true;
  const steps = useMemo(() => assignment.steps.slice(0, 3), [assignment.steps]);
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const impressionSent = useRef(false);
  const checkoutFormRef = useRef<HTMLFormElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);

  const step: OfferStep | undefined = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastStep = stepIndex >= steps.length - 1;

  function fire(
    event: Parameters<typeof recordOfferEvent>[0]["event"],
    extra?: { meta?: Record<string, unknown> }
  ) {
    // Admin previews never write funnel events — they'd skew metrics.
    if (isAdminPreview) return;
    void recordOfferEvent({
      campaignId,
      variant,
      step: step?.position,
      surface: "takeover",
      event,
      context,
      meta: extra?.meta,
    });
  }

  useEffect(() => {
    if (impressionSent.current || isAdminPreview) return;
    impressionSent.current = true;
    void recordOfferEvent({
      campaignId,
      variant,
      surface: "takeover",
      event: "impression",
      context,
    });
  }, [campaignId, variant, context, isAdminPreview]);

  useEffect(() => {
    if (!step || closed || isAdminPreview) return;
    void recordOfferEvent({
      campaignId,
      variant,
      step: step.position,
      surface: "takeover",
      event: "step_view",
      context,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, closed, isAdminPreview]);

  if (closed || !step) return null;

  function decline() {
    fire("decline");
    if (isLastStep) {
      fire("dismiss");
      setClosed(true);
      onClose();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function dismiss() {
    fire("dismiss");
    setClosed(true);
    onClose();
  }

  function optOut() {
    fire("opt_out");
    if (!isAdminPreview) void optOutOffers(campaignId);
    setClosed(true);
    onClose();
  }

  async function acceptPlan(planId: string) {
    // accept/checkout_started matter for measurement — await them before
    // the POST navigates away and cancels in-flight requests.
    if (!isAdminPreview) {
      await Promise.all([
        recordOfferEvent({
          campaignId,
          variant,
          step: step?.position,
          surface: "takeover",
          event: "accept",
          context,
          meta: { plan_id: planId },
        }),
        recordOfferEvent({
          campaignId,
          variant,
          step: step?.position,
          surface: "takeover",
          event: "checkout_started",
          context,
          meta: { plan_id: planId },
        }),
      ]);
    }
    if (planInputRef.current) planInputRef.current.value = planId;
    // Preview mounts must never launch a real checkout.
    if (isAdminPreview) return;
    checkoutFormRef.current?.submit();
  }

  const weekly = plans.filter((p) => p.type === "weekly_trial").slice(0, 2);
  const annual = plans.filter((p) => p.type === "annual")[0] ?? null;
  const monthly = plans.filter((p) => p.type === "monthly");
  const extraCredit = plans.find((p) => p.type === "extra_credit") ?? null;

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
      className="max-h-[85dvh] w-full max-w-[500px] overflow-y-auto p-0 sm:max-w-[880px]"
    >
      <DialogTitle className="sr-only">Special offer</DialogTitle>
      <DialogDescription className="sr-only">
        A limited offer on 5Pixels plans — pick a plan, refer a friend, or
        close to keep browsing.
      </DialogDescription>

      <div className="sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <OfferRail pendingProductName={pendingProductName} />

        <div className="flex min-w-0 flex-col">
          {/* Card header — badge + close */}
          <div className="flex items-center justify-between px-6 pt-5">
            <OfferBadge tone="promo">
              {isAdminPreview ? "Admin preview" : "Special offer"}
            </OfferBadge>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close offer"
              className="text-text-secondary hover:text-cream-50 flex h-8 w-8 items-center justify-center rounded-full bg-charcoal-800 transition-colors"
            >
              <X size={15} weight="bold" />
            </button>
          </div>

          {/* Admin preview switcher — jump between any campaign+variant flow. */}
          {adminVariants && adminVariants.length > 0 && (
            <div className="mx-6 mt-4 flex items-center gap-2.5 rounded-lg bg-charcoal-900 px-3 py-2">
              <label
                htmlFor="offer-preview-variant"
                className="text-text-muted shrink-0 text-[11px] font-semibold uppercase tracking-wide"
              >
                Previewing
              </label>
              <select
                id="offer-preview-variant"
                className="bg-charcoal-800 text-cream-50 border-cream-100/10 min-w-0 flex-1 rounded-md border px-2 py-1.5 text-xs"
                value={`${assignment.campaignSlug}:${variant}`}
                onChange={(e) => {
                  router.push(
                    `/app?offer_preview=${encodeURIComponent(e.target.value)}`
                  );
                }}
              >
                {adminVariants.map((option) => (
                  <option
                    key={`${option.campaignSlug}:${option.variant}`}
                    value={`${option.campaignSlug}:${option.variant}`}
                  >
                    {option.campaignName} — {option.variant}
                    {option.campaignStatus !== "live"
                      ? ` (${option.campaignStatus})`
                      : ""}
                  </option>
                ))}
              </select>
              <Link
                href="/app"
                className="text-text-muted hover:text-cream-50 shrink-0 text-[11px] transition-colors"
              >
                Exit
              </Link>
            </div>
          )}

          <div className="px-6 pb-5 pt-4">
            {pendingProductName && (
              <p className="text-lime-400 mb-4 text-center text-sm font-medium sm:hidden">
                Your {pendingProductName} result is saved and waiting
              </p>
            )}

            <div key={step.position} className="animate-fade-in">
              {step.kind === "weekly_pair" && (
                <WeeklyPairStep
                  plans={weekly}
                  headline={
                    (step.payload.headline as string) ??
                    "Start with a weekly pass"
                  }
                  onAccept={(id) => void acceptPlan(id)}
                />
              )}

              {step.kind === "plans" && (
                <PlansStep
                  headline={
                    (step.payload.headline as string) ?? "Unlock every look"
                  }
                  annual={annual}
                  monthly={monthly}
                  selected={selectedPlanId}
                  onSelect={setSelectedPlanId}
                  onAccept={(id) => void acceptPlan(id)}
                />
              )}

              {step.kind === "referral" && (
                <ReferralStep referralCode={referralCode} />
              )}

              {step.kind === "topup" && extraCredit && (
                <TopUpStep
                  plan={extraCredit}
                  onAccept={(id) => void acceptPlan(id)}
                />
              )}

              {step.kind === "discount" && (
                <PlansStep
                  eyebrow="Limited time"
                  headline={
                    (step.payload.headline as string) ??
                    "Limited-time discount"
                  }
                  annual={annual}
                  monthly={monthly}
                  selected={selectedPlanId}
                  onSelect={setSelectedPlanId}
                  onAccept={(id) => void acceptPlan(id)}
                  deadlineDisplay={
                    (step.payload.deadline_display as OfferDeadlineDisplay) ??
                    "none"
                  }
                  endsAt={(step.payload.ends_at as string) ?? null}
                />
              )}

              {step.kind === "exit" && (
                <ExitStep
                  title={
                    pendingProductName
                      ? `Your ${pendingProductName} will be waiting`
                      : "No pressure"
                  }
                  description={
                    pendingProductName
                      ? "Your photo and settings are saved — pick a plan whenever you're ready to see it."
                      : "Browse freely — plans are here whenever you want to create."
                  }
                  buttonLabel="Back to the app"
                  onDismiss={dismiss}
                />
              )}
            </div>

            {/* Decline cascade — hidden on the exit step */}
            {step.kind !== "exit" && (
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={decline}
                  className="text-text-muted hover:text-cream-100 text-sm transition-colors"
                >
                  {isLastStep ? "No thanks" : "Not now"}
                </button>
              </div>
            )}
          </div>

          {/* Opt-out footer — quiet text row inside the card */}
          <div className="border-t border-cream-100/10 mt-auto px-6 py-3 text-center">
            <button
              type="button"
              onClick={optOut}
              className="text-text-muted hover:text-text-secondary text-[11px] transition-colors"
            >
              Don&rsquo;t show offers again
            </button>
          </div>
        </div>
      </div>

      {/* Checkout POST — hidden; acceptPlan() fills + submits */}
      <form
        ref={checkoutFormRef}
        action="/api/billing/checkout"
        method="post"
        className="hidden"
      >
        <input
          type="hidden"
          name="plan_id"
          ref={planInputRef}
          defaultValue=""
        />
        <input type="hidden" name="campaign_id" value={campaignId} />
        <input type="hidden" name="campaign_variant" value={variant} />
        <input type="hidden" name="campaign_step" value={step.position} />
      </form>
    </Dialog>
  );
}

/**
 * Left rail — desktop only. Brand mark + membership checklist over a soft
 * lime/promo glow; the step ladder morphs in the right column while this
 * stays put, so the pitch never resets between steps.
 */
function OfferRail({ pendingProductName }: { pendingProductName?: string }) {
  return (
    <aside className="border-cream-100/10 bg-charcoal-900 relative hidden flex-col justify-between overflow-hidden border-r p-8 sm:flex">
      <div
        aria-hidden
        className="bg-lime-500/10 absolute -left-24 -top-24 h-64 w-64 rounded-full blur-3xl"
      />
      <div
        aria-hidden
        className="bg-promo/10 absolute -bottom-24 -right-16 h-56 w-56 rounded-full blur-3xl"
      />
      <div className="relative">
        <p className="font-display text-cream-50 text-xl font-bold tracking-tight">
          5Pixels<span className="text-lime-400">.</span>
        </p>
        <h2 className="font-display text-cream-50 mt-10 text-[26px] font-bold leading-snug">
          {pendingProductName ? (
            <>
              Your{" "}
              <span className="text-lime-300">{pendingProductName}</span>{" "}
              is saved and waiting.
            </>
          ) : (
            "Every look. One membership."
          )}
        </h2>
        <ul className="mt-6 space-y-2.5">
          {RAIL_BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="text-text-secondary flex items-center gap-2.5 text-sm"
            >
              <span className="bg-lime-500/15 text-lime-400 flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                <Check size={11} weight="bold" />
              </span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-text-muted relative flex items-center gap-1.5 text-[11px]">
        <LockSimple size={11} weight="bold" />
        Secure checkout
      </p>
    </aside>
  );
}
