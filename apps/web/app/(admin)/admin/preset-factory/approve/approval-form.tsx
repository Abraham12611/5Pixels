"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { StoredWriteIntent } from "@/lib/mcp/preset-factory/approval";
import { mintWriteApproval } from "./actions";

/**
 * Itemized approval preview (#272) — the owner sees the REAL staged
 * request (read back from the server-held intent, not model text):
 * each preset's name/slug/type/category/model/counts, or each category.
 * Private instruction templates are deliberately never rendered here.
 */
export function ApprovalForm({ intent }: { intent: StoredWriteIntent }) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const opLabel =
    intent.operation === "create_draft_batch"
      ? "Create preset draft batch"
      : "Create preset categories";
  const items = intent.summary.items ?? [];
  const categories = intent.summary.categories ?? [];

  const mint = () => {
    setError(null);
    start(async () => {
      const res = await mintWriteApproval({ intentId: intent.intentId });
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
    <div className="border-cream-100/10 bg-charcoal-850 mt-8 max-w-3xl rounded-2xl border p-6">
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Operation</dt>
          <dd className="text-cream-50 font-medium">{opLabel}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Items</dt>
          <dd className="text-cream-50">{intent.summary.total_items}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Request expires</dt>
          <dd className="text-cream-50">{new Date(intent.expiresAt).toLocaleString()}</dd>
        </div>
      </dl>

      {items.length > 0 && (
        <ul className="divide-cream-100/10 border-cream-100/10 mt-5 divide-y rounded-xl border">
          {items.map((it) => (
            <li key={it.client_item_id} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-cream-50 text-sm font-medium">{it.name}</span>
                <span className="text-text-secondary font-mono text-xs">{it.slug}</span>
                <span className="text-text-secondary text-xs uppercase">{it.type}</span>
              </div>
              <div className="text-text-secondary mt-1 flex flex-wrap gap-x-4 text-xs">
                <span>model: {it.provider}/{it.model}</span>
                <span>category: {it.category_id ?? "none"}</span>
                {it.parent_preset_id && <span>variant of {it.parent_preset_id}</span>}
                <span>{it.field_count} fields</span>
                <span>{it.asset_link_count} linked assets</span>
                {it.output_sizes.length > 0 && (
                  <span>
                    sizes: {it.output_sizes.map((s) => `${s.width}x${s.height}`).join(", ")}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {categories.length > 0 && (
        <ul className="divide-cream-100/10 border-cream-100/10 mt-5 divide-y rounded-xl border">
          {categories.map((c) => (
            <li key={c.slug} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-cream-50 text-sm font-medium">{c.name}</span>
                <span className="text-text-secondary font-mono text-xs">{c.slug}</span>
                <span className="text-text-secondary text-xs">sort {c.sort_order}</span>
              </div>
              {c.description && (
                <p className="text-text-secondary mt-1 text-xs">{c.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-text-secondary mt-4 text-xs">
        Payload digest: <span className="font-mono">{intent.digest.slice(0, 24)}…</span>
        {" "}— confirm these items match what your ChatGPT conversation proposed.
        Private instruction templates are never shown here; verify them in the
        draft editor after creation.
      </p>

      {error && (
        <p className="text-destructive mt-4 text-sm" role="alert">
          {error}
        </p>
      )}

      {!token ? (
        <Button className="mt-5" disabled={pending} onClick={mint}>
          Approve exactly this request
        </Button>
      ) : (
        <div className="mt-5 space-y-3">
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
            One approval = this exact staged request. A changed payload needs
            a fresh approval round-trip.
          </p>
        </div>
      )}
    </div>
  );
}
