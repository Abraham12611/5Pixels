"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  categoryFormSchema,
  type CategoryFormInput,
} from "@/lib/validation/admin-actions";
import type { z } from "zod";

type CategoryListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CategoryFormValues = z.input<typeof categoryFormSchema>;

interface CategoryManagerProps {
  categories: CategoryListItem[];
  onCreate: (input: CategoryFormInput) => Promise<CategoryListItem>;
  onUpdate: (id: string, input: CategoryFormInput) => Promise<CategoryListItem>;
  onToggleActive: (id: string, isActive: boolean) => Promise<CategoryListItem>;
}

export function CategoryManager({
  categories: initialCategories,
  onCreate,
  onUpdate,
  onToggleActive,
}: CategoryManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [editing, setEditing] = useState<CategoryListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [globalError, setGlobalError] = useState<string>();
  const [globalSuccess, setGlobalSuccess] = useState<string>();
  const [pendingId, setPendingId] = useState<string>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues, unknown, CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      sort_order: 0,
      is_active: true,
    },
  });

  const openCreate = () => {
    reset({
      name: "",
      slug: "",
      description: "",
      sort_order: 0,
      is_active: true,
    });
    setEditing(null);
    setDialogOpen(true);
    setGlobalError(undefined);
    setGlobalSuccess(undefined);
  };

  const openEdit = (category: CategoryListItem) => {
    reset({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
    setEditing(category);
    setDialogOpen(true);
    setGlobalError(undefined);
    setGlobalSuccess(undefined);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const onSubmit = async (data: CategoryFormInput) => {
    setGlobalError(undefined);
    setGlobalSuccess(undefined);

    try {
      const result = editing
        ? await onUpdate(editing.id, data)
        : await onCreate(data);

      setCategories((prev) => {
        const exists = prev.find((c) => c.id === result.id);
        if (exists) {
          return prev.map((c) => (c.id === result.id ? result : c));
        }
        return [...prev, result].sort(
          (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
        );
      });

      setGlobalSuccess(
        editing
          ? "Category updated successfully."
          : "Category created successfully."
      );
      closeDialog();
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : "Category save failed. Please try again."
      );
    }
  };

  const handleToggleActive = async (category: CategoryListItem) => {
    setPendingId(category.id);
    setGlobalError(undefined);
    setGlobalSuccess(undefined);

    try {
      const result = await onToggleActive(category.id, !category.is_active);
      setCategories((prev) =>
        prev.map((c) => (c.id === result.id ? result : c))
      );
      setGlobalSuccess(
        `Category ${result.is_active ? "activated" : "deactivated"} successfully.`
      );
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : "Action failed. Please try again."
      );
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-cream-50 text-3xl font-bold">Categories</h1>
          <p className="text-text-secondary mt-2">
            Manage preset categories. Deactivating hides a category from product
            forms; it is never deleted.
          </p>
        </div>
        <Button onClick={openCreate}>New category</Button>
      </div>

      {globalError && (
        <div
          role="alert"
          className="border-error/30 bg-error/10 text-error rounded-xl border px-4 py-3 text-sm"
        >
          {globalError}
        </div>
      )}

      {globalSuccess && (
        <div
          role="status"
          className="rounded-xl border border-lime-500/30 bg-lime-500/10 px-4 py-3 text-sm text-lime-400"
        >
          {globalSuccess}
        </div>
      )}

      <div className="border-cream-100/10 bg-charcoal-850 rounded-2xl border">
        {categories.length === 0 ? (
          <p className="text-text-secondary p-6">No categories yet.</p>
        ) : (
          <ul className="divide-cream-100/10 divide-y">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="text-cream-50 font-semibold">{category.name}</p>
                  <p className="text-text-muted text-sm">{category.slug}</p>
                  {category.description && (
                    <p className="text-text-secondary mt-1 max-w-md text-sm">
                      {category.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      category.is_active
                        ? "bg-lime-500/10 text-lime-400"
                        : "bg-charcoal-700 text-text-secondary"
                    }`}
                  >
                    {category.is_active ? "Active" : "Inactive"}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pendingId === category.id}
                    onClick={() => handleToggleActive(category)}
                  >
                    {pendingId === category.id
                      ? "Saving…"
                      : category.is_active
                        ? "Deactivate"
                        : "Activate"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openEdit(category)}
                  >
                    Edit
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-charcoal-850 text-cream-50 border-cream-100/10">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit category" : "New category"}
            </DialogTitle>
            <DialogDescription className="text-text-secondary">
              Slugs must be lowercase letters, numbers, and hyphens.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...register("name")}
                className="mt-2"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-error mt-1 text-sm">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                {...register("slug")}
                className="mt-2"
                disabled={isSubmitting}
              />
              {errors.slug && (
                <p className="text-error mt-1 text-sm">{errors.slug.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                className="mt-2"
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="text-error mt-1 text-sm">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sort_order">Sort order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  {...register("sort_order", { valueAsNumber: true })}
                  className="mt-2"
                  disabled={isSubmitting}
                />
                {errors.sort_order && (
                  <p className="text-error mt-1 text-sm">
                    {errors.sort_order.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="is_active">Status</Label>
                <Select
                  id="is_active"
                  {...register("is_active", {
                    setValueAs: (value) => value === "true",
                  })}
                  className="mt-2"
                  disabled={isSubmitting}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
                {errors.is_active && (
                  <p className="text-error mt-1 text-sm">
                    {errors.is_active.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={closeDialog}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? editing
                    ? "Saving…"
                    : "Creating…"
                  : editing
                    ? "Save changes"
                    : "Create category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
