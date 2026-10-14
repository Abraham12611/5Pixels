import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import {
  REFERRER_SIGNUP_BONUS,
  REFEREE_SIGNUP_BONUS,
  REFERRER_REWARD_CAP,
} from "@/lib/referrals/reward-amounts";
import {
  grantSubsidyCredits,
  type SubsidyProgram,
} from "@/lib/billing/subsidies";

export { REFERRER_SIGNUP_BONUS, REFEREE_SIGNUP_BONUS, REFERRER_REWARD_CAP };

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

/**
 * Refund-window hold for the referrer payment share (issue #110): the
 * reward is claimed as pending_hold at first payment and only settles
 * after REFERRAL_PAYMENT_SHARE_HOLD_DAYS elapse — a refund inside the
 * window cancels the reward before any credits exist to claw back.
 * Env override: REFERRAL_PAYMENT_SHARE_HOLD_DAYS (1–90, 0 disables).
 */
const DEFAULT_PAYMENT_SHARE_HOLD_DAYS = 14;

function paymentShareHoldDays(): number {
  const raw = process.env.REFERRAL_PAYMENT_SHARE_HOLD_DAYS?.trim();
  if (!raw) return DEFAULT_PAYMENT_SHARE_HOLD_DAYS;
  // Only an explicit "0" disables the hold — a misconfigured value must
  // never silently drop a fraud/refund control.
  if (raw === "0") return 0;
  const days = Number.parseInt(raw, 10);
  if (!Number.isFinite(days) || days < 1 || days > 90) {
    console.warn(
      `[referrals] invalid REFERRAL_PAYMENT_SHARE_HOLD_DAYS="${raw}" — ` +
        `falling back to ${DEFAULT_PAYMENT_SHARE_HOLD_DAYS} days`
    );
    return DEFAULT_PAYMENT_SHARE_HOLD_DAYS;
  }
  return days;
}

interface PlanCredits {
  id: string;
  credits_grant: number;
  /** weekly_trial | monthly | annual | extra_credit — share excludes top-ups. */
  type?: string;
}

/** Only plan purchases count toward the referral cycle — never top-ups. */
const SHARE_PLAN_TYPES = new Set(["weekly_trial", "monthly", "annual"]);

/**
 * Route a reward through the subsidy budget (issue #110): the
 * grant_subsidy_credits RPC atomically checks the program's monthly cap,
 * writes the ledger allocation tagged with `subsidy_program`, and
 * dedupes on the idempotency key. `ok` is false only when the budget is
 * exhausted — callers roll the pending reward row back or mark it
 * rejected so the denial is auditable.
 */
async function allocateSubsidyReward(input: {
  program: SubsidyProgram;
  userId: string;
  credits: number;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
}): Promise<{ ok: boolean; ledgerId: string | null }> {
  const service = createServiceClient();
  const result = await grantSubsidyCredits(service, {
    userId: input.userId,
    program: input.program,
    credits: input.credits,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata,
  });
  return {
    ok: result.outcome !== "budget_exhausted",
    ledgerId: result.ledgerId,
  };
}

/**
 * Atomic referrer reward-slot claim (issue #110): the
 * claim_referrer_reward RPC caps referrer-side rewards at
 * REFERRER_REWARD_CAP rewarded referees under a per-referrer row lock,
 * inserting the pending reward row when a claim succeeds. 'capped'
 * denials are recorded as rejected rows for audit; 'duplicate' means the
 * source_ref was already processed (webhook redelivery / retry).
 */
async function claimReferrerReward(input: {
  referrerId: string;
  refereeUserId: string;
  kind: "referrer_signup_bonus" | "referrer_payment_share";
  credits: number;
  sourceRef: string;
  /** 'pending' settles immediately; 'pending_hold' waits for holdUntil. */
  status?: "pending" | "pending_hold";
  holdUntil?: string;
}): Promise<"claimed" | "capped" | "duplicate"> {
  const service = createServiceClient();
  const { data, error } = await service.rpc("claim_referrer_reward", {
    p_referrer_id: input.referrerId,
    p_referee_id: input.refereeUserId,
    p_kind: input.kind,
    p_credits: input.credits,
    p_source_ref: input.sourceRef,
    p_status: input.status ?? "pending",
    p_hold_until: input.holdUntil ?? null,
  });
  if (error) {
    throw new Error(`referrer reward claim failed: ${error.message}`);
  }
  return (data as "claimed" | "capped" | "duplicate" | null) ?? "duplicate";
}

