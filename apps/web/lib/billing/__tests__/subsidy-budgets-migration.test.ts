import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contract test for the subsidy-budget SQL (issue #110) — the RPC is
 * mocked in unit tests, so these assertions guard the invariants that
 * mocked tests can't see: atomic cap consumption, per-user idempotency,
 * fail-closed exhaustion, and the per-referrer reward cap.
 */
const sql = readFileSync(
  join(
    __dirname,
    "../../../../../supabase/migrations/20261017000001_subsidy_budgets.sql"
  ),
  "utf-8"
);

const grantBody = sql.slice(
  sql.indexOf("FUNCTION public.grant_subsidy_credits"),
  sql.indexOf("FUNCTION public.claim_referrer_reward")
);
const claimBody = sql.slice(
  sql.indexOf("FUNCTION public.claim_referrer_reward")
);

describe("subsidy budgets migration", () => {
  it("creates a per-program monthly budget table with admin-only reads", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.subsidy_budgets");
    expect(sql).toContain("program TEXT PRIMARY KEY");
    expect(sql).toContain("monthly_cap_credits");
    expect(sql).toContain("committed_credits");
    expect(sql).toContain(
      "ALTER TABLE public.subsidy_budgets ENABLE ROW LEVEL SECURITY"
    );
    // Admins read for the budgets page; writes stay service-role only.
    expect(sql).toMatch(/CREATE POLICY "subsidy_budgets_admin_read"[\s\S]*?TO authenticated/);
    expect(sql).toContain("REVOKE ALL ON public.subsidy_budgets FROM PUBLIC, anon");
  });

  it("seeds every subsidy program with an explicit cap", () => {
    for (const program of [
      "referral_budget",
      "referral_referee",
      "retention",
      "promo",
      "admin_manual",
    ]) {
      expect(sql).toContain(`('${program}',`);
    }
  });

  it("checks idempotency before touching the budget", () => {
    // Replay must return 'duplicate' without consuming cap — the lookup
    // precedes the FOR UPDATE budget lock in the function body.
    const dupIdx = grantBody.indexOf("'duplicate'");
    const lockIdx = grantBody.indexOf("FOR UPDATE");
    expect(dupIdx).toBeGreaterThan(-1);
    expect(lockIdx).toBeGreaterThan(-1);
    expect(dupIdx).toBeLessThan(lockIdx);
  });

  it("serializes grants with a row lock and rolls the month over lazily", () => {
    expect(grantBody).toContain("FOR UPDATE");
    expect(grantBody).toMatch(/v_budget\.period <>\s*v_period/);
    expect(grantBody).toContain("committed_credits = 0");
  });

  it("fails closed with an admin alert when the cap is exceeded", () => {
    expect(grantBody).toMatch(
      /v_budget\.committed_credits \+ p_credits >\s*v_budget\.monthly_cap_credits/
    );
    expect(grantBody).toContain("'subsidy_budget_exhausted'");
    expect(grantBody).toContain("INSERT INTO public.admin_alerts");
    expect(grantBody).toContain("'budget_exhausted'");
  });

  it("uses the per-user composite idempotency index for the ledger insert", () => {
    // credit_ledger has NO global UNIQUE on idempotency_key — only
    // (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL.
    expect(grantBody).toContain("ON CONFLICT (user_id, idempotency_key)");
    expect(grantBody).not.toMatch(/ON CONFLICT \(idempotency_key\)/);
  });

  it("refunds the budget when the ledger insert loses an idempotency race", () => {
    // ON CONFLICT DO NOTHING → NULL ledger id → undo the commit so a
    // replay never burns budget.
    expect(grantBody).toContain(
      "committed_credits = b.committed_credits - p_credits"
    );
  });

  it("tags the ledger entry with the subsidy program for profitability reporting", () => {
    expect(grantBody).toContain("'subsidy_program', p_program");
    expect(grantBody).toContain("'allocation'");
  });

  it("is service-role only", () => {
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.grant_subsidy_credits[\s\S]*?FROM PUBLIC, anon, authenticated/
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.grant_subsidy_credits[\s\S]*?TO service_role/
    );
    expect(sql).toMatch(/SET search_path = ''/);
  });
});

