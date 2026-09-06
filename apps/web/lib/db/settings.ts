"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface UserSettings {
  defaultDownloadFormat: string;
  marketingOptIn: boolean;
  productUpdatesOptIn: boolean;
  autoDeleteOriginalsDays: number | null;
  autoDeleteOutputsDays: number | null;
}

export async function getUserSettings(): Promise<UserSettings | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_settings")
    .select(
      "default_download_format, marketing_opt_in, product_updates_opt_in, auto_delete_originals_days, auto_delete_outputs_days"
    )
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[getUserSettings] failed", error.message);
    return null;
  }

  return {
    defaultDownloadFormat: (data.default_download_format as string) ?? "webp",
    marketingOptIn: (data.marketing_opt_in as boolean) ?? false,
    productUpdatesOptIn: (data.product_updates_opt_in as boolean) ?? false,
    autoDeleteOriginalsDays:
      data.auto_delete_originals_days != null
        ? Number(data.auto_delete_originals_days)
        : null,
    autoDeleteOutputsDays:
      data.auto_delete_outputs_days != null
        ? Number(data.auto_delete_outputs_days)
        : null,
  };
}

export interface UpdateUserSettingsInput {
  defaultDownloadFormat?: string;
  marketingOptIn?: boolean;
  productUpdatesOptIn?: boolean;
  autoDeleteOriginalsDays?: number | null;
  autoDeleteOutputsDays?: number | null;
}

export async function updateUserSettings(
  input: UpdateUserSettingsInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const service = createServiceClient();

  const { error: upsertError } = await service
    .from("user_settings")
    .upsert(
      {
        user_id: user.id,
        default_download_format: input.defaultDownloadFormat,
        marketing_opt_in: input.marketingOptIn,
        product_updates_opt_in: input.productUpdatesOptIn,
        auto_delete_originals_days: input.autoDeleteOriginalsDays,
        auto_delete_outputs_days: input.autoDeleteOutputsDays,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    console.error("[updateUserSettings] upsert failed", upsertError.message);
    return { success: false, error: "Unable to save settings." };
  }

  // Apply retention settings to existing assets.
  await applyRetentionToUserAssets(user.id, {
    originals: input.autoDeleteOriginalsDays,
    outputs: input.autoDeleteOutputsDays,
  });

  revalidatePath("/app/settings");
  return { success: true };
}

async function applyRetentionToUserAssets(
  userId: string,
  retention: { originals?: number | null; outputs?: number | null }
) {
  const service = createServiceClient();

  const sourceTypes: Array<{ sourceType: string; days: number | null | undefined }> = [
    { sourceType: "generation_source", days: retention.originals },
    { sourceType: "generation_output", days: retention.outputs },
  ];

  for (const { sourceType, days } of sourceTypes) {
    if (days === undefined) continue;

    const { data: assets } = await service
      .from("assets")
      .select("id, created_at")
      .eq("owner_user_id", userId)
      .eq("source_type", sourceType);

    for (const asset of assets ?? []) {
      const retentionExpiresAt =
        days != null
          ? new Date(
              new Date(asset.created_at as string).getTime() +
                days * 24 * 60 * 60 * 1000
            ).toISOString()
          : null;

      await service
        .from("assets")
        .update({ retention_expires_at: retentionExpiresAt })
        .eq("id", asset.id);
    }
  }
}
