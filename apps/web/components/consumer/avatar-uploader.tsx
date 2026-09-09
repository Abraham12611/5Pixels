"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { Camera, Spinner } from "@phosphor-icons/react";
import {
  prepareAvatarUpload,
  finalizeAvatarUpload,
} from "@/lib/profile/avatar-upload";
import { cn } from "@/lib/utils";

interface AvatarUploaderProps {
  currentUrl?: string | null;
  onChange: (assetId: string, url: string) => void;
  onError?: (message: string) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

export function AvatarUploader({
  currentUrl,
  onChange,
  onError,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        onError?.("Please upload a JPEG, PNG, or WebP image.");
        return;
      }
      if (file.size > MAX_BYTES) {
        onError?.("Avatar must be 2 MB or smaller.");
        return;
      }

      setUploading(true);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      try {
        const { signedUrl, path } = await prepareAvatarUpload(
          file.type,
          file.size
        );

        const upload = await fetch(signedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!upload.ok) {
          throw new Error("Avatar upload failed.");
        }

        const { assetId } = await finalizeAvatarUpload(
          path,
          file.type,
          file.size
        );

        onChange(assetId, objectUrl);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to upload avatar.";
        onError?.(message);
        setPreview(currentUrl ?? null);
      } finally {
        setUploading(false);
      }
    },
    [currentUrl, onChange, onError]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 transition",
          uploading ? "opacity-70" : "hover:border-lime-400"
        )}
        style={{
          borderColor: preview
            ? "rgba(130, 234, 58, 0.4)"
            : "rgba(238, 231, 218, 0.15)",
        }}
      >
        {preview ? (
          <Image
            src={preview}
            alt="Avatar preview"
            fill
            unoptimized
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <span className="bg-charcoal-800 text-text-muted flex h-full w-full items-center justify-center">
            <Camera size={28} weight="fill" />
          </span>
        )}

        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Spinner className="h-6 w-6 animate-spin text-lime-400" />
          </span>
        )}

        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 opacity-0 transition hover:bg-black/30 hover:opacity-100">
          <Camera className="text-cream-50" size={24} weight="fill" />
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onInputChange}
      />

      <p className="text-text-muted text-xs">JPG, PNG, or WebP · max 2 MB</p>
    </div>
  );
}
