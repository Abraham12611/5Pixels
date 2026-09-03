"use client";

import { useState, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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

const REFERENCE_ROLES: Array<{
  value: string;
  label: string;
  adminRole: AdminAssetRole;
}> = [
  { value: "style_reference", label: "Style reference", adminRole: "style-reference" },
  {
    value: "composition_reference",
    label: "Composition reference",
    adminRole: "composition-reference",
  },
  {
    value: "layout_reference",
    label: "Layout reference",
    adminRole: "layout-reference",
  },
];

const PREPARE_TIMEOUT_MS = 20_000;
const UPLOAD_TIMEOUT_MS = 180_000;
const FINALIZE_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
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

export interface ReferenceAsset {
  id: string;
  role: string;
  asset_id: string;
  sort_order: number;
  internal_only: boolean;
  public_url?: string;
  mime_type?: string;
}

interface ReferenceAssetManagerProps {
  productId: string;
  versionId?: string;
  initialAssets: ReferenceAsset[];
  onAttach: (input: {
    productId: string;
    assetId: string;
    role: string;
    internalOnly: boolean;
  }) => Promise<unknown>;
  onDetach: (productAssetId: string) => Promise<unknown>;
}

export function ReferenceAssetManager({
  productId,
  versionId,
  initialAssets,
  onAttach,
  onDetach,
}: ReferenceAssetManagerProps) {
  const [assets, setAssets] = useState<ReferenceAsset[]>(initialAssets);
  const [selectedRole, setSelectedRole] = useState<string>("style_reference");
  const [internalOnly, setInternalOnly] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const roleConfig = REFERENCE_ROLES.find((r) => r.value === selectedRole);
  const adminRole = roleConfig?.adminRole ?? "style-reference";

  const upload = async (file: File) => {
    setError(undefined);
    try {
      validateAdminUpload(adminRole, {
        name: file.name,
        type: file.type,
        size: file.size,
      });
      setBusy(true);
      setStatus("Preparing secure upload…");
      const signed = await withTimeout(
        createAdminAssetUpload({
          role: adminRole,
          name: file.name,
          mimeType: file.type,
          bytes: file.size,
        }),
        PREPARE_TIMEOUT_MS,
        "Upload authorization timed out."
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
        "Upload timed out."
      );
      if (result.error) throw result.error;
      setStatus("Finalizing asset…");
      const asset = await withTimeout(
        finalizeAdminAssetUpload(adminRole, signed.path),
        FINALIZE_TIMEOUT_MS,
        "Asset verification timed out."
      );
      setStatus("Attaching to preset…");
      await onAttach({
        productId,
        assetId: asset.id,
        role: selectedRole,
        internalOnly,
      });
      setAssets((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          role: selectedRole,
          asset_id: asset.id,
          sort_order: prev.length,
          internal_only: internalOnly,
          public_url: asset.publicUrl,
          mime_type: asset.mimeType,
        },
      ]);
      setStatus("Reference asset attached.");
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

  const detach = async (productAssetId: string) => {
    setError(undefined);
    try {
      setBusy(true);
      await onDetach(productAssetId);
      setAssets((prev) => prev.filter((a) => a.id !== productAssetId));
    } catch (detachError) {
      setError(
        detachError instanceof Error ? detachError.message : "Failed to remove"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-cream-50 text-lg font-semibold">
          Reference assets
        </h2>
      </div>

      <p className="text-text-secondary text-sm">
        Upload internal reference images that guide the AI model&apos;s aesthetic,
        composition, or layout. These are never shown to users.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="ref-role">Role</Label>
          <Select
            id="ref-role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="mt-1"
          >
            {REFERENCE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <label className="text-cream-50 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={internalOnly}
              onChange={(e) => setInternalOnly(e.target.checked)}
              className="h-4 w-4 rounded text-lime-500"
            />
            Internal only
          </label>
        </div>
        <div className="flex items-end">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            className="sr-only"
            accept={acceptedMimeTypes(adminRole)}
            onChange={(e) => {
              const file = e.target.files?.item(0);
              if (file) void upload(file);
            }}
            disabled={busy}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            Upload reference
          </Button>
        </div>
      </div>

      {versionId && (
        <p className="text-text-muted text-xs">
          Attachments are linked to product {productId}
          {versionId ? ` (version context: ${versionId.slice(0, 8)})` : ""}.
        </p>
      )}

      {assets.length === 0 && (
        <p className="text-text-secondary text-sm">
          No reference assets attached.
        </p>
      )}

      <div className="space-y-2">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="border-cream-100/10 bg-charcoal-800 flex items-center justify-between rounded-xl border p-3"
          >
            <div className="flex items-center gap-3">
              {asset.public_url && asset.mime_type?.startsWith("image/") && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={asset.public_url}
                  alt={asset.role}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="text-cream-50 text-sm font-medium">
                  {REFERENCE_ROLES.find((r) => r.value === asset.role)?.label ??
                    asset.role}
                </p>
                <p className="text-text-muted text-xs">
                  {asset.internal_only ? "Internal" : "Visible"} ·{" "}
                  {asset.asset_id.slice(0, 8)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="danger"
              onClick={() => detach(asset.id)}
              disabled={busy}
            >
              Remove
            </Button>
          </div>
        ))}
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
    </div>
  );
}
