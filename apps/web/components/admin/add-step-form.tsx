"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const KINDS = [
  "weekly_pair",
  "discount",
  "plans",
  "referral",
  "topup",
  "exit",
] as const;

interface Props {
  campaignId: string;
  variant: string;
  action: (
    campaignId: string,
    variant: string,
    kind: (typeof KINDS)[number],
    payload: Record<string, unknown>
  ) => Promise<void>;
}

export function AddStepForm({ campaignId, variant, action }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<(typeof KINDS)[number]>("discount");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();

  const add = () =>
    startTransition(async () => {
      try {
        await action(campaignId, variant, kind, {});
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Add failed");
      }
    });

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
      >
        + Add step
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])}
        className="bg-charcoal-800 border-cream-100/10 text-cream-100 rounded-[10px] border px-3 py-1.5 text-sm"
        disabled={isPending}
      >
        {KINDS.map((k) => (
          <option key={k} value={k}>
            {k.replace("_", " ")}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={add}
      >
        {isPending ? "Adding…" : "Add"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
      {error && <p className="text-error text-xs">{error}</p>}
    </div>
  );
}
