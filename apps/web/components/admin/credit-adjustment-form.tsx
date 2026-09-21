"use client";

import { useActionState, useMemo } from "react";
import { adjustUserCredits } from "@/lib/db/support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        <Label
          htmlFor="amount"
          className="text-text-muted mb-1 block text-xs font-medium uppercase"
        >
          Amount
        </Label>
        <p className="text-text-secondary mb-2 text-xs">
          Positive numbers add credits; negative numbers deduct.
        </p>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          required
          defaultValue={0}
        />
      </div>

      <div>
        <Label
          htmlFor="reason"
          className="text-text-muted mb-1 block text-xs font-medium uppercase"
        >
          Reason
        </Label>
        <Input
          id="reason"
          name="reason"
          type="text"
          required
          minLength={4}
          placeholder="Customer support credit"
        />
      </div>

      <Button type="submit" variant="brand" size="sm" disabled={pending}>
        {pending ? "Processing…" : "Adjust credits"}
      </Button>

      {state.success ? (
        <p className="text-lime-400 text-sm">
          Credits adjusted. New balance: {(state.newBalance ?? 0).toFixed(2)} credits.
        </p>
      ) : state.error ? (
        <p className="text-error text-sm">{state.error}</p>
      ) : null}

      <p className="text-text-muted text-xs">
        Current balance: {currentBalance.toFixed(2)} credits
      </p>
    </form>
  );
}
