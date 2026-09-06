import { requireAdmin } from "@/lib/db/admin";
import { getAdminAuditLogs, getAdminAuditLogFilters } from "@/lib/db/audit-log";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatJson(value: Record<string, unknown> | null) {
  if (!value) return "—";
  return JSON.stringify(value, null, 2);
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity_type?: string }>;
}) {
  await requireAdmin();
  const { action, entity_type } = await searchParams;
  const [logs, filters] = await Promise.all([
    getAdminAuditLogs({ action, entityType: entity_type }, 200),
    getAdminAuditLogFilters(),
  ]);

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-cream-50 text-3xl font-bold">Audit log</h1>
        <p className="text-text-secondary mt-2">
          History of admin and owner actions.
        </p>
      </div>

      <form
        method="GET"
        action="/admin/audit"
        className="mb-6 flex flex-wrap gap-3"
      >
        <select
          name="action"
          defaultValue={action}
          className="border-cream-100/10 bg-charcoal-850 text-cream-50 rounded-xl border px-3 py-2 text-sm"
        >
          <option value="">All actions</option>
          {filters.actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          name="entity_type"
          defaultValue={entity_type}
          className="border-cream-100/10 bg-charcoal-850 text-cream-50 rounded-xl border px-3 py-2 text-sm"
        >
          <option value="">All entity types</option>
          {filters.entityTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="bg-lime-400 text-charcoal-950 hover:bg-lime-300 rounded-xl px-4 py-2 text-sm font-semibold transition"
        >
          Filter
        </button>
      </form>

      <div className="border-cream-100/10 bg-charcoal-850 overflow-hidden rounded-2xl border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="text-text-secondary border-cream-100/10 border-b bg-charcoal-900/50">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-cream-100/10 divide-y">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-text-secondary px-4 py-8 text-center"
                  >
                    No audit log entries yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-charcoal-800/50 transition">
                    <td className="text-cream-100 px-4 py-3 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="text-cream-100 px-4 py-3">
                      {log.adminEmail ?? log.adminUserId ?? "system"}
                    </td>
                    <td className="text-cream-100 px-4 py-3 font-mono text-xs">
                      {log.action}
                    </td>
                    <td className="text-cream-100 px-4 py-3">
                      <span className="text-text-muted">{log.entityType}</span>
                      {log.entityId && (
                        <span className="text-text-muted ml-1 font-mono text-xs">
                          · {log.entityId.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="text-cream-100 px-4 py-3 max-w-xs truncate">
                      {log.reason ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <details className="group">
                        <summary className="text-lime-400 cursor-pointer text-xs font-medium transition hover:text-lime-300">
                          View
                        </summary>
                        <div className="bg-charcoal-900 mt-2 max-w-xl rounded-lg p-3 font-mono text-xs">
                          <p className="text-text-muted mb-1">Before</p>
                          <pre className="text-cream-100 whitespace-pre-wrap">
                            {formatJson(log.before)}
                          </pre>
                          <p className="text-text-muted mb-1 mt-3">After</p>
                          <pre className="text-cream-100 whitespace-pre-wrap">
                            {formatJson(log.after)}
                          </pre>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
