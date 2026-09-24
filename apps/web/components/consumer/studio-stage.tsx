"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowClockwise,
  Camera,
  Check,
  FolderOpen,
  Images,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { useDialogA11y } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STEP_STRIP = ["Add a photo", "Adjust the look", "Generate"] as const;

interface StudioStageProps {
  /** Object URL for a picked file, or a signed URL for a reused source. */
  previewUrl: string | null;
  sourceName?: string | null;
  /** Label shown over the preview — e.g. "Original". */
  sourceLabel?: string;
  /** Output w/h ratio used for the preview frame shape. */
  aspectRatio?: number | null;
  disabled?: boolean;
  submitting?: boolean;
  /** 0-based index of the current submit step (see `submitSteps`). */
  submitStepIndex?: number;
  submitStepLabel?: string;
  /** Step strings for the inline submit indicator, in order. */
  submitSteps?: readonly string[];
  /** Rejected-source message (wrong type / too large) shown under the stage. */
  sourceError?: string | null;
  /** Non-blocking quality warning shown under the stage. */
  sourceWarning?: string | null;
  onFileSelected: (file: File | null) => void;
  onClear: () => void;
}

/**
 * The Create Studio's visual stage. Owns drag/drop + file picking; all source
 * state lives in the parent form. Touch devices get two entry tiles (camera /
 * gallery); fine pointers keep the drop zone. Submission is non-blocking: the
 * photo stays visible at 60% with an inline step indicator beneath it.
 */
