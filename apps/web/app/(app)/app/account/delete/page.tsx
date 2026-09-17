"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteAccount } from "@/lib/db/account";

export default function DeleteAccountPage() {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await deleteAccount(confirmation);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success the server action signs the user out and redirects.
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
      <Link
        href="/app/account/privacy"
        className="text-text-secondary hover:text-cream-50 text-sm transition-colors"
      >
        ← Back to Privacy
      </Link>

      <div className="border-error/30 bg-charcoal-850 mt-6 rounded-[20px] border p-8">
        <h1 className="text-cream-50 text-2xl font-semibold">Delete account</h1>
        <p className="text-text-secondary mt-2 text-sm leading-relaxed">
          This is the final confirmation step. Deleting your account is
          permanent.
        </p>

        <div className="border-error/30 bg-error/10 mt-6 rounded-[15px] border p-4">
          <p className="text-error text-sm leading-relaxed">
            <strong>Warning:</strong> This action cannot be undone. Your source
            images, generated results, favorites, and settings will be deleted.
            Any active subscription will be cancelled.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="confirmation"
              className="text-text-muted mb-1 block text-xs font-medium uppercase tracking-wide"
            >
              Confirm
            </label>
            <p className="text-text-secondary mb-2 text-sm">
              Type <strong className="text-cream-100">DELETE</strong> to confirm.
            </p>
            <input
              id="confirmation"
              name="confirmation"
              type="text"
              autoComplete="off"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
              className="border-cream-100/10 bg-charcoal-850 text-cream-50 focus:ring-error w-full rounded-[10px] border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading || confirmation !== "DELETE"}
            className="bg-error text-cream-50 hover:bg-error/85 w-full rounded-[10px] px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40"
          >
            {loading ? "Deleting…" : "Delete my account"}
          </button>

          {error && <p className="text-error text-sm">{error}</p>}
        </form>
      </div>
    </main>
  );
}
