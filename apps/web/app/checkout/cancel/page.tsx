import { createClient } from "@/lib/supabase/server";
import { getUserCreditBalance } from "@/lib/generation/balance";
import { CheckoutReturn } from "@/components/consumer/checkout-return";

function sanitizeReturn(raw: string | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default async function CheckoutCancelPage(props: {
  searchParams: Promise<{ return?: string }>;
}) {
  const { return: rawReturn } = await props.searchParams;
  const returnPath = sanitizeReturn(rawReturn);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const balance = user ? await getUserCreditBalance() : 0;

  // Try again → pick a plan again; Back to your look → the origin path.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <CheckoutReturn
        mode="cancel"
        balance={balance}
        primaryHref="/pricing"
        primaryLabel="Try again"
        secondaryHref={returnPath ?? undefined}
        secondaryLabel="Back to your look"
      />
    </main>
  );
}