/**
 * Settle a claimed referrer reward: grant the subsidy credits and mark
 * the row granted, or mark it rejected when the program budget is
 * exhausted — the denial stays auditable and never retries.
 */
async function settleClaimedReward(input: {
  sourceRef: string;
  referrerId: string;
  credits: number;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const service = createServiceClient();
  const { ok, ledgerId } = await allocateSubsidyReward({
    program: "referral_budget",
    userId: input.referrerId,
    credits: input.credits,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata,
  });
  if (!ok) {
    await service
      .from("referral_rewards")
      .update({ status: "rejected" })
      .eq("source_ref", input.sourceRef)
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
    .eq("source_ref", input.sourceRef)
    .eq("status", "pending");
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

  const { ok, ledgerId } = await allocateSubsidyReward({
    program: "referral_referee",
    userId: refereeUserId,
    credits: creditCost,
    idempotencyKey: `referral:${sourceRef}`,
    metadata: { reason: "referral_referee_unlock" },
  });
  if (!ok || !ledgerId) {
    // Budget exhausted — release the pending claim so a later attempt
    // (after the monthly reset) can still honour the unlock promise.
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

/**
 * Referrer reward (03 §1): when a referred user makes their FIRST payment,
 * the referrer gets 30% of that plan's monthly credit grant, complimentary.
 * Called from payment fulfillment after the conversion is recorded; the
 * once-per-referee index + ledger idempotency make retries safe.
 *
 * Issue #110: the claim_referrer_reward RPC enforces REFERRER_REWARD_CAP
 * under a per-referrer lock — past the cap the referral still attributes
 * but this referrer earns nothing, and the credits come out of the
 * monthly `referral_budget` subsidy cap (fail-closed on exhaustion).
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

  const sourceRef = `payment_share:${buyerUserId}`;
  const holdDays = paymentShareHoldDays();
  const holdUntil =
    holdDays > 0
      ? new Date(Date.now() + holdDays * 86_400_000).toISOString()
      : undefined;
  const claim = await claimReferrerReward({
    referrerId,
    refereeUserId: buyerUserId,
    kind: "referrer_payment_share",
    credits,
    sourceRef,
    status: holdUntil ? "pending_hold" : "pending",
    holdUntil,
  });
  if (claim !== "claimed") return; // capped past 15 or already processed

  // Refund-window hold: credits mint later via releaseDueReferralHolds().
  // A refund inside the window cancels the row before it can settle.
  if (holdUntil) return;

  await settleClaimedReward({
    sourceRef,
    referrerId,
    credits,
    idempotencyKey: `referral:payment_share:${buyerUserId}`,
    metadata: {
      reason: "referral_payment_share",
      referee_user_id: buyerUserId,
      share: REFERRER_SHARE,
      plan_id: plan.id,
      order_id: orderId,
    },
  });
}

/**
 * Release cron for the first-party refund hold: settle every
 * pending_hold payment-share whose window elapsed through the
 * release_referral_hold RPC — one atomic lock + budget consume + ledger
 * write + status flip per row, so a refund landing mid-release can never
 * produce cancelled-reward-with-live-credits (it either cancels before
 * the lock or claws back after).
 * Budget exhaustion is NOT terminal — the row stays pending_hold and
 * retries on the next run (monthly rollover replenishes the program).
 */
export async function releaseDueReferralHolds(
  limit = 100
): Promise<{ released: number; retried: number }> {
  const service = createServiceClient();
  const { data: due } = await service
    .from("referral_rewards")
    .select("source_ref")
    .eq("status", "pending_hold")
    .eq("kind", "referrer_payment_share")
    .lte("hold_until", new Date().toISOString())
    .limit(limit);

  let released = 0;
  let retried = 0;
  for (const row of due ?? []) {
    const { data, error } = await service.rpc("release_referral_hold", {
      p_source_ref: row.source_ref as string,
    });
    if (error) {
      console.error(
        "[releaseDueReferralHolds] release failed",
        row.source_ref,
        error.message
      );
      retried += 1;
      continue;
    }
    const outcome = (
      (Array.isArray(data) ? data[0] : data) as { outcome?: string } | null
    )?.outcome;
    if (outcome === "granted" || outcome === "duplicate") released += 1;
    else if (outcome === "budget_exhausted") retried += 1;
    // cancelled/rejected/not_due — the refund path or a racing run owns it.
  }
  return { released, retried };
}

/**
 * Refund path (03 §4): called from the refund handlers for the refunded
 * buyer. A pending/held reward is cancelled before it lands; an already
 * granted reward is clawed back with the same capped-reversal semantics
 * used for the buyer (cap at available balance, log the shortfall).
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

  let grantedReward = reward;
  if (reward.status === "pending" || reward.status === "pending_hold") {
    const { data: cancelled } = await service
      .from("referral_rewards")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", reward.id)
      .in("status", ["pending", "pending_hold"])
      .select("id");
    if (cancelled?.length) return;

    // Lost the race with the hold release: the row settled to 'granted'
    // between our read and the cancel attempt — re-read and claw back
    // instead of returning with live credits against a refund.
    const { data: current } = await service
      .from("referral_rewards")
      .select("id, referrer_user_id, referee_user_id, credits, status")
      .eq("id", reward.id)
      .maybeSingle();
    if (!current || current.status !== "granted") return;
    grantedReward = current;
  } else if (reward.status !== "granted") {
    return;
  }

  // Already granted — claw back what remains recoverable (03 §4). Same
  // rule as the buyer reversal: cap at available balance, record the
  // unrecovered remainder as loss in metadata.
  const referrerId = grantedReward.referrer_user_id as string;
  const credits = Number(grantedReward.credits ?? 0);
  if (credits <= 0) return;

  const idempotencyKey = `referral_clawback:${reward.id}`;
  const { data: existing } = await service
    .from("credit_ledger")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing) return;

  // Full ledger sum — open reservations are negative and already reduce
  // available, so a clawback can't touch credits committed to in-flight
  // generations.
  const { data: ledgerRows } = await service
    .from("credit_ledger")
    .select("amount")
    .eq("user_id", referrerId);
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
 * Referrer signup bonus (07 §6.6): fixed credits when a referred friend
 * completes signup — paid in addition to the 30% first-payment share.
 * Once per referee via the partial unique index + ledger idempotency.
 * Amount lives in reward-amounts.ts (shared with client-facing copy).
 */
export async function grantReferrerSignupBonus(
  referrerId: string,
  refereeUserId: string
): Promise<void> {
  // Issue #110: the claim RPC counts this referrer's rewarded referees
  // under a row lock — past REFERRER_REWARD_CAP it records a rejected
  // audit row and no credits mint.
  const sourceRef = `signup_bonus:${refereeUserId}`;
  const claim = await claimReferrerReward({
    referrerId,
    refereeUserId,
    kind: "referrer_signup_bonus",
    credits: REFERRER_SIGNUP_BONUS,
    sourceRef,
  });
  if (claim !== "claimed") return; // capped past the limit or duplicate

  await settleClaimedReward({
    sourceRef,
    referrerId,
    credits: REFERRER_SIGNUP_BONUS,
    idempotencyKey: `referral:signup_bonus:${refereeUserId}`,
    metadata: {
      reason: "referral_signup_bonus",
      referee_user_id: refereeUserId,
    },
  });
}

/**
 * Referee signup bonus (07 §6.6): the referred friend gets a fixed credit
 * grant at claim, alongside the free-transformation unlock. Once per
 * referee via the partial unique index + ledger idempotency.
 * Amount lives in reward-amounts.ts (shared with client-facing copy).
 */
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

  const { ok, ledgerId } = await allocateSubsidyReward({
    program: "referral_referee",
    userId: refereeUserId,
    credits: REFEREE_SIGNUP_BONUS,
    idempotencyKey: `referral:referee_signup_bonus:${refereeUserId}`,
    metadata: {
      reason: "referral_referee_signup_bonus",
      referrer_user_id: referrerId,
    },
  });
  if (!ok || !ledgerId) {
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
  const [{ count }, { data: rewards }] = await Promise.all([
    service
      .from("referral_participants")
      .select("*", { count: "exact", head: true })
      .eq("referred_by", user.id),
    service
      .from("referral_rewards")
      .select("kind, credits, status")
      .eq("referrer_user_id", user.id)
      .in("kind", ["referrer_payment_share", "referrer_signup_bonus"]),
  ]);

  const granted = (rewards ?? []).filter((r) => r.status === "granted");
  return {
    referredCount: count ?? 0,
    paidReferrals: granted.length,
    creditsEarned: granted.reduce((s, r) => s + Number(r.credits ?? 0), 0),
  };
}
