"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

/**
 * Referral rewards (03 §4): grants flow through the same credit_ledger
 * idempotency pattern as billing fulfillment — webhooks and retries can
 * never double-grant because source_ref and the partial unique indexes on
 * (referee_user_id, kind) are enforced in Postgres.
 */

const REFERRER_SHARE = 0.3;

interface PlanCredits {
  id: string;
  credits_grant: number;
}

async function insertLedgerAllocation(input: {
  userId: string;
  credits: number;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
}): Promise<string | null> {
  const service = createServiceClient();
  const { data: existing } = await service
    .from("credit_ledger")
    .select("id")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data, error } = await service
    .from("credit_ledger")
    .insert({
      user_id: input.userId,
      entry_type: "allocation",
      amount: input.credits,
      currency_unit: "credits",
      idempotency_key: input.idempotencyKey,
      metadata: input.metadata,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.message?.includes("duplicate key")) {
      const { data: dup } = await service
        .from("credit_ledger")
        .select("id")
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle();
      return (dup?.id as string) ?? null;
    }
    throw new Error(error?.message ?? "Ledger insert failed");
  }
  return data.id as string;
}

/**
 * Referee reward (03 §1): a referred sign-up gets ONE free transformation
 * — granted as exactly the pending generation's credit cost immediately
 * before the normal charge path debits it. Bounded: the once-per-referee
 * index means no second grant, and clearing free_unlock_source consumes
 * eligibility even if the user abandons before generating.
 */
export async function grantRefereeUnlock(
  refereeUserId: string,
  creditCost: number
): Promise<boolean> {
  const service = createServiceClient();
  const sourceRef = `unlock:${refereeUserId}`;

  // Claim the reward slot first — the unique index makes this atomic.
  const { data: reward, error: rewardError } = await service
    .from("referral_rewards")
    .insert({
      source_ref: sourceRef,
      referee_user_id: refereeUserId,
      kind: "referee_unlock",
      credits: creditCost,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (rewardError || !reward) return false; // already granted

  const ledgerId = await insertLedgerAllocation({
    userId: refereeUserId,
    credits: creditCost,
    idempotencyKey: `referral:${sourceRef}`,
    metadata: { reason: "referral_referee_unlock" },
  });
  if (!ledgerId) {
    await service
      .from("referral_rewards")
      .delete()
      .eq("id", reward.id)
      .eq("status", "pending");
    return false;
  }

  await service
    .from("referral_rewards")
    .update({
      status: "granted",
      ledger_entry_id: ledgerId,
      granted_at: new Date().toISOString(),
    })
    .eq("id", reward.id);

  // Consume eligibility — one unlock ever.
  await service
    .from("profiles")
    .update({ free_unlock_source: null })
    .eq("id", refereeUserId)
    .eq("free_unlock_source", "referral");

  return true;
}

/**
 * Referrer reward (03 §1): when a referred user makes their FIRST payment,
 * the referrer gets 30% of that plan's monthly credit grant, complimentary.
 * Called from Polar fulfillment after the conversion is recorded; the
 * once-per-referee index + ledger idempotency make retries safe.
 */
export async function grantReferrerPaymentShare(
  buyerUserId: string,
  plan: PlanCredits,
  orderId: string
): Promise<void> {
  const service = createServiceClient();

  const { data: participant } = await service
    .from("referral_participants")
    .select("referred_by")
    .eq("user_id", buyerUserId)
    .not("referred_by", "is", null)
    .maybeSingle();
  const referrerId = participant?.referred_by as string | undefined;
  if (!referrerId) return;

  const credits = Math.floor(plan.credits_grant * REFERRER_SHARE);
  if (credits <= 0) return;

  const sourceRef = `payment_share:${buyerUserId}`;
  const { data: reward, error: rewardError } = await service
    .from("referral_rewards")
    .insert({
      source_ref: sourceRef,
      referrer_user_id: referrerId,
      referee_user_id: buyerUserId,
      kind: "referrer_payment_share",
      credits,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (rewardError || !reward) return; // already rewarded for this referee

  const ledgerId = await insertLedgerAllocation({
    userId: referrerId,
    credits,
    idempotencyKey: `referral:${sourceRef}`,
    metadata: {
      reason: "referral_payment_share",
      referee_user_id: buyerUserId,
      plan_id: plan.id,
      order_id: orderId,
      share: REFERRER_SHARE,
    },
  });
  if (!ledgerId) {
    await service
      .from("referral_rewards")
      .delete()
      .eq("id", reward.id)
      .eq("status", "pending");
    return;
  }

  await service
    .from("referral_rewards")
    .update({
      status: "granted",
      ledger_entry_id: ledgerId,
      granted_at: new Date().toISOString(),
    })
    .eq("id", reward.id);
}

export interface ReferralStats {
  referredCount: number;
  paidReferrals: number;
  creditsEarned: number;
}

/** Referrer-side stats for the /app/billing card. */
export async function getReferralStats(): Promise<ReferralStats | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const [{ count }, { data: rewards }] = await Promise.all([
    service
      .from("referral_participants")
      .select("*", { count: "exact", head: true })
      .eq("referred_by", user.id),
    service
      .from("referral_rewards")
      .select("kind, credits, status")
      .eq("referrer_user_id", user.id)
      .eq("kind", "referrer_payment_share"),
  ]);

  const granted = (rewards ?? []).filter((r) => r.status === "granted");
  return {
    referredCount: count ?? 0,
    paidReferrals: granted.length,
    creditsEarned: granted.reduce((s, r) => s + Number(r.credits ?? 0), 0),
  };
}
