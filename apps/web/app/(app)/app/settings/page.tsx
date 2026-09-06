import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    .select("email, display_name, status")
    .eq("id", user.id)
    .single();

  if (profile?.status === "deleted") {
    redirect("/");
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-cream-50 text-3xl font-bold">Settings</h1>
      <p className="text-text-secondary mt-2">Manage your account and data.</p>

      <div className="border-cream-100/10 bg-charcoal-850 mt-8 rounded-2xl border p-6">
        <h2 className="text-cream-100 text-lg font-semibold">Account</h2>
        <p className="text-text-secondary mt-1">
          {profile?.display_name ?? profile?.email ?? user.email}
        </p>

        <div className="mt-6">
          <Link
            href="/app/settings/delete"
            className="text-rose-400 hover:text-rose-300 text-sm font-medium transition"
          >
            Delete account →
          </Link>
        </div>
      </div>
    </main>
  );
}
