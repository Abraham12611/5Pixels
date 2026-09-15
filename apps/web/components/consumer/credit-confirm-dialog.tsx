"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SKIP_COST_CONFIRM_KEY } from "@/lib/generation/credit-confirm";

/**
 * P50 — lightweight cost confirmation shown only per policy (first paid
 * generation, or an unusually costly preset). Not a mandatory gate.
 */
export function CreditConfirmDialog({
  open,
  onOpenChange,
  cost,
  balance,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cost: number;
  balance: number;
  onConfirm: () => void;
}) {
  const [dontAsk, setDontAsk] = useState(false);

  const handleConfirm = () => {
    if (dontAsk) {
      try {
        localStorage.setItem(SKIP_COST_CONFIRM_KEY, "1");
      } catch {
        // storage unavailable — preference just isn't remembered
      }
    }
    onOpenChange(false);
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-sm">
      <DialogContent>
        <DialogTitle>Ready to generate?</DialogTitle>
        <DialogDescription>
          This transformation costs{" "}
          <span className="text-cream-50 font-semibold tabular-nums">
            {cost} {cost === 1 ? "credit" : "credits"}
          </span>
          .
        </DialogDescription>

        <div className="border-cream-100/10 bg-charcoal-800 mt-4 flex items-center justify-between rounded-lg border px-3 py-2.5 text-[13px]">
          <span className="text-text-secondary">Your balance</span>
          <span className="text-cream-50 font-medium tabular-nums">
            {balance} {balance === 1 ? "credit" : "credits"}
          </span>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13px]">
          <input
            type="checkbox"
            checked={dontAsk}
            onChange={(e) => setDontAsk(e.target.checked)}
            className="accent-lime-400 mt-0.5 h-4 w-4 shrink-0"
          />
          <span className="text-text-secondary">
            Don&apos;t ask again for standard-cost transformations
          </span>
        </label>

        <div className="mt-5 flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="brand"
            onClick={handleConfirm}
            className="flex-1"
          >
            Generate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
