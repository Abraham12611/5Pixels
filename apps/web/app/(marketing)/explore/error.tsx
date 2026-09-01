"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function ExploreErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Explore page error:", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <AlertTriangle className="text-error h-12 w-12" aria-hidden />
      <h2 className="text-cream-50 mt-4 text-2xl font-bold">
        Couldn&apos;t load the catalog
      </h2>
      <p className="text-text-secondary mt-2 max-w-md">
        Something went wrong while fetching presets. Please try again.
      </p>
      <Button onClick={() => retry()} className="mt-6">
        Try again
      </Button>
    </main>
  );
}
