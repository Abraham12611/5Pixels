"use server";

import { requireAdmin } from "@/lib/db/admin";
import { createServiceClient } from "@/lib/supabase/service";

export interface PromoStepRow {
  id: string;
  campaign_id: string;
  variant: string;
  position: number;
  kind: string;
  payload: Record<string, unknown>;
}

export interface PromoCampaignRow {
  id: string;
  slug: string;
  name: string;
  audience: string[];
  surfaces: string[];
  status: "draft" | "scheduled" | "live" | "paused" | "archived";
  starts_at: string | null;
  ends_at: string | null;
  frequency: Record<string, unknown>;
  variant_weights: Record<string, number>;
  created_at: string;
}

export interface VariantMetrics {
  variant: string;
  impressions: number;
  step_views: number;
  accepts: number;
  declines: number;
  dismissals: number;
  checkouts_started: number;
  conversions: number;
  refunds: number;
  revenue_cents: number;
}

export interface CampaignSummary extends PromoCampaignRow {
  metrics: Omit<VariantMetrics, "variant">;
}

function emptyMetrics(): Omit<VariantMetrics, "variant"> {
  return {
    impressions: 0,
    step_views: 0,
    accepts: 0,
    declines: 0,
    dismissals: 0,
    checkouts_started: 0,
    conversions: 0,
    refunds: 0,
    revenue_cents: 0,
  };
}

/** All campaigns with cross-variant funnel totals, newest first. */
export async function listCampaignsWithMetrics(): Promise<CampaignSummary[]> {
  await requireAdmin();
  const service = createServiceClient();

  const [{ data: campaigns, error: cErr }, { data: metrics, error: mErr }] =
    await Promise.all([
      service
        .from("promo_campaigns")
        .select("*")
        .order("created_at", { ascending: false }),
      service.from("promo_funnel_metrics").select("*"),
    ]);
  if (cErr) throw new Error(cErr.message);
  if (mErr) throw new Error(mErr.message);

  const totals = new Map<string, Omit<VariantMetrics, "variant">>();
  for (const row of (metrics ?? []) as (VariantMetrics & {
    campaign_id: string;
  })[]) {
    const t = totals.get(row.campaign_id) ?? emptyMetrics();
    t.impressions += row.impressions;
    t.step_views += row.step_views;
    t.accepts += row.accepts;
    t.declines += row.declines;
    t.dismissals += row.dismissals;
    t.checkouts_started += row.checkouts_started;
    t.conversions += row.conversions;
    t.refunds += row.refunds;
    t.revenue_cents += row.revenue_cents;
    totals.set(row.campaign_id, t);
  }

  return ((campaigns ?? []) as PromoCampaignRow[]).map((c) => ({
    ...c,
    metrics: totals.get(c.id) ?? emptyMetrics(),
  }));
}

export interface CampaignDetail {
  campaign: PromoCampaignRow;
  steps: PromoStepRow[];
  metrics: VariantMetrics[];
  assignmentCount: number;
}

export async function getCampaignDetail(
  campaignId: string
): Promise<CampaignDetail | null> {
  await requireAdmin();
  const service = createServiceClient();

  const [
    { data: campaign, error: cErr },
    { data: steps, error: sErr },
    { data: metrics, error: mErr },
    { count, error: aErr },
  ] = await Promise.all([
    service.from("promo_campaigns").select("*").eq("id", campaignId).maybeSingle(),
    service
      .from("promo_steps")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("variant")
      .order("position"),
    service
      .from("promo_funnel_metrics")
      .select("*")
      .eq("campaign_id", campaignId),
    service
      .from("promo_assignments")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId),
  ]);
  if (cErr) throw new Error(cErr.message);
  if (sErr) throw new Error(sErr.message);
  if (mErr) throw new Error(mErr.message);
  if (aErr) throw new Error(aErr.message);
  if (!campaign) return null;

  return {
    campaign: campaign as PromoCampaignRow,
    steps: (steps ?? []) as PromoStepRow[],
    metrics: (metrics ?? []) as VariantMetrics[],
    assignmentCount: count ?? 0,
  };
}

const CAMPAIGN_STATUSES = ["draft", "scheduled", "live", "paused", "archived"];

/** Pause/resume/archive — the "can I switch it off" control (09 §1). */
export async function setCampaignStatus(
  campaignId: string,
  status: string
): Promise<void> {
  await requireAdmin();
  if (!CAMPAIGN_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  const service = createServiceClient();
  const { error } = await service
    .from("promo_campaigns")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", campaignId);
  if (error) throw new Error(error.message);
}

/** Edit the master frequency caps (`frequency` jsonb on the campaign). */
export async function setCampaignFrequency(
  campaignId: string,
  frequency: Record<string, unknown>
): Promise<void> {
  await requireAdmin();
  const service = createServiceClient();
  const { error } = await service
    .from("promo_campaigns")
    .update({ frequency, updated_at: new Date().toISOString() })
    .eq("id", campaignId);
  if (error) throw new Error(error.message);
}

/** Edit the per-campaign variant weights (`variant_weights` jsonb). */
export async function setCampaignVariantWeights(
  campaignId: string,
  weights: Record<string, number>
): Promise<void> {
  await requireAdmin();
  for (const [variant, weight] of Object.entries(weights)) {
    if (!Number.isFinite(weight) || weight < 0) {
      throw new Error(`Weight for ${variant} must be a non-negative number`);
    }
  }
  const service = createServiceClient();
  const { error } = await service
    .from("promo_campaigns")
    .update({ variant_weights: weights, updated_at: new Date().toISOString() })
    .eq("id", campaignId);
  if (error) throw new Error(error.message);
}

/** Edit a step's copy/discount/deadline payload. Validated as JSON upstream. */
export async function setStepPayload(
  stepId: string,
  payload: Record<string, unknown>
): Promise<void> {
  await requireAdmin();
  const service = createServiceClient();
  const { error } = await service
    .from("promo_steps")
    .update({ payload })
    .eq("id", stepId);
  if (error) throw new Error(error.message);
}

/** Add a new step to a variant ladder at the next free position. */
export async function addStep(
  campaignId: string,
  variant: string,
  kind: PromoStepRow["kind"],
  payload: Record<string, unknown> = {}
): Promise<void> {
  await requireAdmin();
  const service = createServiceClient();
  const { data: existing, error: eErr } = await service
    .from("promo_steps")
    .select("position")
    .eq("campaign_id", campaignId)
    .eq("variant", variant);
  if (eErr) throw new Error(eErr.message);
  const nextPosition =
    (existing ?? []).reduce((m, s) => Math.max(m, s.position), -1) + 1;
  const { error } = await service.from("promo_steps").insert({
    campaign_id: campaignId,
    variant,
    position: nextPosition,
    kind,
    payload,
  });
  if (error) throw new Error(error.message);
}

export async function deleteStep(stepId: string): Promise<void> {
  await requireAdmin();
  const service = createServiceClient();
  const { error } = await service
    .from("promo_steps")
    .delete()
    .eq("id", stepId);
  if (error) throw new Error(error.message);
}
