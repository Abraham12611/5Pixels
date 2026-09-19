"use client";

import { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ProviderModelOption } from "@/lib/db/provider-catalog";

/**
 * Provider/model pickers for the preset editor. Admins choose from the seeded
 * `provider_model_pricing` catalog instead of typing endpoints by hand; a
 * "Custom value…" escape hatch reveals a plain input for values outside the
 * catalog (legacy rows, providers not yet priced).
 */

const CUSTOM_VALUE = "__custom__";
const NONE_VALUE = "";

/** Strategy-facing provider value for each catalog provider id. */
const PROVIDER_VALUE_MAP: Record<string, string> = {
  fal: "fal.ai",
};

function providerValue(provider: string): string {
  return PROVIDER_VALUE_MAP[provider] ?? provider;
}

function providerLabel(provider: string): string {
  return provider === "fal" ? "fal.ai" : provider;
}

interface ProviderFieldProps {
  name: string;
  label: string;
  providers: string[];
  optional?: boolean;
}

function ProviderSelect({
  name,
  label,
  providers,
  optional,
}: ProviderFieldProps) {
  const { register, setValue, control } = useFormContext();
  const value = useWatch({ control, name }) as string | undefined;
  const knownValues = providers.map(providerValue);
  const [manual, setManual] = useState(
    () => Boolean(value) && !knownValues.includes(value as string)
  );

  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      {manual ? (
        <div className="mt-2 flex items-center gap-2">
          <Input
            id={name}
            {...register(name)}
            placeholder="e.g. fal.ai"
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => {
              setManual(false);
              setValue(name, optional ? NONE_VALUE : knownValues[0] ?? "", {
                shouldDirty: true,
              });
            }}
            className="text-text-muted hover:text-cream-100 shrink-0 text-xs underline underline-offset-2"
          >
            Use list
          </button>
        </div>
      ) : (
        <>
          <Select
            id={name}
            value={value ?? NONE_VALUE}
            onChange={(e) => {
              const next = e.target.value;
              if (next === CUSTOM_VALUE) {
                setManual(true);
                return;
              }
              setValue(name, next, { shouldDirty: true });
            }}
            className="mt-2"
          >
            {optional && <option value={NONE_VALUE}>None</option>}
            {providers.map((p) => (
              <option key={p} value={providerValue(p)}>
                {providerLabel(p)}
              </option>
            ))}
            <option value={CUSTOM_VALUE}>Custom value…</option>
          </Select>
        </>
      )}
    </div>
  );
}

interface ModelSelectProps {
  name: string;
  providerName: string;
  label: string;
  models: ProviderModelOption[];
  optional?: boolean;
}

function ModelSelect({
  name,
  providerName,
  label,
  models,
  optional,
}: ModelSelectProps) {
  const { register, setValue, control } = useFormContext();
  const value = useWatch({ control, name }) as string | undefined;
  const [query, setQuery] = useState("");
  const knownIds = useMemo(
    () => new Set(models.map((m) => m.endpointId)),
    [models]
  );
  const [manual, setManual] = useState(
    () => Boolean(value) && !knownIds.has(value as string)
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.endpointId.toLowerCase().includes(q)
    );
  }, [models, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProviderModelOption[]>();
    for (const m of filtered) {
      const list = map.get(m.category) ?? [];
      list.push(m);
      map.set(m.category, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      {manual ? (
        <div className="mt-2 flex items-center gap-2">
          <Input
            id={name}
            {...register(name)}
            placeholder="e.g. fal-ai/flux/dev/image-to-image"
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => {
              setManual(false);
              setValue(name, optional ? NONE_VALUE : "", {
                shouldDirty: true,
              });
            }}
            className="text-text-muted hover:text-cream-100 shrink-0 text-xs underline underline-offset-2"
          >
            Use list
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {models.length > 40 && (
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter models…"
              aria-label={`Filter ${label}`}
              className="h-8 text-xs"
            />
          )}
          <Select
            id={name}
            value={value ?? NONE_VALUE}
            onChange={(e) => {
              const next = e.target.value;
              if (next === CUSTOM_VALUE) {
                setManual(true);
                return;
              }
              setValue(name, next, { shouldDirty: true });
              // Picking a catalog model implies its provider.
              const picked = models.find((m) => m.endpointId === next);
              if (picked) {
                setValue(providerName, providerValue(picked.provider), {
                  shouldDirty: true,
                });
              }
            }}
          >
            {optional && <option value={NONE_VALUE}>None</option>}
            {grouped.map(([category, items]) => (
              <optgroup key={category} label={category}>
                {items.map((m) => (
                  <option key={m.endpointId} value={m.endpointId}>
                    {m.displayName} — {m.endpointId}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={CUSTOM_VALUE}>Custom value…</option>
          </Select>
          {query && (
            <p className="text-text-muted text-xs">
              {filtered.length} of {models.length} models
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ProviderStrategyFields({
  catalog,
  className,
}: {
  catalog: ProviderModelOption[];
  className?: string;
}) {
  const providers = useMemo(
    () => [...new Set(catalog.map((m) => m.provider))],
    [catalog]
  );
  const base = "version.provider_strategy";

  return (
    <div className={cn("grid gap-6 md:grid-cols-2", className)}>
      <ProviderSelect
        name={`${base}.primary_provider`}
        label="Primary provider"
        providers={providers}
      />
      <ModelSelect
        name={`${base}.primary_model`}
        providerName={`${base}.primary_provider`}
        label="Primary model"
        models={catalog}
      />
      <ProviderSelect
        name={`${base}.fallback_provider`}
        label="Fallback provider (optional)"
        providers={providers}
        optional
      />
      <ModelSelect
        name={`${base}.fallback_model`}
        providerName={`${base}.fallback_provider`}
        label="Fallback model (optional)"
        models={catalog}
        optional
      />
    </div>
  );
}
