"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";

interface Props {
  stepId: string;
  action: (stepId: string) => Promise<void>;
}

export function DeleteStepButton({ stepId, action }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);

  const run = () =>
    startTransition(async () => {
      await action(stepId);
      router.refresh();
    });

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="text-text-muted hover:text-error p-1.5 transition-colors"
        aria-label="Delete step"
      >
        <Trash size={15} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-error text-xs">Delete this step?</span>
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        className="text-error text-xs font-semibold"
      >
        {isPending ? "Deleting…" : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="text-text-secondary text-xs"
      >
        Cancel
      </button>
    </div>
  );
}
