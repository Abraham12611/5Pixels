import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/profile/actions";
import { SettingsShell } from "@/components/consumer/settings-shell";
import { SettingCard, SettingRow } from "@/components/consumer/setting-card";
import { SignOutOthersButton } from "./sign-out-others";
import { Monitor } from "@phosphor-icons/react/dist/ssr";

export default async function AccountSecurityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/account/security");
  }

  const profile = await getMyProfile();
  const name =
    profile?.display_name ??
    (user.user_metadata?.name as string | null) ??
    "Your account";
  const email = profile?.email ?? user.email ?? "";

  // Password auth exists for email sign-ups; OAuth users manage sign-in with
  // their provider — detect via identities.
  const hasPasswordIdentity = (user.identities ?? []).some(
    (identity) => identity.provider === "email"
  );

  return (
    <SettingsShell userName={name} userEmail={email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-cream-50 text-xl font-semibold">Security</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Manage how you sign in and where your account is active.
          </p>
        </div>

        <SettingCard
          title="Password &amp; sign-in"
          description={
            hasPasswordIdentity
              ? "You sign in with an email and password."
              : "You sign in with a connected provider."
          }
        >
          {hasPasswordIdentity ? (
            <SettingRow
              label="Password"
              value="Set"
              action={
                <Link
                  href="/update-password"
                  className="border-cream-100/10 bg-charcoal-800 text-cream-50 hover:border-cream-100/20 rounded-[10px] border px-3.5 py-2 text-sm font-medium transition-colors"
                >
                  Change password
                </Link>
              }
            />
          ) : (
            <p className="text-text-secondary text-sm">
              Sign-in is managed by your provider, so there is no 5Pixels
              password to change.
            </p>
          )}
        </SettingCard>

        <SettingCard
          title="Active sessions"
          description="Devices where your account is currently signed in."
        >
          <div className="border-cream-100/10 bg-charcoal-800/60 flex items-center justify-between gap-4 rounded-[10px] border px-4 py-3">
            <div className="flex items-center gap-3">
              <Monitor size={18} className="text-text-secondary" />
              <div>
                <p className="text-cream-50 text-sm font-medium">This device</p>
                <p className="text-text-muted text-xs">Current session</p>
              </div>
            </div>
            <span className="bg-lime-500/10 text-lime-300 rounded-full px-2.5 py-1 text-xs font-medium">
              Active now
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-text-muted text-xs">
              Signed in somewhere you don&apos;t recognize?
            </p>
            <SignOutOthersButton />
          </div>
        </SettingCard>

        <SettingCard title="Sensitive actions">
          <p className="text-text-secondary text-sm leading-relaxed">
            Important account changes — like deleting your account — always ask
            for explicit confirmation first. If a session is old, we may ask you
            to sign in again before continuing.
          </p>
        </SettingCard>
      </div>
    </SettingsShell>
  );
}
