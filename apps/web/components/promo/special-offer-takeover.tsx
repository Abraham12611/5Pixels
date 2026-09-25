"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { OfferBadge } from "./offer-badge";
import { PlanRow, type PlanRowBullet } from "./plan-row";
import { ReferralCard } from "./referral-card";
import { SaveLine } from "./save-line";
import { recordOfferEvent, optOutOffers } from "@/lib/offers/actions";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OfferAssignment, OfferStep } from "@/lib/offers/engine";
import type { PlanForPurchase } from "@/lib/db/plans";

/**
 * S7 — full-screen special-offer takeover (07 §4). Renders the assigned
 * campaign's ladder in place: decline advances the step inside the same
 * surface (cross-fade), never stacked modals. Accept posts to the normal
 * checkout endpoint with promo attribution; every transition is a validated
 * promo event. Client never writes `converted` — the webhook does (09 §2).
 */
export function SpecialOfferTakeover({
  assignment,
  plans,
  context = "signup_completed_no_credits",
  pendingProductName,
  referralUserId,
  onClose,
}: {
  assignment: OfferAssignment;
  plans: PlanForPurchase[];
  context?: string;
  /** Set when a saved teaser exists — copy leans on the pending result. */
  pendingProductName?: string;
  referralUserId?: string;
  onClose: () => void;
}) {
  const { campaignId, variant } = assignment;
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
    if (impressionSent.current) return;
    impressionSent.current = true;
    void recordOfferEvent({
      campaignId,
      variant,
      surface: "takeover",
      event: "impression",
      context,
    });
  }, [campaignId, variant, context]);

  useEffect(() => {
    if (!step || closed) return;
    void recordOfferEvent({
      campaignId,
      variant,
      step: step.position,
      surface: "takeover",
      event: "step_view",
      context,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, closed]);

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
    void optOutOffers(campaignId);
    setClosed(true);
    onClose();
  }

  async function acceptPlan(planId: string) {
    // accept/checkout_started matter for measurement — await them before
    // the POST navigates away and cancels in-flight requests.
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
    if (planInputRef.current) planInputRef.current.value = planId;
    checkoutFormRef.current?.submit();
  }

  const weekly = plans.filter((p) => p.type === "weekly_trial").slice(0, 2);
  const annual = plans.filter((p) => p.type === "annual").slice(0, 2);
  const monthly = plans.filter((p) => p.type === "monthly");
  const extraCredit = plans.find((p) => p.type === "extra_credit") ?? null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-ink-950">
      {/* Header bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-ink-950/90 px-5 py-4 backdrop-blur">
        <OfferBadge tone="promo">Special offer</OfferBadge>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close offer"
          className="text-text-secondary hover:text-cream-50 flex h-9 w-9 items-center justify-center rounded-full bg-charcoal-800 transition-colors"
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col px-5 pb-28 pt-6">
        {pendingProductName && (
          <p className="text-lime-400 mb-4 text-center text-sm font-medium">
            Your {pendingProductName} result is saved and waiting
          </p>
        )}

        <div
          key={step.position}
          className="animate-fade-in flex flex-1 flex-col"
        >
          {step.kind === "weekly_pair" && (
            <WeeklyPairStep
              plans={weekly}
              headline={(step.payload.headline as string) ?? "Start with a weekly pass"}
              onAccept={acceptPlan}
            />
          )}

          {step.kind === "plans" && (
            <PlansStep
              headline={(step.payload.headline as string) ?? "Unlock every look"}
              annual={annual}
              monthly={monthly}
              selected={selectedPlanId}
              onSelect={setSelectedPlanId}
              onAccept={acceptPlan}
            />
          )}

          {step.kind === "referral" && (
            <ReferralStep referralUserId={referralUserId} />
          )}

          {step.kind === "topup" && extraCredit && (
            <TopUpStep plan={extraCredit} onAccept={acceptPlan} />
          )}

          {step.kind === "discount" && (
            <PlansStep
              headline={(step.payload.headline as string) ?? "Limited-time discount"}
              annual={annual}
              monthly={monthly}
              selected={selectedPlanId}
              onSelect={setSelectedPlanId}
              onAccept={acceptPlan}
              deadlineDisplay={
                (step.payload.deadline_display as "none" | "date" | "countdown") ?? "none"
              }
              endsAt={(step.payload.ends_at as string) ?? null}
            />
          )}

          {step.kind === "exit" && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <h2 className="font-display text-cream-50 text-3xl font-bold">
                {pendingProductName
                  ? `Your ${pendingProductName} will be waiting`
                  : "No pressure"}
              </h2>
              <p className="text-text-secondary mt-3 max-w-sm text-sm">
                {pendingProductName
                  ? "Your photo and settings are saved — pick a plan whenever you're ready to see it."
                  : "Browse freely — plans are here whenever you want to create."}
              </p>
              <Button
                variant="secondary"
                size="lg"
                className="mt-6"
                onClick={dismiss}
              >
                Back to the app
              </Button>
            </div>
          )}
        </div>

        {/* Decline cascade — hidden on the exit step */}
        {step.kind !== "exit" && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={decline}
              className="text-text-muted hover:text-cream-100 text-sm transition-colors"
            >
              {isLastStep ? "No thanks" : "Not now"}
            </button>
          </div>
        )}

        {/* Checkout POST + opt-out footer */}
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
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-cream-100/10 bg-ink-950/90 px-5 py-3 text-center backdrop-blur">
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
  );
}

