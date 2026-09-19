"use client";

import { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RichSelect,
  type RichSelectGroup,
} from "@/components/ui/rich-select";
import { Cpu } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ProviderModelOption } from "@/lib/db/provider-catalog";

/**
 * Provider/model pickers for the preset editor. Admins choose from the seeded
 * `provider_model_pricing` catalog via searchable popover menus — the same
 * grammar as the lab's model picker; a "Custom value…" escape hatch reveals a
 * plain input for values outside the catalog (legacy rows, unpriced
 * providers).
 */

const CUSTOM_VALUE = "__custom__";

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

/** Friendly group label for a pricing source category. */
function categoryLabel(category: string): string {
  return category
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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
              setValue(name, optional ? "" : (knownValues[0] ?? ""), {
                shouldDirty: true,
              });
            }}
            className="text-text-muted hover:text-cream-100 shrink-0 text-xs underline underline-offset-2"
          >
            Use list
          </button>
        </div>
      ) : (
        <div className="mt-2">
          <RichSelect
            id={name}
            aria-label={label}
            value={value ?? ""}
            onValueChange={(next) => {
              if (next === CUSTOM_VALUE) {
                setManual(true);
                return;
              }
              setValue(name, next, { shouldDirty: true });
            }}
            noneLabel={optional ? "None" : undefined}
            options={providers.map((p) => ({
              value: providerValue(p),
              label: providerLabel(p),
              icon: <Cpu size={15} />,
            }))}
            footerOption={{
              value: CUSTOM_VALUE,
              label: "Custom value…",
              description: "Type a provider not in the catalog",
            }}
          />
        </div>
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
  const knownIds = useMemo(
    () => new Set(models.map((m) => m.endpointId)),
    [models]
  );
  const [manual, setManual] = useState(
    () => Boolean(value) && !knownIds.has(value as string)
  );

  const groups = useMemo<RichSelectGroup[]>(() => {
    const map = new Map<string, ProviderModelOption[]>();
    for (const m of models) {
      const list = map.get(m.category) ?? [];
      list.push(m);
      map.set(m.category, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, items]) => ({
        label: categoryLabel(category),
        options: items.map((m) => ({
          value: m.endpointId,
          label: m.displayName,
          description: m.endpointId,
          hint: `$${m.unitPrice.toFixed(3)}/${m.unit === "image" ? "img" : m.unit}`,
          keywords: `${m.endpointId} ${m.provider}`,
        })),
      }));
  }, [models]);

  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      {manual ? (
        <div className="mt-2 flex items-center gap-2">
          <Input
            id={name}
            {...register(name)}
            placeholder="e.g. fal-ai/flux/dev/image-to-image"
            className="flex-1 font-mono text-xs"
          />
          <button
            type="button"
            onClick={() => {
              setManual(false);
              setValue(name, "", { shouldDirty: true });
            }}
            className="text-text-muted hover:text-cream-100 shrink-0 text-xs underline underline-offset-2"
          >
            Use list
          </button>
        </div>
      ) : (
        <div className="mt-2">
          <RichSelect
            id={name}
            aria-label={label}
            value={value ?? ""}
            onValueChange={(next) => {
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
            noneLabel={optional ? "None" : undefined}
            groups={groups}
            searchable
            searchPlaceholder="Search models or endpoints…"
            placeholder="Select a model…"
            footerOption={{
              value: CUSTOM_VALUE,
              label: "Custom value…",
              description: "Type an endpoint not in the catalog",
            }}
            panelClassName="min-w-72"
          />
          {value && knownIds.has(value) && (
            <p className="text-text-muted mt-1.5 truncate font-mono text-[11px]">
              {value}
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
