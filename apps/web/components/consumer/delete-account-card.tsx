"use client";

import Link from "next/link";
import { Trash, ArrowRight } from "@phosphor-icons/react";

export function DeleteAccountCard() {
  return (
    <section className="border-rose-500/20 bg-rose-950/20 rounded-2xl border p-6">
      <div className="flex items-start gap-3">
        <div className="bg-rose-900/40 text-rose-300 rounded-xl p-2.5">
          <Trash size={22} weight="fill" />
        </div>
        <div>
          <h2 className="text-cream-100 text-lg font-semibold">Delete account</h2>
          <p className="text-text-secondary mt-1 text-sm">
            Permanently delete your account and all data.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <Link
          href="/app/settings/delete"
          className="hover:bg-rose-950/40 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-900/30 px-5 py-2.5 text-sm font-semibold text-rose-300 transition"
        >
          Delete account
          <ArrowRight size={16} weight="bold" />
        </Link>
      </div>
    </section>
  );
}
