import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/profile/actions";
import { getUserSettings } from "@/lib/db/settings";
import { SettingsShell } from "@/components/consumer/settings-shell";
import { SettingCard } from "@/components/consumer/setting-card";
import { RetentionControls } from "./retention-controls";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";

export default async function AccountPrivacyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/account/privacy");
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
          <h1 className="text-cream-50 text-xl font-semibold">Privacy</h1>
          <p className="text-text-secondary mt-1 text-sm">
            How your uploads, results, and shares are handled.
          </p>
        </div>

        <SettingCard
          title="Uploaded images"
          description="Photos you upload are stored privately in your account and used only to create the transformations you ask for. You can remove them anytime by deleting the generation they belong to."
        >
          <p className="text-text-secondary text-sm leading-relaxed">
            Choose how long source photos and results are kept. Auto-delete
            applies to both existing and future files once set.
          </p>
          <RetentionControls
            originalsDays={settings?.autoDeleteOriginalsDays ?? null}
            outputsDays={settings?.autoDeleteOutputsDays ?? null}
          />
        </SettingCard>

        <SettingCard
          title="Generated results"
          description="Your results are private by default and only visible to you in your Library."
        >
          <p className="text-text-secondary text-sm leading-relaxed">
            Nothing you create is shown to other people unless you explicitly
            share it.
          </p>
        </SettingCard>

        <SettingCard
          title="Sharing defaults"
          description="Share links are off by default. A link is only created when you choose Share on a specific result."
        >
          <p className="text-text-secondary text-sm leading-relaxed">
            Anyone with a share link can view that single result. You can stop
            sharing by deleting the link or the result from your Library.
          </p>
        </SettingCard>

        {/* Danger zone */}
        <div
          id="danger"
          className="border-error/30 rounded-[15px] border p-1"
        >
          <details className="group" open={false}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
              <div>
                <p className="text-cream-50 text-base font-semibold">
                  Delete account
                </p>
                <p className="text-text-secondary mt-1 text-sm">
                  Permanently delete your account and associated data according
                  to the retention policy.
                </p>
              </div>
              <CaretDown
                size={18}
                className="text-text-secondary shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="border-error/20 border-t px-5 pb-5 pt-4">
              <ul className="text-text-secondary list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
                <li>
                  Your uploaded images and generated results are removed from
                  storage.
                </li>
                <li>
                  Favorites, settings, and profile details are deleted.
                </li>
                <li>Any active subscription is cancelled.</li>
                <li>
                  Billing records may be retained for legal and accounting
                  purposes.
                </li>
              </ul>
              <Link
                href="/app/account/delete"
                className="bg-error hover:bg-error/85 text-cream-50 mt-4 inline-flex items-center rounded-[10px] px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                Continue to deletion
              </Link>
            </div>
          </details>
        </div>
      </div>
    </SettingsShell>
  );
}
