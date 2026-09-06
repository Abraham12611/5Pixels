import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/db/admin";
import { getUserSupportSummary } from "@/lib/db/support";
import { CreditAdjustmentForm } from "@/components/admin/credit-adjustment-form";
import { GenerationStatusBadge } from "@/components/admin/generation-status-badge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function AdminSupportUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const user = await getUserSupportSummary(id);

  if (!user) notFound();

  const failedGenerations = user.recentGenerations.filter(
    (gen) => gen.status === "failed" || gen.status === "blocked"
  );

  return (
    <main className="p-8">
      <Link
        href="/admin/support"
        className="text-text-secondary hover:text-cream-100 text-sm transition"
      >
        ← Back to support
      </Link>

      <div className="mt-4 mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-cream-50 text-3xl font-bold">
            {user.displayName ?? user.email}
          </h1>
          <p className="text-text-secondary mt-1">{user.email}</p>
          <p className="text-text-muted text-xs font-mono mt-1">{user.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {user.isOwner && (
            <span className="bg-lime-400/10 text-lime-400 rounded-full px-3 py-1 text-xs font-medium">
              Owner
            </span>
          )}
          {user.isAdmin && !user.isOwner && (
            <span className="bg-amber-400/10 text-amber-400 rounded-full px-3 py-1 text-xs font-medium">
              Admin
            </span>
          )}
          <span className="bg-charcoal-700 text-cream-100 rounded-full px-3 py-1 text-xs capitalize">
            {user.status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
          <h2 className="text-cream-100 mb-4 text-lg font-semibold">
            Account
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-text-muted text-xs uppercase">Created</p>
              <p className="text-cream-100">{formatDate(user.createdAt)}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs uppercase">Credit balance</p>
              <p className="text-cream-50 text-2xl font-bold">
                {user.balance.toFixed(2)} credits
              </p>
            </div>
            {user.activeSubscription ? (
              <div>
                <p className="text-text-muted text-xs uppercase">Plan</p>
                <p className="text-cream-100 font-medium">
                  {user.activeSubscription.planName}
                </p>
                <p className="text-text-muted text-xs">
                  {user.activeSubscription.status} · through{" "}
                  {formatDate(user.activeSubscription.currentPeriodEnd)}
                  {user.activeSubscription.cancelAtPeriodEnd && " · cancels at period end"}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-text-muted text-xs uppercase">Plan</p>
                <p className="text-cream-100">No active subscription</p>
              </div>
            )}
          </div>
        </section>

        <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6 lg:col-span-2">
          <h2 className="text-cream-100 mb-4 text-lg font-semibold">
            Adjust credits
          </h2>
          <CreditAdjustmentForm userId={user.id} currentBalance={user.balance} />
        </section>
      </div>

      <section className="border-cream-100/10 bg-charcoal-850 mt-6 rounded-2xl border p-6">
        <h2 className="text-cream-100 mb-4 text-lg font-semibold">
          Recent generations
        </h2>
        {user.recentGenerations.length === 0 ? (
          <p className="text-text-secondary">No generations yet.</p>
        ) : (
          <ul className="divide-cream-100/10 divide-y">
            {user.recentGenerations.map((gen) => (
              <li
                key={gen.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <Link
                    href={`/admin/generations/${gen.id}`}
                    className="text-cream-100 hover:text-lime-400 font-medium transition"
                  >
                    {gen.productName}
                  </Link>
                  <p className="text-text-muted text-xs font-mono">
                    {gen.id.slice(0, 8)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-text-muted text-sm">
                    {gen.creditCost} credits
                  </span>
                  <GenerationStatusBadge status={gen.status} />
                  <span className="text-text-muted text-sm">
                    {formatDate(gen.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-cream-100/10 bg-charcoal-850 mt-6 rounded-2xl border p-6">
        <h2 className="text-cream-100 mb-4 text-lg font-semibold">
          Recent failures
        </h2>
        {failedGenerations.length === 0 ? (
          <p className="text-text-secondary">No failed or blocked generations.</p>
        ) : (
          <ul className="divide-cream-100/10 divide-y">
            {failedGenerations.map((gen) => (
              <li
                key={gen.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <Link
                    href={`/admin/generations/${gen.id}`}
                    className="text-cream-100 hover:text-lime-400 font-medium transition"
                  >
                    {gen.productName}
                  </Link>
                  <p className="text-text-muted text-xs font-mono">
                    {gen.id.slice(0, 8)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-text-muted text-sm">
                    {gen.creditCost} credits
                  </span>
                  <GenerationStatusBadge status={gen.status} />
                  <span className="text-text-muted text-sm">
                    {formatDate(gen.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-cream-100/10 bg-charcoal-850 mt-6 rounded-2xl border p-6">
        <h2 className="text-cream-100 mb-4 text-lg font-semibold">
          Recent ledger
        </h2>
        {user.recentLedger.length === 0 ? (
          <p className="text-text-secondary">No ledger entries.</p>
        ) : (
          <ul className="divide-cream-100/10 divide-y">
            {user.recentLedger.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between py-2"
              >
                <span className="text-cream-100 text-sm capitalize">
                  {entry.entryType.replace(/_/g, " ")}
                </span>
                <span
                  className={`text-sm font-medium ${
                    entry.amount < 0 ? "text-rose-400" : "text-lime-400"
                  }`}
                >
                  {entry.amount > 0 ? "+" : ""}
                  {entry.amount} credits
                </span>
                <span className="text-text-muted text-xs ml-4">
                  {formatDate(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-cream-100/10 bg-charcoal-850 mt-6 rounded-2xl border p-6">
        <h2 className="text-cream-100 mb-4 text-lg font-semibold">
          Recent invoices
        </h2>
        {user.recentInvoices.length === 0 ? (
          <p className="text-text-secondary">No invoices.</p>
        ) : (
          <ul className="divide-cream-100/10 divide-y">
            {user.recentInvoices.map((invoice) => (
              <li
                key={invoice.id}
                className="flex items-center justify-between py-2"
              >
                <span className="text-cream-100 text-sm">
                  {invoice.planName ?? "One-time"}
                </span>
                <span className="text-cream-100 text-sm font-medium">
                  {formatCurrency(invoice.amountCents)}
                </span>
                <span className="text-cream-100 text-sm capitalize">
                  {invoice.status}
                </span>
                <span className="text-text-muted text-xs">
                  {formatDate(invoice.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
