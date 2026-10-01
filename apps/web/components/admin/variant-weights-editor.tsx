"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  campaignId: string;
  weights: Record<string, number>;
  action: (
    campaignId: string,
    weights: Record<string, number>
  ) => Promise<void>;
}

/** Variant weight matrix — how traffic splits across ladder variants. */
export function VariantWeightsEditor({ campaignId, weights, action }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const variants = Object.keys(weights);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(variants.map((v) => [v, String(weights[v])]))
  );
  const [newVariant, setNewVariant] = useState("");
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const total = Object.values(values).reduce(
    (sum, v) => sum + (Number(v) || 0),
    0
  );

  const save = () =>
    startTransition(async () => {
      setError(undefined);
      setSaved(false);
      const next: Record<string, number> = {};
      for (const [variant, raw] of Object.entries(values)) {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) {
          setError(`Weight for "${variant}" must be a non-negative number`);
          return;
        }
        if (n > 0) next[variant] = n;
      }
      const trimmed = newVariant.trim();
      if (trimmed && !(trimmed in next)) next[trimmed] = 1;
      try {
        await action(campaignId, next);
        setSaved(true);
        setNewVariant("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });

  return (
    <div className="space-y-3">
      {[...variants, ""].map((variant, i) => (
        <div key={variant || "__new"} className="flex items-center gap-3">
          {variant ? (
            <Label className="text-cream-100 w-40 shrink-0 font-mono text-xs">
              {variant}
            </Label>
          ) : (
            <Input
              value={newVariant}
              onChange={(e) => setNewVariant(e.target.value)}
              placeholder="new_variant"
              className="bg-charcoal-800 border-cream-100/10 w-40 font-mono text-xs"
            />
          )}
          <Input
            type="number"
            min={0}
            value={variant ? values[variant] : "1"}
            onChange={(e) =>
              variant &&
              setValues((v) => ({ ...v, [variant]: e.target.value }))
            }
            className="bg-charcoal-800 border-cream-100/10 w-24"
            disabled={isPending}
            key={i}
          />
          <span className="text-text-muted text-xs">weight</span>
        </div>
      ))}
      <p className="text-text-secondary text-xs">
        Total weight: <span className="text-cream-100">{total}</span> — each
        variant gets weight/total of new assignments.
      </p>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={save}
        >
          {isPending ? "Saving…" : "Save weights"}
        </Button>
        {saved && <p className="text-lime-400 text-xs">Saved</p>}
        {error && <p className="text-error text-xs">{error}</p>}
      </div>
    </div>
  );
}
