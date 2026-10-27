"use client";

import { useEffect, useState } from "react";
import { Check, LockSimple, Timer } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PlanRow } from "./plan-row";
import { ReferralCard } from "./referral-card";
import { SaveLine } from "./save-line";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlanForPurchase } from "@/lib/db/plans";

export type OfferDeadlineDisplay = "none" | "date" | "countdown";

/**
 * Normalize weekly pass titles so "Weekly Trial" never appears in user-facing
 * UI ("trial" can imply a free trial or auto-renewing subscription).
 */
export function cleanWeeklyPlanName(raw: string): string {
  return raw
    .replace(/^Weekly Trial\s*[—-]\s*/i, "")
    .replace(/^Weekly\s+/i, "")
    .replace(/\s+Monthly$/i, "")
    .trim();
}

/**
 * Shared offer-step bodies — one visual grammar for the offer family, used
 * by both the SpecialOfferTakeover and the blocked-credit surface's offer
 * view so the two can never drift apart. All components are presentational:
 * analytics and checkout submission stay with the parent surface.
 */

export function OfferHeading({
  eyebrow,
  eyebrowTone = "lime",
  title,
  sub,
  deadline,
  align = "left",
}: {
  eyebrow?: string;
  eyebrowTone?: "lime" | "promo" | "muted";
  title: string;
  sub?: string;
  deadline?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={cn(align === "center" ? "text-center" : "text-left")}>
      {eyebrow ? (
        <p
          className={cn(
            "mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]",
            eyebrowTone === "lime" && "text-lime-400",
            eyebrowTone === "promo" && "text-promo",
            eyebrowTone === "muted" && "text-text-muted"
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display text-cream-50 text-2xl font-bold leading-tight">
        {title}
      </h2>
      {sub ? (
        <p className="text-text-secondary mt-1.5 text-sm leading-relaxed">
          {sub}
        </p>
      ) : null}
      {deadline ? (
        <div
          className={cn(
            "mt-2.5 flex",
            align === "center" ? "justify-center" : "justify-start"
          )}
        >
          {deadline}
        </div>
      ) : null}
    </div>
  );
}

/** Deadline affordance — a quiet date line, or a live ticking chip. */
export function OfferDeadline({
  display = "none",
  endsAt,
  className,
}: {
  display?: OfferDeadlineDisplay;
  endsAt?: string | null;
  className?: string;
}) {
  if (display === "none" || !endsAt) return null;
  const d = new Date(endsAt);
  if (Number.isNaN(d.getTime())) return null;
  if (display === "countdown") {
    return <CountdownChip endsAt={endsAt} className={className} />;
  }
  return (
    <p className={cn("text-promo text-xs font-semibold", className)}>
      Offer ends{" "}
      {d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      })}
    </p>
  );
}

function CountdownChip({
  endsAt,
  className,
}: {
  endsAt: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(endsAt).getTime() - now);
  const s = Math.floor(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const label =
    ms <= 0
      ? "Ending soon"
      : `Ends in ${hh > 0 ? `${hh}:` : ""}${pad(mm)}:${pad(ss)}`;
  return (
    <span
      role="timer"
      className={cn(
        "border-promo/40 bg-promo-soft text-promo inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums",
        className
      )}
    >
      <Timer size={12} weight="bold" />
      {label}
    </span>
  );
}

/** Quiet reassurance line under a money CTA. */
export function OfferCtaNote({
  children = "Secure checkout · Cancel anytime",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-text-muted mt-2.5 flex items-center justify-center gap-1.5 text-[11px]",
        className
      )}
    >
      <LockSimple size={11} weight="bold" />
      {children}
    </p>
  );
}

/**
 * Reusable 7-day pass selector cards (Starter & Plus) — two dark cards with
 * subtle borders; the recommended Plus card carries a "Best value" badge, and
 * the active selection gets a deliberate lime border + soft green indicator.
 */
export function WeeklyPassCards({
  plans,
  selectedId,
  onSelect,
}: {
  plans: PlanForPurchase[];
  selectedId: string | null;
  onSelect: (planId: string) => void;
}) {
  const starter = plans[0];
  const starterRate =
    starter && starter.price_cents > 0
      ? starter.credits_grant / starter.price_cents
      : 0;

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      role="radiogroup"
      aria-label="7-day passes"
    >
      {plans.map((plan, i) => {
        const cleanName = cleanWeeklyPlanName(plan.name);
        const recommended = plans.length > 1 && i === plans.length - 1;
        const selected = selectedId === plan.id;
        const rate =
          plan.price_cents > 0 ? plan.credits_grant / plan.price_cents : 0;
        const bonusPct =
          recommended && starterRate > 0
            ? Math.round(((rate - starterRate) / starterRate) * 100)
            : 0;
        const subtext = recommended
          ? bonusPct > 0
            ? `${bonusPct}% more credits per dollar`
            : "7-day pass · best value"
          : "A simple way to get started";

        return (
          <button
            key={plan.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(plan.id)}
            className={cn(
              "relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all",
              selected
                ? "border-lime-400 bg-lime-500/[0.06] ring-1 ring-lime-400/25"
                : recommended
                  ? "border-lime-400/35 bg-charcoal-800/70 hover:border-lime-400/60"
                  : "border-cream-100/10 bg-charcoal-800/60 hover:border-cream-100/25"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-cream-50 text-lg font-bold leading-tight">
                  {cleanName}
                </span>
                {recommended && (
                  <span className="border-lime-400/30 bg-lime-400/15 text-lime-300 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                    Best value
                  </span>
                )}
              </div>
              <span
                aria-hidden
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  selected
                    ? "border-lime-400 bg-lime-400 text-ink-950"
                    : "border-cream-100/25 bg-charcoal-900/50"
                )}
              >
                {selected && <Check size={11} weight="bold" />}
              </span>
            </div>

            <div className="mt-3">
              <p className="text-cream-50 text-sm font-semibold tabular-nums">
                {plan.credits_grant.toLocaleString()} credits{" "}
                <span className="text-text-muted font-normal">· 7 days</span>
              </p>
              <p className="text-text-secondary mt-0.5 text-xs">{subtext}</p>
            </div>

            <div className="border-cream-100/10 mt-3.5 flex items-baseline justify-between border-t pt-3">
              <span className="font-display text-cream-50 text-2xl font-bold leading-none tabular-nums">
                {formatPrice(plan.price_cents)}
              </span>
              <span className="text-text-muted text-[11px]">one-time</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Weekly passes step — selectable dark cards + one primary CTA underneath
 * ("Continue with Plus — $10") that updates when the selection changes.
 */
export function WeeklyPairStep({
  plans,
  headline,
  eyebrow = "Your first week",
  sub = "Get credits to explore looks. Pay once, with no subscription.",
  onAccept,
}: {
  plans: PlanForPurchase[];
  headline?: string;
  eyebrow?: string;
  sub?: string;
  onAccept: (planId: string) => void;
}) {
  const defaultPlan =
    plans.length > 1 ? plans[plans.length - 1] : (plans[0] ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(
    defaultPlan?.id ?? null
  );
  const selectedPlan =
    plans.find((p) => p.id === selectedId) ?? defaultPlan ?? null;
  const selectedName = selectedPlan
    ? cleanWeeklyPlanName(selectedPlan.name)
    : "";

  const resolvedHeadline =
    !headline ||
    headline === "Start with a weekly pass" ||
    headline === "Start with a week"
      ? "Your first week starts here."
      : headline;

  return (
    <div className="flex flex-col">
      <OfferHeading eyebrow={eyebrow} title={resolvedHeadline} sub={sub} />
      <div className="mt-5">
        <WeeklyPassCards
          plans={plans}
          selectedId={selectedPlan?.id ?? null}
          onSelect={setSelectedId}
        />
      </div>
      <Button
        variant="brand"
        size="lg"
        className="mt-5 w-full"
        disabled={!selectedPlan}
        onClick={() => selectedPlan && onAccept(selectedPlan.id)}
      >
        {selectedPlan
          ? `Continue with ${selectedName} — ${formatPrice(selectedPlan.price_cents)}`
          : "Choose a pass"}
      </Button>
      <OfferCtaNote>Secure checkout · One-time purchase</OfferCtaNote>
    </div>
  );
}

/**
 * Annual-forward plan picker — transparent annual billing ("$540 billed
 * annually" alongside the monthly equivalent) and one clear CTA.
 */
export function PlansStep({
  headline,
  eyebrow = "Pro membership",
  annual,
  monthly,
  selected,
  onSelect,
  onAccept,
  deadlineDisplay = "none",
  endsAt = null,
  ctaNote,
}: {
  headline: string;
  eyebrow?: string;
  annual: PlanForPurchase | null;
  monthly: PlanForPurchase[];
  selected: string | null;
  onSelect: (id: string) => void;
  onAccept: (id: string) => void;
  deadlineDisplay?: OfferDeadlineDisplay;
  endsAt?: string | null;
  ctaNote?: string;
}) {
  const monthlyAnchor = annual
    ? (monthly.find((m) => m.credits_grant === annual.credits_grant) ??
      monthly[0] ??
      null)
    : (monthly[0] ?? null);
  const effectiveMonthlyCents = annual
    ? Math.round(annual.price_cents / 12)
    : 0;
  const resolvedSelected =
    selected ?? annual?.id ?? monthlyAnchor?.id ?? null;
  const isAnnualSelected =
    resolvedSelected !== null && resolvedSelected === annual?.id;

  return (
    <div className="flex flex-col">
      <OfferHeading
        eyebrow={eyebrow}
        eyebrowTone={deadlineDisplay !== "none" ? "promo" : "lime"}
        title={headline}
        sub="Monthly credits that refresh automatically. Cancel anytime."
        deadline={
          <OfferDeadline display={deadlineDisplay} endsAt={endsAt} />
        }
      />
      <div className="mt-5 space-y-3">
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
                { icon: "check", text: "HD downloads" },
              ]}
              headerTab="Best value"
              headerTone="lime"
              selected={isAnnualSelected}
              onSelect={() => onSelect(annual.id)}
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
              },
              {
                icon: "check",
                text: "Every preset and poster",
                dimmed: !annual,
              },
            ]}
            selected={resolvedSelected === monthlyAnchor.id}
            onSelect={() => onSelect(monthlyAnchor.id)}
            dimmed={Boolean(annual)}
          />
        )}
      </div>
      <Button
        variant="brand"
        size="lg"
        className="mt-5 w-full"
        disabled={!resolvedSelected}
        onClick={() => resolvedSelected && onAccept(resolvedSelected)}
      >
        {resolvedSelected
          ? isAnnualSelected && annual
            ? `Continue with ${annual.name} — ${formatPrice(effectiveMonthlyCents)}/mo (${formatPrice(annual.price_cents)}/yr)`
            : `Continue with ${monthlyAnchor?.name ?? "Monthly"} — ${formatPrice(monthlyAnchor?.price_cents ?? 0)}/mo`
          : "Choose a plan"}
      </Button>
      <OfferCtaNote>{ctaNote ?? "Secure checkout · Cancel anytime"}</OfferCtaNote>
    </div>
  );
}