export function StudioStage({
  previewUrl,
  sourceName,
  sourceLabel = "Original",
  aspectRatio,
  disabled,
  submitting,
  submitStepIndex = 0,
  submitStepLabel,
  submitSteps,
  sourceError,
  sourceWarning,
  onFileSelected,
  onClear,
}: StudioStageProps) {
  const [dragOver, setDragOver] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  useDialogA11y(sourceSheetOpen, sheetRef);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const openPicker = useCallback(() => {
    if (disabled || submitting) return;
    // Touch devices get the source-action sheet (camera vs gallery);
    // desktops go straight to the file dialog.
    if (window.matchMedia("(pointer: coarse)").matches) {
      setSourceSheetOpen(true);
    } else {
      inputRef.current?.click();
    }
  }, [disabled, submitting]);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || submitting) return;
      const dropped = e.dataTransfer.files?.[0] ?? null;
      if (dropped) onFileSelected(dropped);
    },
    [disabled, submitting, onFileSelected]
  );

  const dropHandlers = {
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled && !submitting) setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    onDrop,
  };

  const fileInput = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled || submitting}
        onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        disabled={disabled || submitting}
        onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
      />
    </>
  );

  const sourceSheet = sourceSheetOpen ? (
    <div
      ref={overlayRef}
      role="presentation"
      className="bg-ink-950/80 animate-overlay-in fixed inset-0 z-50 flex items-end justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) setSourceSheetOpen(false);
      }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Add a photo"
        tabIndex={-1}
        className="border-cream-100/10 bg-charcoal-850 animate-sheet-in w-full max-w-lg rounded-t-2xl border-x border-t px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3 outline-none"
      >
        <div
          aria-hidden
          className="bg-charcoal-700 mx-auto mb-4 h-1 w-10 rounded-full"
        />
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setSourceSheetOpen(false);
              cameraRef.current?.click();
            }}
            className="border-cream-100/10 bg-charcoal-800 hover:border-cream-100/25 flex w-full items-center gap-3.5 rounded-xl border p-4 text-left transition-colors"
          >
            <span className="border-lime-400/40 text-lime-400 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border">
              <Camera size={18} weight="bold" />
            </span>
            <span>
              <span className="text-cream-50 block text-sm font-semibold">
                Take a photo
              </span>
              <span className="text-text-muted block text-xs">
                Use your camera now
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSourceSheetOpen(false);
              inputRef.current?.click();
            }}
            className="border-cream-100/10 bg-charcoal-800 hover:border-cream-100/25 flex w-full items-center gap-3.5 rounded-xl border p-4 text-left transition-colors"
          >
            <span className="border-lime-400/40 text-lime-400 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border">
              <FolderOpen size={18} weight="bold" />
            </span>
            <span>
              <span className="text-cream-50 block text-sm font-semibold">
                Choose from gallery
              </span>
              <span className="text-text-muted block text-xs">
                JPEG, PNG, or WebP · up to 20 MB
              </span>
            </span>
          </button>
        </div>
        <p className="text-text-muted mt-4 text-center text-[11px]">
          Your photo stays private — used only for this result.
        </p>
        <button
          type="button"
          onClick={() => setSourceSheetOpen(false)}
          className="text-text-secondary hover:text-cream-50 mt-3 w-full rounded-xl py-2.5 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative flex min-h-[420px] flex-1 flex-col lg:min-h-full">
      {previewUrl ? (
        <>
          <div
            {...dropHandlers}
            className={cn(
              "relative m-4 flex flex-1 items-center justify-center sm:m-6",
              dragOver && "ring-lime-400/70 rounded-xl ring-2"
            )}
          >
            <div
              className={cn(
                "media-frame relative max-h-full w-full max-w-3xl overflow-hidden rounded-xl transition-opacity",
                submitting && "opacity-60"
              )}
              style={
                aspectRatio && aspectRatio > 0
                  ? { aspectRatio: String(aspectRatio) }
                  : undefined
              }
            >
              <Image
                src={previewUrl}
                alt="Source photo"
                fill
                className="object-cover"
                unoptimized
                priority
              />

              <span className="shadow-elevated absolute left-3 top-3 rounded-md bg-ink-950/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cream-100 backdrop-blur">
                {sourceLabel}
              </span>

              {!submitting && (
                <div className="absolute right-3 top-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openPicker}
                    disabled={disabled}
                    className="shadow-elevated text-cream-50 hover:text-lime-400 flex h-11 items-center gap-1.5 rounded-md bg-ink-950/70 px-3 text-xs font-medium backdrop-blur transition-colors disabled:opacity-50"
                  >
                    <ArrowClockwise size={14} weight="bold" />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={onClear}
                    disabled={disabled}
                    className="shadow-elevated text-cream-50 hover:text-error flex h-11 items-center gap-1.5 rounded-md bg-ink-950/70 px-3 text-xs font-medium backdrop-blur transition-colors disabled:opacity-50"
                  >
                    <Trash size={14} weight="bold" />
                    Remove
                  </button>
                </div>
              )}

              {sourceName && !submitting && (
                <span className="text-text-muted absolute bottom-3 right-3 max-w-[40%] truncate text-[11px]">
                  {sourceName}
                </span>
              )}
            </div>
          </div>

          {submitting ? (
            <SubmitIndicator
              stepIndex={submitStepIndex}
              stepLabel={submitStepLabel}
              steps={submitSteps}
            />
          ) : null}
        </>
      ) : coarse ? (
        <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-6">
          <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={disabled}
              className="border-cream-100/10 bg-charcoal-850 hover:border-cream-100/25 focus-visible:ring-lime-500/50 flex aspect-square flex-col items-center justify-center gap-3 rounded-xl border text-center transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
            >
              <span className="border-lime-400/40 text-lime-400 flex h-12 w-12 items-center justify-center rounded-full border">
                <Camera size={22} weight="bold" />
              </span>
              <span>
                <span className="text-cream-50 block text-sm font-semibold">
                  Take a photo
                </span>
                <span className="text-text-muted mt-0.5 block text-xs">
                  Use your camera
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className="border-cream-100/10 bg-charcoal-850 hover:border-cream-100/25 focus-visible:ring-lime-500/50 flex aspect-square flex-col items-center justify-center gap-3 rounded-xl border text-center transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
            >
              <span className="border-lime-400/40 text-lime-400 flex h-12 w-12 items-center justify-center rounded-full border">
                <Images size={22} weight="bold" />
              </span>
              <span>
                <span className="text-cream-50 block text-sm font-semibold">
                  Choose photo
                </span>
                <span className="text-text-muted mt-0.5 block text-xs">
                  JPEG, PNG, WebP · up to 20 MB
                </span>
              </span>
            </button>
          </div>
          <StepStrip activeIndex={0} />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
          <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label="Upload source image"
            aria-disabled={disabled}
            onClick={openPicker}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openPicker();
              }
            }}
            {...dropHandlers}
            className={cn(
              "group flex min-h-[300px] w-full max-w-2xl cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed text-center outline-none transition-colors",
              dragOver
                ? "border-lime-400 bg-lime-400/5"
                : "border-cream-100/15 bg-charcoal-850/60 hover:border-cream-100/30 hover:bg-charcoal-850",
              disabled && "cursor-not-allowed opacity-60",
              "focus-visible:ring-lime-500/50 focus-visible:ring-2"
            )}
          >
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-xl transition-colors",
                dragOver
                  ? "bg-lime-400 text-ink-950"
                  : "bg-charcoal-800 text-text-secondary group-hover:bg-charcoal-700"
              )}
            >
              <Images size={30} weight="fill" />
            </div>
            <div>
              <p className="text-cream-50 text-base font-semibold">
                Drop your photo here
              </p>
              <p className="text-text-secondary mt-1 text-sm">
                or{" "}
                <span className="text-lime-400 font-medium underline underline-offset-2">
                  browse your files
                </span>
              </p>
              <p className="text-text-muted mt-2 text-xs">
                JPEG, PNG, or WebP · up to 20 MB · one photo per transformation
              </p>
            </div>
            <p className="text-text-muted max-w-sm text-xs">
              One clear photo works best — keep faces and subjects centered.
            </p>
          </div>

          <StepStrip activeIndex={0} />
        </div>
      )}

      {sourceError ? (
        <div
          role="alert"
          className="bg-error/10 text-error mx-4 mb-4 rounded-lg px-3.5 py-3 sm:mx-6"
        >
          <div className="flex items-start gap-2">
            <Warning size={15} weight="fill" className="mt-0.5 shrink-0" />
            <p className="flex-1 text-[13px]">{sourceError}</p>
          </div>
          <button
            type="button"
            onClick={openPicker}
            className="mt-1 flex min-h-11 items-center text-[13px] font-semibold underline underline-offset-2"
          >
            Choose another photo
          </button>
        </div>
      ) : sourceWarning ? (
        <div
          role="status"
          className="bg-warning/10 text-warning mx-4 mb-4 flex items-start gap-2 rounded-lg px-3.5 py-3 sm:mx-6"
        >
          <Warning size={15} weight="fill" className="mt-0.5 shrink-0" />
          <p className="flex-1 text-[13px]">{sourceWarning}</p>
        </div>
      ) : null}

      <p className="text-text-muted px-5 pb-5 text-center text-xs sm:px-6">
        Your photo is private, used only for this result, and you can delete it
        any time in{" "}
        <Link
          href="/app/account/privacy"
          className="text-text-secondary underline underline-offset-2"
        >
          Privacy
        </Link>
        .
      </p>

      {fileInput}
      {sourceSheet}
    </div>
  );
}

