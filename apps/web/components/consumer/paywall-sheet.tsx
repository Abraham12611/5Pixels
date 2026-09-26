"use client";

import { Sheet } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaywallContent } from "@/components/consumer/paywall-content";
import { useIsNarrow } from "@/lib/ui/use-media-query";
import type { PlanForPurchase } from "@/lib/db/plans";

export interface PaywallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: PlanForPurchase[];
  required: number;
  /** Current balance — renders the exact shortfall when provided. */
  balance?: number;
  presetName: string;
  presetThumbUrl?: string | null;
  /** Where checkout returns to on success/cancel — the create page. */
  returnPath: string;
}

/**
 * The single credits paywall (13 §4) — one consolidated surface for both
 * viewports: a T2 Sheet on narrow screens, the same content inside a Dialog
 * above `sm`. Dismissal returns to the create screen with the setup intact.
 */
export function Paywall(props: PaywallProps) {
  const isNarrow = useIsNarrow();

  if (isNarrow) {
    return (
      <Sheet
        open={props.open}
        onOpenChange={props.onOpenChange}
        tier="content"
        title="Add credits to generate"
        description="Your preset and photo are saved — pick a plan to continue."
      >
        <PaywallContent {...props} />
      </Sheet>
    );
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      className="max-w-md"
    >
      <DialogContent>
        <DialogTitle>Add credits to generate</DialogTitle>
        <p className="text-text-secondary text-sm">
          Your preset and photo are saved — pick a plan to continue.
        </p>
        <PaywallContent {...props} />
      </DialogContent>
    </Dialog>
  );
}
