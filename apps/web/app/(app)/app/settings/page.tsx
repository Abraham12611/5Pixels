import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/db/settings";
import { getMyUsageStats } from "@/lib/db/usage-stats";
import { getUserCreditBalance } from "@/lib/generation/balance";
import { getActivePlan } from "@/lib/billing/entitlements";
import { SettingsLayout } from "@/components/consumer/settings-layout";
import { ProfileCard } from "@/components/consumer/profile-card";
import { SubscriptionCard } from "@/components/consumer/subscription-card";
import { CreditsCard } from "@/components/consumer/credits-card";
import { UsageCard } from "@/components/consumer/usage-card";
import { PromoCodeCard } from "@/components/consumer/promo-code-card";
import { SecurityCard } from "@/components/consumer/security-card";
import SettingsForm from "./settings-form";

const SETTINGS_SECTIONS = new Set([
  "profile",
  "subscription",
  "credits",
  "usage",
  "promo",
  "preferences",
  "security",
  "delete",
]);

export default async function SettingsPage(props: {
  searchParams: Promise<{ section?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/settings");
  }

  const { section } = await props.searchParams;
  const active = section && SETTINGS_SECTIONS.has(section) ? section : "profile";

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, email, status")
    .eq("id", user.id)
    .single();

  if (profile?.status === "deleted") {
    redirect("/");
  }

  const settings = await getUserSettings();
  const balance = await getUserCreditBalance();
  const activePlan = await getActivePlan();

  if (active === "delete") {
    redirect("/app/settings/delete");
  }

  const name =
    (profile?.display_name as string | null) ??
    (user.user_metadata?.name as string | null) ??
    "";
  const email = (profile?.email as string | null) ?? user.email ?? "";

  let usageDays: { date: string; credits: number }[] = [];
  if (active === "usage") {
    const usage = await getMyUsageStats();
    usageDays = usage?.days ?? [];
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <SettingsLayout active={active} userName={name} userEmail={email}>
        {active === "profile" ? <ProfileCard name={name} email={email} /> : null}

        {active === "subscription" ? (
          <SubscriptionCard
            planName={activePlan?.name ?? "Free Plan"}
            periodEnd={activePlan?.currentPeriodEnd ?? null}
          />
        ) : null}

        {active === "credits" ? <CreditsCard balance={balance} /> : null}

        {active === "usage" ? <UsageCard days={usageDays} /> : null}

        {active === "promo" ? <PromoCodeCard /> : null}

        {active === "preferences" ? (
          <SettingsForm
            initial={{
              defaultDownloadFormat: settings?.defaultDownloadFormat ?? "webp",
              marketingOptIn: settings?.marketingOptIn ?? false,
              productUpdatesOptIn: settings?.productUpdatesOptIn ?? false,
              autoDeleteOriginalsDays:
                settings?.autoDeleteOriginalsDays ?? null,
              autoDeleteOutputsDays: settings?.autoDeleteOutputsDays ?? null,
            }}
          />
        ) : null}

        {active === "security" ? <SecurityCard /> : null}
      </SettingsLayout>
    </div>
  );
}
