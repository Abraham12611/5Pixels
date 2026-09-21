import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="border-cream-100/10 bg-charcoal-850 w-full max-w-md rounded-2xl border p-8 text-center">
        <h1 className="text-cream-50 mb-2 text-2xl font-bold">
          Payment successful
        </h1>
        <p className="text-text-secondary mb-6">
          Your credits and plan will be updated in a few moments.
        </p>
        <Button asChild>
          <Link href="/app/billing">Go to billing</Link>
        </Button>
      </div>
    </main>
  );
}
