"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "./admin";
import { logAdminAction } from "./audit";
import {
  categoryFormSchema,
  categoryUpdateSchema,
  uuidSchema,
  type CategoryFormInput,
  type CategoryUpdateInput,
} from "@/lib/validation/admin-actions";

export async function getCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getCategoriesForAdmin() {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, slug, name, description, sort_order, is_active, created_at, updated_at"
    )
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createCategory(input: CategoryFormInput) {
  await requireAdmin();
  const validated = categoryFormSchema.parse(input);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: validated.name,
      slug: validated.slug,
      description: validated.description || null,
      sort_order: validated.sort_order,
      is_active: validated.is_active,
    })
    .select()
    .single();

  if (error) {
    throw translateCategoryError(error);
  }

  await logAdminAction({
    action: "category.create",
    entityType: "category",
    entityId: data.id,
    after: data,
  });

  return data;
}

export async function updateCategory(id: string, input: CategoryUpdateInput) {
  await requireAdmin();
  const validatedId = uuidSchema.parse(id);
  const validated = categoryUpdateSchema.parse(input);

  const supabase = await createClient();

  const { data: before, error: beforeError } = await supabase
    .from("categories")
    .select("*")
    .eq("id", validatedId)
    .single();
  if (beforeError) throw beforeError;

  const { data, error } = await supabase
    .from("categories")
    .update({
      ...(validated.name !== undefined && { name: validated.name }),
      ...(validated.slug !== undefined && { slug: validated.slug }),
      ...(validated.description !== undefined && {
        description: validated.description || null,
      }),
      ...(validated.sort_order !== undefined && {
        sort_order: validated.sort_order,
      }),
      ...(validated.is_active !== undefined && {
        is_active: validated.is_active,
      }),
    })
    .eq("id", validatedId)
    .select()
    .single();

  if (error) {
    throw translateCategoryError(error);
  }

  await logAdminAction({
    action: "category.update",
    entityType: "category",
    entityId: validatedId,
    before,
    after: data,
  });

  return data;
}

export async function toggleCategoryActive(id: string, isActive: boolean) {
  await requireAdmin();
  const validatedId = uuidSchema.parse(id);

  const supabase = await createClient();

  const { data: before, error: beforeError } = await supabase
    .from("categories")
    .select("*")
    .eq("id", validatedId)
    .single();
  if (beforeError) throw beforeError;

  const { data, error } = await supabase
    .from("categories")
    .update({ is_active: isActive })
    .eq("id", validatedId)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction({
    action: isActive ? "category.activate" : "category.deactivate",
    entityType: "category",
    entityId: validatedId,
    before,
    after: data,
  });

  return data;
}

function translateCategoryError(error: {
  code?: string;
  message?: string;
}): Error {
  if (error.code === "23505") {
    return new Error(
      "A category with this slug already exists. Choose a unique slug."
    );
  }
  return new Error(error.message ?? "Category operation failed.");
}
