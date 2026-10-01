import { createClient } from "@/lib/supabase/server";

/**
 * Blocked-credit segmentation (06 §2) — decides which recovery surface a
 * signed-in user sees when Generate outruns their balance. Never shown to
 * anonymous users (the auth gate handles them first).
 */
export type BlockedSegment =
  /** Active plan (monthly/annual or an in-flight weekly pass) → top-up only. */
  | "subscriber"
  /** Active but cancel_at_period_end → top-up + restart nudge. */
  | "canceling"
  /** Only ever bought weekly passes → "Get another week". */
  | "weekly_buyer"
  /** Held a monthly/annual plan or paid a non-weekly invoice → reactivation. */
  | "lapsed"
  /** Never paid, has generations → contextual paywall. */
  | "free_history"
  /** Never paid, no generations → compact campaign offer flow. */
  | "new_user";

export interface ResumePlan {
  id: string;
  name: string;
  priceCents: number;
  creditsGrant: number;
  interval: string;
}

export interface BlockedCreditContext {
  segment: BlockedSegment;
  /** Active plan name — "Your {plan} credits ran out" header copy. */
  activePlanName?: string;
  /** Canceling segment: the date the plan actually ends. */
  planEndsAt?: string | null;
  /** Lapsed users' most recent non-weekly plan — preselected reactivation. */
  resumePlan?: ResumePlan | null;
  /** GrowSurf-attributed signup — paywall gets a referral footnote. */
  isReferred: boolean;
  /** Global promo opt-out — suppresses the offer ladder inside the surface. */
  offersOptedOut: boolean;
}

/** Pure segment resolution — unit-tested without a database. */
export function resolveBlockedSegment(input: {
  hasActiveSub: boolean;
  cancelAtPeriodEnd: boolean;
  hasAnySub: boolean;
  hasNonWeeklySub: boolean;
  hasNonWeeklyPayment: boolean;
  hasGenerations: boolean;
}): BlockedSegment {
  if (input.hasActiveSub) {
    return input.cancelAtPeriodEnd ? "canceling" : "subscriber";
  }
  // Any real plan history or non-weekly purchase → reactivation, not a
  // weekly pass.
  if (input.hasNonWeeklySub || input.hasNonWeeklyPayment) return "lapsed";
  // Weekly-only history: still a paying customer, and the weekly surface is
  // theirs to repurchase — "Get another week", never "trial" framing.
  if (input.hasAnySub) return "weekly_buyer";
  return input.hasGenerations ? "free_history" : "new_user";
}

interface PlanRowData {
  id: string;
  name: string;
  type: string;
  price_cents: number;
  credits_grant: number | null;
  interval: string;
}

function toResumePlan(p: PlanRowData | undefined): ResumePlan | null {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    priceCents: Number(p.price_cents),
    creditsGrant: Number(p.credits_grant ?? 0),
    interval: p.interval,
  };
}

/**
 * Loads everything the blocked-credit surface needs in one pass: segment,
 * resume plan, referral flag, and the promo opt-out bit. Plan types are
 * resolved via a two-step lookup (ids → plans) instead of embedded filters
 * so test doubles behave the same as Postgres.
 */
export async function getBlockedCreditContext(
  userId: string,
  generationCount: number
): Promise<BlockedCreditContext> {
  const supabase = await createClient();

  const [subsResult, invoicesResult, profileResult, referralResult] =
    await Promise.all([
      supabase
        .from("subscriptions")
        .select(
          "id, status, cancel_at_period_end, current_period_end, created_at, plan_id"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("invoices")
        .select("plan_id")
        .eq("user_id", userId)
        .eq("status", "paid"),
      supabase
        .from("profiles")
        .select("offers_opted_out")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("referral_participants")
        .select("referred_by")
        .eq("user_id", userId)
        .not("referred_by", "is", null)
        .maybeSingle(),
    ]);

  const subs = (subsResult.data ?? []) as {
    id: string;
    status: string;
    cancel_at_period_end: boolean | null;
    current_period_end: string | null;
    plan_id: string | null;
  }[];
  const invoices = (invoicesResult.data ?? []) as { plan_id: string | null }[];

  const planIds = [
    ...new Set(
      [...subs.map((s) => s.plan_id), ...invoices.map((i) => i.plan_id)].filter(
        (id): id is string => Boolean(id)
      )
    ),
  ];
  const { data: planRows } = planIds.length
    ? await supabase
        .from("plans")
        .select("id, name, type, price_cents, credits_grant, interval")
        .in("id", planIds)
    : { data: [] as PlanRowData[] };
  const planMap = new Map<string, PlanRowData>(
    ((planRows ?? []) as PlanRowData[]).map((p) => [p.id, p])
  );

  const now = Date.now();
  const active = subs.find(
    (s) =>
      (s.status === "active" || s.status === "past_due") &&
      (!s.current_period_end || new Date(s.current_period_end).getTime() > now)
  );
  const nonWeeklySubs = subs.filter(
    (s) => planMap.get(s.plan_id ?? "")?.type !== "weekly_trial"
  );
  const hasNonWeeklyPayment = invoices.some((inv) => {
    const type = planMap.get(inv.plan_id ?? "")?.type;
    return type !== undefined && type !== "weekly_trial" && type !== "extra_credit";
  });

  const segment = resolveBlockedSegment({
    hasActiveSub: Boolean(active),
    cancelAtPeriodEnd: Boolean(active?.cancel_at_period_end),
    hasAnySub: subs.length > 0,
    hasNonWeeklySub: nonWeeklySubs.length > 0,
    hasNonWeeklyPayment,
    hasGenerations: generationCount > 0,
  });

  const resumePlan = toResumePlan(
    nonWeeklySubs.length > 0
      ? planMap.get(nonWeeklySubs[0]!.plan_id ?? "")
      : undefined
  );

  return {
    segment,
    activePlanName: active
      ? planMap.get(active.plan_id ?? "")?.name
      : undefined,
    planEndsAt: active?.current_period_end ?? null,
    resumePlan,
    isReferred: Boolean(referralResult.data?.referred_by),
    offersOptedOut: Boolean(profileResult.data?.offers_opted_out),
  };
}
