import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPlansForPurchase } from "@/lib/db/plans";
import { getActivePlan } from "@/lib/billing/entitlements";
import { getMedianPresetCost } from "@/lib/db/explore";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { PlanFinder } from "@/components/marketing/plan-finder";
import { PricingComparison } from "@/components/marketing/pricing-comparison";
import { PricingFaq } from "@/components/marketing/pricing-faq";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [plans, activePlan, medianCredits] = await Promise.all([
    getPlansForPurchase(),
    getActivePlan(),
    getMedianPresetCost(),
  ]);

  const monthlyPlans = plans.filter((p) => p.type === "monthly");
  const weeklyPlans = plans.filter((p) => p.type === "weekly_trial");

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="px-4 pb-10 pt-16 text-center sm:px-6 lg:pt-24">
        <h1 className="text-cream-50 mx-auto max-w-3xl text-3xl font-semibold sm:text-4xl lg:text-5xl">
          Choose the plan that fits your creativity.
        </h1>
        <p className="text-text-secondary mx-auto mt-4 max-w-xl text-base">
          Plans give you monthly credits to spend on transformations — every
          preset shows its exact cost before you generate.
        </p>
      </section>

      {/* Plan cards behind a Weekly | Monthly segmented control (13 §5) */}
      <section className="px-4 sm:px-6">
        <PricingPlans
          weeklyPlans={weeklyPlans}
          monthlyPlans={monthlyPlans}
          isAuthenticated={Boolean(user)}
          activePlanId={activePlan?.planId ?? null}
          medianCredits={medianCredits}
        />
      </section>

      {/* Plan finder */}
      <section className="px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-cream-50 text-2xl font-semibold sm:text-3xl">
            Find the best plan for you
          </h2>
          <p className="text-text-secondary mt-2 max-w-xl">
            Answer three quick questions and we&apos;ll suggest a plan based on
            how much you expect to create.
          </p>
          <div className="mt-10">
            <PlanFinder
              plans={monthlyPlans.map((p) => ({
                id: p.id,
                name: p.name,
                creditsGrant: p.credits_grant,
                priceCents: p.price_cents,
                markupMultiplier: p.markup_multiplier,
              }))}
              isAuthenticated={Boolean(user)}
            />
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-cream-50 text-2xl font-semibold sm:text-3xl">
            Compare plans
          </h2>
          <p className="text-text-secondary mt-2 max-w-xl">
            Every plan gets the full preset catalog. Paid plans differ on
            monthly credits and credit rates.
          </p>
          <div className="mt-8 overflow-x-auto">
            <PricingComparison
              monthlyPlans={monthlyPlans}
              recommendedSlug="monthly-pro"
            />
          </div>
        </div>
      </section>

      {/* FAQ + final CTA */}
      <section id="faq" className="px-4 pb-20 sm:px-6">
        <PricingFaq />
        <div className="mt-16 text-center">
          <p className="text-cream-50 text-lg font-semibold">Ready to create?</p>
          <Button asChild className="mt-4">
            <Link href={user ? "/app/billing/plan" : "/signup?next=/pricing"}>
              Choose your plan
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
