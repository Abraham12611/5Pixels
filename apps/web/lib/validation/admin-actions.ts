import { z } from "zod";
import { ownerOverrideReasonSchema } from "./publish-gates";

/**
 * Shared server-side input schemas for admin product actions.
 *
 * These schemas validate arguments that come from the UI before they are passed
 * to the database RPCs. They are pure and safe to unit test.
 */

export const uuidSchema = z.string().uuid();

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
