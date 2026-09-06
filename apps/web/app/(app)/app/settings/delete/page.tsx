"use client";

import { useState } from "react";
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
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-8">
        <h1 className="text-cream-50 text-2xl font-bold">Delete account</h1>
        <p className="text-text-secondary mt-2">
          This will permanently delete your account and all associated personal
          data. Financial records and generation metadata may be retained for
          legal and operational purposes.
        </p>

        <div className="bg-rose-950/20 border-rose-500/30 mt-6 rounded-xl border p-4">
          <p className="text-rose-200 text-sm">
            <strong>Warning:</strong> This action cannot be undone. Your source
            images, generated outputs, favorites, and settings will be deleted.
            Any active subscription will be cancelled.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="confirmation"
              className="text-text-muted mb-1 block text-xs font-medium uppercase"
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
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
              className="border-cream-100/10 bg-charcoal-900 text-cream-50 w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-rose-500 text-cream-50 hover:bg-rose-400 disabled:opacity-50 w-full rounded-xl px-4 py-2 text-sm font-semibold transition"
          >
            {loading ? "Deleting…" : "Delete my account"}
          </button>

          {error && (
            <p className="text-rose-400 text-sm">{error}</p>
          )}
        </form>
      </div>
    </main>
  );
}
