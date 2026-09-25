import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { ANON_SESSION_COOKIE } from "@/lib/teaser/anon-session";
import { getUserTier, getAvailableBalance } from "@/lib/billing/entitlements";

export type OfferStepKind =
  | "weekly_pair"
  | "discount"
  | "plans"
  | "referral"
  | "topup"
  | "exit";

export interface OfferStep {
  position: number;
  kind: OfferStepKind;
  payload: Record<string, unknown>;
}

export interface OfferAssignment {
  campaignId: string;
  campaignSlug: string;
  variant: string;
  steps: OfferStep[];
}

/** Events a client may write — `converted`/`refunded` come from webhooks only. */
export const CLIENT_EVENTS = [
  "impression",
  "step_view",
  "accept",
  "decline",
  "dismiss",
  "opt_out",
  "checkout_started",
] as const;
export type ClientOfferEvent = (typeof CLIENT_EVENTS)[number];

interface FrequencyCaps {
  takeoverPerDay: number;
  takeoverLifetime: number;
  fullDeclineCooldownHours: number;
}

const DEFAULT_CAPS: FrequencyCaps = {
  takeoverPerDay: 1,
  takeoverLifetime: 3,
  fullDeclineCooldownHours: 72,
};

/** Pure: weighted variant pick. Weights are integers summing ≈100. */
export function pickVariant(
  weights: Record<string, number>,
  rand: () => number
): string {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  if (entries.length === 0) return "A_default";
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = rand() * total;
  for (const [variant, w] of entries) {
    roll -= w;
    if (roll < 0) return variant;
  }
  return entries[entries.length - 1]![0];
}

async function loadSteps(
  campaignId: string,
  variant: string
): Promise<OfferStep[]> {
  const service = createServiceClient();
  const { data } = await service
    .from("promo_steps")
    .select("position, kind, payload")
    .eq("campaign_id", campaignId)
    .eq("variant", variant)
    .order("position", { ascending: true });
  return (data ?? []).map((s) => ({
    position: Number(s.position),
    kind: s.kind as OfferStepKind,
    payload: (s.payload ?? {}) as Record<string, unknown>,
  }));
}

/**
 * Write-once bucketing (08 §4): returns the subject's sticky
 * campaign+variant, assigning on first touch. The unique index on
 * (subject, campaign) makes concurrent assignment race-safe — a loser of
 * the insert race reads back the winner's variant.
 */
