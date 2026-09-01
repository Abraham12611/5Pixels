import { z } from "zod";
import { ownerOverrideReasonSchema } from "./publish-gates";

/**
 * Shared server-side input schemas for admin product actions.
 *
 * These schemas validate arguments that come from the UI before they are passed
 * to the database RPCs. They are pure and safe to unit test.
 */

export const uuidSchema = z.string().uuid();

const trimmedNonEmptyString = z.string().trim().min(1);

const categorySlugSchema = trimmedNonEmptyString
  .regex(
    /^[a-z0-9-]+$/,
    "Slug must contain only lowercase letters, numbers, and hyphens."
  )
  .max(120, "Slug must be 120 characters or fewer.");

export const categoryFormSchema = z.object({
  name: trimmedNonEmptyString.max(120, "Name must be 120 characters or fewer."),
  slug: categorySlugSchema,
  description: z.string().trim().max(500).optional(),
  sort_order: z.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});

export const categoryUpdateSchema = z.object({
  name: trimmedNonEmptyString.max(120).optional(),
  slug: categorySlugSchema.optional(),
  description: z.string().trim().max(500).optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});

export const productActionSchema = z.object({
  productId: uuidSchema,
  reason: z.string().trim().optional(),
});

export const publishProductVersionSchema = z.object({
  productId: uuidSchema,
  versionId: uuidSchema,
  overrideReason: ownerOverrideReasonSchema.optional(),
});

export const rollbackProductVersionSchema = z.object({
  productId: uuidSchema,
  targetVersionId: uuidSchema,
  reason: z
    .string()
    .trim()
    .min(5, "Rollback reason must be at least 5 characters.")
    .optional(),
});

export const productStatusTransitionSchema = z.object({
  productId: uuidSchema,
  newStatus: z.enum(["active", "paused", "retired"]),
  reason: z.string().trim().optional(),
});

export type PublishProductVersionInput = z.infer<
  typeof publishProductVersionSchema
>;

export type RollbackProductVersionInput = z.infer<
  typeof rollbackProductVersionSchema
>;

export type ProductStatusTransitionInput = z.infer<
  typeof productStatusTransitionSchema
>;

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
