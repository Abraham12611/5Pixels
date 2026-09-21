"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateUserSettings } from "@/lib/db/settings";
import { RichSelect } from "@/components/ui/rich-select";

interface RetentionControlsProps {
  originalsDays: number | null;
  outputsDays: number | null;
}

const OPTIONS = [
  { value: "", label: "Keep until I delete them" },
  { value: "30", label: "Delete after 30 days" },
  { value: "90", label: "Delete after 90 days" },
  { value: "365", label: "Delete after 1 year" },
];

export function RetentionControls({
  originalsDays,
  outputsDays,
}: RetentionControlsProps) {
  const [originals, setOriginals] = useState(originalsDays);
  const [outputs, setOutputs] = useState(outputsDays);
  const [pending, startTransition] = useTransition();

  const save = (
    key: "autoDeleteOriginalsDays" | "autoDeleteOutputsDays",
    value: number | null
  ) => {
    startTransition(async () => {
      const result = await updateUserSettings({ [key]: value });
      if (result.success) {
        toast.success("Privacy setting saved");
      } else {
        toast.error(result.error ?? "Unable to save setting");
      }
    });
  };

  const select = (
    id: string,
    value: number | null,
    onChange: (v: number | null) => void,
    settingKey: "autoDeleteOriginalsDays" | "autoDeleteOutputsDays"
  ) => (
    <RichSelect
      id={id}
      value={value == null ? "" : String(value)}
      disabled={pending}
      onValueChange={(v) => {
        const next = v === "" ? null : Number(v);
        onChange(next);
        save(settingKey, next);
      }}
      options={OPTIONS}
    />
  );

  return (
    <div className="border-cream-100/10 mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
      <div>
        <label
          htmlFor="originals-retention"
          className="text-text-secondary block text-xs font-medium"
        >
          Uploaded images
        </label>
        <div className="mt-1.5">
          {select(
            "originals-retention",
            originals,
            setOriginals,
            "autoDeleteOriginalsDays"
          )}
        </div>
      </div>
      <div>
        <label
          htmlFor="outputs-retention"
          className="text-text-secondary block text-xs font-medium"
        >
          Generated results
        </label>
        <div className="mt-1.5">
          {select(
            "outputs-retention",
            outputs,
            setOutputs,
            "autoDeleteOutputsDays"
          )}
        </div>
      </div>
    </div>
  );
}
