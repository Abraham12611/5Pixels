"use client";

import { useEffect, useState } from "react";
import { LockSimple, Timer } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PlanRow } from "./plan-row";
import { ReferralCard } from "./referral-card";
import { SaveLine } from "./save-line";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlanForPurchase } from "@/lib/db/plans";

export type OfferDeadlineDisplay = "none" | "date" | "countdown";

/**
 * Shared offer-step bodies — one visual grammar for the offer family, used
 * by both the SpecialOfferTakeover and the blocked-credit surface's offer
 * view so the two can never drift apart. All components are presentational:
 * analytics and checkout submission stay with the parent surface.
 */

/**
 * Centered eyebrow + display headline + sub — the shared header for every
 * offer step (Calm/Opal pattern: small accent eyebrow, one strong headline,
 * one supporting line, optional deadline chip).
 */
export function OfferHeading({
  eyebrow,
  title,
  sub,
  deadline,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  deadline?: React.ReactNode;
}) {
  return (
    <div className="text-center">
      {eyebrow ? (
        <p className="text-promo mb-2 text-[10px] font-bold uppercase tracking-[0.2em]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display text-cream-50 text-2xl font-bold leading-tight">
        {title}
      </h2>
      {sub ? (
        <p className="text-text-secondary mt-2 text-sm">{sub}</p>
      ) : null}
      {deadline ? (
        <div className="mt-3 flex justify-center">{deadline}</div>
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
        "text-text-muted mt-3 flex items-center justify-center gap-1.5 text-[11px]",
        className
      )}
    >
      <LockSimple size={11} weight="bold" />
      {children}
    </p>
  );
}

/**
 * Weekly passes — direct-accept cards (one click buys). The featured card
 * is the bright sibling; the rest stay elevated dark.
 */
export function WeeklyPairStep({
  plans,
  headline,
  eyebrow,
  onAccept,
}: {
  plans: PlanForPurchase[];
  headline: string;
  eyebrow?: string;
  onAccept: (planId: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <OfferHeading
        eyebrow={eyebrow}
        title={headline}
        sub="One-time purchases — no subscription."
      />
      <div className="mt-6 space-y-3">
        {plans.map((plan, i) => {
          const featured = plans.length > 1 && i === plans.length - 1;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onAccept(plan.id)}
              className={cn(
                "relative w-full overflow-hidden rounded-2xl p-5 text-left transition-all motion-safe:active:scale-[0.99]",
                featured
                  ? "bg-lime-500 text-ink-950 shadow-lg"
                  : "border-cream-100/10 bg-charcoal-800/70 hover:border-cream-100/25 border"
              )}
            >
              {featured && (
                <span className="bg-ink-950 text-lime-400 absolute right-4 top-4 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest">
                  Most picked
                </span>
              )}
              <p
                className={cn(
                  "font-display text-xl font-bold",
                  featured ? "text-ink-950" : "text-cream-50"
                )}
              >
                {plan.name
                  .replace("Weekly Trial — ", "")
                  .replace(" Monthly", "")}
              </p>
              <p
                className={cn(
                  "mt-1 text-sm",
                  featured ? "text-ink-950/75" : "text-text-secondary"
                )}
              >
                {plan.credits_grant.toLocaleString()} credits · one week of
                looks
              </p>
              <p
                className={cn(
                  "font-display mt-3 text-2xl font-bold",
                  featured ? "text-ink-950" : "text-cream-50"
                )}
              >
                {formatPrice(plan.price_cents)}
                <span
                  className={cn(
                    "ml-1.5 text-xs font-medium",
                    featured ? "text-ink-950/60" : "text-text-muted"
                  )}
                >
                  one-time
                </span>
              </p>
            </button>
          );
        })}
      </div>
      <OfferCtaNote>Secure checkout · One-time purchase</OfferCtaNote>
    </div>
  );
}

/**
 * Annual-forward plan picker — the anchored pair from the Opal/Revolut
 * grammar: recommended annual row with the discount chip on its corner,
 * dimmed monthly sibling beneath, one CTA that restates the deal.
 */
export function PlansStep({
  headline,
  eyebrow,
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
  const isAnnualSelected = selected !== null && selected === annual?.id;

  return (
    <div className="flex flex-col">
      <OfferHeading
        eyebrow={eyebrow}
        title={headline}
        deadline={
          <OfferDeadline display={deadlineDisplay} endsAt={endsAt} />
        }
      />
      <div className="mt-6 space-y-3">
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
                { icon: "check", text: "HD downloads" },
              ]}
              headerTab="Best value"
              headerTone="promo"
              selected={isAnnualSelected}
              onSelect={() => onSelect(annual.id)}
            />
            {monthlyAnchor && (
              <SaveLine
                className="mt-2 text-center"
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
              },
              {
                icon: "check",
                text: "Every preset and poster",
                dimmed: !annual,
              },
            ]}
            selected={selected === monthlyAnchor.id}
            onSelect={() => onSelect(monthlyAnchor.id)}
            dimmed={Boolean(annual)}
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
              isAnnualSelected
                ? `${formatPrice(effectiveMonthlyCents)}/mo`
                : `${formatPrice(monthlyAnchor?.price_cents ?? 0)}/mo`
            }`
          : "Choose a plan"}
      </Button>
      <OfferCtaNote>{ctaNote ?? "Secure checkout · Cancel anytime"}</OfferCtaNote>
    </div>
  );
}

/** One-shot credit pack offered as a plan — direct-accept card. */
export function TopUpStep({
  plan,
  onAccept,
  title = "Just this once",
  sub = "One-time top-up — no plan required.",
}: {
  plan: PlanForPurchase;
  onAccept: (id: string) => void;
  title?: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col">
      <OfferHeading title={title} sub={sub} />
      <button
        type="button"
        onClick={() => onAccept(plan.id)}
        className="group border-cream-100/10 bg-charcoal-800/70 hover:border-lime-500/50 mt-6 flex w-full items-center justify-between rounded-2xl border p-5 text-left transition-all"
      >
        <span>
          <span className="font-display text-cream-50 block text-xl font-bold">
            {plan.credits_grant.toLocaleString()} credits
          </span>
          <span className="text-text-secondary text-sm">
            Never expire — use them whenever
          </span>
        </span>
        <span className="text-right">
          <span className="font-display text-cream-50 block text-2xl font-bold">
            {formatPrice(plan.price_cents)}
          </span>
          <span className="text-text-muted group-hover:text-lime-300 text-[11px] font-medium transition-colors">
            Buy now →
          </span>
        </span>
      </button>
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
      <OfferHeading title={title} sub={sub} />
      <ReferralCard
        className="mt-6"
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
    <div className="py-4 text-center">
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
