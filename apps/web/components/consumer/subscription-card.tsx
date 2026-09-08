"use client";

import Link from "next/link";
import { CreditCard, ArrowSquareOut, TrendUp } from "@phosphor-icons/react";

interface SubscriptionCardProps {
  planName: string;
  periodEnd: string | null;
}

export function SubscriptionCard({ planName, periodEnd }: SubscriptionCardProps) {
  const renews = periodEnd
    ? new Date(periodEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
      <div className="flex items-start gap-3">
        <div className="bg-lime-500/20 text-lime-300 rounded-xl p-2.5">
          <CreditCard size={22} weight="fill" />
        </div>
        <div>
          <h2 className="text-cream-100 text-lg font-semibold">Subscription</h2>
          <p className="text-text-secondary mt-1 text-sm">
            Manage your plan and billing.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col justify-between gap-4 rounded-xl border border-cream-100/10 bg-charcoal-900 p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-cream-50 text-2xl font-bold">{planName}</p>
          {renews ? (
            <p className="text-text-secondary mt-1 text-sm">Renews on {renews}</p>
          ) : (
            <p className="text-text-secondary mt-1 text-sm">No active renewal</p>
          )}
        </div>
        <Link
          href="#"
          className="bg-lime-400 text-charcoal-950 hover:bg-lime-300 flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition"
        >
          <TrendUp size={16} weight="bold" />
          Upgrade plan
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-cream-100/10 bg-charcoal-900 p-4">
        <span className="text-text-secondary text-sm">Billing portal</span>
        <Link
          href="#"
          className="text-lime-400 hover:text-lime-300 flex items-center gap-2 text-sm font-medium transition"
        >
          Manage billing
          <ArrowSquareOut size={14} weight="bold" />
        </Link>
      </div>
    </section>
  );
}
