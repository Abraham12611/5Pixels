import { requireAdmin } from "@/lib/db/admin";
import { ApprovalForm } from "./approval-form";

/**
 * Owner write-approval mint (#272).
 *
 * ChatGPT's write tools refuse without a token bound to the exact payload
 * digest. The owner lands here from the approval link a refused call
 * returned (`?op=…&d=…`), verifies the digest matches what ChatGPT
 * displayed, and mints a short-lived token to paste back — the only way a
 * write can reach the backend.
 */
export default async function PresetFactoryApprovePage({
  searchParams,
}: {
  searchParams: Promise<{ op?: string; d?: string }>;
}) {
  await requireAdmin();
  const { op, d } = await searchParams;

  const valid = (op === "create_draft_batch" || op === "create_categories") && d && /^[0-9a-f]{64}$/.test(d);

  return (
    <>
      <h1 className="text-cream-50 text-3xl font-bold">Approve MCP write</h1>
      <p className="text-text-secondary mt-2 max-w-2xl">
        The Preset Factory connector is asking to write drafts on your
        behalf. Tokens minted here bind the exact payload digest, the
        operation and your account, and expire after 10 minutes.
      </p>

      {!valid ? (
        <div className="border-cream-100/10 bg-charcoal-850 mt-8 rounded-2xl border p-6">
          <p className="text-cream-50 text-sm font-medium">Invalid approval request</p>
          <p className="text-text-secondary mt-1 text-sm">
            This page must be opened from the approval link a refused
            connector call returned (it carries the operation and payload
            digest).
          </p>
        </div>
      ) : (
        <ApprovalForm operation={op} digest={d} />
      )}
    </>
  );
}