/** "Add a photo → Adjust the look → Generate" expectation strip. */
function StepStrip({ activeIndex }: { activeIndex: number }) {
  return (
    <ol className="mt-6 flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-wide">
      {STEP_STRIP.map((step, i) => (
        <li key={step} className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5",
              i === activeIndex ? "text-lime-400" : "text-text-muted"
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-[4px] text-[10px]",
                i === activeIndex
                  ? "bg-lime-400/15 text-lime-400"
                  : "bg-charcoal-800 text-text-muted"
              )}
            >
              {i + 1}
            </span>
            {step}
          </span>
          {i < STEP_STRIP.length - 1 && (
            <span className="bg-charcoal-700 h-px w-5" aria-hidden />
          )}
        </li>
      ))}
    </ol>
  );
}

/**
 * Non-blocking submission state: the photo stays visible (dimmed) and the
 * three submit steps read as done / current / pending under the preview.
 */
function SubmitIndicator({
  stepIndex,
  stepLabel,
  steps,
}: {
  stepIndex: number;
  stepLabel?: string;
  steps?: readonly string[];
}) {
  const labels = steps ?? (stepLabel ? [stepLabel] : []);

  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 px-5 pb-5"
      aria-live="polite"
    >
      {labels.length > 1 ? (
        <ol className="w-full max-w-xs space-y-1.5">
          {labels.map((step, i) => {
            const done = i < stepIndex;
            const current = i === stepIndex;
            return (
              <li key={step} className="flex items-center gap-2.5 text-[13px]">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    done
                      ? "bg-lime-400/15 text-lime-400"
                      : current
                        ? "bg-lime-400/15 text-lime-400"
                        : "bg-charcoal-800 text-text-muted"
                  )}
                >
                  {done ? (
                    <Check size={11} weight="bold" />
                  ) : (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        current
                          ? "bg-lime-400 animate-pulse"
                          : "bg-charcoal-700"
                      )}
                    />
                  )}
                </span>
                <span
                  className={cn(
                    current
                      ? "text-cream-50"
                      : done
                        ? "text-text-secondary"
                        : "text-text-muted"
                  )}
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-cream-50 text-sm font-medium">
          {stepLabel ?? "Working…"}
        </p>
      )}
      <p className="text-text-muted text-xs">
        Keep this tab open — it only takes a moment.
      </p>
    </div>
  );
}
