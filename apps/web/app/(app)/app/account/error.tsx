"use client";

import { RouteError } from "@/components/ui/route-error";

export default function AccountError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      kind="server"
      body="Your account is fine — this page just didn't load."
      escapeHref="/app"
      escapeLabel="Back to Discover"
    />
  );
}
