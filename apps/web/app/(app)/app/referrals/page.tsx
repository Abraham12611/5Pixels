import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/profile/actions";
import {
  getMyReferralCode,
  getMyReferrals,
  getReferralStats,
  REFERRER_SIGNUP_BONUS,
} from "@/lib/referrals/rewards";
import { getSiteUrl } from "@/lib/auth/url";
import { SettingsShell } from "@/components/consumer/settings-shell";
import { ReferralCard } from "@/components/promo/referral-card";

export const metadata = { title: "Referrals — 5Pixels" };

/**
 * First-party referral hub (07 §3 — Blackbird share anatomy + Open
 * give/get framing). Every user has a human code on profiles.referral_code;
 * the link is /r/<code> and the same code is claimable by hand during
 * onboarding. GrowSurf stays dormant — this surface no longer embeds it.
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

  const [code, stats, referrals] = await Promise.all([
    getMyReferralCode(),
    getReferralStats(),
    getMyReferrals(),
  ]);
  const referralUrl = code ? `${getSiteUrl()}/r/${code}` : null;

  return (
    <SettingsShell userName={displayName || "Your account"} userEmail={email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-cream-50 text-xl font-semibold">
            Give a transformation, get credits
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Share your code — friends get their first transformation free, and
            you earn {REFERRER_SIGNUP_BONUS} credits when they join plus 30% of
            their first plan&rsquo;s credits.
          </p>
        </div>

        <ReferralCard
          referralUrl={referralUrl}
          referralCode={code}
          refereeReward="their first transformation, free"
          referrerReward={`${REFERRER_SIGNUP_BONUS} credits when they join + 30% of their first plan's credits`}
          pendingCount={0}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Friends joined", value: stats?.referredCount ?? 0 },
            { label: "Friends subscribed", value: stats?.paidReferrals ?? 0 },
            { label: "Credits earned", value: stats?.creditsEarned ?? 0 },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-4"
            >
              <p className="font-display text-cream-50 text-2xl font-bold">
                {value.toLocaleString()}
              </p>
              <p className="text-text-muted mt-1 text-xs">{label}</p>
            </div>
          ))}
        </div>

        {referrals.length === 0 ? (
          <div className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6 text-center">
            <p className="text-cream-100 text-sm font-medium">
              Nobody&rsquo;s joined yet
            </p>
            <p className="text-text-muted mt-1 text-xs">
              Your code is ready when they are — it also works typed in by
              hand during their signup.
            </p>
          </div>
        ) : (
          <div className="border-cream-100/10 divide-cream-100/10 divide-y rounded-2xl border">
            {referrals.map((r) => (
              <div
                key={r.userId}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-cream-100 text-sm font-medium">{r.name}</p>
                  <p className="text-text-muted text-xs">
                    Joined {new Date(r.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-cream-100 text-sm font-semibold">
                    {r.creditsEarned > 0
                      ? `+${r.creditsEarned.toLocaleString()} credits`
                      : "—"}
                  </p>
                  <p className="text-text-muted text-xs">
                    {r.hasPaid ? "Subscribed" : "Joined"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-text-muted text-xs leading-relaxed">
          Codes are for new accounts only — one referral per signup. Rewards
          land when your friend joins and when they pick their first plan.
        </p>
      </div>
    </SettingsShell>
  );
}
