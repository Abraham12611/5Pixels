"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Images, Trash, UploadSimple, Warning } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SourceUploadDropzoneProps {
  file: File | null;
  disabled?: boolean;
  onFileSelected: (file: File | null) => void;
}

export function SourceUploadDropzone({
  file,
  disabled,
  onFileSelected,
}: SourceUploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const kbLabel = useMemo(() => {
    if (!file) return "";
    const kb = Math.round(file.size / 1024);
    return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
  }, [file]);

  const openPicker = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const clear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (inputRef.current) inputRef.current.value = "";
      onFileSelected(null);
    },
    [onFileSelected]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files?.[0] ?? null;
      if (dropped) onFileSelected(dropped);
    },
    [disabled, onFileSelected]
  );

  return (
    <div className="space-y-3">
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
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "group relative flex min-h-[220px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-center outline-none transition",
          dragOver
            ? "border-lime-400 bg-lime-400/10"
            : "border-cream-100/15 bg-charcoal-900 hover:border-cream-100/30 hover:bg-charcoal-800",
          disabled && "cursor-not-allowed opacity-60",
          "focus-visible:ring-2 focus-visible:ring-lime-500/50"
        )}
      >
        {previewUrl ? (
          <>
            <Image
              src={previewUrl}
              alt="Source preview"
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3 opacity-0 transition group-hover:opacity-100">
              <span className="text-cream-50 truncate text-xs">
                {file?.name}
              </span>
              <button
                type="button"
                onClick={clear}
                className="flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-xs text-rose-300 backdrop-blur transition hover:bg-black/80"
              >
                <Trash size={12} weight="bold" />
                Remove
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 p-6">
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl transition",
                dragOver
                  ? "bg-lime-400 text-ink-950"
                  : "bg-charcoal-800 text-text-secondary group-hover:bg-charcoal-700"
              )}
            >
              <Images size={26} weight="fill" />
            </div>
            <div>
              <p className="text-cream-50 text-sm font-medium">
                Choose or drop a source image
              </p>
              <p className="text-text-muted mt-1 text-xs">
                JPEG, PNG, or WebP — up to 20 MB, one photo per generation
              </p>
            </div>
            <span className="text-lime-400 flex items-center gap-2 text-xs font-semibold">
              <UploadSimple size={14} weight="bold" />
              Browse files
            </span>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled}
          onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
        />
      </div>

      {file ? (
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <UploadSimple size={14} weight="bold" className="text-lime-400" />
          <span className="truncate">{file.name}</span>
          <span className="text-text-muted">· {kbLabel}</span>
        </div>
      ) : null}

      {file && file.size > 20 * 1024 * 1024 ? (
        <p className="text-rose-400 flex items-center gap-1.5 text-xs">
          <Warning size={14} weight="bold" /> Image must be 20 MB or smaller.
        </p>
      ) : null}
    </div>
  );
}
