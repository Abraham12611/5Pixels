"use client";

import { useMemo, useState } from "react";
import {
  estimateMonthlyCredits,
  recommendPlan,
  recommendReasons,
  type ContentType,
  type FinderPlan,
  type Priority,
} from "@/lib/billing/recommend";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  ShareNetwork,
  UserFocus,
  Newspaper,
  Sparkle,
  Check,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const CONTENT_TYPES: { key: ContentType; label: string; icon: typeof Sparkle }[] = [
  { key: "social", label: "Social images", icon: ShareNetwork },
  { key: "portraits", label: "Professional portraits", icon: UserFocus },
  { key: "covers", label: "Covers & posters", icon: Newspaper },
  { key: "creative", label: "Personal creative looks", icon: Sparkle },
];

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: "volume", label: "More volume" },
  { key: "quality", label: "Best value per result" },
  { key: "flexibility", label: "More flexibility" },
];

interface PlanFinderProps {
  plans: FinderPlan[];
  /** Post-checkout path; signed-in users go straight to checkout. */
  isAuthenticated: boolean;
}

export function PlanFinder({ plans, isAuthenticated }: PlanFinderProps) {
  const [contentTypes, setContentTypes] = useState<ContentType[]>(["social"]);
  const [perMonth, setPerMonth] = useState(50);
  const [priority, setPriority] = useState<Priority | null>(null);

  const estimate = useMemo(() => estimateMonthlyCredits(perMonth), [perMonth]);
  const plan = useMemo(
    () => recommendPlan({ contentTypes, perMonth, priority }, plans),
    [contentTypes, perMonth, priority, plans]
  );
  const reasons = useMemo(
    () =>
      plan
        ? recommendReasons({ contentTypes, perMonth, priority }, plan)
        : [],
    [contentTypes, perMonth, priority, plan]
  );

  const toggleContentType = (key: ContentType) => {
    setContentTypes((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key]
    );
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      {/* Questionnaire */}
      <div className="space-y-10">
        <div>
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">
            1 · What do you mostly create?
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {CONTENT_TYPES.map(({ key, label, icon: ItemIcon }) => {
              const selected = contentTypes.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleContentType(key)}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center gap-3 rounded-[15px] border p-4 text-left transition-colors",
                    selected
                      ? "border-lime-500/40 bg-charcoal-800 text-cream-50"
                      : "border-cream-100/10 bg-charcoal-850 text-text-secondary hover:border-cream-100/20 hover:text-cream-100"
                  )}
                >
                  <ItemIcon
                    size={18}
                    weight={selected ? "fill" : "regular"}
                    className={selected ? "text-lime-400" : "text-text-muted"}
                  />
                  <span className="flex-1 text-sm font-medium">{label}</span>
                  {selected && (
                    <Check size={16} weight="bold" className="text-lime-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">
            2 · How often do you expect to create?
          </p>
          <div className="border-cream-100/10 bg-charcoal-850 mt-4 rounded-[15px] border p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-cream-50 text-sm font-medium">
                ~{perMonth} transformations / month
              </p>
              <p className="text-text-secondary text-xs">
                ≈ {estimate.toLocaleString()} credits
              </p>
            </div>
            <Slider
              value={[perMonth]}
              onValueChange={([v]) => setPerMonth(v)}
              min={5}
              max={500}
              step={5}
              className="mt-4"
              aria-label="Transformations per month"
            />
            <div className="text-text-muted mt-2 flex justify-between text-xs">
              <span>5</span>
              <span>500</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">
            3 · What matters most?
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {PRIORITIES.map(({ key, label }) => {
              const selected = priority === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPriority(selected ? null : key)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    selected
                      ? "border-lime-500/40 bg-lime-500/10 text-cream-50"
                      : "border-cream-100/10 bg-charcoal-850 text-text-secondary hover:border-cream-100/20 hover:text-cream-100"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="border-lime-500/25 bg-charcoal-800 rounded-[20px] border p-6">
          {plan ? (
            <>
              <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">
                We recommend
              </p>
              <p className="text-cream-50 mt-2 text-2xl font-semibold">
                {plan.name}
              </p>
              <p className="text-cream-50 mt-1 text-lg">
                ${(plan.priceCents / 100).toFixed(0)}
                <span className="text-text-secondary text-sm font-normal">
                  {" "}
                  / month · {plan.creditsGrant.toLocaleString()} credits
                </span>
              </p>

              <ul className="border-cream-100/10 mt-5 space-y-2.5 border-t pt-5">
                {reasons.map((reason) => (
                  <li key={reason} className="flex items-start gap-2.5">
                    <Check
                      size={15}
                      weight="bold"
                      className="text-lime-400 mt-0.5 shrink-0"
                    />
                    <span className="text-text-secondary text-sm">{reason}</span>
                  </li>
                ))}
              </ul>

              {isAuthenticated ? (
                <form
                  action="/api/billing/checkout"
                  method="post"
                  className="mt-6"
                >
                  <input type="hidden" name="plan_id" value={plan.id} />
                  <Button type="submit" className="w-full">
                    Choose {plan.name}
                  </Button>
                </form>
              ) : (
                <Button asChild className="mt-6 w-full">
                  <a href="/signup?next=/pricing">Choose {plan.name}</a>
                </Button>
              )}
              <p className="text-text-muted mt-3 text-xs leading-relaxed">
                Estimates vary with the presets you choose — every preset shows
                its exact credit cost before you generate.
              </p>
            </>
          ) : (
            <p className="text-text-secondary text-sm">
              Plans are loading — try again shortly.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
