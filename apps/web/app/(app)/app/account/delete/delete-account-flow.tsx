"use client";

import { useState } from "react";
import Link from "next/link";
import { DownloadSimple, Warning } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { deleteAccount } from "@/lib/db/account";
import type { ActivePlan } from "@/lib/billing/entitlements";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Staged account deletion (14 §5) — the page lists consequences, the T1
 * confirmation sheet is the destructive step.
 */
export function DeleteAccountFlow({
  activePlan,
  creditBalance,
}: {
  activePlan: ActivePlan | null;
  creditBalance: number;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async (e: React.FormEvent) => {
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

  const renewsLabel =
    activePlan?.currentPeriodEnd != null
      ? formatDate(activePlan.currentPeriodEnd)
      : null;

  return (
    <>
      <div className="border-error/30 bg-charcoal-850 mt-6 rounded-[20px] border p-6 sm:p-8">
        <h1 className="text-cream-50 text-2xl font-semibold">Delete account</h1>
        <p className="text-text-secondary mt-2 text-sm leading-relaxed">
          Deleting your account is permanent. Here&apos;s exactly what happens.
        </p>

        {/* Consequences — explicit lists per 14 §5 */}
        <div className="mt-6 space-y-5">
          <section>
            <h2 className="text-cream-100 text-sm font-semibold">
              What gets deleted
            </h2>
            <ul className="text-text-secondary mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
              <li>All your results and generated images</li>
              <li>Your uploaded photos and source images</li>
              <li>Saved presets, favorites, and your library</li>
              <li>Your profile, settings, and preferences</li>
              <li>
                Your remaining credit balance
                {creditBalance > 0 ? (
                  <>
                    {" "}
                    — <strong className="text-cream-100">{creditBalance} credits</strong>
                  </>
                ) : null}
                . Unused credits are forfeited and not refunded.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-cream-100 text-sm font-semibold">
              What we keep
            </h2>
            <p className="text-text-secondary mt-2 text-sm leading-relaxed">
              Billing records and invoices stay on file where required for tax
              and legal compliance. Everything else is anonymized — nothing
              remains tied to your identity.
            </p>
          </section>
        </div>

        {/* Take your results with you first */}
        <Link
          href="/app/library"
          className="border-cream-100/10 bg-elevated-2 hover:bg-elevated-3 mt-6 flex items-center gap-3 rounded-[15px] border p-4 transition-colors"
        >
          <DownloadSimple size={18} className="text-text-secondary shrink-0" />
          <span className="min-w-0">
            <span className="text-cream-100 block text-sm font-medium">
              Download your results first
            </span>
            <span className="text-text-secondary mt-0.5 block text-xs leading-relaxed">
              Use Select → Download in your Library to save results before
              they&apos;re gone.
            </span>
          </span>
        </Link>

        {/* Surface an active subscription before deleting */}
        {activePlan && (
          <div className="border-warning/30 bg-warning/10 mt-4 rounded-[15px] border p-4">
            <p className="text-warning flex items-start gap-2 text-sm leading-relaxed">
              <Warning size={16} className="mt-0.5 shrink-0" />
              <span>
                You have an active <strong>{activePlan.name}</strong> plan
                {renewsLabel ? <> renewing {renewsLabel}</> : null}. Deleting
                your account cancels it at the end of the period — or{" "}
                <Link
                  href="/app/billing/plan"
                  className="underline underline-offset-2"
                >
                  cancel it now
                </Link>{" "}
                if you&apos;d rather keep your account.
              </span>
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="border-error/40 text-error hover:bg-error/10 mt-8 w-full rounded-[10px] border px-4 py-3 text-sm font-semibold transition"
        >
          Delete my account
        </button>
      </div>

      {/* T1 confirmation — the destructive step (14 §5) */}
      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        tier="action"
        title="Delete your account?"
        description="This cannot be undone. Everything listed above — including unused credits — is deleted permanently."
        footer={
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setSheetOpen(false)}
              disabled={loading}
            >
              Keep my account
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={loading || confirmation !== "DELETE"}
            >
              {loading ? "Deleting…" : "Delete my account"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <p className="text-text-secondary mb-2 text-sm">
              Type <strong className="text-cream-100">DELETE</strong> to confirm.
            </p>
            <input
              id="delete-confirmation"
              name="confirmation"
              type="text"
              autoComplete="off"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="border-cream-100/10 bg-charcoal-850 text-cream-50 focus:ring-error w-full rounded-[10px] border px-4 py-2.5 text-sm focus:ring-2 focus:outline-none"
            />
          </div>
          {error && <p className="text-error text-sm">{error}</p>}
        </form>
      </Sheet>
    </>
  );
}
