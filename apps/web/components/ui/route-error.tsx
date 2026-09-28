"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Warning } from "@phosphor-icons/react";
import { ERROR_COPY, type ErrorClass } from "@/lib/copy/errors";

/**
 * Shared route-segment error boundary body (16 §8): what happened, what it
 * means, what to do — Try again + a segment-appropriate escape. Never exposes
 * internals.
 */
export function RouteError({
  error,
  reset,
  kind = "server",
  body,
  escapeHref,
  escapeLabel,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** Copy class from the 16 §5 map. */
  kind?: ErrorClass;
  body?: string;
  escapeHref?: string;
  escapeLabel?: string;
}) {
  const copy = ERROR_COPY[kind];
  useEffect(() => {
    console.error("[route-error]", error.message, error.digest ?? "");
  }, [error]);

  return (
    <main
      role="alert"
      className="flex flex-1 flex-col items-center justify-center px-5 py-20 text-center"
    >
      <Warning className="text-error h-12 w-12" aria-hidden />
      <h2 className="text-cream-50 mt-4 text-2xl font-bold">{copy.title}</h2>
      <p className="text-text-secondary mt-2 max-w-md">{body ?? copy.body}</p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
        <Button onClick={() => reset()} variant="brand" className="w-full">
          {copy.primary}
        </Button>
        {(escapeHref ?? "secondary" in copy) && (
          <Button asChild variant="ghost" className="w-full">
            <Link href={escapeHref ?? ("secondary" in copy ? copy.secondary.href : "/app")}>
              {escapeLabel ?? ("secondary" in copy ? copy.secondary.label : "Go home")}
            </Link>
          </Button>
        )}
      </div>
    </main>
  );
}
