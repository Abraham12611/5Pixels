"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  campaignId: string;
  frequency: Record<string, unknown>;
  action: (
    campaignId: string,
    frequency: Record<string, unknown>
  ) => Promise<void>;
}

const FIELDS = [
  {
    key: "takeover_per_day",
    label: "Takeovers / day",
    hint: "Max full-screen offers per user per day (0 = unlimited)",
  },
  {
    key: "takeover_lifetime",
    label: "Takeovers lifetime",
    hint: "Max full-screen offers per user, ever (0 = unlimited)",
  },
  {
    key: "full_decline_cooldown_hours",
    label: "Decline cooldown (hours)",
    hint: "Quiet period after a user declines the whole ladder",
  },
] as const;

/** Frequency caps — the "don't spam the user" controls (08 §7). */
export function FrequencyEditor({ campaignId, frequency, action }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      FIELDS.map((f) => [
        f.key,
        frequency[f.key] != null ? String(frequency[f.key]) : "",
      ])
    )
  );
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const save = () =>
    startTransition(async () => {
      setError(undefined);
      setSaved(false);
      const next: Record<string, unknown> = { ...frequency };
      for (const f of FIELDS) {
        const raw = values[f.key].trim();
        if (raw === "") {
          delete next[f.key];
          continue;
        }
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) {
          setError(`${f.label} must be a non-negative number`);
          return;
        }
        next[f.key] = n;
      }
      try {
        await action(campaignId, next);
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });

  return (
    <div className="space-y-4">
      {FIELDS.map((f) => (
        <div key={f.key} className="flex items-start gap-3">
          <div className="w-56 shrink-0">
            <Label className="text-cream-100 text-xs">{f.label}</Label>
            <p className="text-text-muted mt-0.5 text-[11px] leading-snug">
              {f.hint}
            </p>
          </div>
          <Input
            type="number"
            min={0}
            value={values[f.key]}
            onChange={(e) =>
              setValues((v) => ({ ...v, [f.key]: e.target.value }))
            }
            placeholder="not set"
            className="bg-charcoal-800 border-cream-100/10 w-28"
            disabled={isPending}
          />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={save}
        >
          {isPending ? "Saving…" : "Save caps"}
        </Button>
        {saved && <p className="text-lime-400 text-xs">Saved</p>}
        {error && <p className="text-error text-xs">{error}</p>}
      </div>
    </div>
  );
}
