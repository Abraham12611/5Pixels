import { createServiceClient } from "@/lib/supabase/service";

export async function applyRetentionForNewAsset(
  assetId: string,
  userId: string,
  sourceType: "generation_source" | "generation_output"
): Promise<void> {
  const service = createServiceClient();

  const { data: settings } = await service
    .from("user_settings")
    .select("auto_delete_originals_days, auto_delete_outputs_days")
    .eq("user_id", userId)
    .single();

  const days =
    sourceType === "generation_source"
      ? settings?.auto_delete_originals_days
      : settings?.auto_delete_outputs_days;

  if (days == null) return;

  const { data: asset } = await service
    .from("assets")
    .select("created_at")
    .eq("id", assetId)
    .single();

  if (!asset) return;

  const retentionExpiresAt = new Date(
    new Date(asset.created_at as string).getTime() +
      Number(days) * 24 * 60 * 60 * 1000
  ).toISOString();

  await service
    .from("assets")
    .update({ retention_expires_at: retentionExpiresAt })
    .eq("id", assetId);
}
