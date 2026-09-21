"use server";

import { createClient } from "@/lib/supabase/server";

export interface DefaultAvatar {
  id: string;
  url: string;
  label: string;
}

/**
 * The shared default-avatar set (seeded by the default_avatars migration).
 * Rows with the 'default-avatars' pseudo-bucket are served from the app's
 * public dir (/avatars/<key>); any other bucket resolves to a storage
 * public URL. Safe to render for any signed-in user.
 */
export async function listDefaultAvatars(): Promise<DefaultAvatar[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("assets")
    .select("id, storage_key, bucket")
    .eq("source_type", "default_avatar")
    .eq("visibility", "public")
    .is("deleted_at", null)
    .order("storage_key", { ascending: true });

  if (error) {
    console.error("[listDefaultAvatars] failed", error.message);
    return [];
  }

  return (data ?? []).map((row, index) => ({
    id: row.id as string,
    url:
      row.bucket === "default-avatars"
        ? `/avatars/${row.storage_key}`
        : supabase.storage
            .from(row.bucket as string)
            .getPublicUrl(row.storage_key as string).data.publicUrl,
    label: `Avatar ${index + 1}`,
  }));
}
