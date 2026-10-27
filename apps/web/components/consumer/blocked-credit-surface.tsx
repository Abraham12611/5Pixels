"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LockSimple } from "@phosphor-icons/react";
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
import {
  cleanWeeklyPlanName,
  ExitStep,
  OfferHeading,
  PlansStep,
  ReferralStep,
  WeeklyPairStep,
  WeeklyPassCards,
  type OfferDeadlineDisplay,
} from "@/components/promo/offer-steps";
import { CreditTopUp } from "@/components/consumer/credit-top-up";
import type { CreditPack } from "@/lib/billing/credit-packs";
import { recordOfferEvent } from "@/lib/offers/actions";
import { formatPrice } from "@/lib/format";
import type { OfferAssignment } from "@/lib/offers/engine";
import type { PlanForPurchase } from "@/lib/db/plans";
import type { BlockedSegment, ResumePlan } from "@/lib/billing/segments";
import { useUiReview } from "@/lib/ui-review/context";

interface TopUpInfo {
  packs: CreditPack[];
  creditsPerTransformation: number | null;
}

type View = "main" | "topup" | "offer";
type FreePlanMode = "weekly" | "pro";

/**
 * Blocked-credit surface (06 §3.4) — one component for desktop dialog and
 * mobile sheet. The body morphs per segment: subscribers get the focused
 * 2×2 credit top-up, weekly buyers "Ready for another week?", lapsed users a
 * reactivation card, and free/new users a clean separated weekly-vs-Pro
 * comparison or campaign offer ladder.
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
  // Inert in the admin popup inspector — no analytics, no checkout submit.
  const uiReview = useUiReview();
  // Sheet tier below lg — this surface's content is denser than the shared
  // sm breakpoint's sheets, so it keeps its own (wider) query.
  const isNarrow = useMediaQuery("(max-width: 1023px)");
  const offerEligible =
    offer !== null && (segment === "new_user" || segment === "free_history");
  const steps = offer?.steps.slice(0, 3) ?? [];
  const startsOnOffer = offerEligible && segment === "new_user" && steps.length > 0;

  const weekly = plans.filter((p) => p.type === "weekly_trial").slice(0, 2);
  const annual = plans.filter((p) => p.type === "annual")[0] ?? null;
  const monthly = plans
    .filter((p) => p.type === "monthly")
    .filter((p) => [2000, 5000].includes(p.price_cents))
    .slice(0, 2);

  const initialSelectedPlanId =
    segment === "lapsed"
      ? (resumePlan?.id ?? null)
      : segment === "weekly_buyer"
        ? (weekly[weekly.length - 1]?.id ?? weekly[0]?.id ?? null)
        : null;

  const [view, setView] = useState<View>(startsOnOffer ? "offer" : "main");
  const [planMode, setPlanMode] = useState<FreePlanMode>(
    weekly.length > 0 ? "weekly" : "pro"
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    initialSelectedPlanId
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
      setPlanMode(weekly.length > 0 ? "weekly" : "pro");
      setSelectedPlanId(initialSelectedPlanId);
      setView(startsOnOffer ? "offer" : "main");
    }
  }

  function fire(
    event: Parameters<typeof recordOfferEvent>[0]["event"],
    meta?: Record<string, unknown>
  ) {
    if (uiReview) return Promise.resolve({ ok: true });
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
    if (impressionSent.current || uiReview) return;
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
    if (uiReview) return;
    checkoutFormRef.current?.submit();
  }

  const monthlyAnchor = annual
    ? (monthly.find((m) => m.credits_grant === annual.credits_grant) ??
      monthly[0] ??
      null)
    : (monthly[0] ?? null);
  const effectiveMonthlyCents = annual
    ? Math.round(annual.price_cents / 12)
    : 0;

  const endsLabel = planEndsAt
    ? new Date(planEndsAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  // Free-history CTA label — restates the selected deal honestly (including
  // annual billing total when an annual plan is selected).
  const freeSelected = [...weekly, ...(annual ? [annual] : []), ...monthly].find(
    (p) => p.id === selectedPlanId
  );
  const freeContinueLabel = !freeSelected
    ? "Choose a plan"
    : freeSelected.type === "annual"
      ? `Continue with ${freeSelected.name} — ${formatPrice(effectiveMonthlyCents)}/mo (${formatPrice(freeSelected.price_cents)}/yr)`
      : freeSelected.type === "monthly"
        ? `Continue with ${freeSelected.name} — ${formatPrice(freeSelected.price_cents)}/mo`
        : `Continue with ${cleanWeeklyPlanName(freeSelected.name)} — ${formatPrice(freeSelected.price_cents)}`;

  const selectedWeeklyBuyerPlan =
    weekly.find((p) => p.id === selectedPlanId) ?? null;

  const contextCard = (
    <div className="border-cream-100/10 bg-charcoal-800/70 flex items-center gap-3 rounded-xl border p-3">
      {presetThumbUrl ? (
        <Image
          src={presetThumbUrl}
          alt=""
          width={40}
          height={50}
          className="h-12 w-10 shrink-0 rounded-lg object-cover"
          unoptimized
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-cream-50 truncate text-sm font-semibold">
          {presetName}
        </p>
        <p className="text-text-muted text-xs">Your setup is saved</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-cream-50 text-xs font-semibold tabular-nums">
          {required} needed
        </p>
        <p className="text-text-muted text-xs tabular-nums">
          {balance} available
        </p>
      </div>
    </div>
  );

  const mainBody = (
    <>
      {segment === "subscriber" || segment === "canceling" ? (
        <div className="space-y-4">
          <OfferHeading
            eyebrow="Add credits"
            title="Keep creating."
            sub="Add credits to finish your look. Choose an amount below."
          />
          {segment === "canceling" && (
            <p className="border-warning/25 bg-warning/10 text-warning rounded-xl border px-3.5 py-2.5 text-xs">
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
          <OfferHeading
            eyebrow="Welcome back"
            title="Your look is ready to finish."
            sub={
              resumePlan
                ? `Your ${resumePlan.name} plan ended — restart it or top up just for this one.`
                : "Restart a plan or top up just for this one."
            }
          />
          {resumePlan && (
            <PlanRow
              name={resumePlan.name}
              cadence={
                resumePlan.interval === "annual"
                  ? `per month · ${formatPrice(resumePlan.priceCents)} billed annually`
                  : "per month · billed monthly"
              }
              priceCents={
                resumePlan.interval === "annual"
                  ? Math.round(resumePlan.priceCents / 12)
                  : resumePlan.priceCents
              }
              priceCaption="per month"
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
          <OfferHeading
            eyebrow="7-day pass"
            title="Ready for another week?"
            sub="Get credits for 7 days. Pay once, doesn't renew."
          />
          <WeeklyPassCards
            plans={weekly}
            selectedId={selectedPlanId}
            onSelect={setSelectedPlanId}
          />
          <Button
            variant="brand"
            size="lg"
            className="w-full"
            disabled={!selectedWeeklyBuyerPlan}
            onClick={() =>
              selectedWeeklyBuyerPlan &&
              void acceptPlan(selectedWeeklyBuyerPlan.id)
            }
          >
            {selectedWeeklyBuyerPlan
              ? `Continue with ${cleanWeeklyPlanName(selectedWeeklyBuyerPlan.name)} — ${formatPrice(selectedWeeklyBuyerPlan.price_cents)}`
              : "Choose a pass"}
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
        /* free_history — separated weekly-vs-Pro decision */
        <div className="space-y-4">
          <OfferHeading
            eyebrow={
              planMode === "pro" && weekly.length > 0
                ? "Pro membership"
                : "Flexible access"
            }
            title="Choose how you create."
            sub={
              planMode === "pro" && weekly.length > 0
                ? "Monthly credits that refresh automatically. Cancel anytime."
                : `${presetName} needs ${required} ${required === 1 ? "credit" : "credits"}. Your settings and photo are saved.`
            }
          />

          {planMode === "weekly" && weekly.length > 0 ? (
            <>
              <WeeklyPassCards
                plans={weekly}
                selectedId={selectedPlanId}
                onSelect={setSelectedPlanId}
              />
              <Button
                variant="brand"
                size="lg"
                className="w-full"
                disabled={!selectedPlanId}
                onClick={() =>
                  selectedPlanId && void acceptPlan(selectedPlanId)
                }
              >
                {freeContinueLabel}
              </Button>

              {(annual || monthlyAnchor) && (
                <div className="border-cream-100/10 bg-charcoal-800/40 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5">
                  <span className="text-text-secondary text-xs">
                    Need more credits regularly?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPlanMode("pro");
                      setSelectedPlanId(
                        annual?.id ?? monthlyAnchor?.id ?? null
                      );
                    }}
                    className="text-lime-400 hover:text-lime-300 shrink-0 text-xs font-semibold transition-colors"
                  >
                    Explore Pro plans →
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {(annual || monthlyAnchor) && (
                <div className="space-y-2.5">
                  {annual && (
                    <div>
                      <PlanRow
                        name={annual.name}
                        cadence={`per month · ${formatPrice(annual.price_cents)} billed annually`}
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
                        headerTone="lime"
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
                      cadence="per month · billed monthly"
                      priceCents={monthlyAnchor.price_cents}
                      priceCaption="per month"
                      bullets={[
                        {
                          icon: "credits",
                          text: `${monthlyAnchor.credits_grant.toLocaleString()} credits every month`,
                          dimmed: Boolean(annual),
                        },
                      ]}
                      selected={selectedPlanId === monthlyAnchor.id}
                      onSelect={() => setSelectedPlanId(monthlyAnchor.id)}
                      dimmed={Boolean(annual)}
                    />
                  )}
                </div>
              )}
              <Button
                variant="brand"
                size="lg"
                className="w-full"
                disabled={!selectedPlanId}
                onClick={() =>
                  selectedPlanId && void acceptPlan(selectedPlanId)
                }
              >
                {freeContinueLabel}
              </Button>
              {weekly.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPlanMode("weekly");
                    setSelectedPlanId(null);
                  }}
                  className="text-lime-400 hover:text-lime-300 block w-full text-center text-xs font-medium transition-colors"
                >
                  ← Back to 7-day passes
                </button>
              )}
            </>
          )}

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
      {step?.kind === "discount" && (
        <div className="mb-3">
          <OfferBadge tone="promo">Special offer</OfferBadge>
        </div>
      )}
      <div key={step?.position ?? 0} className="animate-fade-in">
        {step?.kind === "weekly_pair" && (
          <WeeklyPairStep
            plans={weekly}
            headline={step.payload.headline as string | undefined}
            onAccept={(id) => void acceptPlan(id)}
          />
        )}
        {(step?.kind === "plans" || step?.kind === "discount") && (
          <PlansStep
            eyebrow={step.kind === "discount" ? "Limited time" : "Pro membership"}
            headline={
              (step.payload.headline as string) ??
              (step.kind === "discount"
                ? "Limited-time discount"
                : "Unlock every look")
            }
            annual={annual}
            monthly={monthly}
            selected={selectedPlanId}
            onSelect={setSelectedPlanId}
            onAccept={(id) => void acceptPlan(id)}
            deadlineDisplay={
              step.kind === "discount" && step.payload.ends_at
                ? ((step.payload.deadline_display as OfferDeadlineDisplay) ??
                  "date")
                : "none"
            }
            endsAt={(step.payload.ends_at as string) ?? null}
          />
        )}
        {step?.kind === "topup" &&
          (topUp ? (
            <div className="space-y-4">
              <OfferHeading
                eyebrow="One-time credits"
                title="Keep creating."
                sub="Add credits to finish your look. Choose an amount below."
              />
              <CreditTopUp
                packs={topUp.packs}
                creditsPerTransformation={topUp.creditsPerTransformation}
              />
            </div>
          ) : null)}
        {step?.kind === "referral" && (
          <ReferralStep referralCode={referralCode} />
        )}
        {step?.kind === "exit" && (
          <ExitStep
            title="No pressure"
            description="Your photo and settings are saved — pick a plan whenever you're ready."
            buttonLabel="Back to your look"
            onDismiss={close}
          />
        )}
      </div>
      {step?.kind !== "exit" && (
        <div className="mt-4 text-center">
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
      <OfferHeading
        eyebrow="Add credits"
        title="Keep creating."
        sub="Add credits to finish your look. Choose an amount below."
      />
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

  const showFooterNote =
    segment !== "subscriber" && segment !== "canceling";

  const footer =
    view === "main" ? (
      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={cancelMain}
          className="text-text-muted hover:text-cream-100 block w-full text-center text-sm transition-colors"
        >
          Not now
        </button>
        {showFooterNote && (
          <p className="text-text-muted flex items-center justify-center gap-1.5 text-[11px]">
            <LockSimple size={11} weight="bold" />
            Secure checkout · One-time or cancel anytime
          </p>
        )}
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
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-[560px]">
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
