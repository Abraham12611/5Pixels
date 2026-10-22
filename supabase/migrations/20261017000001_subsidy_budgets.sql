-- Budgeted subsidy grants (issue #110)
-- ---------------------------------------------------------------------------
-- Every non-paid credit grant is provider-cost liability (1 credit = $0.01
-- forever). Referral bonuses, retention credits, promo grants and manual
-- support grants all funnel through grant_subsidy_credits: one atomic
-- check-and-grant against a per-program monthly budget.
--
-- Fail closed by design:
--   unknown/missing program        → raise (misconfiguration, not a grant)
--   committed + request > cap      → 'budget_exhausted' + admin_alerts row
--   replayed idempotency key       → 'duplicate' (returns original entry)
--
-- Periods roll over lazily: the first grant of a new month resets the
-- committed counter under the same row lock — no cron needed.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subsidy_budgets (
  program TEXT PRIMARY KEY,
  -- Monthly cap in credits ($0.01 provider capacity each). To disable a
  -- program entirely: set the cap to 0 or delete the row — grants fail
  -- closed either way.
  monthly_cap_credits NUMERIC(12,4) NOT NULL CHECK (monthly_cap_credits >= 0),
  -- Current period key ('YYYY-MM', UTC) + credits committed within it.
  period TEXT NOT NULL DEFAULT '',
  committed_credits NUMERIC(12,4) NOT NULL DEFAULT 0
    CHECK (committed_credits >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subsidy_budgets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subsidy_budgets FROM PUBLIC, anon;

-- Admins/owners can read budgets for the admin budgets page; writes stay
-- service-role only (the RPC is the single mutation path).
CREATE POLICY "subsidy_budgets_admin_read" ON public.subsidy_budgets
  FOR SELECT TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid())
         OR (SELECT is_owner FROM public.profiles WHERE id = auth.uid()));

-- Launch defaults — tuned for the $0.01 denomination (1 credit = $0.01 of
-- provider-cost capacity):
--   referral_budget     2,500cr/mo ≈ $25  (referrer bonus + 30% payment share)
--   referral_referee    1,500cr/mo ≈ $15  (referee 10cr + unlock, up to ~6–9cr)
--   retention           2,500cr/mo ≈ $25  (500cr cancel-save offers)
--   promo               5,000cr/mo ≈ $50  (campaign/promo credit grants)
--   admin_manual        1,000cr/mo ≈ $10  (support manual positive grants)
INSERT INTO public.subsidy_budgets (program, monthly_cap_credits) VALUES
  ('referral_budget', 2500),
  ('referral_referee', 1500),
  ('retention', 2500),
  ('promo', 5000),
  ('admin_manual', 1000)
ON CONFLICT (program) DO NOTHING;

-- ---------------------------------------------------------------------------
-- grant_subsidy_credits — the single subsidy issuance path
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.grant_subsidy_credits(
  p_user_id UUID,
  p_program TEXT,
  p_credits NUMERIC,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (outcome TEXT, ledger_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_budget RECORD;
  v_period TEXT := to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM');
  v_existing UUID;
  v_ledger UUID;
BEGIN
  IF p_credits IS NULL OR p_credits <= 0 THEN
    RAISE EXCEPTION 'Subsidy credits must be positive' USING ERRCODE = 'P0001';
  END IF;
  IF p_idempotency_key IS NULL OR p_idempotency_key = '' THEN
    RAISE EXCEPTION 'Subsidy grants require an idempotency key'
      USING ERRCODE = 'P0001';
  END IF;

  -- Idempotent replay: return the original entry without touching the
  -- budget (committed on first grant only).
  -- credit_ledger idempotency is per-user: the unique index is
  -- (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL.
  SELECT l.id INTO v_existing
  FROM public.credit_ledger l
  WHERE l.user_id = p_user_id AND l.idempotency_key = p_idempotency_key;
  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT 'duplicate'::TEXT, v_existing;
    RETURN;
  END IF;

  -- Row lock serializes every grant for the program — concurrent grants
  -- can never race past the cap.
  SELECT * INTO v_budget
  FROM public.subsidy_budgets b
  WHERE b.program = p_program
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown subsidy program: %', p_program
      USING ERRCODE = 'P0001';
  END IF;

  -- Lazy month rollover under the same lock.
  IF v_budget.period <> v_period THEN
    UPDATE public.subsidy_budgets b
    SET period = v_period, committed_credits = 0, updated_at = NOW()
    WHERE b.program = p_program;
    v_budget.committed_credits := 0;
  END IF;

  IF v_budget.committed_credits + p_credits > v_budget.monthly_cap_credits THEN
    -- One alert per program per period — every skipped grant after that
    -- would spam the alerts feed with the same information.
    IF NOT EXISTS (
      SELECT 1 FROM public.admin_alerts a
      WHERE a.rule = 'subsidy_budget_exhausted'
        AND a.acknowledged_at IS NULL
        AND a.details->>'program' = p_program
        AND a.details->>'period' = v_period
    ) THEN
      INSERT INTO public.admin_alerts (rule, severity, message, details)
      VALUES (
        'subsidy_budget_exhausted', 'warning',
        'Subsidy program "' || p_program || '" over its '
          || v_budget.monthly_cap_credits || 'cr monthly cap — '
          || p_credits || 'cr grant skipped',
        jsonb_build_object(
          'program', p_program,
          'requested', p_credits,
          'committed', v_budget.committed_credits,
          'cap', v_budget.monthly_cap_credits,
          'period', v_period
        )
      );
    END IF;
    RETURN QUERY SELECT 'budget_exhausted'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  UPDATE public.subsidy_budgets b
  SET committed_credits = b.committed_credits + p_credits, updated_at = NOW()
  WHERE b.program = p_program;

  INSERT INTO public.credit_ledger (
    user_id, entry_type, amount, currency_unit, idempotency_key, metadata
  )
  VALUES (
    p_user_id, 'allocation', p_credits, 'credits', p_idempotency_key,
    p_metadata || jsonb_build_object('subsidy_program', p_program)
  )
  ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_ledger;

  -- Lost an insert race on the same key: undo the commit, report duplicate.
  IF v_ledger IS NULL THEN
    UPDATE public.subsidy_budgets b
    SET committed_credits = b.committed_credits - p_credits,
        updated_at = NOW()
    WHERE b.program = p_program;
    SELECT l.id INTO v_existing
    FROM public.credit_ledger l
    WHERE l.user_id = p_user_id AND l.idempotency_key = p_idempotency_key;
    RETURN QUERY SELECT 'duplicate'::TEXT, v_existing;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'granted'::TEXT, v_ledger;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_subsidy_credits(UUID, TEXT, NUMERIC, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_subsidy_credits(UUID, TEXT, NUMERIC, TEXT, JSONB)
  TO service_role;

-- ---------------------------------------------------------------------------
-- claim_referrer_reward — atomic per-referrer referral cap (max 15 rewarded
-- referees). Product decision: a referrer earns rewards on their first 15
-- referred signups; referrals beyond that still attribute (the referee keeps
-- their own bonuses) but pay the referrer nothing.
--
-- The referrer's profiles row is locked FOR UPDATE so concurrent signups/
-- payments can't both see "14 used" and overshoot the cap.
--
-- Outcomes:
--   'claimed'   → reward row inserted pending; caller grants credits
--   'capped'    → referrer at 15; denial recorded as a rejected audit row
--   'duplicate' → source_ref already exists (retry/redelivery)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_referrer_reward(
  p_referrer_id UUID,
  p_referee_id UUID,
  p_kind TEXT,
  p_credits NUMERIC,
  p_source_ref TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INT;
  v_existing_status TEXT;
BEGIN
  -- Serialize per referrer: the count below is evaluated under the lock.
  PERFORM 1 FROM public.profiles WHERE id = p_referrer_id FOR UPDATE;

  -- Rewarded slots = distinct referees with a live referrer reward.
  SELECT COUNT(DISTINCT r.referee_user_id) INTO v_count
  FROM public.referral_rewards r
  WHERE r.referrer_user_id = p_referrer_id
    AND r.kind IN ('referrer_signup_bonus', 'referrer_payment_share')
    AND r.status IN ('pending', 'pending_hold', 'granted');

  IF v_count >= 15 THEN
    -- Audit the denial: the rejected row keeps source_ref uniqueness, so a
    -- redelivery reads 'capped' again rather than silently retrying.
    BEGIN
      INSERT INTO public.referral_rewards (
        source_ref, referrer_user_id, referee_user_id, kind, credits, status
      )
      VALUES (
        p_source_ref, p_referrer_id, p_referee_id, p_kind, p_credits,
        'rejected'
      );
    EXCEPTION WHEN unique_violation THEN
      NULL; -- redelivery of a capped claim — fall through
    END;
    RETURN 'capped';
  END IF;

  BEGIN
    INSERT INTO public.referral_rewards (
      source_ref, referrer_user_id, referee_user_id, kind, credits, status
    )
    VALUES (
      p_source_ref, p_referrer_id, p_referee_id, p_kind, p_credits, 'pending'
    );
  EXCEPTION WHEN unique_violation THEN
    SELECT r.status INTO v_existing_status
    FROM public.referral_rewards r
    WHERE r.source_ref = p_source_ref;
    RETURN CASE WHEN v_existing_status = 'rejected' THEN 'capped' ELSE 'duplicate' END;
  END;

  RETURN 'claimed';
END;
$$;

REVOKE ALL ON FUNCTION public.claim_referrer_reward(UUID, UUID, TEXT, NUMERIC, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referrer_reward(UUID, UUID, TEXT, NUMERIC, TEXT)
  TO service_role;
