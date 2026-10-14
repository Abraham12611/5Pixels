-- Atomic referral hold release (issue #110 review, PR #135)
-- ---------------------------------------------------------------------------
-- releaseDueReferralHolds previously granted subsidy credits and marked the
-- reward granted in two separate statements. A refund landing between them
-- saw 'pending_hold', cancelled the row, and skipped the clawback — leaving
-- spendable credits against a cancelled reward.
--
-- release_referral_hold makes the whole settlement one transaction: it
-- locks the reward row FOR UPDATE (the same lock the refund path's
-- conditional update needs), confirms pending_hold + due, consumes the
-- budget via grant_subsidy_credits, writes the ledger allocation, and
-- marks the row granted — atomically.
--
-- Outcomes:
--   'granted'          → hold settled, credits minted
--   'duplicate'        → ledger entry already existed; row now granted
--   'budget_exhausted' → nothing changed; caller retries next run
--   <status>           → the row's current status when it is not
--                        releasable (cancelled/rejected/pending/not due)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.release_referral_hold(
  p_source_ref TEXT
)
RETURNS TABLE (outcome TEXT, ledger_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reward RECORD;
  v_outcome TEXT;
  v_ledger UUID;
BEGIN
  -- Lock the reward row: the refund path's pending/pending_hold →
  -- cancelled update serializes on this same row, so a refund can never
  -- slip between the credit grant and the status flip.
  SELECT * INTO v_reward
  FROM public.referral_rewards r
  WHERE r.source_ref = p_source_ref
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown referral reward: %', p_source_ref
      USING ERRCODE = 'P0001';
  END IF;

  IF v_reward.status = 'granted' THEN
    RETURN QUERY SELECT 'duplicate'::TEXT, v_reward.ledger_entry_id;
    RETURN;
  END IF;
  IF v_reward.status <> 'pending_hold' THEN
    RETURN QUERY SELECT v_reward.status::TEXT, NULL::UUID;
    RETURN;
  END IF;
  IF v_reward.hold_until IS NOT NULL AND v_reward.hold_until > NOW() THEN
    RETURN QUERY SELECT 'not_due'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Atomic with the row lock held: same key/metadata shape the app path
  -- used, so an earlier partial release dedupes on the ledger key.
  SELECT g.outcome, g.ledger_id INTO v_outcome, v_ledger
  FROM public.grant_subsidy_credits(
    v_reward.referrer_user_id,
    'referral_budget',
    v_reward.credits,
    'referral:payment_share:' || v_reward.referee_user_id::text,
    jsonb_build_object(
      'reason', 'referral_payment_share',
      'referee_user_id', v_reward.referee_user_id,
      'share', 0.3,
      'released_from_hold', true
    )
  ) g;

  IF v_outcome = 'budget_exhausted' THEN
    RETURN QUERY SELECT 'budget_exhausted'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  UPDATE public.referral_rewards r
  SET status = 'granted',
      ledger_entry_id = v_ledger,
      granted_at = NOW()
  WHERE r.id = v_reward.id;

  RETURN QUERY SELECT 'granted'::TEXT, v_ledger;
END;
$$;

REVOKE ALL ON FUNCTION public.release_referral_hold(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_referral_hold(TEXT)
  TO service_role;
