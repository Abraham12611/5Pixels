"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, LockSimple } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import { useMediaQuery } from "@/lib/ui/use-media-query";
import { Button } from "@/components/ui/button";
import { PlanRow } from "@/components/promo/plan-row";
import { SaveLine } from "@/components/promo/save-line";
import { OfferBadge } from "@/components/promo/offer-badge";
import { ReferralCard } from "@/components/promo/referral-card";
import { CreditTopUp } from "@/components/consumer/credit-top-up";
import type { CreditPack } from "@/lib/billing/credit-packs";
import { recordOfferEvent } from "@/lib/offers/actions";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OfferAssignment } from "@/lib/offers/engine";
import type { PlanForPurchase } from "@/lib/db/plans";
import type { BlockedSegment, ResumePlan } from "@/lib/billing/segments";

interface TopUpInfo {
  packs: CreditPack[];
  creditsPerTransformation: number | null;
}

type View = "main" | "topup" | "offer";



/**
 * Blocked-credit surface (06 §3.4) — one component for desktop dialog and
 * mobile sheet. The body morphs per segment: subscribers get the top-up only,
 * weekly buyers "Get another week", lapsed users a reactivation card, and
 * free/new users the campaign offer ladder. Cancel transitions into the offer
 * step inside the same overlay when the segment is offer-eligible — never a
 * stacked modal. The create setup stays mounted behind it.
 */
