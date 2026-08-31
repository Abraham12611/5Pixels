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
    try {
      validateAdminUpload(role, file);
      setBusy(true);
      setStatus("Preparing upload…");
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
      setMimeType(file.type);
      const signed = await createAdminAssetUpload({
        role,
        name: file.name,
        mimeType: file.type,
        bytes: file.size,
      });
      setStatus("Uploading…");
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("preset-media")
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;
      setStatus("Verifying upload…");
      const asset = await finalizeAdminAssetUpload(role, signed.path);
      onChange(asset.id);
      setPreviewUrl(asset.publicUrl);
      setMimeType(asset.mimeType);
      setStatus("Upload complete");
      URL.revokeObjectURL(localUrl);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed"
      );
      setStatus(undefined);
    } finally {
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