const fixSql = readFileSync(
  join(
    __dirname,
    "../../../../../supabase/migrations/20261018000001_referrer_cap_and_hold.sql"
  ),
  "utf-8"
);

const fixGrantBody = fixSql.slice(
  fixSql.indexOf("FUNCTION public.grant_subsidy_credits"),
  fixSql.indexOf("FUNCTION public.claim_referrer_reward")
);
const fixClaimBody = fixSql.slice(
  fixSql.indexOf("FUNCTION public.claim_referrer_reward")
);

describe("claim_referrer_reward — 15-referral cap", () => {
  it("locks the referrer's profile row so the count can't race", () => {
    expect(claimBody).toContain(
      "FROM public.profiles WHERE id = p_referrer_id FOR UPDATE"
    );
  });

  it("caps referrer-side rewards at 15 rewarded referees", () => {
    expect(claimBody).toContain("v_count >= 15");
    // Only referrer-side kinds consume slots — referee bonuses are exempt.
    expect(claimBody).toContain(
      "r.kind IN ('referrer_signup_bonus', 'referrer_payment_share')"
    );
  });

  it("records capped denials as rejected audit rows", () => {
    expect(claimBody).toContain("'rejected'");
    expect(claimBody).toContain("RETURN 'capped'");
  });

  it("distinguishes capped redeliveries from ordinary duplicates", () => {
    expect(claimBody).toContain(
      "CASE WHEN v_existing_status = 'rejected' THEN 'capped' ELSE 'duplicate' END"
    );
  });

  it("is service-role only", () => {
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.claim_referrer_reward[\s\S]*?FROM PUBLIC, anon, authenticated/
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.claim_referrer_reward[\s\S]*?TO service_role/
    );
  });
});

describe("fix-up migration — concurrency and cap-occupancy (review)", () => {
  it("rechecks the ledger idempotency key under the budget lock", () => {
    // Blocker 2: a duplicate that queued behind its own original grant
    // must report 'duplicate', never 'budget_exhausted'. The fixed
    // function performs a second ledger lookup AFTER FOR UPDATE.
    const lockIdx = fixGrantBody.indexOf("FOR UPDATE");
    const secondDupIdx = fixGrantBody.indexOf("'duplicate'", lockIdx);
    const capIdx = fixGrantBody.indexOf("monthly_cap_credits THEN");
    expect(lockIdx).toBeGreaterThan(-1);
    expect(secondDupIdx).toBeGreaterThan(-1);
    expect(secondDupIdx).toBeGreaterThan(lockIdx);
    expect(secondDupIdx).toBeLessThan(capIdx);
  });

  it("lets a referee already occupying a rewarded slot bypass the cap", () => {
    // Blocker 1: the 15-cap limits DISTINCT referees, not reward kinds —
    // a referee with a live signup-bonus row stays eligible for their
    // payment share even when the referrer is at 15.
    expect(fixClaimBody).toContain("v_occupied");
    const occupiedIdx = fixClaimBody.indexOf("v_occupied");
    const countIdx = fixClaimBody.indexOf("COUNT(DISTINCT");
    expect(occupiedIdx).toBeGreaterThan(-1);
    expect(countIdx).toBeGreaterThan(-1);
    expect(occupiedIdx).toBeLessThan(countIdx);
    expect(fixClaimBody).toContain("IF NOT v_occupied THEN");
  });

  it("creates pending_hold rows atomically with the claim", () => {
    expect(fixClaimBody).toContain("p_status TEXT DEFAULT 'pending'");
    expect(fixClaimBody).toContain("p_hold_until TIMESTAMPTZ DEFAULT NULL");
    expect(fixClaimBody).toContain("p_status,\n      p_hold_until");
    // Due-hold index for the release cron.
    expect(fixSql).toContain("idx_referral_rewards_pending_hold_due");
    expect(fixSql).toContain("WHERE status = 'pending_hold'");
  });

  it("keeps both fixed RPCs service-role only", () => {
    expect(fixSql).toMatch(
      /REVOKE ALL ON FUNCTION public\.grant_subsidy_credits[\s\S]*?FROM PUBLIC, anon, authenticated/
    );
    expect(fixSql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.claim_referrer_reward[\s\S]*?TO service_role/
    );
  });
});
