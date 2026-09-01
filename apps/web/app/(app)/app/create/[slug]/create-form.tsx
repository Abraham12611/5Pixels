"use client";

import { useCallback, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { GenerationControls } from "@/components/consumer/generation-controls";
import { normalizeField, sortFields } from "@/lib/catalog/fields";
import { validateGenerationOptions } from "@/lib/generation/validation";
import { createAndSubmitGeneration } from "@/lib/generation/actions";
import {
  finalizeSourceUpload,
  prepareSourceUpload,
} from "@/lib/generation/upload";
import type { PublicProductDetail } from "@/types/catalog";

interface CreateGenerationFormProps {
  userId: string;
  product: PublicProductDetail;
  initialBalance: number;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 20 * 1024 * 1024;

export function CreateGenerationForm({
  userId,
  product,
  initialBalance,
}: CreateGenerationFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    for (const field of sortFields(product.active_fields)) {
      defaults[field.field_key] = normalizeField(field).defaultValue;
    }
    return defaults;
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string>("");

  const isPoster = product.type === "poster";
  const canAfford = initialBalance >= product.credit_cost;

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError("");
      const selected = e.target.files?.[0] ?? null;
      if (!selected) return;
      if (!ALLOWED_TYPES.includes(selected.type)) {
        setError("Please select a JPEG, PNG, or WebP image.");
        setFile(null);
        return;
      }
      if (selected.size > MAX_SIZE) {
        setError("Image must be 20 MB or smaller.");
        setFile(null);
        return;
      }
      setFile(selected);
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setProgress("");

    if (!file) {
      setError("Please upload a source image.");
      return;
    }
    if (!product.version_id) {
      setError("Preset is not available for generation.");
      return;
    }
    if (isPoster) {
      setError(
        "Poster generation with deterministic text rendering is not supported yet."
      );
      return;
    }
    if (!canAfford) {
      setError(
        `This preset costs ${product.credit_cost} credits. Your balance is ${initialBalance}.`
      );
      return;
    }

    const validation = validateGenerationOptions(
      product.active_fields,
      options
    );
    if (validation) {
      setError(validation.message);
      return;
    }

    setLoading(true);

    try {
      setProgress("Preparing secure upload...");
      const { signedUrl, path } = await prepareSourceUpload(
        file.type,
        file.size
      );

      setProgress("Uploading image...");
      const upload = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!upload.ok) {
        throw new Error("Image upload failed. Please try again.");
      }

      setProgress("Finalizing upload...");
      const { assetId: sourceAssetId } = await finalizeSourceUpload(
        path,
        file.type,
        file.size
      );

      setProgress("Starting generation...");
      const idempotencyKey = `create:${userId}:${product.id}:${uuidv4()}`;
      const result = await createAndSubmitGeneration({
        productId: product.id,
        productVersionId: product.version_id ?? "",
        sourceAssetId,
        options,
        idempotencyKey,
      });

      if (result?.error) {
        setError(result.error);
      }
      // On success the server action redirects. On idempotent retry it also redirects.
    } catch (err) {
      if (
        err instanceof Error &&
        ((err as { digest?: string }).digest === "NEXT_REDIRECT" ||
          err.message === "NEXT_REDIRECT")
      ) {
        throw err;
      }
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-8">
      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <h2 className="text-cream-50 text-lg font-semibold">1. Source photo</h2>
        <div className="mt-4">
          <Label htmlFor="source-image" className="sr-only">
            Upload source image
          </Label>
          <input
            id="source-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={loading}
            className="text-cream-50 file:text-ink-950 file:mr-4 file:rounded-lg file:border-0 file:bg-lime-500 file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-lime-400"
          />
          {file && (
            <p className="text-text-secondary mt-2 text-sm">
              {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          )}
        </div>
      </section>

      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <h2 className="text-cream-50 text-lg font-semibold">2. Controls</h2>
        <div className="mt-4">
          <GenerationControls
            fields={product.active_fields}
            values={options}
            onChange={setOptions}
          />
        </div>
      </section>

      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-cream-50 font-medium">
              Cost: {product.credit_cost || "Free"}
              {product.credit_cost ? " credits" : ""}
            </p>
            <p className="text-text-muted text-sm">
              Your balance: {initialBalance} credits
            </p>
          </div>
          <Button
            type="submit"
            disabled={loading || !file || isPoster}
            className="w-full sm:w-auto"
          >
            {loading ? progress || "Creating..." : "Create generation"}
          </Button>
        </div>
        {isPoster && (
          <p className="text-text-secondary mt-3 text-sm">
            Posters with exact text generation are coming soon.
          </p>
        )}
      </section>

      {error && (
        <div className="border-l-4 border-red-500 bg-red-950/20 p-4 text-sm text-red-200">
          {error}
        </div>
      )}
    </form>
  );
}
