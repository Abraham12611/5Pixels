"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveAuthorization, denyAuthorization } from "./actions";

/**
 * OAuth consent buttons (#272) — the owner sees exactly which MCP client
 * is requesting access, then approves or denies. The returned redirect_url
 * carries the decision back to the client (ChatGPT connector).
 */
export function ConsentForm({ authorizationId }: { authorizationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const decide = (fn: typeof approveAuthorization) => {
    setError(null);
    start(async () => {
      const res = await fn(authorizationId);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.redirect_url) {
        window.location.href = res.redirect_url;
      }
    });
  };

  return (
    <div className="mt-6 space-y-3">
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button disabled={pending} onClick={() => decide(approveAuthorization)}>
          Approve access
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => decide(denyAuthorization)}
        >
          Deny
        </Button>
      </div>
      <p className="text-text-secondary text-xs">
        Approving grants this connector draft-creation access under your
        admin account until you revoke the grant or the token expires.
      </p>
    </div>
  );
}
