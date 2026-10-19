"use client";

import { useFormContext, useFormState } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Docked save/status bar for the preset editor (#222).
 *
 * Rendered as the last child of the editor column with `sticky bottom-0` so it
 * stays visible while the form scrolls and rests after the final section —
 * no overlay maths, and the safe-area inset keeps it clear of iOS chrome.
 * The submit button targets the form via the `form` attribute, so the dock
 * can live outside the <form> element (after page-level sections).
 */
interface SaveDockProps {
  formId: string;
  isEdit: boolean;
  /** "Filter" | "Poster" — used in the create-mode label. */
  title: string;
  submitError?: string;
  submitSuccess: boolean;
}

export function SaveDock({
  formId,
  isEdit,
  title,
  submitError,
  submitSuccess,
}: SaveDockProps) {
  const { control } = useFormContext();
  const { isDirty, isSubmitting } = useFormState({ control });

  const requestSave = () => {
    (document.getElementById(formId) as HTMLFormElement | null)
      ?.requestSubmit();
  };

  let statusText: string;
  let statusTone: string;
  if (isSubmitting) {
    statusText = "Saving…";
    statusTone = "text-text-secondary";
  } else if (submitError) {
    statusText = "Save failed";
    statusTone = "text-error";
  } else if (isDirty) {
    // Dirty outranks "saved": edits made while the previous save was in
    // flight are real unsaved changes, not part of the acknowledged batch.
    statusText = "Unsaved changes";
    statusTone = "text-warning";
  } else if (submitSuccess) {
    statusText = isEdit ? "All changes saved" : `${title} created`;
    statusTone = "text-lime-400";
  } else {
    statusText = isEdit ? "All changes saved" : "Not saved yet";
    statusTone = "text-text-muted";
  }

  return (
    <div className="sticky bottom-0 z-30 pt-2 pb-[env(safe-area-inset-bottom)]">
      <div className="border-cream-100/10 bg-charcoal-850/95 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border px-4 py-3 shadow-[0_-10px_28px_rgba(0,0,0,0.4)] backdrop-blur-md">
        <p
          aria-live="polite"
          className={cn("min-w-0 text-sm font-medium", statusTone)}
        >
          {statusText}
        </p>
        {submitError && (
          <p className="text-error min-w-0 flex-1 truncate text-xs">
            {submitError}
          </p>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            size="lg"
            className="min-h-11"
            onClick={requestSave}
            disabled={
              isSubmitting || (isEdit && !isDirty && !submitError)
            }
          >
            {isSubmitting
              ? "Saving…"
              : submitError
                ? "Retry save"
                : isEdit
                  ? "Save changes"
                  : `Create ${title}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
