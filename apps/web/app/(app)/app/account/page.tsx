import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getAvatarUrl } from "@/lib/profile/actions";
import { listDefaultAvatars } from "@/lib/profile/default-avatars";
import { getUserSettings } from "@/lib/db/settings";
import { getUserCreditBalance } from "@/lib/generation/balance";
import { getActivePlan } from "@/lib/billing/entitlements";
import { SettingsShell } from "@/components/consumer/settings-shell";
import { SettingCard } from "@/components/consumer/setting-card";
import { EditAccountButton } from "@/components/consumer/edit-account-dialog";
import { signOut } from "@/app/actions/auth";
import { SITE_VERSION } from "@/lib/site-version";
import {
  User,
  LockSimple,
  ShieldCheck,
  Coins,
  Crown,
  Receipt,
  Bell,
  Question,
  SignOut,
  Trash,
  CaretRight,
} from "@phosphor-icons/react/dist/ssr";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/account");
  }

  const [profile, settings, balance, activePlan] = await Promise.all([
    getMyProfile(),
    getUserSettings(),
    getUserCreditBalance(),
    getActivePlan(),
  ]);


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
    year: "numeric",
  });

  const privacySummary =
    settings?.autoDeleteOriginalsDays || settings?.autoDeleteOutputsDays
      ? `Auto-delete: sources ${
          settings.autoDeleteOriginalsDays
            ? `${settings.autoDeleteOriginalsDays}d`
            : "kept"
        }, results ${
          settings.autoDeleteOutputsDays
            ? `${settings.autoDeleteOutputsDays}d`
            : "kept"
        }`
      : "Your uploads and results stay private by default.";

  return (
    <SettingsShell userName={name} userEmail={email}>
      {/* Mobile: grouped index — 56px rows, group headers, labelled groups
          per 14 §2 (desktop keeps the card grid below) */}
      <div className="lg:hidden">
        {/* Identity row → profile */}
        <Link
          href="/app/account/profile"
          className="focus-visible:ring-lime-500/70 -mx-2 flex items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-cream-100/5 focus-visible:ring-2 focus-visible:outline-none"
        >
          <div className="border-cream-100/10 bg-charcoal-800 relative h-14 w-14 shrink-0 overflow-hidden rounded-full border">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                fill
                unoptimized
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <span className="text-text-muted flex h-full w-full items-center justify-center text-lg font-semibold">
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-cream-50 truncate text-base font-semibold">
              {name}
            </p>
            <p className="text-text-secondary truncate text-sm">{email}</p>
          </div>
          <CaretRight size={16} className="text-text-muted shrink-0" />
        </Link>

        {[
          {
            heading: "Credits & billing",
            rows: [
              {
                href: "/app/billing",
                icon: Coins,
                label: "Balance",
                value: `${balance} credits`,
              },
              {
                href: "/app/billing/plan",
                icon: Crown,
                label: "Plan",
                value: activePlan ? activePlan.name : "Free",
              },
              {
                href: "/app/billing/history",
                icon: Receipt,
                label: "Payment history",
                value: "",
              },
            ],
          },
          {
            heading: "Account",
            rows: [
              {
                href: "/app/account/profile",
                icon: User,
                label: "Profile",
                value: "",
              },
              {
                href: "/app/account/security",
                icon: ShieldCheck,
                label: "Security",
                value: "",
              },
              {
                href: "/app/account/notifications",
                icon: Bell,
                label: "Notifications",
                value: "",
              },
              {
                href: "/app/account/privacy",
                icon: LockSimple,
                label: "Privacy & data",
                value: "",
              },
            ],
          },
          {
            heading: "Support",
            rows: [
              {
                href: "/pricing#faq",
                icon: Question,
                label: "Help & FAQ",
                value: "",
              },
            ],
          },
        ].map((group) => (
          <section key={group.heading} className="mt-6">
            <h2 className="text-text-muted text-[11px] font-semibold uppercase tracking-wider">
              {group.heading}
            </h2>
            <div className="border-cream-100/10 divide-cream-100/10 bg-charcoal-850 mt-2 divide-y rounded-xl border">
              {group.rows.map((row) => (
                <Link
                  key={row.href + row.label}
                  href={row.href}
                  className="focus-visible:ring-lime-500/70 flex min-h-14 items-center gap-3 px-4 transition-colors hover:bg-cream-100/[0.04] focus-visible:ring-2 focus-visible:outline-none"
                >
                  <row.icon
                    size={18}
                    className="text-text-secondary shrink-0"
                  />
                  <span className="text-cream-50 flex-1 text-sm font-medium">
                    {row.label}
                  </span>
                  {row.value && (
                    <span className="text-text-muted text-sm">
                      {row.value}
                    </span>
                  )}
                  <CaretRight
                    size={14}
                    className="text-text-muted shrink-0"
                  />
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Sign out + danger row + version */}
        <div className="mt-8 space-y-4 pb-4">
          <form action={signOut}>
            <button
              type="submit"
              className="text-cream-50 hover:text-cream-100 flex w-full items-center gap-3 py-1 text-sm font-medium transition-colors"
            >
              <SignOut size={18} className="text-text-secondary" />
              Sign out
            </button>
          </form>
          <Link
            href="/app/account/delete"
            className="text-error/80 hover:text-error flex items-center gap-3 py-1 text-sm transition-colors"
          >
            <Trash size={18} className="text-error/60" weight="regular" />
            Delete account
          </Link>
          <p className="text-text-muted text-xs">v{SITE_VERSION}</p>
        </div>
      </div>

      <div className="hidden space-y-6 lg:block">
        {/* Identity header */}
        <div className="flex items-center gap-4">
          <div className="border-cream-100/10 bg-charcoal-800 relative h-14 w-14 shrink-0 overflow-hidden rounded-full border">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={name}
                fill
                unoptimized
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <span className="text-text-muted flex h-full w-full items-center justify-center text-lg font-semibold">
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-cream-50 truncate text-xl font-semibold">
              {name}
            </h1>
            <p className="text-text-secondary truncate text-sm">{email}</p>
          </div>
          <EditAccountButton
            profile={profile}
            avatarUrl={avatarUrl}
            defaultAvatars={defaultAvatars}
            label="Edit"
          />
        </div>

        {/* Shortcut / status cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/app/account/profile" className="group">
            <SettingCard className="group-hover:border-cream-100/20 h-full transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-charcoal-800 text-text-secondary rounded-[10px] p-2.5">
                    <User size={18} weight="regular" />
                  </span>
                  <div>
                    <p className="text-cream-50 text-sm font-medium">
                      Profile details
                    </p>
                    <p className="text-text-secondary mt-0.5 text-xs">
                      {name} · {email}
                    </p>
                  </div>
                </div>
                <CaretRight
                  size={16}
                  className="text-text-muted group-hover:text-cream-100 mt-1 transition-colors"
                />
              </div>
            </SettingCard>
          </Link>

          <Link href="/app/account/privacy" className="group">
            <SettingCard className="group-hover:border-cream-100/20 h-full transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-charcoal-800 text-text-secondary rounded-[10px] p-2.5">
                    <LockSimple size={18} weight="regular" />
                  </span>
                  <div>
                    <p className="text-cream-50 text-sm font-medium">Privacy</p>
                    <p className="text-text-secondary mt-0.5 text-xs">
                      {privacySummary}
                    </p>
                  </div>
                </div>
                <CaretRight
                  size={16}
                  className="text-text-muted group-hover:text-cream-100 mt-1 transition-colors"
                />
              </div>
            </SettingCard>
          </Link>

          <Link href="/app/account/security" className="group">
            <SettingCard className="group-hover:border-cream-100/20 h-full transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-charcoal-800 text-text-secondary rounded-[10px] p-2.5">
                    <ShieldCheck size={18} weight="regular" />
                  </span>
                  <div>
                    <p className="text-cream-50 text-sm font-medium">Security</p>
                    <p className="text-text-secondary mt-0.5 text-xs">
                      Password and sign-in
                    </p>
                  </div>
                </div>
                <CaretRight
                  size={16}
                  className="text-text-muted group-hover:text-cream-100 mt-1 transition-colors"
                />
              </div>
            </SettingCard>
          </Link>

          <Link href="/app/billing" className="group">
            <SettingCard className="group-hover:border-cream-100/20 h-full transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-charcoal-800 text-text-secondary rounded-[10px] p-2.5">
                    <Coins size={18} weight="regular" />
                  </span>
                  <div>
                    <p className="text-cream-50 text-sm font-medium">
                      Billing &amp; credits
                    </p>
                    <p className="text-text-secondary mt-0.5 text-xs">
                      {activePlan ? activePlan.name : "Free"} ·{" "}
                      {balance} credits
                    </p>
                  </div>
                </div>
                <CaretRight
                  size={16}
                  className="text-text-muted group-hover:text-cream-100 mt-1 transition-colors"
                />
              </div>
            </SettingCard>
          </Link>
        </div>

        <p className="text-text-muted text-xs">Member since {joined}</p>
      </div>
    </SettingsShell>
  );
}
