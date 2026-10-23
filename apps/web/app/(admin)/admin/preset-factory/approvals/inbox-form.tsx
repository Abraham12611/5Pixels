"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { WriteIntentSummary } from "@/lib/preset-factory/contract";
import type { IntentSummary } from "@/lib/mcp/preset-factory/approval";
import { bulkApproveWriteIntents, type BulkApproveResult } from "./actions";

/**
 * Owner bulk-review inbox (#272). Lists pending intents across all
 * requesters (A's owner-only `admin_list_write_intents`), lets the owner
 * inspect each via the detail page and approve any subset. Approving
 * only flips the intent's server-side status — the connector retries and
 * the database re-verifies every payload fingerprint at write time.
 */
export function InboxForm({ intents }: { intents: WriteIntentSummary[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Map<string, BulkApproveResult>>(new Map());
  const [pending, start] = useTransition();

  const [now] = useState(() => Date.now());
  const live = intents.filter((i) => new Date(i.expires_at).getTime() > now);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const approveSelected = () => {
    start(async () => {
      const res = await bulkApproveWriteIntents([...selected]);
      setResults(new Map(res.map((r) => [r.intent_id, r])));
      setSelected(new Set());
      router.refresh();
    });
  };

  if (live.length === 0) {
    return (
      <div className="border-cream-100/10 bg-charcoal-850 mt-8 max-w-2xl rounded-2xl border p-6">
        <p className="text-text-secondary text-sm">
          No pending write requests. Refused connector calls stage intents
          here for your review.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 max-w-3xl space-y-4">
      <ul className="space-y-3">
        {live.map((intent) => {
          const summary = (intent.preview ?? {}) as unknown as IntentSummary;
          const total =
            intent.total_items ||
            (summary.items?.length ?? 0) + (summary.categories?.length ?? 0);
          const res = results.get(intent.intent_id);
          const opLabel =
            intent.operation === "create_draft_batch"
              ? "Draft batch"
              : "Categories";
          return (
            <li
              key={intent.intent_id}
              className="border-cream-100/10 bg-charcoal-850 flex items-start gap-4 rounded-xl border p-4"
            >
              <input
                type="checkbox"
                className="mt-1.5 h-4 w-4 shrink-0"
                checked={selected.has(intent.intent_id)}
                onChange={() => toggle(intent.intent_id)}
                aria-label={`Select intent ${intent.intent_id}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-cream-50 text-sm font-medium">{opLabel}</span>
                  <span className="text-text-secondary text-xs">{total} item(s)</span>
                  <span className="text-text-secondary font-mono text-xs">
                    {intent.payload_digest.slice(0, 16)}…
                  </span>
                </div>
                <div className="text-text-secondary mt-1 flex flex-wrap gap-x-4 text-xs">
                  <span>
                    requested by{" "}
                    <span className="font-mono">{intent.requested_by.slice(0, 8)}…</span>
                  </span>
                  <span>staged {new Date(intent.created_at).toLocaleString()}</span>
                  <span>expires {new Date(intent.expires_at).toLocaleString()}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Link
                    href={`/admin/preset-factory/approve?intent=${intent.intent_id}`}
                    className="text-lime-400 text-xs underline underline-offset-2"
                  >
                    Inspect staged items →
                  </Link>
                  {res && !res.ok && (
                    <span className="text-destructive text-xs">{res.error}</span>
                  )}
                  {res?.ok && (
                    <span className="text-lime-400 text-xs">Approved — connector may retry</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <Button disabled={pending || selected.size === 0} onClick={approveSelected}>
        {pending
          ? "Approving…"
          : `Approve ${selected.size || ""} selected`.replace(/\s+/, " ")}
      </Button>
      <p className="text-text-secondary max-w-2xl text-xs">
        Approving marks the request approved — it does not write anything
        itself. The connector then retries; the database re-verifies each
        payload&apos;s fingerprint and consumes the approval as items write.
        Approvals are one-shot per staged payload and never carry forward
        to future requests.
      </p>
    </div>
  );
}
