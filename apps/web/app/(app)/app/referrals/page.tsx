import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/profile/actions";
import { SettingsShell } from "@/components/consumer/settings-shell";
import { SettingCard } from "@/components/consumer/setting-card";
import { GrowSurfBlocks } from "@/components/growsurf/blocks";
import { GrowSurfInit } from "@/components/growsurf/init";

export const metadata = { title: "Referrals — 5Pixels" };

/**
 * White-label referral page (GrowSurf Step 4: embedded elements). The
 * universal code in the root layout powers the blocks; passing the
 * participant's email forces the signed-in "participant view" instead of
 * a signup form.
 */
export default async function ReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/referrals");
  }

  const profile = await getMyProfile();
  const email = profile?.email ?? user.email ?? "";
  const displayName =
    profile?.display_name ??
    (user.user_metadata?.name as string | null) ??
    "";
  const [firstName = "", ...rest] = displayName.trim().split(/\s+/);
  const lastName = rest.join(" ");

  const growSurfEnabled =
    (process.env.NEXT_PUBLIC_GROWSURF_CAMPAIGN_ID ?? "whr2c0") !== "";

  return (
    <SettingsShell userName={displayName || "Your account"} userEmail={email}>
      {/* Re-initializes embedded blocks after client-side navigation. */}
      <GrowSurfInit />
      <div className="space-y-6">
        <div>
          <h1 className="text-cream-50 text-xl font-semibold">
            Refer &amp; earn
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Share your link — friends get their first result on us, and you
            earn credits when they pick a plan.
          </p>
        </div>

        {!growSurfEnabled || !email ? (
          <SettingCard title="Referral program">
            <p className="text-text-secondary text-sm">
              Referrals are not available yet.
            </p>
          </SettingCard>
        ) : (
          <GrowSurfBlocks
            email={email}
            firstName={firstName}
            lastName={lastName}
          />
        )}
      </div>
    </SettingsShell>
  );
}
