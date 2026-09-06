"use client";

import { useActionState, useMemo } from "react";
import { adjustUserCredits } from "@/lib/db/support";

interface CreditAdjustmentFormProps {
  userId: string;
  currentBalance: number;
}

export function CreditAdjustmentForm({
  userId,
  currentBalance,
}: CreditAdjustmentFormProps) {
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const [state, action, pending] = useActionState(
    async (_: unknown, formData: FormData) => {
      const amount = Number(formData.get("amount"));
      const reason = String(formData.get("reason"));
      return adjustUserCredits(userId, amount, reason, idempotencyKey);
    },
    { success: false }
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <div>
        <label
          htmlFor="amount"
          className="text-text-muted mb-1 block text-xs font-medium uppercase"
        >
          Amount
        </label>
        <p className="text-text-secondary mb-2 text-xs">
          Positive numbers add credits; negative numbers deduct.
        </p>
        <input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          required
          defaultValue={0}
          className="border-cream-100/10 bg-charcoal-900 text-cream-50 w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
        />
      </div>

      <div>
        <label
          htmlFor="reason"
          className="text-text-muted mb-1 block text-xs font-medium uppercase"
        >
          Reason
        </label>
        <input
          id="reason"
          name="reason"
          type="text"
          required
          minLength={4}
          placeholder="Customer support credit"
          className="border-cream-100/10 bg-charcoal-900 text-cream-50 w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-lime-400 text-charcoal-950 hover:bg-lime-300 disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-semibold transition"
      >
        {pending ? "Processing…" : "Adjust credits"}
      </button>

      {state.success ? (
        <p className="text-lime-400 text-sm">
          Credits adjusted. New balance: {(state.newBalance ?? 0).toFixed(2)} credits.
        </p>
      ) : state.error ? (
        <p className="text-rose-400 text-sm">{state.error}</p>
      ) : null}

      <p className="text-text-muted text-xs">
        Current balance: {currentBalance.toFixed(2)} credits
      </p>
    </form>
  );
}
