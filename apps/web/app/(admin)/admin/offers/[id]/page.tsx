import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import {
  addStep,
  getCampaignDetail,
  setCampaignFrequency,
  setCampaignStatus,
  setCampaignVariantWeights,
  setStepPayload,
  deleteStep,
} from "@/lib/offers/admin";
import { CampaignStatusActions } from "@/components/admin/campaign-status-actions";
import { StepPayloadEditor } from "@/components/admin/step-payload-editor";
import { VariantWeightsEditor } from "@/components/admin/variant-weights-editor";
import { FrequencyEditor } from "@/components/admin/frequency-editor";
import { AddStepForm } from "@/components/admin/add-step-form";
import { DeleteStepButton } from "@/components/admin/delete-step-button";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  live: "bg-lime-500/15 text-lime-400",
  paused: "bg-amber-500/15 text-amber-400",
  draft: "bg-charcoal-700 text-cream-100",
  scheduled: "bg-blue-500/15 text-blue-400",
  archived: "bg-charcoal-700/50 text-text-muted",
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCampaignDetail(id);
  if (!detail) notFound();

  const { campaign, steps, metrics, assignmentCount } = detail;

  const byVariant = new Map<string, typeof steps>();
  for (const step of steps) {
    const list = byVariant.get(step.variant) ?? [];
    list.push(step);
    byVariant.set(step.variant, list);
  }

  return (
    <>
      <Link
        href="/admin/offers"
        className="text-text-secondary hover:text-cream-50 inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft size={14} />
        All campaigns
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-cream-50 text-3xl font-bold">{campaign.name}</h1>
          <p className="text-text-muted mt-1 font-mono text-xs">
            {campaign.slug}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs",
              STATUS_TONE[campaign.status]
            )}
          >
            {campaign.status}
          </span>
          <CampaignStatusActions
            campaignId={campaign.id}
            status={campaign.status}
            action={setCampaignStatus}
          />
        </div>
      </div>

      <div className="text-text-secondary mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>
          Audience:{" "}
          <span className="text-cream-100">{campaign.audience.join(", ")}</span>
        </span>
        <span>
          Surfaces:{" "}
          <span className="text-cream-100">{campaign.surfaces.join(", ")}</span>
        </span>
        <span>
          Assignments:{" "}
          <span className="text-cream-100">{assignmentCount}</span>
        </span>
        {campaign.ends_at && (
          <span>
            Ends:{" "}
            <span className="text-cream-100">
              {new Date(campaign.ends_at).toLocaleDateString()}
            </span>
          </span>
        )}
      </div>

      {/* Per-variant funnel */}
      <section className="mt-10">
        <h2 className="text-cream-50 text-xl font-semibold">
          Funnel by variant
        </h2>
        <div className="border-cream-100/10 bg-charcoal-850 mt-4 overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-cream-100/10 text-text-muted border-b text-left text-[11px] uppercase tracking-wide">
                <th className="px-4 py-3">Variant</th>
                <th className="px-4 py-3 text-right">Impressions</th>
                <th className="px-4 py-3 text-right">Accepts</th>
                <th className="px-4 py-3 text-right">Declines</th>
                <th className="px-4 py-3 text-right">Checkouts</th>
                <th className="px-4 py-3 text-right">Conversions</th>
                <th className="px-4 py-3 text-right">Conv. %</th>
                <th className="px-4 py-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-cream-100/10 divide-y">
              {metrics.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-text-muted px-4 py-8 text-center text-sm"
                  >
                    No events yet — the funnel fills in as soon as the first
                    user sees an offer.
                  </td>
                </tr>
              ) : (
                metrics.map((m) => (
                  <tr key={m.variant}>
                    <td className="text-cream-100 px-4 py-3 font-mono text-xs">
                      {m.variant}
                    </td>
                    <td className="text-cream-100 px-4 py-3 text-right">
                      {m.impressions}
                    </td>
                    <td className="text-cream-100 px-4 py-3 text-right">
                      {m.accepts}
                    </td>
                    <td className="text-cream-100 px-4 py-3 text-right">
                      {m.declines}
                    </td>
                    <td className="text-cream-100 px-4 py-3 text-right">
                      {m.checkouts_started}
                    </td>
                    <td className="text-cream-100 px-4 py-3 text-right">
                      {m.conversions}
                    </td>
                    <td className="text-cream-100 px-4 py-3 text-right">
                      {m.impressions > 0
                        ? `${((m.conversions / m.impressions) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="text-cream-100 px-4 py-3 text-right">
                      {formatPrice(m.revenue_cents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Variant weights */}
      <section className="mt-10">
        <h2 className="text-cream-50 text-xl font-semibold">Variant weights</h2>
        <p className="text-text-secondary mt-1 text-sm">
          How new assignments split across ladder variants. Set a weight to 0
          to stop assigning a variant without deleting its steps.
        </p>
        <div className="border-cream-100/10 bg-charcoal-850 mt-4 rounded-2xl border p-5">
          <VariantWeightsEditor
            campaignId={campaign.id}
            weights={campaign.variant_weights}
            action={setCampaignVariantWeights}
          />
        </div>
      </section>

      {/* Frequency caps */}
      <section className="mt-10">
        <h2 className="text-cream-50 text-xl font-semibold">Frequency caps</h2>
        <p className="text-text-secondary mt-1 text-sm">
          Master limits that keep offers from feeling like spam.
        </p>
        <div className="border-cream-100/10 bg-charcoal-850 mt-4 rounded-2xl border p-5">
          <FrequencyEditor
            campaignId={campaign.id}
            frequency={campaign.frequency}
            action={setCampaignFrequency}
          />
        </div>
      </section>

      {/* Ladder steps per variant */}
      <section className="mt-10">
        <h2 className="text-cream-50 text-xl font-semibold">Ladder steps</h2>
        <p className="text-text-secondary mt-1 text-sm">
          Ordered steps each variant walks through inside the takeover.
          Payloads carry copy, discount %, and deadline display.
        </p>
        {[...byVariant.entries()].map(([variant, variantSteps]) => (
          <div key={variant} className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-cream-100 font-mono text-sm">{variant}</h3>
              <AddStepForm
                campaignId={campaign.id}
                variant={variant}
                action={addStep}
              />
            </div>
            <div className="mt-3 space-y-3">
              {variantSteps.map((step) => (
                <div
                  key={step.id}
                  className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="bg-charcoal-700 text-cream-100 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold">
                        {step.position}
                      </span>
                      <span className="text-cream-50 text-sm font-semibold capitalize">
                        {step.kind.replace("_", " ")}
                      </span>
                    </div>
                    <DeleteStepButton stepId={step.id} action={deleteStep} />
                  </div>
                  <StepPayloadEditor
                    stepId={step.id}
                    initialPayload={step.payload}
                    action={setStepPayload}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
