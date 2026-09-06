import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/db/admin";
import { getAdminGenerationById } from "@/lib/db/generations-admin";
import { GenerationStatusBadge } from "@/components/admin/generation-status-badge";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6 ${className}`}
    >
      <h2 className="text-cream-100 mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="mb-3">
      <p className="text-text-muted text-xs font-medium uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`text-cream-100 mt-1 text-sm ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default async function AdminGenerationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const generation = await getAdminGenerationById(id);

  if (!generation) notFound();

  return (
    <main className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            href="/admin/generations"
            className="text-text-secondary hover:text-cream-100 text-sm transition"
          >
            ← Back to generations
          </Link>
          <h1 className="text-cream-50 mt-2 text-3xl font-bold">
            Generation {id.slice(0, 8)}
          </h1>
          <p className="text-text-secondary mt-2">
            <GenerationStatusBadge status={generation.status} />
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Overview">
          <Field label="User" value={generation.userEmail ?? generation.userId} />
          <Field label="Preset" value={generation.productName} />
          <Field
            label="Type"
            value={<span className="capitalize">{generation.productType}</span>}
          />
          <Field label="Version" value={generation.productVersionId.slice(0, 8)} />
          <Field
            label="Provider endpoint"
            value={generation.providerEndpoint ?? "—"}
            mono
          />
          <Field
            label="Created"
            value={formatDate(generation.createdAt)}
          />
          <Field
            label="Started"
            value={formatDate(generation.startedAt)}
          />
          <Field
            label="Completed"
            value={formatDate(generation.completedAt)}
          />
          <Field label="Latency" value={formatDuration(generation.latencyMs)} />
        </Section>

        <Section title="Cost & credits">
          <Field
            label="Credits held"
            value={generation.creditCost}
          />
          <Field
            label="Actual credits used"
            value={generation.actualCreditCost ?? "—"}
          />
          <Field
            label="Provider cost"
            value={
              generation.providerCostUsd != null
                ? formatCurrency(Math.round(generation.providerCostUsd * 100))
                : "—"
            }
          />
          <Field
            label="Markup multiplier"
            value={
              generation.markupMultiplier != null
                ? `${generation.markupMultiplier}x`
                : "—"
            }
          />
          <Field
            label="Status detail"
            value={generation.statusDetail ?? "—"}
          />
          {generation.failureCode && (
            <Field
              label="Failure code"
              value={generation.failureCode}
              mono
            />
          )}
          {generation.failureStage && (
            <Field
              label="Failure stage"
              value={generation.failureStage}
            />
          )}
        </Section>

        <Section title="Credit ledger">
          {generation.creditLedger.length === 0 ? (
            <p className="text-text-secondary">No ledger entries.</p>
          ) : (
            <ul className="divide-cream-100/10 divide-y">
              {generation.creditLedger.map((entry) => (
                <li
                  key={entry.idempotencyKey}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-cream-100 text-sm capitalize">
                    {entry.entryType.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      entry.amount < 0 ? "text-rose-400" : "text-lime-400"
                    }`}
                  >
                    {entry.amount > 0 ? "+" : ""}
                    {entry.amount} credits
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Provider attempts" className="mt-6">
        {generation.falUsage.length === 0 ? (
          <p className="text-text-secondary">No provider usage recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-text-secondary border-cream-100/10 border-b">
                  <th className="py-2 font-medium">Endpoint</th>
                  <th className="py-2 font-medium">Cost</th>
                  <th className="py-2 font-medium">Compute time</th>
                  <th className="py-2 font-medium">At</th>
                </tr>
              </thead>
              <tbody className="divide-cream-100/10 divide-y">
                {generation.falUsage.map((usage, index) => (
                  <tr key={index}>
                    <td className="text-cream-100 py-3 font-mono text-xs">
                      {usage.endpointId ?? "—"}
                    </td>
                    <td className="text-cream-100 py-3">
                      {formatCurrency(Math.round(usage.rawCostUsd * 100))}
                    </td>
                    <td className="text-cream-100 py-3">
                      {usage.computeSeconds != null
                        ? `${usage.computeSeconds}s`
                        : "—"}
                    </td>
                    <td className="text-cream-100 py-3">
                      {formatDate(usage.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Outputs" className="mt-6">
        {generation.outputs.length === 0 ? (
          <p className="text-text-secondary">No outputs yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {generation.outputs.map((output) => (
              <div
                key={output.assetId}
                className="border-cream-100/10 bg-charcoal-900 rounded-xl border p-3"
              >
                {output.publicUrl ? (
                  <Image
                    src={output.publicUrl}
                    alt={`${output.outputRole} output`}
                    unoptimized
                    width={output.width ?? 400}
                    height={output.height ?? 400}
                    className="bg-charcoal-800 aspect-square w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="bg-charcoal-800 aspect-square w-full rounded-lg" />
                )}
                <p className="text-cream-100 mt-2 text-sm font-medium capitalize">
                  {output.outputRole.replace(/_/g, " ")}
                  {output.isPrimary && (
                    <span className="text-lime-400 ml-1 text-xs">(primary)</span>
                  )}
                </p>
                {output.width && output.height && (
                  <p className="text-text-muted text-xs">
                    {output.width} × {output.height} {output.fileFormat && `· ${output.fileFormat}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </main>
  );
}
