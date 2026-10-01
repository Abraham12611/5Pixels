import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-only module — NOT "use server": nothing here is invoked as a
 * client-side action (callers are route handlers, server components, and
 * server libs), and the module mixes sync helpers with async functions.
 *
 * Referral rewards (03 §4): grants flow through the same credit_ledger
 * idempotency pattern as billing fulfillment — webhooks and retries can
 * never double-grant because source_ref and the partial unique indexes on
 * (referee_user_id, kind) are enforced in Postgres.
 */

const REFERRER_SHARE = 0.3;

interface PlanCredits {
  id: string;
  credits_grant: number;
  /** weekly_trial | monthly | annual | extra_credit — share excludes top-ups. */
  type?: string;
}

/** Only plan purchases count toward the referral cycle — never top-ups. */
const SHARE_PLAN_TYPES = new Set(["weekly_trial", "monthly", "annual"]);

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

/** Buyer → referrer lookup shared by the grant and hold paths. */
async function findReferrer(buyerUserId: string): Promise<string | null> {
  const service = createServiceClient();
  const { data: participant } = await service
    .from("referral_participants")
    .select("referred_by")
    .eq("user_id", buyerUserId)
    .not("referred_by", "is", null)
    .maybeSingle();
  return (participant?.referred_by as string | undefined) ?? null;
}

export function paymentShareCredits(plan: PlanCredits): number {
  return Math.floor(plan.credits_grant * REFERRER_SHARE);
}

/** Claims the once-per-referee payment-share slot. Null = already claimed. */
export async function insertPaymentShareReward(input: {
  buyerUserId: string;
  referrerId: string;
  credits: number;
  status: "pending" | "pending_hold";
  holdUntil?: string;
}): Promise<{ id: string } | null> {
  const service = createServiceClient();
  const { data: reward, error } = await service
    .from("referral_rewards")
    .insert({
      source_ref: `payment_share:${input.buyerUserId}`,
      referrer_user_id: input.referrerId,
      referee_user_id: input.buyerUserId,
      kind: "referrer_payment_share",
      credits: input.credits,
      status: input.status,
      hold_until: input.holdUntil ?? null,
    })
    .select("id")
    .maybeSingle();
  if (error || !reward) return null;
  return { id: reward.id as string };
}

/**
 * Grants the credits for a pending/pending_hold reward row and marks it
 * granted. Used by the immediate path (first-party) and by the GrowSurf
 * webhook when a held reward lands (03 §4). Idempotent on the reward id —
 * a row already granted/clawed_back/cancelled is left untouched.
 */
export async function grantRewardRow(input: {
  rewardId: string;
  referrerId: string;
  refereeUserId: string;
  credits: number;
  metadata: Record<string, unknown>;
  growsurfPrewId?: string;
}): Promise<boolean> {
  const service = createServiceClient();
  const ledgerId = await insertLedgerAllocation({
    userId: input.referrerId,
    credits: input.credits,
    idempotencyKey: `referral:payment_share:${input.refereeUserId}`,
    metadata: {
      reason: "referral_payment_share",
      referee_user_id: input.refereeUserId,
      share: REFERRER_SHARE,
      ...input.metadata,
    },
  });
  if (!ledgerId) return false;

  const { data: updated } = await service
    .from("referral_rewards")
    .update({
      status: "granted",
      ledger_entry_id: ledgerId,
      granted_at: new Date().toISOString(),
      hold_until: null,
      growsurf_prew_id: input.growsurfPrewId ?? undefined,
    })
    .eq("id", input.rewardId)
    .in("status", ["pending", "pending_hold"])
    .select("id")
    .maybeSingle();

  return Boolean(updated);
}

/**
 * Referrer reward (03 §1): when a referred user makes their FIRST payment,
 * the referrer gets 30% of that plan's monthly credit grant, complimentary.
 * Called from Polar fulfillment after the conversion is recorded; the
 * once-per-referee index + ledger idempotency make retries safe.
 *
 * When GrowSurf's delayed trigger is configured the reward parks in
 * pending_hold instead — lib/growsurf/sync.ts decides the path; this
 * function is the immediate-grant path and the hold fallback.
 */
export async function grantReferrerPaymentShare(
  buyerUserId: string,
  plan: PlanCredits,
  orderId: string
): Promise<void> {
  // Top-ups (extra_credit) are not a "plan upgrade" — a referred user who
  // only ever tops up never starts the referrer's payment-share cycle.
  if (plan.type && !SHARE_PLAN_TYPES.has(plan.type)) return;

  const referrerId = await findReferrer(buyerUserId);
  if (!referrerId) return;

  const credits = paymentShareCredits(plan);
  if (credits <= 0) return;

  const reward = await insertPaymentShareReward({
    buyerUserId,
    referrerId,
    credits,
    status: "pending",
  });
  if (!reward) return; // already rewarded for this referee

  const granted = await grantRewardRow({
    rewardId: reward.id,
    referrerId,
    refereeUserId: buyerUserId,
    credits,
    metadata: { plan_id: plan.id, order_id: orderId },
  });
  if (!granted) {
    const service = createServiceClient();
    await service
      .from("referral_rewards")
      .delete()
      .eq("id", reward.id)
      .eq("status", "pending");
  }
}

