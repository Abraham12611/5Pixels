"use client";

import { useFormContext, useWatch } from "react-hook-form";
import {
  RichSelect,
  type RichSelectOption,
  type RichSelectGroup,
} from "@/components/ui/rich-select";

interface FormRichSelectProps {
  name: string;
  options?: RichSelectOption[];
  groups?: RichSelectGroup[];
  label: string;
  noneLabel?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  placeholder?: string;
  footerOption?: RichSelectOption;
  onFooterSelect?: (value: string) => boolean;
  /** Write `undefined` instead of "" when the empty option is chosen. */
  emptyToUndefined?: boolean;
  disabled?: boolean;
  className?: string;
  panelClassName?: string;
}

/**
 * react-hook-form bridge for RichSelect — watches the field and writes back
 * with shouldDirty so unsaved-changes tracking keeps working.
 */
export function FormRichSelect({
  name,
  label,
  onFooterSelect,
  emptyToUndefined,
  ...props
}: FormRichSelectProps) {
  const { setValue, control } = useFormContext();
  const value = useWatch({ control, name }) as string | undefined;

  return (
    <RichSelect
      aria-label={label}
      value={value ?? ""}
      onValueChange={(next) => {
        if (onFooterSelect?.(next)) return;
        setValue(name, emptyToUndefined && next === "" ? undefined : next, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }}
      {...props}
    />
  );
}
