import { requireAdmin } from "@/lib/db/admin";
import { getCategories } from "@/lib/db/categories";
import {
  getProductAssetPreviews,
  getProductById,
  publishProductVersion,
  updateProduct,
} from "@/lib/db/products";
import { ProductForm } from "./product-form";
import { PublishButton } from "./publish-button";
import { notFound } from "next/navigation";
import type { ProductCreateInput } from "@5pixels/shared";

interface EditProductPageProps {
  id: string;
  type: "filter" | "poster";
}

export async function EditProductPage({ id, type }: EditProductPageProps) {
  await requireAdmin();
  const product = await getProductById(id);
  if (!product || product.type !== type) notFound();

  const [categories, assetPreviewById] = await Promise.all([
    getCategories(),
    getProductAssetPreviews([
      product.hero_asset_id,
      product.poster_asset_id,
      product.preview_video_asset_id,
      product.preview_gif_asset_id,
    ]),
  ]);

  const version = Array.isArray(product.product_versions)
    ? product.product_versions[0]
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
      id: version?.id,
      version_number: version?.version_number ?? 1,
      state: version?.state ?? "draft",
      private_instruction_template: version?.private_instruction_template ?? "",
      private_negative_instruction:
        version?.private_negative_instruction ?? undefined,
      provider_strategy: version?.provider_strategy ?? {
        primary_provider: "",
        primary_model: "",
      },
      model_config: version?.model_config ?? {},
      input_validation_config: version?.input_validation_config ?? {},
      post_process_config: version?.post_process_config ?? {},
      safety_config: version?.safety_config ?? {},
      credit_cost: version?.credit_cost ?? 1,
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

  return (
    <main className="p-8">
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
          <PublishButton
            productId={id}
            versionId={version?.id}
            action={publishProductVersion}
          />
        }
      />
    </main>
  );
}
