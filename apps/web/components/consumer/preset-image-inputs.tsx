"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowClockwise,
  ArrowLeft,
  ArrowRight,
  CircleNotch,
  Plus,
  Warning,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/** Per-slot lifecycle as the contract's upload pipeline sees it (#178):
 *  picked → decoding → held locally / uploading → finalized asset, or a
 *  terminal blocked/failed state the user can recover from. */
export type InputSlotStatus =
  | "empty"
  | "validating"
  | "blocked"
  | "local"
  | "uploading"
  | "finalizing"
  | "ready"
  | "failed";

export interface InputSlotView {
  /** Stable local id — used for React keys and fingerprint input ids before
   *  the server asset id exists. */
  id: string;
  /** Display label for this slot's declared role ("Person", "Photo 2"). */
  roleLabel: string;
  /** True when filling this slot is not required to generate. */
  optional: boolean;
  status: InputSlotStatus;
  previewUrl: string | null;
  fileName: string | null;
  /** Blocking message for blocked/failed; shown under the rail. */
  error: string | null;
  /** Non-blocking quality hint. */
  warning: string | null;
}

interface PresetImageInputsProps {
  slots: InputSlotView[];
  /** Required count from the version's input capability. */
  requiredCount: number;
  /** Declared max — the rail never offers a slot beyond it. */
  maxCount: number;
  /** Currently staged (non-empty) slots, for "N of M photos". */
  filledCount: number;
  /** Slot whose preview currently fills the stage. */
  focusedSlotId: string | null;
  disabled?: boolean;
  /** Pick files for `slotId`; extras fill subsequent empty slots in order. */
  onPick: (slotId: string, files: File[]) => void;
  onRemove: (slotId: string) => void;
  onRetry: (slotId: string) => void;
  onFocus: (slotId: string) => void;
  /** Move a staged image one slot left/right — only enabled between slots
   *  sharing the same declared role so a reorder can't silently reassign
   *  subject ↔ reference. */
  onMove: (slotId: string, direction: -1 | 1) => void;
  canMove: (slotId: string, direction: -1 | 1) => boolean;
}

const STATUS_COPY: Record<InputSlotStatus, string> = {
  empty: "",
  validating: "Reading…",
  blocked: "Not usable",
  local: "Ready",
  uploading: "Uploading…",
  finalizing: "Finishing…",
  ready: "Ready",
  failed: "Upload failed",
};

function slotBusy(status: InputSlotStatus): boolean {
  return status === "validating" || status === "uploading" || status === "finalizing";
}

/**
 * Multi-image input rail for presets whose version declares max_images > 1
 * (#178). Renders one thumbnail card per staged input plus "+ Add photo"
 * tiles for remaining capacity. Single-image presets never see this — they
 * keep the original one-photo stage.
 */
