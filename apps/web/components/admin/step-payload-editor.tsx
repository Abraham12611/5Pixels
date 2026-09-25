"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  stepId: string;
  initialPayload: Record<string, unknown>;
  action: (
    stepId: string,
    payload: Record<string, unknown>
  ) => Promise<void>;
}

/** Edits a ladder step's JSON payload — headline, discount %, deadline copy. */
export function StepPayloadEditor({ stepId, initialPayload, action }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(
    JSON.stringify(initialPayload, null, 2)
  );
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const save = () =>
    startTransition(async () => {
      setError(undefined);
      setSaved(false);
      let parsed: Record<string, unknown>;
      try {
        const raw = JSON.parse(value) as unknown;
        if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
          throw new Error("Payload must be a JSON object");
        }
        parsed = raw as Record<string, unknown>;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid JSON");
        return;
      }
      try {
        await action(stepId, parsed);
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={Math.min(10, value.split("\n").length + 1)}
        spellCheck={false}
        className="border-cream-100/10 bg-charcoal-800 text-cream-100 focus:border-lime-500/40 w-full rounded-[10px] border p-3 font-mono text-xs leading-relaxed outline-none"
      />
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={save}
        >
          {isPending ? "Saving…" : "Save payload"}
        </Button>
        {saved && <p className="text-lime-400 text-xs">Saved</p>}
        {error && <p className="text-error text-xs">{error}</p>}
      </div>
    </div>
  );
}
