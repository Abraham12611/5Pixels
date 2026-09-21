"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ProviderModelOption } from "@/lib/db/provider-catalog";

/**
 * Multi-select grid of provider endpoints for the admin test lab. The preset's
 * configured endpoint is pre-checked upstream; admins can add any number of
 * image-to-image models to compare results side by side.
 */
export function LabModelPicker({
  models,
  defaultEndpointId,
  selected,
  onToggle,
  onSelectAll,
  onClear,
  disabled,
}: {
  models: ProviderModelOption[];
  defaultEndpointId: string | null;
  selected: Set<string>;
  onToggle: (endpointId: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.endpointId.toLowerCase().includes(q)
    );
  }, [models, query]);

  const defaultFirst = useMemo(() => {
    if (!defaultEndpointId) return filtered;
    return [...filtered].sort((a, b) => {
      if (a.endpointId === defaultEndpointId) return -1;
      if (b.endpointId === defaultEndpointId) return 1;
      return 0;
    });
  }, [filtered, defaultEndpointId]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter models by name or endpoint…"
          aria-label="Filter models"
          className="h-9 flex-1 text-sm sm:max-w-xs"
          disabled={disabled}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={disabled}
            className="text-text-secondary hover:text-cream-50 text-xs font-medium transition-colors disabled:opacity-50"
          >
            Select all
          </button>
          <span className="text-text-muted text-xs">·</span>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="text-text-secondary hover:text-cream-50 text-xs font-medium transition-colors disabled:opacity-50"
          >
            Clear
          </button>
          <span className="bg-charcoal-700 text-cream-100 ml-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
            {selected.size} selected
          </span>
        </div>
      </div>

      <div className="mt-4 grid max-h-96 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
        {defaultFirst.map((model) => {
          const isSelected = selected.has(model.endpointId);
          const isDefault = model.endpointId === defaultEndpointId;
          return (
            <button
              key={model.endpointId}
              type="button"
              onClick={() => onToggle(model.endpointId)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={cn(
                "group flex items-start gap-3 rounded-[10px] border p-3 text-left transition-colors disabled:opacity-60",
                isSelected
                  ? "border-lime-500/50 bg-lime-500/10"
                  : "border-cream-100/10 bg-charcoal-800/60 hover:border-cream-100/25"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors",
                  isSelected
                    ? "border-lime-500 bg-lime-500 text-ink-950"
                    : "border-cream-100/25 text-transparent group-hover:border-cream-100/50"
                )}
              >
                <Check size={11} weight="bold" />
              </span>
              <span className="min-w-0">
                <span className="text-cream-50 flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{model.displayName}</span>
                  {isDefault && (
                    <span className="bg-charcoal-700 text-cream-100 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                      preset
                    </span>
                  )}
                </span>
                <span className="text-text-muted mt-0.5 block truncate font-mono text-[11px]">
                  {model.endpointId}
                </span>
                <span className="text-text-muted mt-0.5 block text-[11px]">
                  ${model.unitPrice.toFixed(5)}/{model.unit}
                </span>
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-text-secondary col-span-full py-6 text-center text-sm">
            No models match &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
