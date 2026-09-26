import { createServiceClient } from "@/lib/supabase/service";
import {
  addGrowSurfParticipant,
  cancelGrowSurfDelayedReferral,
  growSurfReferralHoldDays,
  isGrowSurfConfigured,
  triggerGrowSurfReferral,
} from "./client";
import {
  grantReferrerPaymentShare,
  grantRewardRow,
  insertPaymentShareReward,
  paymentShareCredits,
} from "@/lib/referrals/rewards";

/**
 * GrowSurf orchestration (03 §3–§5). The local referral tables stay the
 * system of record; GrowSurf supplies attribution confirmation, fraud
 * signals, and the reward state machine that emits
 * PARTICIPANT_REACHED_A_GOAL.
 *
 * Everything here is fire-and-forget safe: callers wrap in try/catch and
 * failures degrade to the first-party behavior (immediate local grant).
 * When GROWSURF_* env vars are absent the client no-ops and the local
 * loop behaves exactly as if GrowSurf didn't exist.
 */

/**
 * Pushes a signed-up user into the GrowSurf program so they can refer and
 * so a referred signup records `referredBy`. Idempotent: users with a
 * stored growsurf_id are skipped; a referral_participants row is created
 * for users who don't have one yet (every user is a potential referrer).
 *
 * Called from the auth callback — never let a failure block sign-in.
 */
