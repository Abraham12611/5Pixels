"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProductCreateInput } from "@5pixels/shared";
import { logAdminAction } from "./audit";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { version, fields, filter_config, poster_config, ...productData } =
    input;

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
      input_validation_config: version.input_validation_config,
      post_process_config: version.post_process_config,
      safety_config: version.safety_config,
      credit_cost: version.credit_cost,
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const before = await getProductById(id);
  const { version, fields, filter_config, poster_config, ...productData } =
    input;

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
    const { error: versionError } = await supabase
      .from("product_versions")
      .update({
        private_instruction_template: version.private_instruction_template,
        private_negative_instruction: version.private_negative_instruction,
        provider_strategy: version.provider_strategy,
        model_config: version.model_config,
        input_validation_config: version.input_validation_config,
        post_process_config: version.post_process_config,
        safety_config: version.safety_config,
        credit_cost: version.credit_cost,
      })
      .eq("id", version.id);

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
  versionId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Retire current active version.
  await supabase
    .from("product_versions")
    .update({ state: "retired", retired_at: new Date().toISOString() })
    .eq("product_id", productId)
    .eq("state", "active");

  // Publish new version.
  const { error } = await supabase
    .from("product_versions")
    .update({ state: "active", published_at: new Date().toISOString() })
    .eq("id", versionId);

  if (error) throw error;

  await supabase
    .from("products")
    .update({ public_status: "active" })
    .eq("id", productId);

  await logAdminAction({
    action: "product_version.publish",
    entityType: "product_version",
    entityId: versionId,
    after: { product_id: productId, version_id: versionId },
  });
}

export async function duplicateProduct(id: string) {
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