/** One-shot credit pack offered as a plan — selectable card + clear CTA. */
export function TopUpStep({
  plan,
  onAccept,
  title = "Keep creating.",
  sub = "Add a one-time credit pack — never expires, no subscription required.",
}: {
  plan: PlanForPurchase;
  onAccept: (id: string) => void;
  title?: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col">
      <OfferHeading eyebrow="One-time credits" title={title} sub={sub} />
      <div className="border-lime-400 bg-lime-500/[0.06] ring-lime-400/25 mt-5 flex w-full items-center justify-between rounded-2xl border p-4 text-left ring-1">
        <span>
          <span className="font-display text-cream-50 block text-xl font-bold">
            {plan.credits_grant.toLocaleString()} credits
          </span>
          <span className="text-text-secondary mt-0.5 block text-xs">
            One-time purchase · Never expires
          </span>
        </span>
        <span className="text-right">
          <span className="font-display text-cream-50 block text-2xl font-bold tabular-nums">
            {formatPrice(plan.price_cents)}
          </span>
          <span className="text-text-muted text-[11px]">one-time</span>
        </span>
      </div>
      <Button
        type="button"
        variant="brand"
        size="lg"
        className="mt-5 w-full"
        onClick={() => onAccept(plan.id)}
      >
        Continue — {formatPrice(plan.price_cents)}
      </Button>
      <OfferCtaNote>Secure checkout · One-time purchase</OfferCtaNote>
    </div>
  );
}