export async function syncParticipantToGrowSurf(userId: string): Promise<void> {
  if (!isGrowSurfConfigured()) return;
  const service = createServiceClient();

  const [{ data: profile }, { data: participant }] = await Promise.all([
    service
      .from("profiles")
      .select("id, email, display_name")
      .eq("id", userId)
      .maybeSingle(),
    service
      .from("referral_participants")
      .select("user_id, growsurf_id, referred_by, growsurf_synced_at")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const email = profile?.email as string | undefined;
  if (!email) return;
  if (participant?.growsurf_id && participant?.growsurf_synced_at) return;

  // Resolve referredBy: prefer the referrer's GrowSurf id; fall back to
  // their email (both are accepted by the API).
  let referredBy: string | undefined;
  const referrerId = participant?.referred_by as string | undefined;
  if (referrerId) {
    const { data: referrerParticipant } = await service
      .from("referral_participants")
      .select("growsurf_id")
      .eq("user_id", referrerId)
      .maybeSingle();
    if (referrerParticipant?.growsurf_id) {
      referredBy = referrerParticipant.growsurf_id as string;
    } else {
      const { data: referrerProfile } = await service
        .from("profiles")
        .select("email")
        .eq("id", referrerId)
        .maybeSingle();
      referredBy = (referrerProfile?.email as string | undefined) ?? undefined;
    }
  }

  const displayName = (profile?.display_name as string | undefined) ?? "";
  const [firstName, ...rest] = displayName.split(/\s+/).filter(Boolean);

  const created = await addGrowSurfParticipant({
    email,
    firstName: firstName || undefined,
    lastName: rest.length ? rest.join(" ") : undefined,
    referredBy,
    metadata: { spx_user_id: userId },
  });
  if (!created?.id) return;

  await service
    .from("referral_participants")
    .upsert(
      {
        user_id: userId,
        growsurf_id: created.id,
        growsurf_synced_at: new Date().toISOString(),
        referred_by: referrerId ?? null,
      },
      { onConflict: "user_id" }
    );
}

/**
 * Referrer reward entry point called from Polar fulfillment (03 §1).
 *
 * Paths:
 * - GrowSurf unconfigured → immediate local grant (standalone loop).
 * - Configured + hold days > 0 → claim the reward as pending_hold and
 *   trigger GrowSurf's delayed referral; PARTICIPANT_REACHED_A_GOAL grants
 *   when the hold elapses. A refund inside the window cancels the trigger
 *   so the bonus never lands.
 * - Configured + no hold → trigger for tracking, grant immediately.
 *
 * If the delayed trigger fails after the slot was claimed, we grant
 * locally — silently dropping a legit reward is worse than over-rewarding.
 */
export async function awardOrHoldReferrerShare(input: {
  buyerUserId: string;
  plan: { id: string; credits_grant: number };
  orderId: string;
}): Promise<void> {
  const { buyerUserId, plan, orderId } = input;

  if (!isGrowSurfConfigured()) {
    await grantReferrerPaymentShare(buyerUserId, plan, orderId);
    return;
  }

  const holdDays = growSurfReferralHoldDays();
  if (holdDays === 0) {
    // Immediate grant; GrowSurf trigger records the referral conversion
    // for the dashboard/fraud trail without gating the reward.
    await grantReferrerPaymentShare(buyerUserId, plan, orderId);
    void triggerForBuyer(buyerUserId, 0);
    return;
  }

  const service = createServiceClient();
  const { data: participant } = await service
    .from("referral_participants")
    .select("referred_by, growsurf_id")
    .eq("user_id", buyerUserId)
    .not("referred_by", "is", null)
    .maybeSingle();

  const referrerId = participant?.referred_by as string | undefined;
  const credits = paymentShareCredits(plan);
  if (!referrerId || credits <= 0) return;

  const holdUntil = new Date(
    Date.now() + holdDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const reward = await insertPaymentShareReward({
    buyerUserId,
    referrerId,
    credits,
    status: "pending_hold",
    holdUntil,
  });
  if (!reward) return; // already claimed for this referee

  const buyerKey = (participant?.growsurf_id as string | undefined) ?? null;
  let triggered = false;
  if (buyerKey) {
    try {
      const result = await triggerGrowSurfReferral(buyerKey, holdDays);
      triggered = result?.success === true;
    } catch (err) {
      console.error(
        "[growsurf] delayed referral trigger failed:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  if (!triggered) {
    // Buyer wasn't synced to GrowSurf yet, or the API failed — fall back
    // to the immediate local grant so the referrer isn't silently shorted.
    const granted = await grantRewardRow({
      rewardId: reward.id,
      referrerId,
      refereeUserId: buyerUserId,
      credits,
      metadata: {
        plan_id: plan.id,
        order_id: orderId,
        fallback: "growsurf_trigger_failed",
      },
    });
    if (!granted) {
      await service
        .from("referral_rewards")
        .delete()
        .eq("id", reward.id)
        .eq("status", "pending_hold");
    }
  }
}

async function triggerForBuyer(
  buyerUserId: string,
  delayInDays: number
): Promise<void> {
  const service = createServiceClient();
  const { data: participant } = await service
    .from("referral_participants")
    .select("growsurf_id")
    .eq("user_id", buyerUserId)
    .maybeSingle();
  let key = participant?.growsurf_id as string | undefined;
  if (!key) {
    const { data: profile } = await service
      .from("profiles")
      .select("email")
      .eq("id", buyerUserId)
      .maybeSingle();
    key = profile?.email as string | undefined;
  }
  if (!key) return;
  try {
    await triggerGrowSurfReferral(key, delayInDays);
  } catch (err) {
    console.error(
      "[growsurf] referral trigger failed:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * Refund path (03 §4): called from handlePolarRefund for the refunded
 * buyer. A pending_hold reward means the GrowSurf trigger is still inside
 * its delay window — cancel it and mark the reward cancelled, so the
 * referrer's bonus never lands. If the reward already granted (window
 * elapsed or local fallback), claw the referrer's credits back with the
 * same capped-reversal semantics used for the buyer.
 */
export async function reverseReferrerShareForRefund(input: {
  buyerUserId: string;
  orderId: string;
  refundId: string;
}): Promise<void> {
  const service = createServiceClient();

  const { data: reward } = await service
    .from("referral_rewards")
    .select("id, referrer_user_id, referee_user_id, credits, status")
    .eq("referee_user_id", input.buyerUserId)
    .eq("kind", "referrer_payment_share")
    .maybeSingle();
  if (!reward) return;

  if (reward.status === "pending_hold") {
    // Cancel the delayed GrowSurf trigger before it lands.
    const { data: participant } = await service
      .from("referral_participants")
      .select("growsurf_id")
      .eq("user_id", input.buyerUserId)
      .maybeSingle();
    const key = participant?.growsurf_id as string | undefined;
    if (key && isGrowSurfConfigured()) {
      try {
        await cancelGrowSurfDelayedReferral(key);
      } catch (err) {
        console.error(
          "[growsurf] delayed referral cancel failed:",
          err instanceof Error ? err.message : String(err)
        );
        // Still mark cancelled — if the trigger lands anyway the webhook
        // dedup on growsurf_prew_id finds a cancelled row and skips it.
      }
    }
    await service
      .from("referral_rewards")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", reward.id)
      .eq("status", "pending_hold");
    return;
  }

  if (reward.status !== "granted") return;

  // Already granted — claw back what remains recoverable (03 §4). Same
  // rule as the buyer reversal: cap at available balance, record the
  // unrecovered remainder as loss in metadata.
  const referrerId = reward.referrer_user_id as string;
  const credits = Number(reward.credits ?? 0);
  if (credits <= 0) return;

  const idempotencyKey = `referral_clawback:${reward.id}`;
  const { data: existing } = await service
    .from("credit_ledger")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing) return;

  const { data: ledgerRows } = await service
    .from("credit_ledger")
    .select("amount")
    .eq("user_id", referrerId)
    .neq("entry_type", "reservation");
  const available = (ledgerRows ?? []).reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );
  const reversal = Math.min(credits, Math.max(0, available));

  await service.from("credit_ledger").insert({
    user_id: referrerId,
    entry_type: "debit",
    amount: -reversal,
    currency_unit: "credits",
    idempotency_key: idempotencyKey,
    metadata: {
      reason: "referral_clawback",
      referee_user_id: input.buyerUserId,
      order_id: input.orderId,
      refund_id: input.refundId,
      reward_id: reward.id,
      granted_credits: credits,
      reversed_credits: reversal,
      unrecovered_credits: credits - reversal,
    },
  });

  await service
    .from("referral_rewards")
    .update({ status: "clawed_back" })
    .eq("id", reward.id)
    .eq("status", "granted");
}

/**
 * Backfill: when a participant is added through a channel we didn't
 * initiate (SDK form, dashboard import), NEW_PARTICIPANT_ADDED lets us
 * attach their GrowSurf id to the local referral_participants row.
 */
export async function recordGrowSurfParticipant(input: {
  growSurfId: string;
  email: string;
  referrerGrowSurfId?: string;
  referrerEmail?: string;
}): Promise<void> {
  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();
  if (!profile) return; // participant exists in GrowSurf but not locally

  let referrerUserId: string | undefined;
  if (input.referrerGrowSurfId) {
    const { data: ref } = await service
      .from("referral_participants")
      .select("user_id")
      .eq("growsurf_id", input.referrerGrowSurfId)
      .maybeSingle();
    referrerUserId = ref?.user_id as string | undefined;
  }
  if (!referrerUserId && input.referrerEmail) {
    const { data: refProfile } = await service
      .from("profiles")
      .select("id")
      .eq("email", input.referrerEmail)
      .maybeSingle();
    referrerUserId = refProfile?.id as string | undefined;
  }

  const { data: existing } = await service
    .from("referral_participants")
    .select("user_id, referred_by")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing) {
    await service
      .from("referral_participants")
      .update({
        growsurf_id: input.growSurfId,
        growsurf_synced_at: new Date().toISOString(),
        ...(existing.referred_by || !referrerUserId
          ? {}
          : { referred_by: referrerUserId }),
      })
      .eq("user_id", profile.id);
  } else {
    await service.from("referral_participants").insert({
      user_id: profile.id,
      growsurf_id: input.growSurfId,
      growsurf_synced_at: new Date().toISOString(),
      referred_by: referrerUserId ?? null,
    });
  }

  // First-party referee unlock parity: a GrowSurf-attributed referral
  // carries the same free-transformation promise as a ?ref= signup.
  if (referrerUserId && referrerUserId !== profile.id) {
    await service
      .from("profiles")
      .update({ free_unlock_source: "referral" })
      .eq("id", profile.id)
      .is("free_unlock_source", null);
  }
}

