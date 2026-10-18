import type { PublicProductField, OutputSizeOption } from "@/types/catalog";

/** One ordered generation input — an owned asset plus optional declared
 *  role. Ordinals are implicit in array order (#176). */
export interface GenerationInputAsset {
  assetId: string;
  role?: string;
}

export interface CreateGenerationInput {
  productId: string;
  productVersionId: string;
  /**
   * @deprecated Single-image callers only. New code should pass `inputs`.
   * Retained as the contract's backward-compatible alias for
   * `inputs: [{ assetId: sourceAssetId }]`.
   */
  sourceAssetId?: string;
  /** Ordered inputs (ordinal = array position). Server-validated against
   *  the pinned version's input capability; required unless the deprecated
   *  `sourceAssetId` alias is used. */
  inputs?: GenerationInputAsset[];
  /** Optional user prompt — only accepted when the pinned version has
   *  `prompt_override_enabled`; screened with the options before any
   *  credits move and bound into the quote hash. */
  prompt?: string;
  options: Record<string, unknown>;
  outputSize: OutputSizeOption;
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
  savedAt: string | null;
  downloadedAt: string | null;
}

export interface SafeGenerationDetail extends SafeGeneration {
  sourceAssetId: string | null;
  sourceBucket: string | null;
  sourceStorageKey: string | null;
  completedAt: string | null;
  failureCode: string | null;
  failureStage: string | null;
  /** Ordered input assets recorded in generation_input_assets (#176). */
  inputAssets: Array<{
    assetId: string;
    role: string | null;
    ordinal: number;
    bucket: string;
    storageKey: string;
    mimeType: string | null;
    width: number | null;
    height: number | null;
  }>;
  /** The caller's own prompt text, when the preset allowed one. */
  userPrompt: string | null;
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
