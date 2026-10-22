"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Warning } from "@phosphor-icons/react";
import Link from "next/link";

export default function ArticleErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Article page error:", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <div role="alert" className="flex flex-col items-center">
        <Warning className="text-error h-12 w-12" aria-hidden />
        <h2 className="text-cream-50 mt-4 text-2xl font-bold">
          Couldn&apos;t load this article
        </h2>
        <p className="text-text-secondary mt-2 max-w-md">
          Something went wrong while fetching the article. Please try again.
        </p>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => retry()}>Try again</Button>
          <Button variant="secondary" asChild>
            <Link href="/articles">Back to articles</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
