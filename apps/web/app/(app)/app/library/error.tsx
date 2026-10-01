"use client";

import { RouteError } from "@/components/ui/route-error";

export default function LibraryError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      kind="network"
      body="Your Library is safe — this just didn't load. Try again."
      escapeHref="/app"
      escapeLabel="Back to Discover"
    />
  );
}
