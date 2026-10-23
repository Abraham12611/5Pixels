import { requireAdmin } from "@/lib/db/admin";
import { createClient } from "@/lib/supabase/server";
import { createPresetFactoryContext } from "@/lib/preset-factory/service";
import { listPendingWriteIntents } from "@/lib/mcp/preset-factory/approval";
import { InboxForm } from "./inbox-form";

/**
 * Owner approvals inbox (#272) — every pending write intent the connector
 * has staged, across ALL requesting admins, in one review queue.
 *
 * Visibility is governed by the table's RLS policy: once A's owner
 * cross-admin SELECT ships, the owner sees every admin's staged requests;
 * until then the query is requester-bound (owner sees only own intents).
 * Approval itself is owner-only in SQL (`admin_approve_write_intent`),
 * and every intent the owner approves still carries its SQL-computed
 * payload fingerprints — bulk approving here can never authorize a
 * payload other than the one the owner inspected.
 */
export default async function PresetFactoryApprovalsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const ctxRes = await createPresetFactoryContext(supabase);

  if (!ctxRes.ok || !ctxRes.data.isOwner) {
    return (
      <>
        <h1 className="text-cream-50 text-3xl font-bold">Preset Factory approvals</h1>
        <div className="border-cream-100/10 bg-charcoal-850 mt-8 max-w-2xl rounded-2xl border p-6">
          <p className="text-cream-50 text-sm font-medium">Owner access required</p>
          <p className="text-text-secondary mt-1 text-sm">
            Approving connector write requests is owner-only — the database
            enforces it. If you staged a request yourself, use the approval
            link the connector returned instead.
          </p>
        </div>
      </>
    );
  }

  const intents = await listPendingWriteIntents(supabase);

  return (
    <>
      <h1 className="text-cream-50 text-3xl font-bold">Preset Factory approvals</h1>
      <p className="text-text-secondary mt-2 max-w-2xl">
        Pending connector write requests awaiting your approval. Approving
        marks each request approved server-side — the connector then
        retries its call and the database writes only the exact payloads
        you inspected (per-item fingerprints are re-verified at write
        time). Previews are limited summaries: private recipe text is never
        shown or independently verified.
      </p>
      <InboxForm intents={intents} />
    </>
  );
}
