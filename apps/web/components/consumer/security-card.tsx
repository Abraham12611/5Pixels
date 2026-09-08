"use client";

import Link from "next/link";
import { Lock, Key } from "@phosphor-icons/react";

export function SecurityCard() {
  return (
    <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
      <div className="flex items-start gap-3">
        <div className="bg-lime-500/20 text-lime-300 rounded-xl p-2.5">
          <Lock size={22} weight="fill" />
        </div>
        <div>
          <h2 className="text-cream-100 text-lg font-semibold">Security</h2>
          <p className="text-text-secondary mt-1 text-sm">
            Manage password and account access.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Link
          href="/update-password"
          className="hover:border-lime-500/30 flex items-center justify-between rounded-xl border border-cream-100/10 bg-charcoal-900 p-4 transition hover:bg-charcoal-800"
        >
          <div className="flex items-center gap-3">
            <Key size={18} weight="bold" className="text-text-secondary" />
            <span className="text-cream-100 text-sm font-medium">Change password</span>
          </div>
        </Link>

        <div className="rounded-xl border border-cream-100/10 bg-charcoal-900 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock size={18} weight="bold" className="text-text-muted" />
              <span className="text-text-secondary text-sm font-medium">Two-factor authentication</span>
            </div>
            <span className="text-text-muted text-xs">Coming soon</span>
          </div>
        </div>
      </div>
    </section>
  );
}
