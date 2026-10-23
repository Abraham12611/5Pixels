import { requireAdmin } from "@/lib/db/admin";
import { createClient } from "@/lib/supabase/server";
import { createPresetFactoryContext } from "@/lib/preset-factory/service";
import { readWriteIntentById } from "@/lib/mcp/preset-factory/approval";
import { ApprovalForm } from "./approval-form";

/**
 * Owner write-approval mint (#272).
 *
 * The connector's write tools stage a pending intent in
 * `preset_factory_write_intents` (mutations only via A's SECURITY DEFINER
 * RPCs; requester-scoped SELECT). The owner lands here via `?intent=<id>`,
 * sees the staged preview — names, slugs, types, visibility/safety/
 * composition/model settings — and approving runs the atomic
 * pending→approved RPC transition before a ChatGPT-layer token is minted.
 * Limited summary: private recipe material is never stored or shown.
 */
export default async function PresetFactoryApprovePage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  await requireAdmin();
  const { intent: intentId } = await searchParams;

  if (!intentId || !/^[0-9a-f-]{36}$/i.test(intentId)) {
    return (
      <>
        <h1 className="text-cream-50 text-3xl font-bold">Approve MCP write</h1>
        <div className="border-cream-100/10 bg-charcoal-850 mt-8 max-w-2xl rounded-2xl border p-6">
          <p className="text-cream-50 text-sm font-medium">Missing approval request</p>
          <p className="text-text-secondary mt-1 text-sm">
            Open this page from the approval link a refused connector call
            returned — it carries the staged request id.
          </p>
        </div>
      </>
    );
  }

  const supabase = await createClient();
  const ctxRes = await createPresetFactoryContext(supabase);
  // RLS-governed read: owner can open another admin's staged intent once
  // A's cross-admin policy ships; requester-bound until then.
  const loaded = ctxRes.ok
    ? await readWriteIntentById(supabase, intentId)
    : { error: ctxRes.error.message };

  return (
    <>
      <h1 className="text-cream-50 text-3xl font-bold">Approve MCP write</h1>
      <p className="text-text-secondary mt-2 max-w-2xl">
        Review the staged request below — this is what the connector is
        asking to write, exactly as the server recorded it. Approving
        performs the server-side pending → approved transition and mints a
        ChatGPT-layer token for this intent only, valid for 10 minutes.
      </p>

      {"error" in loaded ? (
        <div className="border-cream-100/10 bg-charcoal-850 mt-8 max-w-2xl rounded-2xl border p-6">
          <p className="text-cream-50 text-sm font-medium">Cannot approve this request</p>
          <p className="text-text-secondary mt-1 text-sm">{loaded.error}</p>
        </div>
      ) : (
        <ApprovalForm intent={loaded.intent} />
      )}
    </>
  );
}
