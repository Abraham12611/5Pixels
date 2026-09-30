import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/profile/actions";
import { getUserSettings } from "@/lib/db/settings";
import { SettingsShell } from "@/components/consumer/settings-shell";
import { SettingCard } from "@/components/consumer/setting-card";
import { ToggleRow } from "@/components/consumer/toggle-row";

export default async function AccountNotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/account/notifications");
  }

  const [profile, settings] = await Promise.all([
    getMyProfile(),
    getUserSettings(),
  ]);
  const name =
    profile?.display_name ??
    (user.user_metadata?.name as string | null) ??
    "Your account";
  const email = profile?.email ?? user.email ?? "";

  return (
    <SettingsShell userName={name} userEmail={email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-cream-50 text-xl font-semibold">Notifications</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Choose what reaches you, and where. Essential account messages
            can&apos;t be turned off.
          </p>
        </div>

        {/* Pause all — one global switch above the groups (14 §4.1) */}
        <SettingCard>
          <ToggleRow
            title="Pause all notifications"
            description="Silences everything — inbox updates and email — until you turn it back on."
            settingKey="notificationsPaused"
            defaultChecked={settings?.notificationsPaused ?? false}
          />
        </SettingCard>

        <SettingCard
          title="Your transformations"
          description="In-app · also by email"
        >
          <ToggleRow
            title="When a result is ready"
            description="An email when a transformation you started finishes processing — the in-app inbox entry always lands."
            settingKey="notifyGenerationCompleted"
            defaultChecked={settings?.notifyGenerationCompleted ?? true}
          />
          <ToggleRow
            title="When one fails"
            description="Failures always appear in your inbox with credits refunded — there is no separate switch for them."
            locked
            lockedLabel="In-app only"
          />
        </SettingCard>

        <SettingCard
          title="Credits & billing"
          description="Email"
        >
          <ToggleRow
            title="Billing & low-credit"
            description="Receipts, plan changes, and a heads-up before your credits run out."
            settingKey="notifyBilling"
            defaultChecked={settings?.notifyBilling ?? true}
          />
          <ToggleRow
            title="Important account & security"
            description="Sign-in alerts, password changes, and other notices we must send to keep your account safe."
            locked
            lockedLabel="Always on"
          />
        </SettingCard>

        <SettingCard
          title="Product"
          description="Marketing email · off by default — unsubscribe anytime."
        >
          <ToggleRow
            title="New looks and collections"
            description="New presets, collections, and features as they launch."
            settingKey="productUpdatesOptIn"
            defaultChecked={settings?.productUpdatesOptIn ?? false}
          />
          <ToggleRow
            title="Tips & offers"
            description="Occasional creative tips, promotions, and marketing email."
            settingKey="marketingOptIn"
            defaultChecked={settings?.marketingOptIn ?? false}
          />
        </SettingCard>
      </div>
    </SettingsShell>
  );
}
