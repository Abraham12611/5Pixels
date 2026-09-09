import { createClient } from "@/lib/supabase/server";
import { getUserCreditBalance } from "@/lib/generation/balance";
import {
  getMyNotifications,
  getUnreadNotificationCount,
} from "@/lib/db/notifications";
import { getAvatarUrl } from "@/lib/profile/actions";
import { AppHeaderClient } from "@/components/consumer/app-header-client";

export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, email, avatar_asset_id")
    .eq("id", user.id)
    .single();

  const [creditBalance, unreadCount, notifications, avatarUrl] = await Promise.all([
    getUserCreditBalance(),
    getUnreadNotificationCount(),
    getMyNotifications(15),
    getAvatarUrl(profile?.avatar_asset_id as string | null | undefined),
  ]);

  const name =
    (profile?.display_name as string | null) ??
    (user.user_metadata?.name as string | null) ??
    "";
  const email = user.email ?? "";

  return (
    <AppHeaderClient
      creditBalance={creditBalance}
      userName={name}
      userEmail={email}
      avatarUrl={avatarUrl}
      unreadCount={unreadCount}
      notifications={notifications}
    />
  );
}