/**
 * GrowSurf campaign reward (milestone or referee-side): the reward's
 * Program Editor metadata `spx_credits` names the credit amount; the
 * PARTICIPANT_REACHED_A_GOAL webhook calls this. `source_ref` doubles as
 * the DB-level idempotency key alongside `growsurf_prew_id`'s unique
 * index, so manual-approval redeliveries and retries can't double-grant.
 * Pass status 'rejected' to record a fraud-blocked reward for audit.
 */
export async function insertGrowSurfMilestoneReward(input: {
  participantRewardId: string;
  earnerUserId: string;
  isReferrer: boolean;
  referrerUserId?: string | null;
  refereeUserId?: string | null;
  credits: number;
  campaignRewardId?: string | null;
  status?: "granted" | "rejected";
}): Promise<boolean> {
  const service = createServiceClient();
  const status = input.status ?? "granted";
  const prewId = input.participantRewardId;

  let ledgerId: string | null = null;
  if (status === "granted") {
    ledgerId = await insertLedgerAllocation({
      userId: input.earnerUserId,
      credits: input.credits,
      idempotencyKey: `growsurf_prew:${prewId}`,
      metadata: {
        reason: "growsurf_milestone",
        is_referrer: input.isReferrer,
        growsurf_reward_id: input.campaignRewardId ?? null,
      },
    });
    if (!ledgerId) return false;
  }

  const { data, error } = await service
    .from("referral_rewards")
    .insert({
      source_ref: `gsprew:${prewId}`,
      growsurf_prew_id: prewId,
      kind: "growsurf_milestone",
      status,
      credits: input.credits,
      earner_user_id: input.earnerUserId,
      referrer_user_id: input.referrerUserId ?? null,
      referee_user_id: input.refereeUserId ?? null,
      ledger_entry_id: ledgerId,
      granted_at: status === "granted" ? new Date().toISOString() : null,
    })
    .select("id")
    .maybeSingle();

  // Unique violation on source_ref/growsurf_prew_id = redelivery.
  if (error) return error.message.includes("duplicate key");
  return Boolean(data);
}

/**
 * Referrer signup bonus (07 §6.6): fixed credits when a referred friend
 * completes signup — paid in addition to the 30% first-payment share.
 * Once per referee via the partial unique index + ledger idempotency.
 */
export const REFERRER_SIGNUP_BONUS = 50;

