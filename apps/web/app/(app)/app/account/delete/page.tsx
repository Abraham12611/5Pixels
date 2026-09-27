import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePlan } from "@/lib/billing/entitlements";
import { getUserCreditBalance } from "@/lib/generation/balance";
import { DeleteAccountFlow } from "./delete-account-flow";

export default async function DeleteAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/account/delete");
  }

  const [activePlan, creditBalance] = await Promise.all([
    getActivePlan(),
    getUserCreditBalance(),
  ]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
      <Link
        href="/app/account"
        className="text-text-secondary hover:text-cream-50 text-sm transition-colors"
      >
        ← Back to Account
      </Link>
      <DeleteAccountFlow
        activePlan={activePlan}
        creditBalance={creditBalance}
      />
    </main>
  );
}
