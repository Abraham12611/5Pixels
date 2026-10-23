"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { mintWriteApproval } from "./actions";

/**
 * Mint + display the approval token (#272). The digest is shown in full so
 * the owner can eyeball it against the payload summary ChatGPT displayed —
 * approving anything else is meaningless because the token only binds THIS
 * digest.
 */
export function ApprovalForm({
  operation,
  digest,
}: {
  operation: string;
  digest: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const opLabel =
    operation === "create_draft_batch" ? "Create preset draft batch" : "Create preset categories";

  const mint = () => {
    setError(null);
    start(async () => {
      const res = await mintWriteApproval({ operation, digest });
      if (res.error) {
        setError(res.error);
        return;
      }
      setToken(res.token ?? null);
      setExpiresAt(res.expires_at ?? null);
    });
  };

  const copy = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-cream-100/10 bg-charcoal-850 mt-8 max-w-2xl rounded-2xl border p-6">
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="text-text-secondary">Operation</dt>
          <dd className="text-cream-50 mt-0.5 font-medium">{opLabel}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Payload digest (SHA-256)</dt>
          <dd className="text-cream-50 mt-0.5 break-all font-mono text-xs">{digest}</dd>
          <dd className="text-text-secondary mt-1 text-xs">
            Confirm this matches the digest shown in your ChatGPT
            conversation — the token will only authorize that exact payload.
          </dd>
        </div>
      </dl>

      {error && (
        <p className="text-destructive mt-4 text-sm" role="alert">
          {error}
        </p>
      )}

      {!token ? (
        <Button className="mt-6" disabled={pending} onClick={mint}>
          Approve this exact payload
        </Button>
      ) : (
        <div className="mt-6 space-y-3">
          <p className="text-cream-50 text-sm font-medium">
            Approval token — paste it into the ChatGPT conversation as
            `approval_token`. Expires {expiresAt}.
          </p>
          <pre className="bg-charcoal-900 text-cream-50 overflow-x-auto rounded-xl p-3 text-xs break-all whitespace-pre-wrap">
            {token}
          </pre>
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? "Copied" : "Copy token"}
          </Button>
          <p className="text-text-secondary text-xs">
            One approval = one exact payload. A changed batch needs a new
            approval.
          </p>
        </div>
      )}
    </div>
  );
}
