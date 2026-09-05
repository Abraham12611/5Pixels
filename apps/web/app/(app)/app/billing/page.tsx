import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBillingData } from "@/lib/db/billing";
import { getPlansForPurchase } from "@/lib/db/plans";
import { getUserCreditBalance } from "@/lib/generation/balance";
import { Button } from "@/components/ui/button";
import { getActivePlan } from "@/lib/billing/entitlements";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [billing, plans, balance, activePlan] = await Promise.all([
    getBillingData(),
    getPlansForPurchase(),
    getUserCreditBalance(),
    getActivePlan(),
  ]);

  if (!billing) {
    redirect("/login");
  }

  const monthlyPlans = plans.filter((p) => p.type === "monthly");
  const weeklyPlans = plans.filter((p) => p.type === "weekly_trial");
  const extraCreditPlan = plans.find((p) => p.type === "extra_credit");

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-cream-50 mb-6 text-3xl font-bold">Billing</h1>

        <section className="border-cream-100/10 bg-charcoal-850 mb-6 rounded-2xl border p-6">
          <h2 className="text-cream-50 mb-2 text-xl font-semibold">
            Current balance
          </h2>
          <p className="text-cream-50 text-3xl font-bold">
            {balance} <span className="text-text-secondary text-lg">credits</span>
          </p>
          {activePlan && (
            <p className="text-text-secondary mt-2">
              Active plan: <span className="text-cream-50">{activePlan.name}</span>{" "}
              {activePlan.currentPeriodEnd && (
                <span className="text-text-muted">
                  (renews {formatDate(activePlan.currentPeriodEnd)})
                </span>
              )}
            </p>
          )}
          {billing.dodoCustomerId && (
            <form
              action="/api/billing/portal"
              method="post"
              className="mt-4"
            >
              <Button type="submit" variant="secondary" size="sm">
                Manage billing
              </Button>
            </form>
          )}
        </section>

        <section className="border-cream-100/10 bg-charcoal-850 mb-6 rounded-2xl border p-6">
          <h2 className="text-cream-50 mb-4 text-xl font-semibold">
            Monthly plans
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {monthlyPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} cta="Subscribe" />
            ))}
          </div>
        </section>

        <section className="border-cream-100/10 bg-charcoal-850 mb-6 rounded-2xl border p-6">
          <h2 className="text-cream-50 mb-4 text-xl font-semibold">
            Weekly trials
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {weeklyPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} cta="Start trial" />
            ))}
          </div>
        </section>

        {extraCreditPlan && (
          <section className="border-cream-100/10 bg-charcoal-850 mb-6 rounded-2xl border p-6">
            <h2 className="text-cream-50 mb-4 text-xl font-semibold">
              Extra credits
            </h2>
            <ExtraCreditsForm planId={extraCreditPlan.id} />
          </section>
        )}

        <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
          <h2 className="text-cream-50 mb-4 text-xl font-semibold">
            Transaction history
          </h2>
          {billing.transactions.length === 0 ? (
            <p className="text-text-secondary">No transactions yet.</p>
          ) : (
            <ul className="space-y-2">
              {billing.transactions.map((tx) => (
                <li
                  key={tx.id}
                  className="text-text-secondary flex items-center justify-between text-sm"
                >
                  <span className="capitalize">{tx.entry_type}</span>
                  <span className="text-cream-50">{Number(tx.amount).toFixed(2)} credits</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-6">
          <Button asChild variant="ghost">
            <Link href="/app">Back to app home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

function PlanCard({
  plan,
  cta,
}: {
  plan: Awaited<ReturnType<typeof getPlansForPurchase>>[number];
  cta: string;
}) {
  return (
    <div className="border-cream-100/10 bg-charcoal-800 flex flex-col rounded-2xl border p-4">
      <h3 className="text-cream-50 font-semibold">{plan.name}</h3>
      <p className="text-cream-50 my-2 text-2xl font-bold">
        {formatCents(plan.price_cents)}
        {plan.interval === "monthly" && (
          <span className="text-text-muted text-sm font-normal">/mo</span>
        )}
      </p>
      <p className="text-text-secondary mb-4 text-sm">
        {plan.credits_grant.toLocaleString()} credits
        {plan.type === "monthly" && " / month"}
      </p>
      <form
        action="/api/billing/checkout"
        method="post"
        className="mt-auto"
      >
        <input type="hidden" name="plan_id" value={plan.id} />
        <Button
          type="submit"
          size="sm"
          className="w-full"
          disabled={!plan.dodo_product_id}
        >
          {plan.dodo_product_id ? cta : "Coming soon"}
        </Button>
      </form>
    </div>
  );
}

function ExtraCreditsForm({ planId }: { planId: string }) {
  return (
    <form action="/api/billing/checkout" method="post" className="space-y-4">
      <input type="hidden" name="plan_id" value={planId} />
      <div>
        <label
          htmlFor="amount"
          className="text-cream-50 mb-2 block text-sm font-medium"
        >
          Amount (USD, minimum $10)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          min="10"
          step="1"
          defaultValue="10"
          className="border-cream-100/10 bg-charcoal-800 text-cream-50 w-full rounded-xl border px-4 py-2"
        />
      </div>
      <p className="text-text-muted text-sm">
        You receive 1 credit for every $0.01 paid.
      </p>
      <Button type="submit" size="sm">
        Buy extra credits
      </Button>
    </form>
  );
}
