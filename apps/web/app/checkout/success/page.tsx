import { createClient } from "@/lib/supabase/server";
import { getUserCreditBalance } from "@/lib/generation/balance";
import { getCreditActivity } from "@/lib/db/billing";
import { CheckoutReturn } from "@/components/consumer/checkout-return";

function sanitizeReturn(raw: string | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

// Plain helper — `Date.now()` in render-position components is flagged by
// react-hooks/purity; this stays a normal function so the comparison is legal.
function isFreshPurchase(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 120_000;
}

export default async function CheckoutSuccessPage(props: {
  searchParams: Promise<{ return?: string }>;
}) {
  const { return: rawReturn } = await props.searchParams;
  const returnPath = sanitizeReturn(rawReturn);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-out (or webhook beat the session): don't block the page.
  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6">
        <CheckoutReturn
          mode="success"
          balance={0}
          settled
          primaryHref={returnPath ?? "/explore"}
          primaryLabel={
            returnPath?.startsWith("/app/create/")
              ? "Continue your look"
              : "Browse looks"
          }
        />
      </main>
    );
  }

  const [balance, activity] = await Promise.all([
    getUserCreditBalance(),
    getCreditActivity(5),
  ]);

  // Webhook-lag tolerance: a purchase ledger entry under 2 minutes old means
  // the webhook already landed; otherwise the card polls until it does.
  const latestAdded = activity.find(
    (e) => e.kind === "added" && e.statusLabel === "Purchase"
  );
  const settled = latestAdded ? isFreshPurchase(latestAdded.date) : false;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <CheckoutReturn
        mode="success"
        balance={balance}
        settled={settled}
        purchaseLabel={latestAdded?.label ?? null}
        primaryHref={returnPath ?? "/explore"}
        primaryLabel={
          returnPath?.startsWith("/app/create/")
            ? "Continue your look"
            : returnPath === "/app/billing/credits"
              ? "Back to credits"
              : "Browse looks"
        }
        secondaryHref="/app/billing"
        secondaryLabel="Go to billing"
      />
    </main>
  );
}
