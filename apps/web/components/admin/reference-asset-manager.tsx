"use client";

import { useState, useId, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  acceptedMimeTypes,
  validateAdminUpload,
} from "@/lib/uploads/admin-assets";
import {
  createAdminAssetUpload,
  finalizeAdminAssetUpload,
} from "@/app/(admin)/admin/asset-upload-actions";
import { cn } from "@/lib/utils";

const REFERENCE_ROLES: Array<{
  value: string;
  label: string;
  short: string;
}> = [
  { value: "style_reference", label: "Style reference", short: "Style" },
  {
    value: "composition_reference",
    label: "Composition reference",
    short: "Composition",
  },
  { value: "layout_reference", label: "Layout reference", short: "Layout" },
];

// Uploads always go through the style-reference lane — the adminRole only
// steers upload validation and the storage path prefix, never the product
// link. Roles are assigned per-asset via the toggle chips below.
const UPLOAD_ADMIN_ROLE = "style-reference";

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
  initialAssets: ReferenceAsset[];
  onAttach: (input: {
    productId: string;
    assetId: string;
    role: string;
    internalOnly: boolean;
  }) => Promise<unknown>;
  onDetach: (productAssetId: string) => Promise<unknown>;
}

interface AssetGroup {
  assetId: string;
  internalOnly: boolean;
  publicUrl?: string;
  mimeType?: string;
  rows: ReferenceAsset[];
}

export function ReferenceAssetManager({
  productId,
  initialAssets,
  onAttach,
  onDetach,
}: ReferenceAssetManagerProps) {
  const [assets, setAssets] = useState<ReferenceAsset[]>(initialAssets);
  const [internalOnly, setInternalOnly] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // One card per underlying image — a single asset can hold several roles.
  const groups = useMemo<AssetGroup[]>(() => {
    const map = new Map<string, AssetGroup>();
    for (const row of assets) {
      const group = map.get(row.asset_id) ?? {
        assetId: row.asset_id,
        internalOnly: row.internal_only,
        publicUrl: row.public_url,
        mimeType: row.mime_type,
        rows: [],
      };
      group.rows.push(row);
      map.set(row.asset_id, group);
    }
    return [...map.values()];
  }, [assets]);

  const upload = async (file: File) => {
    setError(undefined);
    try {
      validateAdminUpload(UPLOAD_ADMIN_ROLE, {
        name: file.name,
        type: file.type,
        size: file.size,
      });
      setBusy(true);
      setStatus("Preparing secure upload…");
      const signed = await withTimeout(
        createAdminAssetUpload({
          role: UPLOAD_ADMIN_ROLE,
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
        finalizeAdminAssetUpload(UPLOAD_ADMIN_ROLE, signed.path),
        FINALIZE_TIMEOUT_MS,
        "Asset verification timed out."
      );

      // Attach under every role — the common case is one image guiding the
      // whole look; untoggle what doesn't apply.
      setStatus("Attaching to preset…");
      const rows: ReferenceAsset[] = [];
      for (const role of REFERENCE_ROLES) {
        const attached = (await onAttach({
          productId,
          assetId: asset.id,
          role: role.value,
          internalOnly,
        })) as { id?: string } | null;
        rows.push({
          id: attached?.id ?? `temp-${Date.now()}-${role.value}`,
          role: role.value,
          asset_id: asset.id,
          sort_order: assets.length + rows.length,
          internal_only: internalOnly,
          public_url: asset.publicUrl,
          mime_type: asset.mimeType,
        });
      }
      setAssets((prev) => [...prev, ...rows]);
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

  const toggleRole = async (
    group: AssetGroup,
    role: string,
    enable: boolean
  ) => {
    setError(undefined);
    setBusy(true);
    try {
      if (enable) {
        const attached = (await onAttach({
          productId,
          assetId: group.assetId,
          role,
          internalOnly: group.internalOnly,
        })) as { id?: string } | null;
        setAssets((prev) => [
          ...prev,
          {
            id: attached?.id ?? `temp-${Date.now()}-${role}`,
            role,
            asset_id: group.assetId,
            sort_order: prev.length,
            internal_only: group.internalOnly,
            public_url: group.publicUrl,
            mime_type: group.mimeType,
          },
        ]);
      } else {
        const row = assets.find(
          (a) => a.asset_id === group.assetId && a.role === role
        );
        if (!row) return;
        await onDetach(row.id);
        setAssets((prev) => prev.filter((a) => a.id !== row.id));
      }
    } catch (toggleError) {
      setError(
        toggleError instanceof Error ? toggleError.message : "Update failed"
      );
    } finally {
      setBusy(false);
    }
  };

  const removeAsset = async (group: AssetGroup) => {
    setError(undefined);
    setBusy(true);
    try {
      for (const row of group.rows) {
        await onDetach(row.id);
      }
      setAssets((prev) => prev.filter((a) => a.asset_id !== group.assetId));
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
        Upload internal reference images that guide the AI model&apos;s style,
        composition, or layout. Toggle roles per image — one image can serve
        several roles. These are never shown to users.
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <label className="text-cream-50 flex items-center gap-2 pb-2.5 text-sm">
          <input
            type="checkbox"
            checked={internalOnly}
            onChange={(e) => setInternalOnly(e.target.checked)}
            className="h-4 w-4 rounded text-lime-500"
          />
          Internal only
        </label>
        <div>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            className="sr-only"
            accept={acceptedMimeTypes(UPLOAD_ADMIN_ROLE)}
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

      {groups.length === 0 && (
        <p className="text-text-secondary text-sm">
          No reference assets attached.
        </p>
      )}

      <div className="space-y-2">
        {groups.map((group) => (
          <div
            key={group.assetId}
            className="border-cream-100/10 bg-charcoal-800 flex items-center justify-between gap-3 rounded-xl border p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              {group.publicUrl && group.mimeType?.startsWith("image/") && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={group.publicUrl}
                  alt="Reference asset"
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="text-text-muted text-xs">
                  {group.internalOnly ? "Internal" : "Visible"} ·{" "}
                  {group.assetId.slice(0, 8)}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {REFERENCE_ROLES.map((role) => {
                    const active = group.rows.some(
                      (row) => row.role === role.value
                    );
                    return (
                      <button
                        key={role.value}
                        type="button"
                        aria-pressed={active}
                        title={role.label}
                        disabled={busy}
                        onClick={() =>
                          void toggleRole(group, role.value, !active)
                        }
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50",
                          active
                            ? "border-lime-500/40 bg-lime-500/15 text-lime-300"
                            : "border-cream-100/15 text-text-muted hover:text-cream-100"
                        )}
                      >
                        {role.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void removeAsset(group)}
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
