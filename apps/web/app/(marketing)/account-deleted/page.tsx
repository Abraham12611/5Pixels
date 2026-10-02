import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Account deleted — 5Pixels",
};

export default function AccountDeletedPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <h1 className="text-cream-50 text-2xl font-semibold">
        Your account has been deleted
      </h1>
      <p className="text-text-secondary mt-3 text-sm leading-relaxed">
        Your results, photos, library, and settings are gone, and you&apos;ve
        been signed out everywhere. We&apos;re sorry to see you go.
      </p>
      <div className="mt-8 flex w-full flex-col gap-3">
        <Button asChild className="w-full">
          <Link href="/">Back to 5Pixels</Link>
        </Button>
        <Button variant="ghost" asChild className="w-full">
          <Link href="/login">Create a new account</Link>
        </Button>
      </div>
    </main>
  );
}
