import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyGrowSurfSignature } from "@/lib/growsurf/verify";
import { growSurfCampaignId } from "@/lib/growsurf/client";
import { recordGrowSurfParticipant } from "@/lib/growsurf/sync";
import { grantRewardRow } from "@/lib/referrals/rewards";

/**
 * GrowSurf webhook receiver (docs/growsurf/Webhooks.md).
 *
 * - Signature: `GrowSurf-Signature: ts=<ms>,v=<hmac>` verified over the
 *   RAW body — JSON re-serialization would break the HMAC.
 * - PARTICIPANT_REACHED_A_GOAL is the only event that moves money: when a
 *   referrer reward is approved we grant the pending_hold credit row. The
 *   ParticipantReward id (`data.reward.id`) is the idempotency key —
 *   GrowSurf retries deliveries for days.
 * - NEW_PARTICIPANT_ADDED backfills growsurf_id for participants added
 *   outside our REST path (SDK form, dashboard import).
 * - Everything else is acknowledged and ignored.
 *
 * Returns 500 on infra errors so GrowSurf retries; logical mismatches
 * (wrong campaign, unapproved, non-referrer reward, unresolvable user)
 * return 200 — they will never succeed on retry.
 */

interface GsParticipant {
  id?: string;
  email?: string;
  metadata?: Record<string, unknown>;
  fraudRiskLevel?: string;
  referrer?: GsParticipant;
  referee?: GsParticipant;
}

interface ReachedGoalData {
  participant?: GsParticipant;
  reward?: {
    id?: string;
    rewardId?: string;
    isReferrer?: boolean;
    approved?: boolean;
    referrerId?: string;
    referredId?: string;
    metadata?: Record<string, unknown>;
  };
  campaign?: { id?: string };
}

/** Metadata keys arrive camelCased (Metadata.md): accept both spellings. */
function metaUserId(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) return null;
  const v = metadata.spxUserId ?? metadata.spx_user_id;
  return typeof v === "string" && v ? v : null;
}

async function resolveUserId(p: GsParticipant | undefined): Promise<string | null> {
  if (!p) return null;
  const service = createServiceClient();

  if (p.id) {
    const { data } = await service
      .from("referral_participants")
      .select("user_id")
      .eq("growsurf_id", p.id)
      .maybeSingle();
    if (data?.user_id) return data.user_id as string;
  }

  const meta = metaUserId(p.metadata);
  if (meta) {
    const { data } = await service
      .from("profiles")
      .select("id")
      .eq("id", meta)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  if (p.email) {
    const { data } = await service
      .from("profiles")
      .select("id")
      .eq("email", p.email)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }
  return null;
}

async function handleReachedGoal(data: ReachedGoalData): Promise<void> {
  const campaignId = growSurfCampaignId();
  if (!campaignId || data.campaign?.id !== campaignId) {
    console.error(
      `[growsurf webhook] reward event for unknown campaign ${data.campaign?.id}`
    );
    return;
  }

  const reward = data.reward;
  const participant = data.participant;

  // Referee-side rewards are handled locally at signup (free unlock).
  if (!reward?.isReferrer) return;

  // Manual approval configured → the first delivery arrives unapproved;
  // wait for the approved one (Webhooks.md §PARTICIPANT_REACHED_A_GOAL).
  if (reward.approved !== true) return;

  const prewId = reward.id;
  if (!prewId) {
    console.error("[growsurf webhook] goal event missing reward.id");
    return;
  }

  const service = createServiceClient();

  // Delivery-level dedup: this ParticipantReward was already recorded.
  const { data: seen } = await service
    .from("referral_rewards")
    .select("id")
    .eq("growsurf_prew_id", prewId)
    .maybeSingle();
  if (seen) return;

  const referrerUserId = await resolveUserId(participant);
  if (!referrerUserId) {
    console.error(
      `[growsurf webhook] reward ${prewId}: no local user for participant ${participant?.id} (${participant?.email})`
    );
    return;
  }

  const refereeUserId = await resolveUserId(participant?.referee);

  // The held reward to settle: precise referee match preferred; otherwise
  // the referrer's single pending_hold row (one outstanding hold per
  // referee is enforced by the unique index, but a referrer can hold
  // several across different referees — ambiguity means manual review).
  const rewardQuery = service
    .from("referral_rewards")
    .select("id, referee_user_id, referrer_user_id, credits, status")
    .eq("referrer_user_id", referrerUserId)
    .eq("kind", "referrer_payment_share")
    .order("created_at", { ascending: false });

  const { data: candidates } = refereeUserId
    ? await rewardQuery.eq("referee_user_id", refereeUserId).limit(1)
    : await rewardQuery.eq("status", "pending_hold").limit(2);

  const held = (candidates ?? [])[0];
  if (!held) {
    console.error(
      `[growsurf webhook] reward ${prewId}: no pending reward for referrer ${referrerUserId}`
    );
    return;
  }

  if (held.status !== "pending_hold") {
    // Already settled locally (immediate-grant path) — attach the
    // ParticipantReward id for reconciliation and call it done.
    await service
      .from("referral_rewards")
      .update({ growsurf_prew_id: prewId })
      .eq("id", held.id)
      .is("growsurf_prew_id", null);
    return;
  }

  // Fraud gate: GrowSurf's fraud assessment rides the event; HIGH-risk
  // referrers get the reward rejected rather than granted (03 §6).
  if (participant?.fraudRiskLevel === "HIGH") {
    await service
      .from("referral_rewards")
      .update({
        status: "rejected",
        growsurf_prew_id: prewId,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", held.id)
      .eq("status", "pending_hold");
    console.error(
      `[growsurf webhook] reward ${prewId} rejected: fraudRiskLevel HIGH`
    );
    return;
  }

  const granted = await grantRewardRow({
    rewardId: held.id as string,
    referrerId: referrerUserId,
    refereeUserId: held.referee_user_id as string,
    credits: Number(held.credits ?? 0),
    growsurfPrewId: prewId,
    metadata: {
      growsurf_reward_id: reward.rewardId ?? null,
      via: "growsurf_webhook",
    },
  });

  if (!granted) {
    console.error(
      `[growsurf webhook] reward ${prewId}: grant failed for row ${held.id}`
    );
  }
}

async function handleNewParticipant(data: {
  id?: string;
  email?: string;
  referrer?: { id?: string; email?: string };
}): Promise<void> {
  if (!data.id || !data.email) return;
  await recordGrowSurfParticipant({
    growSurfId: data.id,
    email: data.email,
    referrerGrowSurfId: data.referrer?.id,
    referrerEmail: data.referrer?.email,
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.GROWSURF_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[growsurf webhook] missing GROWSURF_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("growsurf-signature");

  if (!verifyGrowSurfSignature({ rawBody, header: signature, secret })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (event.event) {
      case "PARTICIPANT_REACHED_A_GOAL":
        await handleReachedGoal(event.data as ReachedGoalData);
        break;
      case "NEW_PARTICIPANT_ADDED":
        await handleNewParticipant(
          event.data as Parameters<typeof handleNewParticipant>[0]
        );
        break;
      default:
        console.log("[growsurf webhook] ignored event:", event.event);
    }
  } catch (err) {
    console.error(
      "[growsurf webhook] handler error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