export function PresetImageInputs({
  slots,
  requiredCount,
  maxCount,
  filledCount,
  focusedSlotId,
  disabled,
  onPick,
  onRemove,
  onRetry,
  onFocus,
  onMove,
  canMove,
}: PresetImageInputsProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingSlotRef = useRef<string | null>(null);
  const [dragSlotId, setDragSlotId] = useState<string | null>(null);

  const openPicker = useCallback(
    (slotId: string) => {
      if (disabled) return;
      pendingSlotRef.current = slotId;
      inputRef.current?.click();
    },
    [disabled]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const slotId = pendingSlotRef.current;
    e.target.value = "";
    pendingSlotRef.current = null;
    if (slotId && files.length > 0) onPick(slotId, files);
  };

  const handleDrop = (slotId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragSlotId(null);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0) onPick(slotId, files);
  };

  const emptyCapacity = maxCount - filledCount;

  return (
    <section
      aria-label="Input photos"
      className="border-cream-100/10 border-t px-4 py-3 sm:px-6"
    >
      <div className="mb-2.5 flex items-baseline justify-between">
        <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wide">
          {filledCount} of {maxCount} photos
        </p>
        <p className="text-text-muted text-[11px]">
          {requiredCount > 1
            ? `${requiredCount} required`
            : "First photo required"}
        </p>
      </div>

      <div
        role="list"
        className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5"
      >
        {slots.map((slot) => {
          const busy = slotBusy(slot.status);
          const focused = slot.id === focusedSlotId;
          const failed = slot.status === "failed" || slot.status === "blocked";
          return (
            <div
              role="listitem"
              key={slot.id}
              className="w-20 shrink-0"
              onDragOver={(e) => {
                e.preventDefault();
                if (!disabled) setDragSlotId(slot.id);
              }}
              onDragLeave={() => setDragSlotId(null)}
              onDrop={handleDrop(slot.id)}
            >
              <div
                className={cn(
                  "media-frame relative aspect-square w-20 overflow-hidden rounded-lg border transition-colors",
                  focused
                    ? "border-lime-400"
                    : failed
                      ? "border-error/60"
                      : "border-cream-100/10",
                  dragSlotId === slot.id && "border-lime-400 ring-lime-400/40 ring-2"
                )}
              >
                {slot.previewUrl ? (
                  <button
                    type="button"
                    aria-label={`Show ${slot.roleLabel} preview`}
                    onClick={() => onFocus(slot.id)}
                    className="absolute inset-0"
                  >
                    <Image
                      src={slot.previewUrl}
                      alt={`${slot.roleLabel} photo`}
                      fill
                      className={cn(
                        "object-cover",
                        busy && "opacity-60"
                      )}
                      unoptimized
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`Add ${slot.roleLabel} photo`}
                    onClick={() => openPicker(slot.id)}
                    disabled={disabled}
                    className="bg-charcoal-800 hover:bg-charcoal-700 text-text-secondary absolute inset-0 flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    <Plus size={18} weight="bold" />
                  </button>
                )}

                {busy && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <CircleNotch
                      size={18}
                      weight="bold"
                      className="text-cream-50 animate-spin"
                    />
                  </span>
                )}
                {slot.status === "ready" && (
                  <span
                    aria-hidden
                    className="bg-lime-400 text-ink-950 absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full"
                  >
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-current">
                      <path d="M10.2 2.6 4.8 8 1.8 5l-1 1 4 4 6.4-6.4z" />
                    </svg>
                  </span>
                )}
                {failed && (
                  <span className="bg-error/90 text-cream-50 absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full">
                    <Warning size={10} weight="fill" />
                  </span>
                )}

                {slot.previewUrl && !disabled && (
                  <span className="absolute right-1 top-1 flex gap-1">
                    {slot.status === "failed" ? (
                      <button
                        type="button"
                        aria-label={`Retry ${slot.roleLabel} upload`}
                        onClick={() => onRetry(slot.id)}
                        className="bg-ink-950/70 text-cream-50 hover:text-lime-400 flex h-6 w-6 items-center justify-center rounded-md backdrop-blur transition-colors"
                      >
                        <ArrowClockwise size={11} weight="bold" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-label={`Remove ${slot.roleLabel} photo`}
                      onClick={() => onRemove(slot.id)}
                      className="bg-ink-950/70 text-cream-50 hover:text-error flex h-6 w-6 items-center justify-center rounded-md backdrop-blur transition-colors"
                    >
                      <X size={11} weight="bold" />
                    </button>
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-1">
                <p
                  className={cn(
                    "truncate text-[11px] font-medium",
                    failed ? "text-error" : "text-text-secondary"
                  )}
                >
                  {slot.roleLabel}
                  {slot.optional ? " · optional" : ""}
                </p>
                {slot.previewUrl && (
                  <span className="flex shrink-0 items-center">
                    {([-1, 1] as const).map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        aria-label={`Move ${slot.roleLabel} photo ${dir === -1 ? "left" : "right"}`}
                        onClick={() => onMove(slot.id, dir)}
                        disabled={disabled || !canMove(slot.id, dir)}
                        className="text-text-muted hover:text-cream-50 flex h-6 w-5 items-center justify-center transition-colors disabled:opacity-30"
                      >
                        {dir === -1 ? (
                          <ArrowLeft size={10} weight="bold" />
                        ) : (
                          <ArrowRight size={10} weight="bold" />
                        )}
                      </button>
                    ))}
                  </span>
                )}
              </div>
              {slot.status !== "empty" && STATUS_COPY[slot.status] && (
                <p
                  className={cn(
                    "text-[10px]",
                    failed ? "text-error" : "text-text-muted"
                  )}
                >
                  {STATUS_COPY[slot.status]}
                </p>
              )}
            </div>
          );
        })}

        {emptyCapacity > 0 && (
          <button
            type="button"
            onClick={() => {
              const target =
                slots.find((s) => s.status === "empty")?.id ?? slots[0]?.id;
              if (target) openPicker(target);
            }}
            disabled={disabled}
            aria-label="Add photo"
            className="border-cream-100/15 bg-charcoal-850/60 hover:border-cream-100/30 hover:bg-charcoal-850 text-text-secondary flex aspect-square w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed transition-colors disabled:opacity-50"
          >
            <Plus size={18} weight="bold" />
            <span className="text-[10px] font-medium">Add photo</span>
          </button>
        )}
      </div>

      {slots.some((s) => s.error) && (
        <p role="alert" className="text-error mt-2 text-[12px]">
          {slots.find((s) => s.error)?.error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={handleInputChange}
      />
    </section>
  );
}
