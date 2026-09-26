"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * P51 — insufficient credits gate. Keeps the creative setup visible and
 * offers two recovery paths: top up (billing) or compare plans. Canceling
 * leaves the Create configuration untouched.
 */
export function InsufficientCreditsDialog({
  open,
  onOpenChange,
  required,
  balance,
  presetName,
  presetThumbUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  required: number;
  balance: number;
  presetName: string;
  presetThumbUrl?: string | null;
}) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-sm">
      <DialogContent>
        <DialogTitle>Not enough credits</DialogTitle>
        <DialogDescription>
          This transformation needs more credits than you have.
        </DialogDescription>

        <div className="border-cream-100/10 bg-charcoal-800 mt-4 flex items-center gap-3 rounded-lg border p-3">
          {presetThumbUrl && (
            <Image
              src={presetThumbUrl}
              alt=""
              width={40}
              height={50}
              className="h-12 w-10 shrink-0 rounded-md object-cover"
              unoptimized
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-cream-50 truncate text-sm font-semibold">
              {presetName}
            </p>
            <p className="text-text-muted text-xs">
              Your setup is saved while you top up.
            </p>
          </div>
        </div>

        <div className="border-cream-100/10 mt-4 space-y-2 rounded-lg border p-3 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Required</span>
            <span className="text-cream-50 font-medium tabular-nums">
              {required} {required === 1 ? "credit" : "credits"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Your balance</span>
            <span className="text-error font-medium tabular-nums">
              {balance} {balance === 1 ? "credit" : "credits"}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <Button
            type="button"
            variant="brand"
            className="w-full"
            onClick={() => router.push("/app/billing")}
          >
            Get credits
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => router.push("/pricing")}
          >
            View plans
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