export function BlockedCreditSurface({
  open,
  onOpenChange,
  segment,
  offer,
  plans,
  required,
  balance,
  presetName,
  presetThumbUrl,
  topUp,
  resumePlan,
  planEndsAt,
  activePlanName,
  isReferred = false,
  referralCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment: BlockedSegment;
  offer: OfferAssignment | null;
  plans: PlanForPurchase[];
  required: number;
  balance: number;
  presetName: string;
  presetThumbUrl?: string | null;
  topUp: TopUpInfo | null;
  resumePlan?: ResumePlan | null;
  planEndsAt?: string | null;
  activePlanName?: string;
  isReferred?: boolean;
  referralCode?: string;
}) {
  // Sheet tier below lg — this surface's content is denser than the shared
  // sm breakpoint's sheets, so it keeps its own (wider) query.
  const isNarrow = useMediaQuery("(max-width: 1023px)");
  const offerEligible =
    offer !== null && (segment === "new_user" || segment === "free_history");
  const steps = offer?.steps.slice(0, 3) ?? [];
  const startsOnOffer = offerEligible && segment === "new_user" && steps.length > 0;

  const [view, setView] = useState<View>(startsOnOffer ? "offer" : "main");
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    resumePlan?.id ?? null
  );
  const [wasOpen, setWasOpen] = useState(open);
  const impressionSent = useRef(false);
  const checkoutFormRef = useRef<HTMLFormElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);

  const step = steps[Math.min(stepIndex, Math.max(steps.length - 1, 0))];
  const isLastStep = stepIndex >= steps.length - 1;

  // Reset view state each time the surface opens (adjust-during-render pattern).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStepIndex(0);
      setSelectedPlanId(resumePlan?.id ?? null);
      setView(startsOnOffer ? "offer" : "main");
    }
  }

  function fire(
    event: Parameters<typeof recordOfferEvent>[0]["event"],
    meta?: Record<string, unknown>
  ) {
    return recordOfferEvent({
      campaignId: offer?.campaignId,
      variant: offer?.variant,
      step: step?.position,
      surface: "paywall",
      event,
      context: "blocked_credit",
      meta: { segment, ...meta },
    }).catch(() => ({ ok: false }));
  }

  // Surface impression — once per open.
  useEffect(() => {
    if (!open) {
      impressionSent.current = false;
      return;
    }
    if (impressionSent.current) return;
    impressionSent.current = true;
    void recordOfferEvent({
      campaignId: offer?.campaignId,
      variant: offer?.variant,
      surface: "paywall",
      event: "impression",
      context: "blocked_credit",
      meta: { segment },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Offer step views.
  useEffect(() => {
    if (!open || view !== "offer" || !step) return;
    fire("step_view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, view, stepIndex]);

  if (!open) return null;

  function close() {
    fire("dismiss");
    onOpenChange(false);
  }

  /** "Cancel"/"Not now" on the main view — offer-eligible segments transition
   *  into the ladder inside the same overlay (Linktree pass-through). */
  function cancelMain() {
    fire("decline");
    if (offerEligible && steps.length > 0) {
      setView("offer");
      return;
    }
    close();
  }

  function declineOffer() {
    fire("decline");
    if (isLastStep) {
      close();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  async function acceptPlan(planId: string) {
    // Measurement must land before the POST navigates away.
    await Promise.all([
      fire("accept", { plan_id: planId }),
      fire("checkout_started", { plan_id: planId }),
    ]);
    if (planInputRef.current) planInputRef.current.value = planId;
    checkoutFormRef.current?.submit();
  }

  const weekly = plans.filter((p) => p.type === "weekly_trial").slice(0, 2);
  const annual = plans.filter((p) => p.type === "annual")[0] ?? null;
  const monthly = plans
    .filter((p) => p.type === "monthly")
    .filter((p) => [2000, 5000].includes(p.price_cents))
    .slice(0, 2);
  const monthlyAnchor = annual
    ? (monthly.find((m) => m.credits_grant === annual.credits_grant) ??
      monthly[0] ??
      null)
    : null;
  const effectiveMonthlyCents = annual
    ? Math.round(annual.price_cents / 12)
    : 0;

  const endsLabel = planEndsAt
    ? new Date(planEndsAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  const contextCard = (
    <div className="border-cream-100/10 bg-charcoal-800 flex items-center gap-3 rounded-lg border p-3">
      {presetThumbUrl ? (
        <Image
          src={presetThumbUrl}
          alt=""
          width={40}
          height={50}
          className="h-12 w-10 shrink-0 rounded-md object-cover"
          unoptimized
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-cream-50 truncate text-sm font-semibold">
          {presetName}
        </p>
        <p className="text-text-muted text-xs">
          Your setup is saved while you decide.
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-cream-50 text-xs font-medium tabular-nums">
          {required} {required === 1 ? "credit" : "credits"}
        </p>
        <p className="text-error text-xs tabular-nums">
          you have {balance}
        </p>
      </div>
    </div>
  );

  const weeklyCards = (
    <div className="grid grid-cols-2 gap-3">
      {weekly.map((plan, i) => {
        const name = plan.name
          .replace("Weekly Trial — ", "")
          .replace(" Monthly", "");
        const selected = selectedPlanId === plan.id;
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => setSelectedPlanId(plan.id)}
            aria-pressed={selected}
            className={cn(
              "relative rounded-xl p-4 text-left transition-colors",
              i === 1
                ? "bg-lime-400 text-ink-950"
                : "border-cream-100/10 bg-charcoal-850 text-cream-50 border",
              selected && i !== 1 && "border-lime-400/70 ring-lime-400/40 ring-1",
              selected && i === 1 && "ring-cream-50/70 ring-2"
            )}
          >
            {i === 1 && (
              <span className="bg-ink-950 text-lime-400 absolute -top-2 right-3 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest">
                Popular
              </span>
            )}
            <p
              className={cn(
                "font-display text-lg leading-tight",
                i === 1 ? "text-ink-950" : "text-cream-50"
              )}
            >
              {name}
            </p>
            <p
              className={cn(
                "font-display mt-1 text-2xl font-bold",
                i === 1 ? "text-ink-950" : "text-cream-50"
              )}
            >
              {formatPrice(plan.price_cents)}
              <span
                className={cn(
                  "ml-1 align-middle text-[11px] font-normal",
                  i === 1 ? "text-ink-950/60" : "text-text-muted"
                )}
              >
                one week
              </span>
            </p>
            <p
              className={cn(
                "mt-1 text-xs font-semibold",
                i === 1 ? "text-ink-950/80" : "text-text-secondary"
              )}
            >
              {plan.credits_grant.toLocaleString()} credits
            </p>
            <span
              className={cn(
                "absolute bottom-3 right-3 flex h-5 w-5 items-center justify-center rounded-full border",
                selected
                  ? i === 1
                    ? "border-ink-950 bg-ink-950 text-lime-400"
                    : "border-lime-400 bg-lime-400 text-ink-950"
                  : i === 1
                    ? "border-ink-950/30"
                    : "border-cream-100/25"
              )}
            >
              {selected && <Check size={12} weight="bold" />}
            </span>
          </button>
        );
      })}
    </div>
  );

  const mainBody = (
    <>
      {segment === "subscriber" || segment === "canceling" ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-cream-50 text-lg font-semibold">
              You&rsquo;re out of credits
            </h2>
            <p className="text-text-secondary mt-1 text-sm">
              {activePlanName
                ? `Your ${activePlanName} credits ran out — top up to keep going.`
                : "Top up to keep going — packs never expire."}
            </p>
          </div>
          {segment === "canceling" && (
            <p className="border-warning/25 bg-warning/10 text-warning rounded-lg border px-3.5 py-2.5 text-xs">
              Your {activePlanName ?? "plan"} plan ends {endsLabel} — restart on
              your{" "}
              <Link
                href="/app/billing/plan"
                className="font-semibold underline underline-offset-2"
              >
                plan page
              </Link>{" "}
              to keep monthly credits.
            </p>
          )}
          {topUp ? (
            <CreditTopUp
              packs={topUp.packs}
              creditsPerTransformation={topUp.creditsPerTransformation}
            />
          ) : (
            <Button asChild variant="brand" className="w-full">
              <Link href="/app/billing/credits">Buy credits</Link>
            </Button>
          )}
        </div>
      ) : segment === "lapsed" ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-cream-50 text-lg font-semibold">
              Pick up where you left off
            </h2>
            <p className="text-text-secondary mt-1 text-sm">
              {resumePlan
                ? `Your ${resumePlan.name} plan ended — restart it or top up just for this one.`
                : "Restart a plan or top up just for this one."}
            </p>
          </div>
          {resumePlan && (
            <PlanRow
              name={resumePlan.name}
              cadence={
                resumePlan.interval === "annual"
                  ? "per month, billed annually"
                  : "per month, billed monthly"
              }
              priceCents={
                resumePlan.interval === "annual"
                  ? Math.round(resumePlan.priceCents / 12)
                  : resumePlan.priceCents
              }
              priceCaption={
                resumePlan.interval === "annual" ? "per month" : "per month"
              }
              bullets={[
                {
                  icon: "credits",
                  text: `${resumePlan.creditsGrant.toLocaleString()} credits every month`,
                },
              ]}
              selected={selectedPlanId === resumePlan.id}
              onSelect={() => setSelectedPlanId(resumePlan.id)}
            />
          )}
          <Button
            variant="brand"
            size="lg"
            className="w-full"
            disabled={!selectedPlanId}
            onClick={() => selectedPlanId && void acceptPlan(selectedPlanId)}
          >
            {resumePlan && selectedPlanId === resumePlan.id
              ? `Restart ${resumePlan.name} — ${
                  resumePlan.interval === "annual"
                    ? `${formatPrice(Math.round(resumePlan.priceCents / 12))}/mo`
                    : `${formatPrice(resumePlan.priceCents)}/mo`
                }`
              : "Restart your plan"}
          </Button>
          {!resumePlan && (
            <Button asChild variant="secondary" className="w-full">
              <Link href="/app/billing/plan">See plans</Link>
            </Button>
          )}
          <button
            type="button"
            onClick={() => setView("topup")}
            className="text-text-secondary hover:text-cream-50 block w-full text-center text-xs font-medium transition-colors"
          >
            Or just buy credits — never expire
          </button>
        </div>
      ) : segment === "weekly_buyer" ? (
        <div className="space-y-4">
          <div>
            <p className="text-promo text-[10px] font-bold uppercase tracking-[0.2em]">
              Weekly pass
            </p>
            <h2 className="text-cream-50 mt-1 text-lg font-semibold">
              Get another week
            </h2>
            <p className="text-text-secondary mt-1 text-sm">
              One-time purchases — no subscription, doesn&rsquo;t renew.
            </p>
          </div>
          {weeklyCards}
          <Button
            variant="brand"
            size="lg"
            className="w-full"
            disabled={!selectedPlanId}
            onClick={() => selectedPlanId && void acceptPlan(selectedPlanId)}
          >
            {selectedPlanId
              ? `Get a week — ${formatPrice(
                  weekly.find((p) => p.id === selectedPlanId)?.price_cents ?? 0
                )}`
              : "Pick a week"}
          </Button>
          <button
            type="button"
            onClick={() => setView("topup")}
            className="text-text-secondary hover:text-cream-50 block w-full text-center text-xs font-medium transition-colors"
          >
            Or just buy credits — never expire
          </button>
        </div>
      ) : (
        /* free_history — and new_user fallback when no campaign is live */
        <div className="space-y-4">
          <div>
            <h2 className="text-cream-50 text-lg font-semibold">
              You need credits to generate
            </h2>
            <p className="text-text-secondary mt-1 text-sm">
              {presetName} and your photo are saved — pick a plan to continue.
            </p>
          </div>
          {weekly.length > 0 && weeklyCards}
          {(annual || monthlyAnchor) && (
            <div className="space-y-2.5">
              {annual && (
                <div>
                  <PlanRow
                    name={annual.name}
                    cadence="per month, billed annually"
                    priceCents={effectiveMonthlyCents}
                    anchorCents={monthlyAnchor?.price_cents}
                    priceCaption="per month"
                    bullets={[
                      {
                        icon: "credits",
                        text: `${annual.credits_grant.toLocaleString()} credits every month`,
                      },
                    ]}
                    headerTab="Best value"
                    headerTone="promo"
                    selected={selectedPlanId === annual.id}
                    onSelect={() => setSelectedPlanId(annual.id)}
                  />
                  {monthlyAnchor && (
                    <SaveLine
                      className="mt-1.5 pl-1"
                      annualCents={annual.price_cents}
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
                      dimmed: true,
                    },
                  ]}
                  selected={selectedPlanId === monthlyAnchor.id}
                  onSelect={() => setSelectedPlanId(monthlyAnchor.id)}
                  dimmed
                />
              )}
            </div>
          )}
          <Button
            variant="brand"
            size="lg"
            className="w-full"
            disabled={!selectedPlanId}
            onClick={() => selectedPlanId && void acceptPlan(selectedPlanId)}
          >
            {selectedPlanId
              ? `Continue — ${formatPrice(
                  [...weekly, ...(annual ? [annual] : []), ...monthly].find(
                    (p) => p.id === selectedPlanId
                  )?.price_cents ?? 0
                )}`
              : "Choose a plan"}
          </Button>
          <button
            type="button"
            onClick={() => setView("topup")}
            className="text-text-secondary hover:text-cream-50 block w-full text-center text-xs font-medium transition-colors"
          >
            Or just buy credits — any amount, never expire
          </button>
          {isReferred && (
            <p className="text-text-muted text-center text-[11px]">
              Invited by a friend?{" "}
              <Link
                href="/app/referrals"
                className="text-lime-400 font-medium"
              >
                Invite friends — earn credits
              </Link>{" "}
              when they subscribe.
            </p>
          )}
        </div>
      )}
    </>
  );

  const offerBody = (
    <>
      <OfferBadge tone="promo">Special offer</OfferBadge>
      <div key={step?.position ?? 0} className="animate-fade-in mt-4">
        {step?.kind === "weekly_pair" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-cream-50 text-lg font-semibold">
                {(step.payload.headline as string) ?? "Start with a week"}
              </h2>
              <p className="text-text-secondary mt-1 text-sm">
                One-time purchases — no subscription.
              </p>
            </div>
            <div className="space-y-2.5">
              {weekly.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => void acceptPlan(plan.id)}
                  className="border-cream-100/10 bg-charcoal-850 hover:border-lime-500/40 flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors"
                >
                  <span>
                    <span className="text-cream-50 block text-sm font-semibold">
                      {plan.name.replace("Weekly Trial — ", "")}
                    </span>
                    <span className="text-text-muted text-xs">
                      {plan.credits_grant.toLocaleString()} credits · one week
                    </span>
                  </span>
                  <span className="font-display text-cream-50 text-lg font-bold">
                    {formatPrice(plan.price_cents)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {(step?.kind === "plans" || step?.kind === "discount") && (
          <div className="space-y-4">
            <div>
              <h2 className="text-cream-50 text-lg font-semibold">
                {(step.payload.headline as string) ?? "Unlock every look"}
              </h2>
              {step.kind === "discount" &&
                typeof step.payload.ends_at === "string" && (
                <p className="text-promo mt-1 text-xs font-semibold">
                  Offer ends{" "}
                  {new Date(step.payload.ends_at as string).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric" }
                  )}
                </p>
              )}
            </div>
            {annual && (
              <div>
                <PlanRow
                  name={annual.name}
                  cadence="per month, billed annually"
                  priceCents={effectiveMonthlyCents}
                  anchorCents={monthlyAnchor?.price_cents}
                  priceCaption="per month"
                  bullets={[
                    {
                      icon: "credits",
                      text: `${annual.credits_grant.toLocaleString()} credits every month`,
                    },
                    { icon: "check", text: "Every preset and poster" },
                  ]}
                  headerTab="Best value"
                  headerTone="promo"
                  selected={selectedPlanId === annual.id}
                  onSelect={() => setSelectedPlanId(annual.id)}
                />
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
                    dimmed: true,
                  },
                ]}
                selected={selectedPlanId === monthlyAnchor.id}
                onSelect={() => setSelectedPlanId(monthlyAnchor.id)}
                dimmed
              />
            )}
            <Button
              variant="brand"
              size="lg"
              className="w-full"
              disabled={!selectedPlanId}
              onClick={() => selectedPlanId && void acceptPlan(selectedPlanId)}
            >
              {selectedPlanId
                ? `Continue — ${formatPrice(
                    [...(annual ? [annual] : []), ...monthly].find(
                      (p) => p.id === selectedPlanId
                    )?.price_cents ?? 0
                  )}`
                : "Choose a plan"}
            </Button>
          </div>
        )}
        {step?.kind === "topup" &&
          (topUp ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-cream-50 text-lg font-semibold">
                  Just this once
                </h2>
                <p className="text-text-secondary mt-1 text-sm">
                  One-time credits — never expire.
                </p>
              </div>
              <CreditTopUp
                packs={topUp.packs}
                creditsPerTransformation={topUp.creditsPerTransformation}
              />
            </div>
          ) : null)}
        {step?.kind === "referral" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-cream-50 text-lg font-semibold">
                Or get credits on us
              </h2>
              <p className="text-text-secondary mt-1 text-sm">
                Refer a friend — this one&rsquo;s on us.
              </p>
            </div>
            <ReferralCard
              referralUrl={
                referralCode
                  ? `${typeof window !== "undefined" ? window.location.origin : ""}/r/${referralCode}`
                  : null
              }
              referralCode={referralCode}
              refereeReward="their first result on us"
              referrerReward="30% of their plan's credits when they subscribe"
            />
          </div>
        )}
        {step?.kind === "exit" && (
          <div className="py-8 text-center">
            <h2 className="text-cream-50 text-lg font-semibold">No pressure</h2>
            <p className="text-text-secondary mt-2 text-sm">
              Your photo and settings are saved — pick a plan whenever
              you&rsquo;re ready.
            </p>
            <Button
              variant="secondary"
              className="mt-5"
              onClick={close}
            >
              Back to your look
            </Button>
          </div>
        )}
      </div>
      {step?.kind !== "exit" && (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={declineOffer}
            className="text-text-muted hover:text-cream-100 text-sm transition-colors"
          >
            {isLastStep ? "No thanks" : "Not now"}
          </button>
        </div>
      )}
    </>
  );

  const topupBody = (
    <div className="space-y-4">
      <div>
        <h2 className="text-cream-50 text-lg font-semibold">Buy credits</h2>
        <p className="text-text-secondary mt-1 text-sm">
          One-time packs — credits never expire.
        </p>
      </div>
      {topUp ? (
        <CreditTopUp
          packs={topUp.packs}
          creditsPerTransformation={topUp.creditsPerTransformation}
        />
      ) : (
        <Button asChild variant="brand" className="w-full">
          <Link href="/app/billing/credits">Open credit packs</Link>
        </Button>
      )}
      <button
        type="button"
        onClick={() => setView(startsOnOffer ? "offer" : "main")}
        className="text-text-muted hover:text-cream-100 block w-full text-center text-xs transition-colors"
      >
        Back
      </button>
    </div>
  );

  const footer =
    view === "main" ? (
      <div className="mt-5 space-y-2">
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={cancelMain}
        >
          Not now
        </Button>
        <p className="text-text-muted flex items-center justify-center gap-1.5 text-[11px]">
          <LockSimple size={12} weight="bold" />
          Secure checkout · weekly passes are one-time purchases
        </p>
      </div>
    ) : null;

  const body = (
    <>
      {contextCard}
      <div className="mt-4">
        {view === "offer" ? offerBody : view === "topup" ? topupBody : mainBody}
      </div>
      {footer}
      {/* Shared checkout POST — every accept path funnels through here so
          campaign attribution rides along when a ladder is in play. */}
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
        {offer && (
          <>
            <input
              type="hidden"
              name="campaign_id"
              value={offer.campaignId}
            />
            <input
              type="hidden"
              name="campaign_variant"
              value={offer.variant}
            />
            <input
              type="hidden"
              name="campaign_step"
              value={step?.position ?? ""}
            />
          </>
        )}
      </form>
    </>
  );

  if (isNarrow) {
    return (
      <Sheet
        open={open}
        onOpenChange={(o) => {
          if (!o) close();
        }}
        tier="content"
        title="5Pixels"
        ariaLabel="Add credits to generate"
      >
        {body}
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-lg">
      <DialogContent>
        <DialogTitle className="sr-only">Add credits to generate</DialogTitle>
        <DialogDescription className="sr-only">
          {presetName} needs {required} credits — you have {balance}.
        </DialogDescription>
        {body}
      </DialogContent>
    </Dialog>
  );
}
