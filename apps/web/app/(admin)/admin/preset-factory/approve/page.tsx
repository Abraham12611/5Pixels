import { requireAdmin } from "@/lib/db/admin";
import { createClient } from "@/lib/supabase/server";
import { loadWriteIntent } from "@/lib/mcp/preset-factory/approval";
import { ApprovalForm } from "./approval-form";

/**
 * Owner write-approval mint (#272).
 *
 * The connector's write tools stage a server-held pending intent (stored
 * in admin_audit_logs) and refuse. The owner lands here via `?intent=<id>`,
 * sees the REAL itemized request — names, slugs, types, categories, model
 * config, counts, never private recipe text — and mints a token bound to
 * the stored payload digest only if it matches what ChatGPT proposed.
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const loaded = user
    ? await loadWriteIntent(supabase, intentId, user.id)
    : { ok: false as const, error: "Not signed in." };

  return (
    <>
      <h1 className="text-cream-50 text-3xl font-bold">Approve MCP write</h1>
      <p className="text-text-secondary mt-2 max-w-2xl">
        Review the staged request below — this is what the connector is
        asking to write, exactly as the server recorded it. Approving mints
        a token bound to this payload only, valid for 10 minutes.
      </p>

      {!loaded.ok ? (
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
