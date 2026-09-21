import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getAvatarUrl } from "@/lib/profile/actions";
import { listDefaultAvatars } from "@/lib/profile/default-avatars";
import { SettingsShell } from "@/components/consumer/settings-shell";
import { SettingCard, SettingRow } from "@/components/consumer/setting-card";
import { EditAccountButton } from "@/components/consumer/edit-account-dialog";

export default async function AccountProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/account/profile");
  }

  const profile = await getMyProfile();
  if (!profile) {
    redirect("/app");
  }

  const [avatarUrl, defaultAvatars] = await Promise.all([
    getAvatarUrl(profile.avatar_asset_id),
    listDefaultAvatars(),
  ]);
  const name =
    profile.display_name ??
    (user.user_metadata?.name as string | null) ??
    "Your account";
  const email = profile.email ?? user.email ?? "";
  const joined = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <SettingsShell userName={name} userEmail={email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-cream-50 text-xl font-semibold">Profile</h1>
          <p className="text-text-secondary mt-1 text-sm">
            How your account appears to you. Profiles on 5Pixels are private —
            nothing here is public.
          </p>
        </div>

        <SettingCard
          title="Your profile"
          description="Your name and photo are used across your account only."
          action={
            <EditAccountButton
              profile={profile}
              avatarUrl={avatarUrl}
              defaultAvatars={defaultAvatars}
            />
          }
        >
          <div className="flex items-center gap-4">
            <div className="border-cream-100/10 bg-charcoal-800 relative h-16 w-16 shrink-0 overflow-hidden rounded-full border">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={name}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <span className="text-text-muted flex h-full w-full items-center justify-center text-xl font-semibold">
                  {name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-cream-50 truncate text-base font-medium">
                {name}
              </p>
              <p className="text-text-secondary truncate text-sm">{email}</p>
            </div>
          </div>
        </SettingCard>

        <SettingCard title="Account details">
          <SettingRow label="Display name" value={name} />
          <SettingRow label="Email" value={email} hint="Used to sign in and for account notices" />
          <SettingRow label="Member since" value={joined} />
        </SettingCard>
      </div>
    </SettingsShell>
  );
}
