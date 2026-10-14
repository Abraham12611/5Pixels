import { requireAdmin } from "@/lib/db/admin";
import { createClient } from "@/lib/supabase/server";

interface BudgetRow {
  program: string;
  monthly_cap_credits: number;
  period: string;
  committed_credits: number;
  updated_at: string;
}

const PROGRAM_LABELS: Record<string, { label: string; blurb: string }> = {
  referral_budget: {
    label: "Referrals — referrer",
    blurb: "Referrer signup bonus + 30% first-plan payment share.",
  },
  referral_referee: {
    label: "Referrals — referee",
    blurb: "Referee joining bonus + free first transformation.",
  },
  retention: {
    label: "Retention",
    blurb: "Cancel-save credit offers.",
  },
  promo: {
    label: "Promo & campaigns",
    blurb: "Promotional credit grants.",
  },
  admin_manual: {
    label: "Manual support grants",
    blurb: "Positive credit adjustments issued from Support.",
  },
};

function formatPeriod(period: string) {
  return period ? period : "—";
}

export default async function AdminBudgetsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: budgets } = await supabase
    .from("subsidy_budgets")
    .select("program, monthly_cap_credits, period, committed_credits, updated_at")
    .order("program");

  const rows = (budgets ?? []) as BudgetRow[];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-cream-50 text-3xl font-bold">Subsidy budgets</h1>
        <p className="text-text-secondary mt-2">
          Monthly caps on free-credit programs (1 credit = $0.01 of provider
          cost). Programs fail closed when a period&rsquo;s cap is spent; the
          counter resets at the start of each UTC month.
        </p>
      </div>

      <div className="border-cream-100/10 bg-charcoal-850 overflow-hidden rounded-2xl border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm tabular-nums">
            <thead>
              <tr className="text-text-secondary border-cream-100/10 border-b bg-charcoal-850/50">
                <th className="px-4 py-3 font-medium">Program</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 text-right font-medium">Cap</th>
                <th className="px-4 py-3 text-right font-medium">Committed</th>
                <th className="px-4 py-3 text-right font-medium">Remaining</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-cream-100/10 divide-y">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-text-muted px-4 py-10 text-center"
                  >
                    No subsidy budgets configured — every free-credit program
                    is currently fail-closed.
                  </td>
                </tr>
              ) : (
                rows.map((b) => {
                  const meta = PROGRAM_LABELS[b.program] ?? {
                    label: b.program,
                    blurb: "",
                  };
                  const cap = Number(b.monthly_cap_credits);
                  const committed = Number(b.committed_credits);
                  const remaining = Math.max(0, cap - committed);
                  const pct = cap > 0 ? committed / cap : 1;
                  const status =
                    cap <= 0
                      ? { label: "Disabled", cls: "text-text-muted" }
                      : remaining <= 0
                        ? {
                            label: "Exhausted",
                            cls: "text-red-400 font-medium",
                          }
                        : pct >= 0.8
                          ? {
                              label: "Near cap",
                              cls: "text-amber-400 font-medium",
                            }
                          : { label: "Active", cls: "text-lime-400" };
                  return (
                    <tr key={b.program}>
                      <td className="px-4 py-3">
                        <p className="text-cream-100 font-medium">
                          {meta.label}
                        </p>
                        {meta.blurb ? (
                          <p className="text-text-muted text-xs">
                            {meta.blurb}
                          </p>
                        ) : null}
                      </td>
                      <td className="text-text-secondary px-4 py-3">
                        {formatPeriod(b.period)}
                      </td>
                      <td className="text-cream-100 px-4 py-3 text-right">
                        {cap.toLocaleString()}
                      </td>
                      <td className="text-cream-100 px-4 py-3 text-right">
                        {committed.toLocaleString()}
                      </td>
                      <td className="text-cream-100 px-4 py-3 text-right">
                        {remaining.toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 ${status.cls}`}>
                        {status.label}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-text-muted mt-4 text-xs leading-relaxed">
        Caps are edited directly in the database (subsidy_budgets
        monthly_cap_credits) — set a cap to 0 to freeze a program. Grants
        that hit an exhausted cap are skipped and logged to Alerts.
      </p>
    </>
  );
}