/* ----------------------------------------------------------------------- */
/* Step bodies                                                              */
/* ----------------------------------------------------------------------- */

function WeeklyPairStep({
  plans: weeklies,
  headline,
  onAccept,
}: {
  plans: PlanForPurchase[];
  headline: string;
  onAccept: (planId: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <h2 className="font-display text-cream-50 text-center text-3xl font-bold leading-tight">
        {headline}
      </h2>
      <p className="text-text-secondary mt-2 text-center text-sm">
        One-time purchases — no subscription.
      </p>
      <div className="mt-6 space-y-3">
        {weeklies.map((plan, i) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => onAccept(plan.id)}
            className={cn(
              "relative w-full overflow-hidden rounded-2xl p-5 text-left transition-transform active:scale-[0.99]",
              i === 0
                ? "border-cream-100/10 bg-charcoal-850 border"
                : "bg-lime-500 text-ink-950"
            )}
          >
            {i === 1 && (
              <OfferBadge tone="neutral" className="absolute right-4 top-4">
                Most picked
              </OfferBadge>
            )}
            <p
              className={cn(
                "font-display text-xl font-bold",
                i === 1 ? "text-ink-950" : "text-cream-50"
              )}
            >
              {plan.name}
            </p>
            <p
              className={cn(
                "mt-1 text-sm",
                i === 1 ? "text-ink-950/75" : "text-text-secondary"
              )}
            >
              {plan.credits_grant.toLocaleString()} credits · one week of looks
            </p>
            <p
              className={cn(
                "font-display mt-3 text-2xl font-bold",
                i === 1 ? "text-ink-950" : "text-cream-50"
              )}
            >
              {formatPrice(plan.price_cents)}
              <span
                className={cn(
                  "ml-1.5 text-xs font-medium",
                  i === 1 ? "text-ink-950/60" : "text-text-muted"
                )}
              >
                one-time
              </span>
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlansStep({
  headline,
  annual,
  monthly,
  selected,
  onSelect,
  onAccept,
  deadlineDisplay = "none",
  endsAt = null,
}: {
  headline: string;
  annual: PlanForPurchase[];
  monthly: PlanForPurchase[];
  selected: string | null;
  onSelect: (id: string) => void;
  onAccept: (id: string) => void;
  deadlineDisplay?: "none" | "date" | "countdown";
  endsAt?: string | null;
}) {
  // Annual-forward: the annual plan is bright + anchored to the matching
  // monthly plan's effective price; the monthly row sits dimmed beneath —
  // the "big/colorful vs shadow" pairing from the references (07 §4).
  const primaryAnnual = annual[0] ?? null;
  const monthlyAnchor = primaryAnnual
    ? (monthly.find((m) => m.credits_grant === primaryAnnual.credits_grant) ??
      monthly[0] ??
      null)
    : null;
  const effectiveMonthlyCents = primaryAnnual
    ? Math.round(primaryAnnual.price_cents / 12)
    : 0;

  const annualBullets: PlanRowBullet[] = primaryAnnual
    ? [
        {
          icon: "credits",
          text: `${primaryAnnual.credits_grant.toLocaleString()} credits every month`,
        },
        { icon: "check", text: "Every preset and poster" },
        { icon: "check", text: "HD downloads" },
      ]
    : [];

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="font-display text-cream-50 text-center text-3xl font-bold leading-tight">
        {headline}
      </h2>
      {deadlineDisplay !== "none" && endsAt && (
        <p className="text-promo mt-2 text-center text-xs font-semibold">
          Offer ends {new Date(endsAt).toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </p>
      )}
      <div className="mt-6 space-y-3">
        {primaryAnnual && (
          <div>
            <PlanRow
              name={primaryAnnual.name}
              cadence="per month, billed annually"
              priceCents={effectiveMonthlyCents}
              anchorCents={monthlyAnchor?.price_cents}
              priceCaption="per month"
              bullets={annualBullets}
              headerTab="Best value"
              headerTone="promo"
              selected={selected === primaryAnnual.id}
              onSelect={() => onSelect(primaryAnnual.id)}
            />
            {monthlyAnchor && (
              <SaveLine
                className="mt-2 text-center"
                annualCents={primaryAnnual.price_cents}
                monthlyCents={monthlyAnchor.price_cents * 12}
              />
            )}
          </div>
        )}
        {monthlyAnchor && (
          <PlanRow
            name={monthlyAnchor.name}
            cadence="per month, billed monthly"
            priceCents={monthlyAnchor.price_cents}
            priceCaption="per month"
            bullets={[
              {
                icon: "credits",
                text: `${monthlyAnchor.credits_grant.toLocaleString()} credits every month`,
              },
              { icon: "check", text: "Every preset and poster", dimmed: true },
            ]}
            selected={selected === monthlyAnchor.id}
            onSelect={() => onSelect(monthlyAnchor.id)}
            dimmed
          />
        )}
      </div>
      <Button
        variant="brand"
        size="lg"
        className="mt-6 w-full"
        disabled={!selected}
        onClick={() => selected && onAccept(selected)}
      >
        {selected
          ? `Continue — ${
              selected === primaryAnnual?.id
                ? `${formatPrice(effectiveMonthlyCents)}/mo`
                : formatPrice(
                    monthlyAnchor?.price_cents ?? 0
                  ) + "/mo"
            }`
          : "Choose a plan"}
      </Button>
    </div>
  );
}

function ReferralStep({
  referralUserId,
}: {
  referralUserId?: string;
}) {
  const referralUrl =
    typeof window !== "undefined" && referralUserId
      ? `${window.location.origin}/signup?ref=${referralUserId}`
      : null;

  return (
    <div className="flex flex-1 flex-col justify-center">
      <h2 className="font-display text-cream-50 text-center text-3xl font-bold leading-tight">
        Or get credits on us
      </h2>
      <p className="text-text-secondary mt-2 text-center text-sm">
        Refer a friend — their credits stay untouched, this one&rsquo;s on us.
      </p>
      <ReferralCard
        className="mt-6"
        referralUrl={referralUrl}
        refereeReward="their first result on us"
        referrerReward="30% of their plan's credits when they subscribe"
      />
      <p className="text-text-muted mt-3 text-center text-[11px]">
        Rewards land after their first plan purchase.
      </p>
    </div>
  );
}

function TopUpStep({
  plan,
  onAccept,
}: {
  plan: PlanForPurchase;
  onAccept: (id: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <h2 className="font-display text-cream-50 text-center text-3xl font-bold leading-tight">
        Just this once
      </h2>
      <button
        type="button"
        onClick={() => onAccept(plan.id)}
        className="border-cream-100/10 bg-charcoal-850 hover:border-lime-500/40 mt-6 flex w-full items-center justify-between rounded-2xl border p-5 text-left transition-colors"
      >
        <span>
          <span className="font-display text-cream-50 block text-xl font-bold">
            {plan.credits_grant.toLocaleString()} credits
          </span>
          <span className="text-text-secondary text-sm">
            One-time top-up — no plan required
          </span>
        </span>
        <span className="font-display text-cream-50 text-2xl font-bold">
          {formatPrice(plan.price_cents)}
        </span>
      </button>
    </div>
  );
}
