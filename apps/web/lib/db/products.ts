"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProductCreateInput } from "@5pixels/shared";
import type { PublicProductDetail } from "@/types/catalog";
import { coerceCreditCost } from "@/lib/admin/coerce";
import { logAdminAction } from "./audit";
import { requireAdminOrOwner } from "./admin";
import {
  publishProductVersionSchema,
  rollbackProductVersionSchema,
  productStatusTransitionSchema,
} from "@/lib/validation/admin-actions";

export async function getProducts(type: "filter" | "poster") {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, slug, name, short_description, public_status, visibility, featured_rank, created_at, updated_at,
      product_versions(id, version_number, state, credit_cost, created_at)`
    )
    .eq("type", type)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getProductById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `*,
      product_versions(*),
      product_fields(*)`
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getProductAssetPreviews(
  assetIds: Array<string | null | undefined>
) {
  const ids = [...new Set(assetIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("id, bucket, storage_key, mime_type, visibility")
    .in("id", ids)
    .eq("bucket", "preset-media")
    .eq("visibility", "public");
  if (error) throw error;

  return Object.fromEntries(
    (data ?? []).map((asset) => [
      asset.id,
      {
        publicUrl: supabase.storage
          .from(asset.bucket)
          .getPublicUrl(asset.storage_key).data.publicUrl,
        mimeType: asset.mime_type,
      },
    ])
  );
}

export async function createProduct(input: ProductCreateInput) {
  await requireAdminOrOwner();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const {
    version,
    fields,
    filter_config,
    poster_config,
    credit_cost,
    ...productData
  } = input;

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      ...productData,
      metadata: {
        filter_config,
        poster_config,
      },
    })
    .select()
    .single();

  if (productError) throw productError;

  const { error: versionError } = await supabase
    .from("product_versions")
    .insert({
      product_id: product.id,
      version_number: version.version_number,
      state: "draft",
      private_instruction_template: version.private_instruction_template,
      private_negative_instruction: version.private_negative_instruction,
      provider_strategy: version.provider_strategy,
      model_config: version.model_config,
      output_sizes: version.output_sizes,
      input_validation_config: version.input_validation_config,
      post_process_config: version.post_process_config,
      safety_config: version.safety_config,
      credit_cost,
      created_by_admin_id: user.id,
    });

  if (versionError) throw versionError;

  if (fields.length > 0) {
    const { error: fieldsError } = await supabase.from("product_fields").insert(
      fields.map((field) => ({
        product_id: product.id,
        field_key: field.field_key,
        label: field.label,
        help_text: field.help_text,
        field_type: field.field_type,
        required: field.required,
        sort_order: field.sort_order,
        config: field.config,
        validation: field.validation,
        active: field.active,
      }))
    );
    if (fieldsError) throw fieldsError;
  }

  await logAdminAction({
    action: "product.create",
    entityType: "product",
    entityId: product.id,
    after: product,
  });

  return product;
}

export async function updateProduct(id: string, input: ProductCreateInput) {
  await requireAdminOrOwner();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const before = await getProductById(id);
  const {
    version,
    fields,
    filter_config,
    poster_config,
    credit_cost,
    ...productData
  } = input;

  const { data: product, error: productError } = await supabase
    .from("products")
    .update({
      ...productData,
      metadata: {
        filter_config,
        poster_config,
      },
    })
    .eq("id", id)
    .select()
    .single();

  if (productError) throw productError;

  if (version.id) {
    // Active versions are immutable. Cloning creates a new draft so edits never
    // mutate a published recipe.
    let effectiveVersionId = version.id;
    const existingVersion = Array.isArray(before.product_versions)
      ? before.product_versions.find((v: { id: string }) => v.id === version.id)
      : null;

    if (existingVersion?.state === "active") {
      const { data: cloned, error: cloneError } = await supabase
        .rpc("clone_version_as_draft", {
          p_source_version_id: version.id,
        })
        .single();

      if (cloneError) throw cloneError;
      effectiveVersionId =
        (cloned as { id: string } | null)?.id ?? effectiveVersionId;
    }

    const { error: versionError } = await supabase
      .from("product_versions")
      .update({
        private_instruction_template: version.private_instruction_template,
        private_negative_instruction: version.private_negative_instruction,
        provider_strategy: version.provider_strategy,
        model_config: version.model_config,
        output_sizes: version.output_sizes,
        input_validation_config: version.input_validation_config,
        post_process_config: version.post_process_config,
        safety_config: version.safety_config,
        credit_cost,
      })
      .eq("id", effectiveVersionId);

    if (versionError) throw versionError;
  }

  // Upsert fields is simplified: delete existing and re-insert.
  await supabase.from("product_fields").delete().eq("product_id", id);

  if (fields.length > 0) {
    const { error: fieldsError } = await supabase.from("product_fields").insert(
      fields.map((field) => ({
        product_id: id,
        field_key: field.field_key,
        label: field.label,
        help_text: field.help_text,
        field_type: field.field_type,
        required: field.required,
        sort_order: field.sort_order,
        config: field.config,
        validation: field.validation,
        active: field.active,
      }))
    );
    if (fieldsError) throw fieldsError;
  }

  await logAdminAction({
    action: "product.update",
    entityType: "product",
    entityId: id,
    before,
    after: product,
  });

  return product;
}

export async function publishProductVersion(
  productId: string,
  versionId: string,
  overrideReason?: string
) {
  await requireAdminOrOwner();
  const input = publishProductVersionSchema.parse({
    productId,
    versionId,
    overrideReason,
  });

  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_product_version", {
    p_product_id: input.productId,
    p_version_id: input.versionId,
    p_override_reason: input.overrideReason ?? null,
  });

  if (error) throw error;
}

export async function rollbackProductVersion(
  productId: string,
  targetVersionId: string,
  reason?: string
) {
  await requireAdminOrOwner();
  const input = rollbackProductVersionSchema.parse({
    productId,
    targetVersionId,
    reason,
  });

  const supabase = await createClient();
  const { error } = await supabase.rpc("rollback_product_version", {
    p_product_id: input.productId,
    p_target_version_id: input.targetVersionId,
    p_reason: input.reason ?? null,
  });

  if (error) throw error;
}

export async function transitionProductStatus(
  productId: string,
  newStatus: string,
  reason?: string
) {
  await requireAdminOrOwner();
  const input = productStatusTransitionSchema.parse({
    productId,
    newStatus,
    reason,
  });

  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_product_status", {
    p_product_id: input.productId,
    p_new_status: input.newStatus,
    p_reason: input.reason ?? null,
  });

  if (error) throw error;
}

export async function duplicateProduct(id: string) {
  await requireAdminOrOwner();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const original = await getProductById(id);
  if (!original) throw new Error("Product not found");

  const newSlug = `${original.slug}-copy-${Date.now()}`;
  const newName = `${original.name} (Copy)`;

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      type: original.type,
      slug: newSlug,
      name: newName,
      short_description: original.short_description,
      long_description: original.long_description,
      category_id: original.category_id,
      public_status: "draft",
      visibility: original.visibility,
      likeness_level: original.likeness_level,
      featured_rank: original.featured_rank,
      hero_asset_id: original.hero_asset_id,
      poster_asset_id: original.poster_asset_id,
      preview_video_asset_id: original.preview_video_asset_id,
      preview_gif_asset_id: original.preview_gif_asset_id,
      metadata: original.metadata,
    })
    .select()
    .single();

  if (productError) throw productError;

  const originalVersion = Array.isArray(original.product_versions)
    ? original.product_versions[0]
    : null;

  if (originalVersion) {
    await supabase.from("product_versions").insert({
      product_id: product.id,
      version_number: 1,
      state: "draft",
      private_instruction_template:
        originalVersion.private_instruction_template,
      private_negative_instruction:
        originalVersion.private_negative_instruction,
      provider_strategy: originalVersion.provider_strategy,
      model_config: originalVersion.model_config,
      output_sizes: originalVersion.output_sizes,
      input_validation_config: originalVersion.input_validation_config,
      post_process_config: originalVersion.post_process_config,
      safety_config: originalVersion.safety_config,
      credit_cost: originalVersion.credit_cost,
      created_by_admin_id: user.id,
    });
  }

  const originalFields = Array.isArray(original.product_fields)
    ? original.product_fields
    : [];

  if (originalFields.length > 0) {
    await supabase.from("product_fields").insert(
      originalFields.map(
        (field: {
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
          product_id: product.id,
          field_key: field.field_key,
          label: field.label,
          help_text: field.help_text,
          field_type: field.field_type,
          required: field.required,
          sort_order: field.sort_order,
          config: field.config,
          validation: field.validation,
          active: field.active,
        })
      )
    );
  }

  await logAdminAction({
    action: "product.duplicate",
    entityType: "product",
    entityId: id,
    after: { new_product_id: product.id },
  });

  return product;
}

/**
 * Select the version an admin should be editing: the current draft if one exists,
 * otherwise the active (published) version. Retired versions are only selectable
 * explicitly via rollback.
 */
export async function selectEditableVersion(
  versions: Array<{ id: string; state: string; version_number: number }>
) {
  const ordered = [...versions].sort((a, b) => {
    const stateRank = (state: string) =>
      ({ draft: 0, testing: 1, active: 2, retired: 3 })[state] ?? 4;
    const rankDiff = stateRank(a.state) - stateRank(b.state);
    if (rankDiff !== 0) return rankDiff;
    return b.version_number - a.version_number;
  });

  const draft = ordered.find((v) => v.state === "draft");
  if (draft) return draft;

  const testing = ordered.find((v) => v.state === "testing");
  if (testing) return testing;

  return ordered.find((v) => v.state === "active") ?? ordered[0] ?? null;
}

/**
 * Admin lab listing — every product regardless of status (drafts are the whole
 * point of the lab), with the editable version's credit cost for display.
 */
export async function getAdminLabProducts() {
  await requireAdminOrOwner();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, type, public_status, hero_asset_id, product_versions(id, state, version_number, credit_cost)"
    )
    .order("name", { ascending: true });
  if (error) throw error;

  return Promise.all(
    (data ?? []).map(async (product) => {
      const versions = Array.isArray(product.product_versions)
        ? (product.product_versions as Array<{
            id: string;
            state: string;
            version_number: number;
            credit_cost: unknown;
          }>)
        : [];
      const selected = await selectEditableVersion(
        versions.map((v) => ({
          id: v.id,
          state: v.state,
          version_number: v.version_number,
        }))
      );
      const version = versions.find((v) => v.id === selected?.id);
      return {
        id: product.id as string,
        slug: product.slug as string,
        name: product.name as string,
        type: product.type as "filter" | "poster",
        public_status: product.public_status as string,
        hero_asset_id: (product.hero_asset_id as string | null) ?? null,
        credit_cost: coerceCreditCost(version?.credit_cost) ?? 0,
      };
    })
  );
}

/**
 * Admin-gated product lookup by slug for the test lab. Unlike
 * `getPublicProductBySlug`, this returns drafts/testing versions too — the
 * lab exists to test presets *before* they're published. Shaped to
 * `PublicProductDetail` so `LabWorkspace` renders identically to the
 * consumer-facing detail data.
 */
export async function getAdminProductBySlug(slug: string) {
  await requireAdminOrOwner();

  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from("products")
    .select(
      `*, categories(slug, name), product_versions(*), product_fields(*)`
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!product) return null;

  const versions = Array.isArray(product.product_versions)
    ? product.product_versions
    : [];
  const selected = await selectEditableVersion(
    versions.map((v: Record<string, unknown>) => ({
      id: String(v.id),
      state: String(v.state),
      version_number: Number(v.version_number),
    }))
  );
  const version = selected
    ? (versions.find(
        (v: Record<string, unknown>) => v.id === selected.id
      ) as Record<string, unknown> | undefined)
    : undefined;

  const fields = Array.isArray(product.product_fields)
    ? product.product_fields
    : [];

  const modelConfig =
    (version?.model_config as Record<string, unknown> | undefined) ?? {};
  const outputSizes = Array.isArray(version?.output_sizes)
    ? (version!.output_sizes as PublicProductDetail["output_sizes"])
    : modelConfig.width && modelConfig.height
      ? [
          {
            name: `${modelConfig.width}x${modelConfig.height}`,
            width: Number(modelConfig.width),
            height: Number(modelConfig.height),
            is_default: true,
          },
        ]
      : [];

  const category = Array.isArray(product.categories)
    ? product.categories[0]
    : product.categories;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    type: product.type,
    short_description: product.short_description ?? null,
    long_description: product.long_description ?? null,
    category_id: product.category_id ?? null,
    category_slug: category?.slug ?? null,
    category_name: category?.name ?? null,
    featured_rank: product.featured_rank ?? null,
    version_id: (version?.id as string | undefined) ?? null,
    version_number: (version?.version_number as number | undefined) ?? null,
    credit_cost: coerceCreditCost(version?.credit_cost) ?? 0,
    output_sizes: outputSizes,
    metadata:
      product.type === "filter"
        ? {
            filter_config:
              (product.metadata as Record<string, unknown> | null)
                ?.filter_config ?? {},
          }
        : product.type === "poster"
          ? {
              poster_config:
                (product.metadata as Record<string, unknown> | null)
                  ?.poster_config ?? {},
            }
          : {},
    hero_asset_id: product.hero_asset_id ?? null,
    poster_asset_id: product.poster_asset_id ?? null,
    preview_gif_asset_id: product.preview_gif_asset_id ?? null,
    preview_video_asset_id: product.preview_video_asset_id ?? null,
    public_assets: [],
    created_at: product.created_at ?? null,
    likeness_level: product.likeness_level ?? null,
    active_fields: fields
      .filter((f: { active: boolean | null }) => f.active !== false)
      .sort(
        (a: { sort_order: number | null }, b: { sort_order: number | null }) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0)
      )
      .map((f: Record<string, unknown>) => ({
        id: f.id,
        field_key: f.field_key,
        label: f.label,
        help_text: f.help_text ?? null,
        field_type: f.field_type,
        required: f.required ?? null,
        sort_order: f.sort_order ?? null,
        config: f.config ?? null,
        validation: f.validation ?? null,
      })),
  } as PublicProductDetail;
}

const REFERENCE_ROLES = [
  "style_reference",
  "composition_reference",
  "layout_reference",
] as const;

export async function attachReferenceAsset(input: {
  productId: string;
  assetId: string;
  role: string;
  internalOnly: boolean;
}) {
  await requireAdminOrOwner();
  if (!REFERENCE_ROLES.includes(input.role as (typeof REFERENCE_ROLES)[number])) {
    throw new Error("Invalid reference role");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_assets")
    .insert({
      product_id: input.productId,
      asset_id: input.assetId,
      role: input.role,
      internal_only: input.internalOnly,
      sort_order: 0,
    })
    .select("id, role, asset_id, sort_order, internal_only")
    .single();

  if (error) throw error;

  await logAdminAction({
    action: "product.attach_reference",
    entityType: "product",
    entityId: input.productId,
    after: { asset_id: input.assetId, role: input.role },
  });

  return data;
}

export async function detachReferenceAsset(productAssetId: string) {
  await requireAdminOrOwner();

  const supabase = await createClient();
  const { data: existing, error: findError } = await supabase
    .from("product_assets")
    .select("id, product_id, asset_id, role")
    .eq("id", productAssetId)
    .single();

  if (findError || !existing) throw new Error("Reference asset not found");

  const { error } = await supabase
    .from("product_assets")
    .delete()
    .eq("id", productAssetId);

  if (error) throw error;

  await logAdminAction({
    action: "product.detach_reference",
    entityType: "product",
    entityId: existing.product_id as string,
    before: existing,
  });
}

export async function getProductReferenceAssets(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_assets")
    .select(
      `id, role, asset_id, sort_order, internal_only,
      assets!inner(id, bucket, storage_key, mime_type, visibility)`
    )
    .eq("product_id", productId)
    .in("role", [...REFERENCE_ROLES])
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const asset = row.assets as unknown as {
      id: string;
      bucket: string;
      storage_key: string;
      mime_type: string;
      visibility: string;
    };
    const publicUrl = supabase.storage
      .from(asset.bucket)
      .getPublicUrl(asset.storage_key).data.publicUrl;
    return {
      id: row.id as string,
      role: row.role as string,
      asset_id: row.asset_id as string,
      sort_order: row.sort_order as number,
      internal_only: row.internal_only as boolean,
      public_url: publicUrl,
      mime_type: asset.mime_type,
    };
  });
}
