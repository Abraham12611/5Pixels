-- Referral cap + subsidy RPC fix-ups and the first-party refund hold
-- (issue #110 review, PR #135)
-- ---------------------------------------------------------------------------
-- 1. claim_referrer_reward previously counted DISTINCT rewarded referees and
--    capped at 15 before checking whether the CURRENT referee already
--    occupied one of those slots — so once a referrer hit 15 rewarded
--    referees, a first payment from any of those same 15 was denied its
--    30% share. Now slot occupancy is checked first: a referee already in
--    the rewarded set bypasses the cap for their other reward kind.
-- 2. grant_subsidy_credits checked the ledger idempotency key BEFORE the
--    budget row lock — a duplicate retry that queued behind the original
--    grant could reach the cap check after the budget filled and report
--    'budget_exhausted' for a grant that actually succeeded. The key is
--    now rechecked under the lock.
-- 3. claim_referrer_reward gains p_status / p_hold_until so the
--    first-party refund-window hold (pending_hold rows) is created
--    atomically with the claim — no window where a pending row could be
--    settled before the hold is attached.
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

  -- Recheck under the lock: a duplicate that queued behind its own
  -- original grant must report 'duplicate', never 'budget_exhausted'.
  SELECT l.id INTO v_existing
  FROM public.credit_ledger l
  WHERE l.user_id = p_user_id AND l.idempotency_key = p_idempotency_key;
  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT 'duplicate'::TEXT, v_existing;
    RETURN;
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

CREATE OR REPLACE FUNCTION public.claim_referrer_reward(
  p_referrer_id UUID,
  p_referee_id UUID,
  p_kind TEXT,
  p_credits NUMERIC,
  p_source_ref TEXT,
  p_status TEXT DEFAULT 'pending',
  p_hold_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INT;
  v_occupied BOOLEAN;
  v_existing_status TEXT;
BEGIN
  -- Serialize per referrer: the count below is evaluated under the lock.
  PERFORM 1 FROM public.profiles WHERE id = p_referrer_id FOR UPDATE;

  -- Slot occupancy first: a referee who already holds a live rewarded slot
  -- (e.g. their signup bonus) stays eligible for their other reward kind
  -- even when the referrer is already at the cap — the cap limits how many
  -- DISTINCT referees get rewarded, not how many rewards each can earn.
  SELECT EXISTS (
    SELECT 1 FROM public.referral_rewards r
    WHERE r.referrer_user_id = p_referrer_id
      AND r.referee_user_id = p_referee_id
      AND r.kind IN ('referrer_signup_bonus', 'referrer_payment_share')
      AND r.status IN ('pending', 'pending_hold', 'granted')
  ) INTO v_occupied;

  IF NOT v_occupied THEN
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
  END IF;

  BEGIN
    INSERT INTO public.referral_rewards (
      source_ref, referrer_user_id, referee_user_id, kind, credits, status,
      hold_until
    )
    VALUES (
      p_source_ref, p_referrer_id, p_referee_id, p_kind, p_credits, p_status,
      p_hold_until
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

REVOKE ALL ON FUNCTION public.claim_referrer_reward(UUID, UUID, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referrer_reward(UUID, UUID, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ)
  TO service_role;

-- Held payment-share rewards due for settlement — the release cron scans
-- this index each run.
CREATE INDEX IF NOT EXISTS idx_referral_rewards_pending_hold_due
  ON public.referral_rewards (hold_until)
  WHERE status = 'pending_hold';
