import { requireAdmin } from "@/lib/db/admin";
import { getCategories } from "@/lib/db/categories";
import {
  getProductAssetPreviews,
  getProductById,
  getProductReferenceAssets,
  attachReferenceAsset,
  detachReferenceAsset,
  publishProductVersion,
  rollbackProductVersion,
  transitionProductStatus,
  updateProduct,
  selectEditableVersion,
} from "@/lib/db/products";
import { ProductForm } from "./product-form";
import { PublishButton } from "./publish-button";
import { ProductActions } from "./product-actions";
import { VersionRollback } from "./version-rollback";
import { VersionList, type VersionSummary } from "./version-list";
import { ReferenceAssetManager } from "./reference-asset-manager";
import { notFound } from "next/navigation";
import type { ProductCreateInput } from "@5pixels/shared";
import { validatePublishGates } from "@/lib/validation/publish-gates";

interface EditProductPageProps {
  id: string;
  type: "filter" | "poster";
}

export async function EditProductPage({ id, type }: EditProductPageProps) {
  const { profile } = await requireAdmin();
  const product = await getProductById(id);
  if (!product || product.type !== type) notFound();

  const [categories, assetPreviewById, referenceAssets] = await Promise.all([
    getCategories(),
    getProductAssetPreviews([
      product.hero_asset_id,
      product.poster_asset_id,
      product.preview_video_asset_id,
      product.preview_gif_asset_id,
    ]),
    getProductReferenceAssets(id),
  ]);

  const versions = Array.isArray(product.product_versions)
    ? product.product_versions
    : [];
  const selectedVersion = await selectEditableVersion(
    versions.map((v: Record<string, unknown>) => ({
      id: String(v.id),
      state: String(v.state),
      version_number: Number(v.version_number),
    }))
  );
  const version = selectedVersion
    ? (versions.find(
        (v: Record<string, unknown>) => v.id === selectedVersion.id
      ) as Record<string, unknown> | undefined)
    : null;

  const fields = Array.isArray(product.product_fields)
    ? product.product_fields
    : [];

  const metadata = (product.metadata ?? {}) as {
    filter_config?: ProductCreateInput["filter_config"];
    poster_config?: ProductCreateInput["poster_config"];
  };

  const initialData: ProductCreateInput & { id?: string } = {
    id: product.id,
    type: product.type,
    slug: product.slug,
    name: product.name,
    short_description: product.short_description ?? undefined,
    long_description: product.long_description ?? undefined,
    category_id: product.category_id ?? undefined,
    public_status: product.public_status,
    visibility: product.visibility,
    hero_asset_id: product.hero_asset_id ?? undefined,
    poster_asset_id: product.poster_asset_id ?? undefined,
    preview_video_asset_id: product.preview_video_asset_id ?? undefined,
    preview_gif_asset_id: product.preview_gif_asset_id ?? undefined,
    likeness_level: product.likeness_level ?? undefined,
    featured_rank: product.featured_rank ?? undefined,
    credit_cost: version?.credit_cost ?? product.credit_cost ?? 0,
    version: {
      id: version?.id as string | undefined,
      version_number: (version?.version_number as number) ?? 1,
      state:
        (version?.state as ProductCreateInput["version"]["state"]) ?? "draft",
      private_instruction_template:
        (version?.private_instruction_template as string) ?? "",
      private_negative_instruction:
        (version?.private_negative_instruction as string | undefined) ??
        undefined,
      provider_strategy: (version?.provider_strategy as
        ProductCreateInput["version"]["provider_strategy"] | undefined) ?? {
        primary_provider: "",
        primary_model: "",
      },
      model_config:
        (version?.model_config as
          ProductCreateInput["version"]["model_config"] | undefined) ?? {},
      input_validation_config:
        (version?.input_validation_config as
          | ProductCreateInput["version"]["input_validation_config"]
          | undefined) ?? {},
      post_process_config: (version?.post_process_config as
        ProductCreateInput["version"]["post_process_config"] | undefined) ?? {
        crop: false,
        format: "webp",
        quality: 90,
        metadata_stripped: true,
      },
      safety_config: (version?.safety_config as
        ProductCreateInput["version"]["safety_config"] | undefined) ?? {
        allowed_nsfw: false,
        block_public_figures: true,
        block_minors: true,
      },
      credit_cost: (version?.credit_cost as number) ?? 1,
    },
    fields: fields.map(
      (f: {
        id: string;
        field_key: string;
        label: string;
        help_text: string | null;
        field_type: string;
        required: boolean;
        sort_order: number;
        config: unknown;
        validation: unknown;
        active: boolean;
      }) => ({
        id: f.id,
        field_key: f.field_key,
        label: f.label,
        help_text: f.help_text ?? undefined,
        field_type: f.field_type,
        required: f.required,
        sort_order: f.sort_order,
        config: f.config ?? {},
        validation: f.validation ?? {},
        active: f.active,
      })
    ),
    filter_config:
      product.type === "filter"
        ? (metadata.filter_config ?? {
            style_archetype: "",
            identity_preservation: "high",
          })
        : undefined,
    poster_config:
      product.type === "poster"
        ? (metadata.poster_config ?? {
            layout_template: "portrait",
            text_fields: [],
            text_layer_config: {
              position: "bottom",
              size: "medium",
              color: "#F7F2E8",
              alignment: "center",
            },
            background_handling: "replace",
          })
        : undefined,
  };

  const gateResult = validatePublishGates(
    {
      id: product.id,
      type: product.type,
      slug: product.slug,
      name: product.name,
      public_status: product.public_status,
      hero_asset_id: product.hero_asset_id ?? undefined,
      poster_asset_id: product.poster_asset_id ?? undefined,
      metadata,
    },
    {
      id: version?.id as string | undefined,
      product_id: product.id,
      version_number: (version?.version_number as number) ?? 1,
      state: (version?.state as string) ?? "draft",
      provider_strategy: (version?.provider_strategy as Record<
        string,
        string
      >) ?? {
        primary_provider: "",
        primary_model: "",
      },
      credit_cost: (version?.credit_cost as number) ?? 0,
      safety_config: (version?.safety_config as Record<string, unknown>) ?? {},
    },
    initialData.fields
  );

  const activeVersion = versions.find(
    (v: Record<string, unknown>) => v.state === "active"
  );

  const versionSummaries: VersionSummary[] = versions.map(
    (v: Record<string, unknown>) => ({
      id: String(v.id),
      version_number: Number(v.version_number),
      state: String(v.state),
      published_at: v.published_at
        ? new Date(String(v.published_at)).toISOString()
        : null,
      credit_cost: Number(v.credit_cost ?? 0),
      provider_strategy: (v.provider_strategy as VersionSummary["provider_strategy"]) ?? {
        primary_provider: "",
        primary_model: "",
      },
      private_instruction_template: String(
        v.private_instruction_template ?? ""
      ),
      private_negative_instruction: (v.private_negative_instruction as string | null) ?? null,
      model_config: (v.model_config as Record<string, unknown>) ?? {},
      input_validation_config:
        (v.input_validation_config as Record<string, unknown>) ?? {},
      post_process_config:
        (v.post_process_config as Record<string, unknown>) ?? {},
      safety_config: (v.safety_config as Record<string, unknown>) ?? {},
    })
  );

  return (
    <main className="p-8">
      <div className="border-cream-100/10 bg-charcoal-850 mb-6 flex items-center justify-between rounded-2xl border p-4">
        <div className="space-y-1">
          <p className="text-text-secondary text-sm">
            Current status:
            <span className="bg-charcoal-700 text-cream-100 ml-1 rounded-full px-2 py-0.5 text-xs font-medium">
              {product.public_status}
            </span>
          </p>
          <p className="text-text-secondary text-sm">
            Editing version:
            <span className="text-cream-50 ml-1 font-medium">
              v{initialData.version.version_number}
            </span>
            <span className="bg-charcoal-700 text-cream-100 ml-2 rounded-full px-2 py-0.5 text-xs font-medium">
              {initialData.version.state}
            </span>
          </p>
        </div>
        <ProductActions
          productId={id}
          status={product.public_status}
          action={transitionProductStatus}
        />
      </div>

      {versionSummaries.length > 0 && (
        <div className="border-cream-100/10 bg-charcoal-850 mb-6 rounded-2xl border p-6">
          <VersionList
            versions={versionSummaries}
            selectedVersionId={initialData.version.id}
            onSelect={() => {
              // Version switching is handled via the edit form save flow.
              // The list is primarily for visibility and diff comparison.
            }}
          />
        </div>
      )}

      <ProductForm
        type={type}
        initialData={initialData}
        categories={categories}
        assetPreviews={{
          hero: product.hero_asset_id
            ? assetPreviewById[product.hero_asset_id]
            : undefined,
          poster: product.poster_asset_id
            ? assetPreviewById[product.poster_asset_id]
            : undefined,
          "preview-video": product.preview_video_asset_id
            ? assetPreviewById[product.preview_video_asset_id]
            : undefined,
          "preview-gif": product.preview_gif_asset_id
            ? assetPreviewById[product.preview_gif_asset_id]
            : undefined,
        }}
        onSubmit={async (data) => {
          "use server";
          await updateProduct(id, data);
          return { id };
        }}
        headerAction={
          <div className="flex items-center gap-3">
            {activeVersion && (
              <VersionRollback
                productId={id}
                activeVersionId={activeVersion.id as string}
                versions={versions.map((v: Record<string, unknown>) => ({
                  id: String(v.id),
                  version_number: Number(v.version_number),
                  state: String(v.state),
                  published_at: v.published_at
                    ? new Date(String(v.published_at)).toISOString()
                    : null,
                }))}
                action={rollbackProductVersion}
              />
            )}
            <PublishButton
              productId={id}
              versionId={initialData.version.id}
              isOwner={!!profile.is_owner}
              gateFailures={gateResult.ok ? [] : gateResult.failures}
              action={publishProductVersion}
            />
          </div>
        }
      />

      <div className="border-cream-100/10 bg-charcoal-850 mt-8 rounded-2xl border p-6">
        <ReferenceAssetManager
          productId={id}
          versionId={initialData.version.id}
          initialAssets={referenceAssets}
          onAttach={attachReferenceAsset}
          onDetach={detachReferenceAsset}
        />
      </div>
    </main>
  );
}
