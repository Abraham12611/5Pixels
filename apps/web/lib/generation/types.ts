import type { PublicProductField } from "@/types/catalog";

export interface CreateGenerationInput {
  productId: string;
  productVersionId: string;
  sourceAssetId: string;
  options: Record<string, unknown>;
  idempotencyKey: string;
}

export interface CreateGenerationResult {
  generationId: string;
  status: string;
  processingToken: string;
  balanceAfter: number;
  creditCost: number;
}

export interface SafeGeneration {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productType: string;
  status: string;
  statusDetail: string | null;
  progress: Record<string, unknown> | null;
  creditCost: number;
  createdAt: string;
  updatedAt: string;
  outputAssetId: string | null;
  outputRole: string | null;
  outputBucket: string | null;
  outputStorageKey: string | null;
  outputMimeType: string | null;
  outputWidth: number | null;
  outputHeight: number | null;
}

export interface SafeGenerationDetail extends SafeGeneration {
  sourceAssetId: string | null;
  sourceBucket: string | null;
  sourceStorageKey: string | null;
  completedAt: string | null;
  failureCode: string | null;
  failureStage: string | null;
  outputs: Array<{
    assetId: string;
    outputRole: string;
    bucket: string;
    storageKey: string;
    mimeType: string | null;
    width: number | null;
    height: number | null;
  }>;
}

export interface ProductForCreate {
  id: string;
  slug: string;
  name: string;
  type: "filter" | "poster";
  creditCost: number;
  activeFields: PublicProductField[];
}
