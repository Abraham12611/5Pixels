"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface VersionSummary {
  id: string;
  version_number: number;
  state: string;
  published_at: string | null;
  credit_cost: number;
  provider_strategy: {
    primary_provider: string;
    primary_model: string;
    fallback_provider?: string;
    fallback_model?: string;
  };
  private_instruction_template: string;
  private_negative_instruction: string | null;
  model_config: Record<string, unknown>;
  input_validation_config: Record<string, unknown>;
  post_process_config: Record<string, unknown>;
  safety_config: Record<string, unknown>;
}

interface VersionListProps {
  versions: VersionSummary[];
  selectedVersionId: string | undefined;
  onSelect: (versionId: string) => void;
}

const STATE_COLORS: Record<string, string> = {
  draft: "bg-charcoal-700 text-cream-100",
  testing: "bg-blue-900/40 text-blue-300",
  active: "bg-lime-500/20 text-lime-400",
  retired: "bg-charcoal-700 text-text-muted",
};

export function VersionList({
  versions,
  selectedVersionId,
  onSelect,
}: VersionListProps) {
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);
  const [diffPair, setDiffPair] = useState<{
    base: VersionSummary;
    target: VersionSummary;
  } | null>(null);

  const sorted = [...versions].sort(
    (a, b) => b.version_number - a.version_number
  );

  const selected = versions.find((v) => v.id === selectedVersionId);
  const active = versions.find((v) => v.state === "active");

  const openDiff = (target: VersionSummary) => {
    if (!selected) return;
    setDiffPair({ base: selected, target });
    setDiffDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-cream-50 text-lg font-semibold">Versions</h2>
        {selected && active && selected.id !== active.id && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => openDiff(active)}
          >
            Compare with active
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {sorted.map((version) => (
          <div
            key={version.id}
            className={cn(
              "flex items-center justify-between rounded-xl border p-3",
              version.id === selectedVersionId
                ? "border-lime-500/40 bg-lime-500/5"
                : "border-cream-100/10 bg-charcoal-800"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-cream-50 font-medium">
                v{version.version_number}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  STATE_COLORS[version.state] ?? STATE_COLORS.retired
                )}
              >
                {version.state}
              </span>
              {version.published_at && (
                <span className="text-text-muted text-xs">
                  published {new Date(version.published_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-secondary text-sm">
                {version.credit_cost} credits
              </span>
              <span className="text-text-muted text-xs">
                {version.provider_strategy.primary_provider}/
                {version.provider_strategy.primary_model}
              </span>
              {version.id !== selectedVersionId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onSelect(version.id)}
                >
                  Edit
                </Button>
              )}
              {version.id !== selectedVersionId &&
                active &&
                version.id !== active.id && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openDiff(version)}
                  >
                    Diff
                  </Button>
                )}
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={diffDialogOpen}
        onOpenChange={setDiffDialogOpen}
        className="max-w-2xl"
      >
        <div className="w-full max-w-2xl">
          <h2 className="text-cream-50 mb-4 text-lg font-semibold">
            Version diff
          </h2>
          {diffPair && (
            <VersionDiff base={diffPair.base} target={diffPair.target} />
          )}
          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDiffDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function VersionDiff({
  base,
  target,
}: {
  base: VersionSummary;
  target: VersionSummary;
}) {
  const fields: Array<{
    label: string;
    baseValue: string;
    targetValue: string;
  }> = [
    {
      label: "Version",
      baseValue: `v${base.version_number}`,
      targetValue: `v${target.version_number}`,
    },
    {
      label: "State",
      baseValue: base.state,
      targetValue: target.state,
    },
    {
      label: "Credit cost",
      baseValue: String(base.credit_cost),
      targetValue: String(target.credit_cost),
    },
    {
      label: "Primary provider",
      baseValue: base.provider_strategy.primary_provider,
      targetValue: target.provider_strategy.primary_provider,
    },
    {
      label: "Primary model",
      baseValue: base.provider_strategy.primary_model,
      targetValue: target.provider_strategy.primary_model,
    },
    {
      label: "Fallback provider",
      baseValue: base.provider_strategy.fallback_provider ?? "—",
      targetValue: target.provider_strategy.fallback_provider ?? "—",
    },
    {
      label: "Fallback model",
      baseValue: base.provider_strategy.fallback_model ?? "—",
      targetValue: target.provider_strategy.fallback_model ?? "—",
    },
    {
      label: "Instruction template",
      baseValue: base.private_instruction_template,
      targetValue: target.private_instruction_template,
    },
    {
      label: "Negative instruction",
      baseValue: base.private_negative_instruction ?? "—",
      targetValue: target.private_negative_instruction ?? "—",
    },
    {
      label: "Model config",
      baseValue: JSON.stringify(base.model_config, null, 2),
      targetValue: JSON.stringify(target.model_config, null, 2),
    },
    {
      label: "Input validation",
      baseValue: JSON.stringify(base.input_validation_config, null, 2),
      targetValue: JSON.stringify(target.input_validation_config, null, 2),
    },
    {
      label: "Post-processing",
      baseValue: JSON.stringify(base.post_process_config, null, 2),
      targetValue: JSON.stringify(target.post_process_config, null, 2),
    },
    {
      label: "Safety config",
      baseValue: JSON.stringify(base.safety_config, null, 2),
      targetValue: JSON.stringify(target.safety_config, null, 2),
    },
  ];

  return (
    <div className="space-y-3">
      {fields.map((field) => {
        const changed = field.baseValue !== field.targetValue;
        return (
          <div
            key={field.label}
            className={cn(
              "rounded-lg border p-3",
              changed
                ? "border-lime-500/30 bg-lime-500/5"
                : "border-cream-100/10 bg-charcoal-800"
            )}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-cream-50 text-sm font-medium">
                {field.label}
              </span>
              {changed && (
                <span className="text-lime-400 text-xs">changed</span>
              )}
            </div>
            {changed ? (
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="text-text-muted text-xs">Current (editing)</p>
                  <pre className="text-cream-100 mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs">
                    {field.baseValue}
                  </pre>
                </div>
                <div>
                  <p className="text-text-muted text-xs">Comparison</p>
                  <pre className="text-cream-100 mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs">
                    {field.targetValue}
                  </pre>
                </div>
              </div>
            ) : (
              <pre className="text-text-secondary max-h-32 overflow-auto whitespace-pre-wrap text-xs">
                {field.baseValue}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}