export async function grantReferrerSignupBonus(
  referrerId: string,
  refereeUserId: string
): Promise<void> {
  const service = createServiceClient();
  const { data: reward, error } = await service
    .from("referral_rewards")
    .insert({
      source_ref: `signup_bonus:${refereeUserId}`,
      referrer_user_id: referrerId,
      referee_user_id: refereeUserId,
      kind: "referrer_signup_bonus",
      credits: REFERRER_SIGNUP_BONUS,
      status: "pending",
    })
    .select("id")
    .maybeSingle();
  if (error || !reward) return; // already granted

  const ledgerId = await insertLedgerAllocation({
    userId: referrerId,
    credits: REFERRER_SIGNUP_BONUS,
    idempotencyKey: `referral:signup_bonus:${refereeUserId}`,
    metadata: {
      reason: "referral_signup_bonus",
      referee_user_id: refereeUserId,
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
    .eq("id", reward.id)
    .eq("status", "pending");
}

/**
 * Referee signup bonus (07 §6.6): the referred friend gets a fixed credit
 * grant at claim, alongside the free-transformation unlock. Once per
 * referee via the partial unique index + ledger idempotency.
 */
export const REFEREE_SIGNUP_BONUS = 25;

export async function grantRefereeSignupBonus(
  refereeUserId: string,
  referrerId: string
): Promise<void> {
  const service = createServiceClient();
  const { data: reward, error } = await service
    .from("referral_rewards")
    .insert({
      source_ref: `referee_signup_bonus:${refereeUserId}`,
      referrer_user_id: referrerId,
      referee_user_id: refereeUserId,
      kind: "referee_signup_bonus",
      credits: REFEREE_SIGNUP_BONUS,
      status: "pending",
    })
    .select("id")
    .maybeSingle();
  if (error || !reward) return; // already granted

  const ledgerId = await insertLedgerAllocation({
    userId: refereeUserId,
    credits: REFEREE_SIGNUP_BONUS,
    idempotencyKey: `referral:referee_signup_bonus:${refereeUserId}`,
    metadata: {
      reason: "referral_referee_signup_bonus",
      referrer_user_id: referrerId,
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
    .eq("id", reward.id)
    .eq("status", "pending");
}

/**
 * Shared attribution (07 §2B): both claim paths — the spx_ref cookie and
 * manual code entry during onboarding — land here. Guards: not self,
 * referrer exists and is active, and the referee has no prior
 * attribution (first claim wins, one ever).
 */
export async function attributeReferral(
  userId: string,
  referrerId: string
): Promise<boolean> {
  if (referrerId === userId) return false;

  const service = createServiceClient();
  const [{ data: referrer }, { data: existing }] = await Promise.all([
    service
      .from("profiles")
      .select("id, status")
      .eq("id", referrerId)
      .maybeSingle(),
    service
      .from("referral_participants")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (!referrer || referrer.status !== "active" || existing?.user_id) {
    return false;
  }

  const { error } = await service.from("referral_participants").insert({
    user_id: userId,
    referred_by: referrerId,
  });
  if (error) {
    console.error("[attributeReferral] participant insert failed", error.message);
    return false;
  }

  await service
    .from("profiles")
    .update({ free_unlock_source: "referral" })
    .eq("id", userId)
    .is("free_unlock_source", null);

  await grantReferrerSignupBonus(referrerId, userId).catch((e) => {
    console.error("[attributeReferral] signup bonus failed", e);
  });
  await grantRefereeSignupBonus(userId, referrerId).catch((e) => {
    console.error("[attributeReferral] referee bonus failed", e);
  });

  return true;
}

/** The signed-in user's human share code — null when signed out. */
export async function getMyReferralCode(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .maybeSingle();
  return (data?.referral_code as string | null) ?? null;
}

export interface ReferralHistoryRow {
  userId: string;
  name: string;
  joinedAt: string;
  /** credits granted to the referrer for this referee, across kinds */
  creditsEarned: number;
  hasPaid: boolean;
}

/** The signed-in user's referral list for /app/referrals — newest first. */
export async function getMyReferrals(): Promise<ReferralHistoryRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const service = createServiceClient();
  const { data: participants } = await service
    .from("referral_participants")
    .select("user_id, created_at")
    .eq("referred_by", user.id)
    .order("created_at", { ascending: false });
  if (!participants?.length) return [];

  const refereeIds = participants.map((p) => p.user_id as string);
  const [{ data: profiles }, { data: rewards }] = await Promise.all([
    service
      .from("profiles")
      .select("id, display_name, username, email")
      .in("id", refereeIds),
    service
      .from("referral_rewards")
      .select("referee_user_id, credits, status, kind")
      .eq("referrer_user_id", user.id)
      .in("referee_user_id", refereeIds),
  ]);

  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      (p.display_name as string | null) ??
        (p.username as string | null) ??
        ((p.email as string | null)?.split("@")[0] ?? "A friend"),
    ])
  );
  const byReferee = new Map<string, { credits: number; paid: boolean }>();
  for (const r of rewards ?? []) {
    const id = r.referee_user_id as string;
    const cur = byReferee.get(id) ?? { credits: 0, paid: false };
    if (r.status === "granted") cur.credits += Number(r.credits ?? 0);
    if (r.kind === "referrer_payment_share") cur.paid = true;
    byReferee.set(id, cur);
  }

  return participants.map((p) => ({
    userId: p.user_id as string,
    name: nameById.get(p.user_id as string) ?? "A friend",
    joinedAt: p.created_at as string,
    creditsEarned: byReferee.get(p.user_id as string)?.credits ?? 0,
    hasPaid: byReferee.get(p.user_id as string)?.paid ?? false,
  }));
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
  const [{ count }, { data: rewards }, { data: milestoneRewards }] =
    await Promise.all([
      service
        .from("referral_participants")
        .select("*", { count: "exact", head: true })
        .eq("referred_by", user.id),
      service
        .from("referral_rewards")
        .select("kind, credits, status")
        .eq("referrer_user_id", user.id)
        .eq("kind", "referrer_payment_share"),
      service
        .from("referral_rewards")
        .select("kind, credits, status")
        .eq("earner_user_id", user.id)
        .eq("kind", "growsurf_milestone"),
    ]);

  const granted = [...(rewards ?? []), ...(milestoneRewards ?? [])].filter(
    (r) => r.status === "granted"
  );
  return {
    referredCount: count ?? 0,
    paidReferrals: granted.length,
    creditsEarned: granted.reduce((s, r) => s + Number(r.credits ?? 0), 0),
  };
}
