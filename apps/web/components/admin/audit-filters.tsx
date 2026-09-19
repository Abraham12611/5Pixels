"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RichSelect } from "@/components/ui/rich-select";

/**
 * Filter bar for the audit log — custom dropdowns that update the URL
 * (and re-run the server query) as soon as a value is picked.
 */
export function AuditFilters({
  actions,
  entityTypes,
}: {
  actions: string[];
  entityTypes: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action") ?? "";
  const entityType = searchParams.get("entity_type") ?? "";

  const apply = (key: "action" | "entity_type", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.push(qs ? `/admin/audit?${qs}` : "/admin/audit");
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <RichSelect
        aria-label="Filter by action"
        className="w-56"
        value={action}
        onValueChange={(v) => apply("action", v)}
        noneLabel="All actions"
        searchable={actions.length > 12}
        searchPlaceholder="Search actions…"
        options={actions.map((a) => ({ value: a, label: a }))}
      />
      <RichSelect
        aria-label="Filter by entity type"
        className="w-56"
        value={entityType}
        onValueChange={(v) => apply("entity_type", v)}
        noneLabel="All entity types"
        options={entityTypes.map((t) => ({ value: t, label: t }))}
      />
    </div>
  );
}
