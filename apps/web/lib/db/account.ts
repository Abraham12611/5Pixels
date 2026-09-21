"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logAdminAction } from "./audit";

const CONFIRMATION_PHRASE = "DELETE";

export interface AccountDeletionResult {
  error?: string;
}

export async function deleteAccount(
  confirmation: string
): Promise<AccountDeletionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to delete your account." };
  }

  if (confirmation !== CONFIRMATION_PHRASE) {
    return { error: `Please type ${CONFIRMATION_PHRASE} to confirm.` };
  }

  const service = createServiceClient();

  // Load the profile and assets before making destructive changes.
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("id, is_owner")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Unable to load your account." };
  }

  if (profile.is_owner) {
    return {
      error:
        "The owner account cannot be deleted through this flow. Transfer ownership first.",
    };
  }

  // Cancel active subscriptions.
  await service
    .from("subscriptions")
    .update({ status: "cancelled", cancel_at_period_end: true, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .in("status", ["active", "past_due", "trialing"]);

  // Delete favorites and user settings.
  await service.from("favorites").delete().eq("user_id", user.id);
  await service.from("user_settings").delete().eq("user_id", user.id);

  // Soft-delete user-owned assets and remove their storage objects.
  const { data: assets } = await service
    .from("assets")
    .select("id, bucket, storage_key")
    .eq("owner_user_id", user.id);

  const assetsByBucket = new Map<string, string[]>();
  for (const asset of assets ?? []) {
    const list = assetsByBucket.get(asset.bucket) ?? [];
    list.push(asset.storage_key);
    assetsByBucket.set(asset.bucket, list);
  }

  for (const [bucket, keys] of assetsByBucket) {
    if (keys.length > 0) {
      await service.storage.from(bucket).remove(keys);
    }
  }

  if (assets && assets.length > 0) {
    const assetIds = assets.map((a) => a.id);
    await service
      .from("assets")
      .update({
        owner_user_id: null,
        visibility: "private",
        deleted_at: new Date().toISOString(),
      })
      .in("id", assetIds);
  }

  // Anonymize generation records.
  await service
    .from("generations")
    .update({
      requested_options: {},
      compiled_request_fingerprint: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  // Soft-delete the profile.
  const { error: updateError } = await service
    .from("profiles")
    .update({
      email: null,
      display_name: null,
      avatar_asset_id: null,
      is_admin: false,
      is_owner: false,
      dodo_customer_id: null,
      status: "deleted",
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return { error: "Unable to delete your account. Please try again." };
  }

  await logAdminAction({
    action: "user.account_deleted",
    entityType: "profile",
    entityId: user.id,
    after: { user_id: user.id },
    throwOnFailure: false,
  });

  revalidatePath("/", "layout");

  // Sign the user out after their account is marked deleted.
  await supabase.auth.signOut({ scope: "global" });

  redirect("/");
}
