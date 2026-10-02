"use client";

import { RouteError } from "@/components/ui/route-error";

export default function BillingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      kind="server"
      body="Your plan and credits are unaffected — the billing view just didn't load."
      escapeHref="/app/account"
      escapeLabel="Back to Account"
    />
  );
}
