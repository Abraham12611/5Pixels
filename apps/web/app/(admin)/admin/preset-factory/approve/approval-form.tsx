"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { WriteIntentSummary } from "@/lib/preset-factory/contract";
import type {
  IntentItemPreview,
  IntentSummary,
} from "@/lib/mcp/preset-factory/approval";
import { mintWriteApproval } from "./actions";

function ItemRow({ it }: { it: IntentItemPreview }) {
  const safetyBits = [
    it.safety?.allowed_nsfw != null &&
      `nsfw:${it.safety.allowed_nsfw ? "allowed" : "blocked"}`,
    it.safety?.block_public_figures != null &&
      `public-figures:${it.safety.block_public_figures ? "blocked" : "allowed"}`,
    it.safety?.block_minors != null &&
      `minors:${it.safety.block_minors ? "blocked" : "allowed"}`,
    it.safety?.policy_version && `policy:${it.safety.policy_version}`,
  ].filter(Boolean);
  const sizes = (it.output_sizes ?? []).filter(
    (s) => s?.width != null && s?.height != null
  );

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-cream-50 text-sm font-medium">{it.name ?? "(unnamed)"}</span>
        <span className="text-text-secondary font-mono text-xs">{it.slug ?? "—"}</span>
        <span className="text-text-secondary text-xs uppercase">{it.type ?? "—"}</span>
        <span className="text-text-secondary text-xs">{it.visibility ?? "—"}</span>
      </div>
      {it.short_description && (
        <p className="text-text-secondary mt-1 text-xs">{it.short_description}</p>
      )}
      <div className="text-text-secondary mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
        <span>
          model: {it.provider ?? "?"}/{it.model ?? "?"}
        </span>
        <span>category: {it.category_id ?? "none"}</span>
        {it.parent_preset_id && (
          <span>
            variant of {it.parent_preset_id}
            {it.variant_display_name ? ` (${it.variant_display_name})` : ""}
          </span>
        )}
        {it.standalone_discoverable && <span>standalone</span>}
        {it.featured_rank != null && <span>featured #{it.featured_rank}</span>}
        {it.style_archetype && <span>archetype: {it.style_archetype}</span>}
        {it.identity_preservation && (
          <span>identity: {it.identity_preservation}</span>
        )}
        {it.layout_template && <span>layout: {it.layout_template}</span>}
        {it.input_mode && <span>input: {it.input_mode}</span>}
        {it.input_image_range && <span>images: {it.input_image_range}</span>}
        {it.credit_cost != null && <span>credits: {it.credit_cost}</span>}
        {safetyBits.length > 0 && <span>safety: {safetyBits.join(", ")}</span>}
        {it.post_process?.format && (
          <span>
            output: {it.post_process.format}
            {it.post_process.quality != null && ` q${it.post_process.quality}`}
            {it.post_process.crop ? " cropped" : ""}
          </span>
        )}
        {sizes.length > 0 && (
          <span>
            sizes: {sizes.map((s) => `${s.width}x${s.height}`).join(", ")}
          </span>
        )}
        <span>{it.field_count ?? 0} fields</span>
        <span>{it.asset_link_count ?? 0} linked assets</span>
      </div>
    </li>
  );
}

/**
 * Itemized approval preview (#272) — the owner sees the staged intent's
 * stored preview (read back from `preset_factory_write_intents`, not model
 * text): each preset's name/slug/type/visibility/safety/composition/model
 * settings, or each category. This is a LIMITED SUMMARY by design: private
 * instruction templates, negative prompts, model_config internals, field
 * copy and asset payloads are never stored or rendered — approving means
 * trusting the SQL-bound payload fingerprint, not independently verifying
 * hidden recipe content (review that in the draft editor after creation).
 */
export function ApprovalForm({ intent }: { intent: WriteIntentSummary }) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const opLabel =
    intent.operation === "create_draft_batch"
      ? "Create preset draft batch"
      : "Create preset categories";
  const summary = (intent.preview ?? {}) as unknown as IntentSummary;
  const items = summary.items ?? [];
  const categories = summary.categories ?? [];
  const [now] = useState(() => Date.now());
  const expired = new Date(intent.expires_at).getTime() <= now;
  const approvable = intent.status === "pending" && !expired;

  const mint = () => {
    setError(null);
    start(async () => {
      const res = await mintWriteApproval({ intentId: intent.intent_id });
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
          <dd className="text-cream-50">{summary.total_items ?? items.length + categories.length}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Status</dt>
          <dd className="text-cream-50">
            {intent.status}
            {expired && intent.status === "pending" && " (expired)"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Request expires</dt>
          <dd className="text-cream-50">{new Date(intent.expires_at).toLocaleString()}</dd>
        </div>
      </dl>

      {items.length > 0 && (
        <ul className="divide-cream-100/10 border-cream-100/10 mt-5 divide-y rounded-xl border">
          {items.map((it, idx) => (
            // The SQL-derived preview has no per-item client id — slug +
            // position is the stable key.
            <ItemRow key={`${it.slug ?? "item"}-${idx}`} it={it} />
          ))}
        </ul>
      )}

      {categories.length > 0 && (
        <ul className="divide-cream-100/10 border-cream-100/10 mt-5 divide-y rounded-xl border">
          {categories.map((c, idx) => (
            <li key={`${c.slug ?? "category"}-${idx}`} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-cream-50 text-sm font-medium">{c.name ?? "(unnamed)"}</span>
                <span className="text-text-secondary font-mono text-xs">{c.slug ?? "—"}</span>
                <span className="text-text-secondary text-xs">sort {c.sort_order ?? 0}</span>
              </div>
              {c.description && (
                <p className="text-text-secondary mt-1 text-xs">{c.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 space-y-1.5">
        <p className="text-text-secondary text-xs">
          Payload digest (SQL-computed):{" "}
          <span className="font-mono">{intent.payload_digest.slice(0, 24)}…</span>
          {" "}— confirm these items match what your ChatGPT conversation proposed.
        </p>
        <p className="text-text-secondary text-xs">
          This is a summary of identity and settings only. Private recipe
          material — instruction templates, negative prompts, model-config
          internals, field copy and linked-asset content — is never stored or
          shown here and is NOT independently verified by this page.
          Approving binds the SQL fingerprint of the staged payload; review
          full recipes in the draft editor after creation.
        </p>
      </div>

      {error && (
        <p className="text-destructive mt-4 text-sm" role="alert">
          {error}
        </p>
      )}

      {!token ? (
        <Button className="mt-5" disabled={pending || !approvable} onClick={mint}>
          {approvable ? "Approve exactly this request" : "Not approvable"}
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
            This token points at the approved intent — it authorizes only
            this exact staged request through the connector. It may be
            retried until expiry; the intent is consumed server-side as each
            item writes, so replays cannot duplicate drafts. Alternatively
            the connector can simply retry with{" "}
            <span className="font-mono">approval_intent_id</span> — no
            token is needed once the intent is approved.
          </p>
        </div>
      )}
    </div>
  );
}
