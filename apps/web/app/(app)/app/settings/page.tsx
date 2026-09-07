import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/db/settings";
import SettingsForm from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/settings");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profile?.status === "deleted") {
    redirect("/");
  }

  const settings = await getUserSettings();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-cream-50 text-3xl font-bold">Settings</h1>
      <p className="text-text-secondary mt-2">Manage your account and data.</p>

      <div className="mt-8">
        <SettingsForm
          initial={{
            defaultDownloadFormat: settings?.defaultDownloadFormat ?? "webp",
            marketingOptIn: settings?.marketingOptIn ?? false,
            productUpdatesOptIn: settings?.productUpdatesOptIn ?? false,
            autoDeleteOriginalsDays: settings?.autoDeleteOriginalsDays ?? null,
            autoDeleteOutputsDays: settings?.autoDeleteOutputsDays ?? null,
          }}
        />
      </div>
    </main>
  );
}