export async function getOrAssignCampaignForUser(
  userId: string
): Promise<OfferAssignment | null> {
  const service = createServiceClient();

  const { data: existing } = await service
    .from("promo_assignments")
    .select("campaign_id, variant, promo_campaigns!inner(slug, status)")
    .eq("user_id", userId)
    .eq("promo_campaigns.status", "live")
    .maybeSingle();

  if (existing) {
    const campaign = existing.promo_campaigns as unknown as { slug: string };
    return {
      campaignId: existing.campaign_id as string,
      campaignSlug: campaign.slug,
      variant: existing.variant as string,
      steps: await loadSteps(existing.campaign_id as string, existing.variant as string),
    };
  }

  // First touch — find a live campaign whose audience includes free users.
  const { data: campaign } = await service
    .from("promo_campaigns")
    .select("id, slug, variant_weights")
    .eq("status", "live")
    .overlaps("audience", ["free", "new_signup"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!campaign) return null;

  const weights = (campaign.variant_weights ?? {}) as Record<string, number>;
  const variant = pickVariant(weights, Math.random);

  const { error: insertError } = await service
    .from("promo_assignments")
    .insert({
      user_id: userId,
      campaign_id: campaign.id,
      variant,
    });

  if (insertError) {
    // Lost the assignment race — read back the winner's bucket.
    const { data: winner } = await service
      .from("promo_assignments")
      .select("variant")
      .eq("user_id", userId)
      .eq("campaign_id", campaign.id)
      .maybeSingle();
    if (!winner) {
      console.error("[getOrAssignCampaign] insert failed", insertError.message);
      return null;
    }
    return {
      campaignId: campaign.id as string,
      campaignSlug: campaign.slug as string,
      variant: winner.variant as string,
      steps: await loadSteps(campaign.id as string, winner.variant as string),
    };
  }

  return {
    campaignId: campaign.id as string,
    campaignSlug: campaign.slug as string,
    variant,
    steps: await loadSteps(campaign.id as string, variant),
  };
}

function capsFromFrequency(frequency: unknown): FrequencyCaps {
  const f = (frequency ?? {}) as Record<string, unknown>;
  return {
    takeoverPerDay: Number(f.takeover_per_day) || DEFAULT_CAPS.takeoverPerDay,
    takeoverLifetime:
      Number(f.takeover_lifetime) || DEFAULT_CAPS.takeoverLifetime,
    fullDeclineCooldownHours:
      Number(f.full_decline_cooldown_hours) ||
      DEFAULT_CAPS.fullDeclineCooldownHours,
  };
}

export interface TakeoverState {
  show: boolean;
  reason: string;
  assignment: OfferAssignment | null;
  /** Campaign-level caps for client display/debug only. */
}

/**
 * Server-side gate for the special-offer takeover (08 §2
 * `signup_completed_no_credits` / `scheduled_takeover`). Eligibility: signed
 * in, free tier, zero balance, not opted out, under frequency caps, live
 * campaign assigned.
 */
export async function getTakeoverStateForUser(): Promise<TakeoverState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { show: false, reason: "anonymous", assignment: null };

  const service = createServiceClient();
  const [{ data: profile }, tier, balance] = await Promise.all([
    service
      .from("profiles")
      .select("offers_opted_out")
      .eq("id", user.id)
      .maybeSingle(),
    getUserTier(user.id),
    getAvailableBalance(user.id),
  ]);

  if (profile?.offers_opted_out) {
    return { show: false, reason: "opted_out", assignment: null };
  }
  if (balance > 0) {
    return { show: false, reason: "has_credits", assignment: null };
  }
  if (tier !== "free") {
    // Never interrupt paid users with the promotional ladder — exhausted
    // paid users get functional surfaces (top-up), active ones need nothing.
    return { show: false, reason: "not_free_tier", assignment: null };
  }

  const assignment = await getOrAssignCampaignForUser(user.id);
  if (!assignment || assignment.steps.length === 0) {
    return { show: false, reason: "no_campaign", assignment: null };
  }

  const { data: campaign } = await service
    .from("promo_campaigns")
    .select("frequency")
    .eq("id", assignment.campaignId)
    .single();
  const caps = capsFromFrequency(campaign?.frequency);

  // Frequency caps evaluated against the event stream (09 §4.2 — checked at
  // eligibility time, which for v1 equals render time).
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await service
    .from("promo_events")
    .select("event, created_at")
    .eq("user_id", user.id)
    .in("event", ["impression", "dismiss"])
    .order("created_at", { ascending: false })
    .limit(50);

  const impressions = (events ?? []).filter((e) => e.event === "impression");
  const todayCount = impressions.filter((e) => (e.created_at as string) >= dayAgo).length;
  if (todayCount >= caps.takeoverPerDay) {
    return { show: false, reason: "daily_cap", assignment };
  }
  if (impressions.length >= caps.takeoverLifetime) {
    return { show: false, reason: "lifetime_cap", assignment };
  }

  const lastDismiss = (events ?? []).find((e) => e.event === "dismiss");
  if (lastDismiss) {
    const cooldownEnds =
      new Date(lastDismiss.created_at as string).getTime() +
      caps.fullDeclineCooldownHours * 60 * 60 * 1000;
    if (Date.now() < cooldownEnds) {
      return { show: false, reason: "cooldown", assignment };
    }
  }

  return { show: true, reason: "eligible", assignment };
}

/**
 * Anon → user claim for promo rows (08 §5). Assignments rewrite the subject
 * key; if the user already holds an assignment for the same campaign the
 * anon row is dropped — the user's bucket wins.
 */
export async function claimAnonPromoRows(
  anonId: string,
  userId: string
): Promise<void> {
  const service = createServiceClient();

  const { data: anonAssignments } = await service
    .from("promo_assignments")
    .select("campaign_id")
    .eq("anon_id", anonId);

  for (const row of anonAssignments ?? []) {
    const { data: userRow } = await service
      .from("promo_assignments")
      .select("assigned_at")
      .eq("user_id", userId)
      .eq("campaign_id", row.campaign_id)
      .maybeSingle();

    if (userRow) {
      await service
        .from("promo_assignments")
        .delete()
        .eq("anon_id", anonId)
        .eq("campaign_id", row.campaign_id);
    } else {
      await service
        .from("promo_assignments")
        .update({ user_id: userId, anon_id: null })
        .eq("anon_id", anonId)
        .eq("campaign_id", row.campaign_id);
    }
  }

  await service
    .from("promo_events")
    .update({ user_id: userId, anon_id: null })
    .eq("anon_id", anonId)
    .is("user_id", null);
}

export async function readAnonId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ANON_SESSION_COOKIE)?.value ?? null;
}
