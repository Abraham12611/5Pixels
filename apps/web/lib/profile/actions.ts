"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

const MAX_USERNAME = 32;
const MAX_HEADLINE = 120;
const MAX_BIO = 300;
const MAX_LOCATION = 80;

export interface ProfileUpdateInput {
  display_name?: string;
  username?: string;
  headline?: string;
  bio?: string;
  location?: string;
  socials?: Record<string, string>;
  show_spent_credits?: boolean;
  avatar_asset_id?: string | null;
}

export interface PublicProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  socials: Record<string, string>;
  show_spent_credits: boolean;
  avatar_asset_id: string | null;
  created_at: string;
}

const usernamePattern = /^[a-z0-9_-]+$/;

export async function getMyProfile(): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, username, email, headline, bio, location, socials, show_spent_credits, avatar_asset_id, created_at"
    )
    .eq("id", user.id)
    .single();

  if (error || !data) {
    console.error("[getMyProfile] failed", error?.message);
    return null;
  }

  return {
    ...data,
    socials: (data.socials as Record<string, string> | null) ?? {},
    show_spent_credits: data.show_spent_credits ?? false,
  };
}

function validateInput(input: ProfileUpdateInput): string | null {
  if (input.username !== undefined && input.username !== null) {
    const normalized = input.username.trim().toLowerCase();
    if (normalized.length < 2 || normalized.length > MAX_USERNAME) {
      return "Username must be between 2 and 32 characters.";
    }
    if (!usernamePattern.test(normalized)) {
      return "Username can only contain letters, numbers, underscores, and dashes.";
    }
  }
  if (input.headline !== undefined && input.headline !== null) {
    if (input.headline.length > MAX_HEADLINE) {
      return "Headline must be 120 characters or less.";
    }
  }
  if (input.bio !== undefined && input.bio !== null) {
    if (input.bio.length > MAX_BIO) {
      return "Bio must be 300 characters or less.";
    }
  }
  if (input.location !== undefined && input.location !== null) {
    if (input.location.length > MAX_LOCATION) {
      return "Location must be 80 characters or less.";
    }
  }
  return null;
}

export async function updateProfile(
  input: ProfileUpdateInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const validation = validateInput(input);
  if (validation) {
    return { success: false, error: validation };
  }

  const updates: Record<string, unknown> = {};
  if (input.display_name !== undefined) updates.display_name = input.display_name;
  if (input.username !== undefined) updates.username = input.username?.trim().toLowerCase() || null;
  if (input.headline !== undefined) updates.headline = input.headline || null;
  if (input.bio !== undefined) updates.bio = input.bio || null;
  if (input.location !== undefined) updates.location = input.location || null;
  if (input.socials !== undefined) updates.socials = input.socials;
  if (input.show_spent_credits !== undefined) updates.show_spent_credits = input.show_spent_credits;
  if (input.avatar_asset_id !== undefined) updates.avatar_asset_id = input.avatar_asset_id;

  if (Object.keys(updates).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    console.error("[updateProfile] failed", error.message);
    if (error.message.includes("idx_profiles_username_unique")) {
      return { success: false, error: "That username is already taken." };
    }
    return { success: false, error: "Unable to save profile." };
  }

  revalidatePath("/app/profile");
  revalidatePath("/app");
  revalidatePath("/app/settings");
  return { success: true };
}

export async function getAvatarUrl(
  assetId: string | null | undefined,
  expiresSeconds = 300
): Promise<string | null> {
  if (!assetId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("assets")
    .select("storage_key, bucket, owner_user_id")
    .eq("id", assetId)
    .maybeSingle();

  if (error || !data) {
    console.error("[getAvatarUrl] asset lookup failed", error?.message);
    return null;
  }

  if (data.owner_user_id !== user.id) {
    return null;
  }

  const service = createServiceClient();
  const { data: signed, error: signError } = await service.storage
    .from(data.bucket)
    .createSignedUrl(data.storage_key, expiresSeconds);

  if (signError || !signed?.signedUrl) {
    console.error("[getAvatarUrl] sign failed", signError?.message);
    return null;
  }

  return signed.signedUrl;
}
