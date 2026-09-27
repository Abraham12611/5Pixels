import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getBillingData,
  getSavedPaymentMethods,
  getCreditActivity,
} from "@/lib/db/billing";
import { getMyProfile } from "@/lib/profile/actions";
import { SettingsShell } from "@/components/consumer/settings-shell";
import { SettingCard } from "@/components/consumer/setting-card";
import { Button } from "@/components/ui/button";
import { Receipt, CreditCard } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { cn } from "@/lib/utils";

function formatCents(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function monthLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return "Earlier";
  }
}

interface HistoryRow {
  id: string;
  date: string;
  label: string;
  /** Signed amount text — purchases/refunds render lime, spends muted. */
  amountText: string;
  positive: boolean;
  statusLabel?: string;
  statusClass?: string;
  invoice: boolean;
}

const INVOICE_STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-lime-500/10 text-lime-300" },
  pending: { label: "Pending", className: "bg-warning/10 text-warning" },
  failed: { label: "Failed", className: "bg-error/10 text-error" },
  refunded: {
    label: "Refunded",
    className: "bg-cream-100/10 text-text-secondary",
  },
};

export default async function BillingHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/billing/history");
  }

  const [billing, paymentMethods, profile, creditActivity] = await Promise.all([
    getBillingData(),
    getSavedPaymentMethods(),
    getMyProfile(),
    getCreditActivity(),
  ]);

  if (!billing) {
    redirect("/login");
  }

  const name =
    profile?.display_name ??
    (user.user_metadata?.name as string | null) ??
    "Your account";
  const email = profile?.email ?? user.email ?? "";

  // One merged timeline (13 §9): money rows (invoices) + credit-ledger rows,
  // grouped by month — the credit side reconciles with the Runs segment.
  const rows: HistoryRow[] = [
    ...billing.invoices.map((invoice) => {
      const status = INVOICE_STATUS[invoice.status] ?? {
        label: invoice.status,
        className: "bg-cream-100/10 text-text-secondary",
      };
      return {
        id: `inv-${invoice.id}`,
        date: invoice.created_at,
        label: invoice.plan_name ?? "Credit purchase",
        amountText: `${invoice.status === "refunded" ? "+" : ""}${formatCents(
          invoice.amount_cents,
          invoice.currency
        )}`,
        positive: invoice.status === "paid" || invoice.status === "refunded",
        statusLabel: invoice.status === "paid" ? undefined : status.label,
        statusClass: status.className,
        invoice: true,
      };
    }),
    ...creditActivity.map((entry) => ({
      id: `cr-${entry.id}`,
      date: entry.date,
      label: entry.label,
      amountText:
        entry.kind === "released"
          ? `+${Math.abs(entry.amount)} credits`
          : `${entry.amount > 0 ? "+" : "−"}${Math.abs(entry.amount)} credits`,
      positive: entry.kind === "released" || entry.amount > 0,
      statusLabel:
        entry.statusLabel === "Failed" || entry.statusLabel === "In progress"
          ? entry.statusLabel
          : undefined,
      statusClass:
        entry.statusLabel === "Failed"
          ? "bg-error/10 text-error"
          : "bg-warning/10 text-warning",
      invoice: false,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const byMonth = new Map<string, HistoryRow[]>();
  for (const row of rows) {
    const key = monthLabel(row.date);
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(row);
    else byMonth.set(key, [row]);
  }

  return (
    <SettingsShell userName={name} userEmail={email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-cream-50 text-xl font-semibold">Billing history</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Invoices, payment methods, and billing details.
          </p>
        </div>

        {/* Activity — merged money + credit rows under sticky month headers */}
        <SettingCard
          title="Activity"
          description="Payments and credit movements in one timeline — credit rows reconcile with the Runs segment in your Library."
          action={
            billing.dodoCustomerId ? (
              <form action="/api/billing/portal" method="post">
                <Button type="submit" variant="ghost" size="sm">
                  Manage in billing portal
                </Button>
              </form>
            ) : undefined
          }
        >
          {rows.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="bg-charcoal-800 text-text-muted rounded-[15px] p-4">
                <Receipt size={24} />
              </span>
              <p className="text-cream-50 mt-4 text-sm font-medium">
                No activity yet.
              </p>
              <p className="text-text-secondary mt-1 max-w-xs text-sm">
                Purchases and credit movements will appear here.
              </p>
            </div>
          ) : (
            <div>
              {[...byMonth.entries()].map(([month, monthRows]) => (
                <section key={month}>
                  <h3 className="text-text-muted bg-charcoal-850/95 sticky top-14 z-10 -mx-6 px-6 py-2 text-[11px] font-semibold tracking-wider uppercase backdrop-blur-sm">
                    {month}
                  </h3>
                  <ul className="divide-cream-100/10 divide-y">
                    {monthRows.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center justify-between gap-4 py-3.5"
                      >
                        <div className="min-w-0">
                          <p className="text-cream-50 truncate text-sm font-medium">
                            {row.label}
                          </p>
                          <p className="text-text-muted mt-0.5 text-xs">
                            {formatDate(row.date)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5">
                          {row.statusLabel && (
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-xs font-medium",
                                row.statusClass
                              )}
                            >
                              {row.statusLabel}
                            </span>
                          )}
                          <span
                            className={cn(
                              "min-w-20 text-right text-sm font-medium tabular-nums",
                              row.positive
                                ? "text-lime-300"
                                : "text-text-secondary"
                            )}
                          >
                            {row.amountText}
                          </span>
                          {row.invoice && billing.dodoCustomerId && (
                            <form
                              action="/api/billing/portal"
                              method="post"
                            >
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                aria-label={`Receipt for ${row.label}`}
                              >
                                Receipt
                              </Button>
                            </form>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </SettingCard>

        {/* Payment methods */}
        <SettingCard
          title="Payment methods"
          description="Payment details are stored by our payment provider — we never see your full card number."
        >
          {paymentMethods.methods.length === 0 ? (
            <div className="border-cream-100/10 flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-dashed p-4">
              <p className="text-text-secondary text-sm">
                No payment method saved. One is added securely at your first
                purchase.
              </p>
              <Button asChild variant="secondary" size="sm">
                <Link href="/pricing">View plans</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {paymentMethods.methods.map((method, i) => (
                <li
                  key={method.id}
                  className="border-cream-100/10 bg-charcoal-800/60 flex items-center justify-between gap-4 rounded-[10px] border p-4"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard size={20} className="text-text-secondary" />
                    <div>
                      <p className="text-cream-50 text-sm font-medium">
                        {method.brand} •••• {method.last4}
                      </p>
                      {method.expiryMonth && method.expiryYear && (
                        <p className="text-text-muted text-xs">
                          Expires {method.expiryMonth}/{method.expiryYear}
                        </p>
                      )}
                    </div>
                  </div>
                  {i === 0 && (
                    <span className="bg-lime-500/10 text-lime-300 rounded-full px-2.5 py-1 text-xs font-medium">
                      Default
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {paymentMethods.portalAvailable && billing.dodoCustomerId && (
            <form action="/api/billing/portal" method="post" className="mt-4">
              <Button type="submit" variant="secondary" size="sm">
                Add or manage payment methods
              </Button>
            </form>
          )}
        </SettingCard>

        {/* Billing information */}
        <SettingCard
          title="Billing information"
          description="The name and address on your receipts, managed in the billing portal."
          action={
            billing.dodoCustomerId ? (
              <form action="/api/billing/portal" method="post">
                <Button type="submit" variant="secondary" size="sm">
                  Manage
                </Button>
              </form>
            ) : undefined
          }
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="text-cream-50 truncate text-sm font-medium">
                {name}
              </p>
              <p className="text-text-secondary mt-0.5 text-sm">{email}</p>
            </div>
          </div>
          {!billing.dodoCustomerId && (
            <p className="text-text-muted mt-3 text-xs">
              A billing profile is created automatically at your first purchase.
            </p>
          )}
        </SettingCard>
      </div>
    </SettingsShell>
  );
}
