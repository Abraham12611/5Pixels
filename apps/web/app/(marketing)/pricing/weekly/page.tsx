import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { getCheapestGenerationCredits } from "@/lib/billing/credit-cost";
import { getPlansForPurchase } from "@/lib/db/plans";
import {
  canPurchaseWeeklyPass,
  hasEverPaid,
} from "@/lib/billing/entitlements";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Weekly Pass — 5Pixels",
  description:
    "One week of 5Pixels credits — a one-time purchase that never renews.",
};

/**
 * Weekly Pass surface (06 §3.3 — District Pass pattern): hero price lockup,
 * benefit rows with honest limits, both weekly tiers purchasable in place.
 * Public for deep links and marketing; signed-in users who no longer qualify
 * (any subscription history) are redirected to the regular pricing page —
 * the weekly-suppression rule applies on every surface.
 */
export default async function WeeklyPassPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [weeklyGate, everPaid] = user
    ? await Promise.all([canPurchaseWeeklyPass(), hasEverPaid()])
    : [{ allowed: true, reason: "" }, false];
  if (user && !weeklyGate.allowed) redirect("/pricing");

  const plans = await getPlansForPurchase();
  const weekly = plans
    .filter((p) => p.type === "weekly_trial")
    .sort((a, b) => a.price_cents - b.price_cents);
  if (weekly.length === 0) redirect("/pricing");

  const creditsPerTransformation = await getCheapestGenerationCredits();

  const cheapestPlan = weekly[0];
  const pastBuyer = Boolean(user && everPaid);

  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <Link
          href="/pricing"
          className="text-text-muted hover:text-cream-100 inline-flex items-center gap-1.5 text-xs transition-colors"
        >
          <ArrowLeft size={13} weight="bold" />
          All plans
        </Link>

        {/* Hero price lockup */}
        <div className="mt-10 text-center">
          <p className="text-lime-400 text-xs font-semibold uppercase tracking-[0.2em]">
            ✦ Weekly pass ✦
          </p>
          <h1 className="font-display text-cream-50 mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            {pastBuyer ? "Get another week" : "One week of creating"}
          </h1>
          <p className="text-cream-50 mt-4 text-2xl font-semibold">
            From {formatPrice(cheapestPlan.price_cents)}
            <span className="text-text-muted ml-2 text-sm font-medium">
              one-time
            </span>
          </p>
          <p className="text-text-secondary mx-auto mt-3 max-w-sm text-sm">
            A pass, not a subscription — credits for a week of looks. It never
            renews.
          </p>
        </div>

        {/* Pass benefits */}
        <div className="mt-10">
          <p className="text-text-muted text-center text-[11px] font-semibold uppercase tracking-[0.2em]">
            ✦ Pass benefits ✦
          </p>
          <ul className="mx-auto mt-5 max-w-sm space-y-3">
            {[
              `≈ up to ${Math.floor(
                cheapestPlan.credits_grant / creditsPerTransformation
              ).toLocaleString()} transformations on the Starter pass`,
              "Every Filter and Poster in the catalog",
              "HD downloads included",
              "Credits land instantly — and the pass never renews",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="bg-lime-500/10 text-lime-400 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                  <Check size={13} weight="bold" />
                </span>
                <span className="text-text-secondary text-sm leading-relaxed">
                  {line}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Both tiers, selectable in place */}
        <div className="mt-10 space-y-3">
          {weekly.map((plan, i) => (
            <div
              key={plan.id}
              className={`relative overflow-hidden rounded-[16px] p-5 ${
                i === weekly.length - 1 && weekly.length > 1
                  ? "bg-lime-500 text-ink-950"
                  : "border-cream-100/10 bg-charcoal-850 border"
              }`}
            >
              {i === weekly.length - 1 && weekly.length > 1 && (
                <span className="bg-ink-950 text-lime-300 absolute right-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
                  Most credits
                </span>
              )}
              <p
                className={`flex items-center gap-1.5 text-sm font-semibold ${
                  i === weekly.length - 1 && weekly.length > 1
                    ? "text-ink-950"
                    : "text-cream-50"
                }`}
              >
                <Sparkle
                  size={14}
                  weight="fill"
                  className={
                    i === weekly.length - 1 && weekly.length > 1
                      ? "text-ink-950"
                      : "text-lime-400"
                  }
                />
                {plan.name.replace(/Weekly Trial\s*[—-]\s*/, "")} week
              </p>
              <p
                className={`mt-1 text-sm ${
                  i === weekly.length - 1 && weekly.length > 1
                    ? "text-ink-950/70"
                    : "text-text-secondary"
                }`}
              >
                {plan.credits_grant.toLocaleString()} credits · ≈ up to{" "}
                {Math.floor(
                  plan.credits_grant / creditsPerTransformation
                ).toLocaleString()}{" "}
                transformations · one week
              </p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p
                  className={`font-display text-2xl font-bold ${
                    i === weekly.length - 1 && weekly.length > 1
                      ? "text-ink-950"
                      : "text-cream-50"
                  }`}
                >
                  {formatPrice(plan.price_cents)}
                  <span
                    className={`ml-1.5 text-xs font-medium ${
                      i === weekly.length - 1 && weekly.length > 1
                        ? "text-ink-950/60"
                        : "text-text-muted"
                    }`}
                  >
                    one-time
                  </span>
                </p>
                {user ? (
                  <form action="/api/billing/checkout" method="post">
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <Button
                      type="submit"
                      variant={
                        i === weekly.length - 1 && weekly.length > 1
                          ? "secondary"
                          : "brand"
                      }
                      disabled={!plan.checkout_ready}
                    >
                      {plan.checkout_ready ? "Get a week" : "Coming soon"}
                    </Button>
                  </form>
                ) : (
                  <Button
                    asChild
                    variant={
                      i === weekly.length - 1 && weekly.length > 1
                        ? "secondary"
                        : "brand"
                    }
                  >
                    <Link href="/signup?next=/pricing/weekly">Get a week</Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-text-muted mt-6 text-center text-xs leading-relaxed">
          One-time purchase — it never renews and there&apos;s nothing to
          cancel. Want credits every month instead?{" "}
          <Link
            href="/pricing"
            className="text-lime-400 hover:text-lime-300 font-medium transition-colors"
          >
            See monthly plans →
          </Link>
        </p>
      </section>
    </main>
  );
}
