"use client";

import Link from "next/link";
import { Coins, ArrowRight } from "@phosphor-icons/react";

interface CreditsCardProps {
  balance: number;
}

export function CreditsCard({ balance }: CreditsCardProps) {
  const low = balance < 20;
  const pct = Math.min(100, (balance / 100) * 100);

  return (
    <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
      <div className="flex items-start gap-3">
        <div className="bg-lime-500/20 text-lime-300 rounded-xl p-2.5">
          <Coins size={22} weight="fill" />
        </div>
        <div>
          <h2 className="text-cream-100 text-lg font-semibold">Credits</h2>
          <p className="text-text-secondary mt-1 text-sm">
            Your current credit balance.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-cream-100/10 bg-charcoal-900 p-5">
        <p className="text-text-muted text-sm">Available credits</p>
        <p className="text-cream-50 mt-1 text-4xl font-bold">{balance}</p>

        <div className="mt-4">
          <div className="bg-charcoal-700 h-1.5 w-full overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full ${low ? "bg-rose-500" : "bg-lime-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-4">
          <Link
            href="/app/billing"
            className="bg-lime-400 text-charcoal-950 hover:bg-lime-300 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition"
          >
            Top-up credits
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </div>
    </section>
  );
}
