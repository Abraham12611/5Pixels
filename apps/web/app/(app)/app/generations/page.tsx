import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { getUserCreditBalance } from "@/lib/generation/balance";
import type { SafeGeneration } from "@/lib/generation/types";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default async function GenerationsHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const [balanceResult, generationsResult] = await Promise.all([
    getUserCreditBalance(),
    supabase.rpc("get_user_generations"),
  ]);

  const generations = (generationsResult.data ??
    []) as unknown[] as SafeGeneration[];

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-cream-50 text-3xl font-bold">
              Generation history
            </h1>
            <p className="text-text-secondary mt-1">
              Credits:{" "}
              <span className="text-cream-50 font-medium">{balanceResult}</span>
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/explore">New generation</Link>
          </Button>
        </div>

        {generations.length === 0 ? (
          <p className="text-text-secondary">
            No generations yet. Pick a preset to get started.
          </p>
        ) : (
          <ul className="space-y-3">
            {generations.map((gen) => (
              <li
                key={gen.id}
                className="border-cream-100/10 bg-charcoal-850 flex items-center justify-between rounded-2xl border p-4"
              >
                <div>
                  <p className="text-cream-50 font-medium">{gen.productName}</p>
                  <p className="text-text-secondary text-sm">
                    {formatDate(gen.createdAt)} ·{" "}
                    <span className="capitalize">
                      {gen.status.replace(/_/g, " ")}
                    </span>
                    {gen.status === "completed" && (
                      <span className="text-text-muted ml-2">
                        ({gen.creditCost} credits used)
                      </span>
                    )}
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link
                    href={
                      gen.status === "completed"
                        ? `/app/results/${gen.id}`
                        : `/app/generations/${gen.id}`
                    }
                  >
                    View
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
