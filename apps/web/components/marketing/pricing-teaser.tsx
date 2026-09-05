"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPlansForPurchase } from "@/lib/db/plans";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  primary: boolean;
}

export function PricingTeaser() {
  const [tiers, setTiers] = useState<PricingTier[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const plans = await getPlansForPurchase();
      if (cancelled) return;

      const monthly = plans.filter((p) => p.type === "monthly");
      const trials = plans.filter((p) => p.type === "weekly_trial");

      const list: PricingTier[] = monthly.map((plan) => ({
        name: plan.name,
        price: formatCents(plan.price_cents),
        period: "/mo",
        description: `${plan.credits_grant.toLocaleString()} credits / month`,
        features: [
          `${plan.credits_grant.toLocaleString()} monthly credits`,
          `${plan.markup_multiplier}x credit burn rate`,
          "Premium presets",
          "Priority processing",
        ],
        cta: plan.slug === "monthly-creator" ? "Start creating" : "Subscribe",
        href: "/app/billing",
        primary: plan.slug === "monthly-creator",
      }));

      if (trials.length > 0) {
        const trial = trials[0];
        list.unshift({
          name: "Weekly trial",
          price: formatCents(trial.price_cents),
          period: "/7 days",
          description: `${trial.credits_grant.toLocaleString()} credits for 7 days. One-time only.`,
          features: [
            `${trial.credits_grant.toLocaleString()} trial credits`,
            `${trial.markup_multiplier}x credit burn rate`,
            "All presets",
            "No subscription",
          ],
          cta: "Try for 7 days",
          href: "/app/billing",
          primary: false,
        });
      }

      setTiers(list);
    }

    load().catch((err) => {
      console.error("[PricingTeaser] failed to load plans", err);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="pricing" className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="text-lime-400 text-sm font-semibold uppercase tracking-wider">
            Pricing
          </p>
          <h2 className="text-cream-50 mt-2 text-3xl font-bold sm:text-4xl">
            Simple, credit-based plans
          </h2>
          <p className="text-text-secondary mt-3 max-w-2xl mx-auto">
            Choose a plan that fits your volume. 1 credit = $0.01 of retail
            purchasing power; higher tiers burn credits slower.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`border-cream-100/10 relative flex flex-col rounded-2xl border p-6 ${
                tier.primary
                  ? "bg-lime-500 text-ink-950"
                  : "bg-charcoal-850 text-cream-50"
              }`}
            >
              <h3
                className={`text-xl font-semibold ${
                  tier.primary ? "text-ink-950" : "text-cream-50"
                }`}
              >
                {tier.name}
              </h3>
              <p
                className={`mt-1 text-sm ${
                  tier.primary ? "text-ink-900" : "text-text-secondary"
                }`}
              >
                {tier.description}
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span
                  className={`text-4xl font-bold ${
                    tier.primary ? "text-ink-950" : "text-cream-50"
                  }`}
                >
                  {tier.price}
                </span>
                {tier.period && (
                  <span
                    className={`text-sm ${
                      tier.primary ? "text-ink-900" : "text-text-muted"
                    }`}
                  >
                    {tier.period}
                  </span>
                )}
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className={`flex items-center gap-2 text-sm ${
                      tier.primary ? "text-ink-900" : "text-text-secondary"
                    }`}
                  >
                    <Check
                      className={`h-4 w-4 ${
                        tier.primary ? "text-ink-950" : "text-lime-400"
                      }`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={`mt-6 w-full ${
                  tier.primary
                    ? "bg-ink-950 text-lime-400 hover:bg-ink-900"
                    : "bg-lime-500 text-ink-950 hover:bg-lime-400"
                }`}
              >
                <Link href={tier.href}>{tier.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
