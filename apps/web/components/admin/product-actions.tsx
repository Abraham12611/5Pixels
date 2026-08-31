"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProductStatus =
  | "draft"
  | "internal_test"
  | "private_beta"
  | "scheduled"
  | "active"
  | "paused"
  | "retired";

interface ProductActionsProps {
  productId: string;
  status: ProductStatus;
  action: (
    productId: string,
    newStatus: string,
    reason?: string
  ) => Promise<void>;
}

const ACTIONS: Record<
  ProductStatus,
  {
    label: string;
    next: ProductStatus;
    variant: "secondary" | "danger" | "primary";
  } | null
> = {
  draft: null,
  internal_test: null,
  private_beta: null,
  scheduled: { label: "Activate", next: "active", variant: "primary" },
  active: { label: "Pause", next: "paused", variant: "secondary" },
  paused: { label: "Unpause", next: "active", variant: "primary" },
  retired: null,
};

export function ProductActions({
  productId,
  status,
  action,
}: ProductActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();

  const primary = ACTIONS[status];
  const canRetire = status === "active" || status === "paused";

  const runAction = async (newStatus: ProductStatus) => {
    setError(undefined);
    startTransition(async () => {
      try {
        await action(productId, newStatus, reason.trim() || undefined);
        setConfirmOpen(false);
        setReason("");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Action failed. Please try again."
        );
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      {primary && (
        <Button
          type="button"
          variant={primary.variant}
          disabled={isPending}
          onClick={() => runAction(primary.next)}
        >
          {isPending ? "Working…" : primary.label}
        </Button>
      )}

      {canRetire && (
        <Button
          type="button"
          variant="danger"
          disabled={isPending}
          onClick={() => setConfirmOpen(true)}
        >
          Retire
        </Button>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-charcoal-850 text-cream-50 border-cream-100/10">
          <DialogHeader>
            <DialogTitle>Retire product?</DialogTitle>
            <DialogDescription className="text-text-secondary">
              This makes the product unavailable to users. Products are never
              deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="retire-reason">Reason (optional)</Label>
            <Input
              id="retire-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you retiring this product?"
              disabled={isPending}
            />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <DialogFooter className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={isPending}
              onClick={() => runAction("retired")}
            >
              {isPending ? "Retiring…" : "Confirm retire"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
