"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  acceptedMimeTypes,
  validateAdminUpload,
  type AdminAssetRole,
} from "@/lib/uploads/admin-assets";
import {
  createAdminAssetUpload,
  finalizeAdminAssetUpload,
} from "@/app/(admin)/admin/asset-upload-actions";

const PREPARE_TIMEOUT_MS = 20_000;
const UPLOAD_TIMEOUT_MS = 180_000;
const FINALIZE_TIMEOUT_MS = 20_000;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

interface AssetUploaderProps {
  role: AdminAssetRole;
  label: string;
  value?: string;
  initialPreviewUrl?: string;
  initialMimeType?: string;
  onChange: (assetId: string | undefined) => void;
  disabled?: boolean;
}

export function AssetUploader({
  role,
  label,
  value,
  initialPreviewUrl,
  initialMimeType,
  onChange,
  disabled,
}: AssetUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(initialPreviewUrl);
  const [mimeType, setMimeType] = useState(initialMimeType);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();

  const upload = async (file: File) => {
    setError(undefined);
    let localUrl: string | undefined;
    try {
      validateAdminUpload(role, file);
      setBusy(true);
      setStatus("Preparing secure upload…");
      localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
      setMimeType(file.type);
      const signed = await withTimeout(
        createAdminAssetUpload({
          role,
          name: file.name,
          mimeType: file.type,
          bytes: file.size,
        }),
        PREPARE_TIMEOUT_MS,
        "Upload authorization timed out. Please try again."
      );
      setStatus(`Uploading ${(file.size / 1024 / 1024).toFixed(1)} MB…`);
      const supabase = createClient();
      const result = await withTimeout(
        supabase.storage
          .from("preset-media")
          .uploadToSignedUrl(signed.path, signed.token, file, {
            contentType: file.type,
            upsert: false,
          }),
        UPLOAD_TIMEOUT_MS,
        "Upload timed out after 3 minutes. Check your connection and try again."
      );
      if (result.error) throw result.error;
      setStatus("Upload received. Saving asset…");
      const asset = await withTimeout(
        finalizeAdminAssetUpload(role, signed.path),
        FINALIZE_TIMEOUT_MS,
        "Asset verification timed out. Please refresh before trying again."
      );
      onChange(asset.id);
      setPreviewUrl(asset.publicUrl);
      setMimeType(asset.mimeType);
      setStatus("Upload complete");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed"
      );
      setPreviewUrl(initialPreviewUrl);
      setMimeType(initialMimeType);
      setStatus(undefined);
    } finally {
      if (localUrl) URL.revokeObjectURL(localUrl);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onFiles = (files: FileList | null) => {
    const file = files?.item(0);
    if (file) void upload(file);
  };

  const remove = () => {
    onChange(undefined);
    setPreviewUrl(undefined);
    setMimeType(undefined);
    setStatus(undefined);
    setError(undefined);
  };

  return (
    <fieldset disabled={disabled || busy} className="space-y-3">
      <legend className="text-cream-100 text-sm font-medium">{label}</legend>
      <div
        className={cn(
          "border-cream-100/20 bg-charcoal-800 rounded-xl border border-dashed p-4",
          busy && "opacity-70"
        )}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onFiles(event.dataTransfer.files);
        }}
      >
        {previewUrl ? (
          <div className="space-y-3">
            {mimeType?.startsWith("video/") ? (
              <video
                src={previewUrl}
                controls
                className="max-h-64 w-full rounded-lg object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={`${label} preview`}
                className="max-h-64 w-full rounded-lg object-contain"
              />
            )}
            <p className="text-text-secondary truncate text-xs">
              Asset ID: {value ?? "uploading"}
            </p>
          </div>
        ) : (
          <p className="text-text-secondary text-sm">
            Drop a file here, or choose one from your device.
          </p>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="sr-only"
          accept={acceptedMimeTypes(role)}
          onChange={(event) => onFiles(event.target.files)}
        />
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
          >
            {previewUrl ? "Replace" : "Choose file"}
          </Button>
          {value && (
            <Button type="button" variant="danger" onClick={remove}>
              Remove selection
            </Button>
          )}
        </div>
      </div>
      {status && (
        <p role="status" className="text-text-secondary text-sm">
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="text-error text-sm">
          {error}
        </p>
      )}
    </fieldset>
  );
}