/** The referral rung — shared copy + card. */
export function ReferralStep({
  referralCode,
  title = "Or get credits on us",
  sub = "Refer a friend — their credits stay untouched, this one's on us.",
}: {
  referralCode?: string;
  title?: string;
  sub?: string;
}) {
  const referralUrl =
    typeof window !== "undefined" && referralCode
      ? `${window.location.origin}/r/${referralCode}`
      : null;

  return (
    <div className="flex flex-col">
      <OfferHeading eyebrow="Invite & earn" title={title} sub={sub} />
      <ReferralCard
        className="mt-5"
        referralUrl={referralUrl}
        referralCode={referralCode}
        refereeReward="their first result on us"
        referrerReward="30% of their plan's credits when they subscribe"
      />
      <p className="text-text-muted mt-3 text-center text-[11px]">
        Rewards land after their first plan purchase.
      </p>
    </div>
  );
}

/** The soft landing at the bottom of every ladder. */
export function ExitStep({
  title,
  description,
  buttonLabel,
  onDismiss,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onDismiss: () => void;
}) {
  return (
    <div className="py-3 text-center">
      <h2 className="font-display text-cream-50 text-2xl font-bold">{title}</h2>
      <p className="text-text-secondary mt-2 text-sm">{description}</p>
      <Button
        variant="secondary"
        size="lg"
        className="mt-5"
        onClick={onDismiss}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
