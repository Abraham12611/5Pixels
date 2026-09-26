-- GrowSurf bridge (03 §4/§5): referral rewards can now park in
-- 'pending_hold' while GrowSurf's delayed referral trigger (delayInDays,
-- 1–90) holds credit through the refund window, and 'cancelled' when a
-- refund cancels the pending trigger before it lands.
--
-- growsurf_prew_id stores the ParticipantReward id from
-- PARTICIPANT_REACHED_A_GOAL webhooks — the natural idempotency key for
-- reward deliveries (GrowSurf retries webhooks for days).
--
-- referral_participants.growsurf_synced_at marks when the local user was
-- pushed to GrowSurf so the sync stays a one-shot per account.

ALTER TABLE public.referral_rewards
  DROP CONSTRAINT IF EXISTS referral_rewards_status_check;

ALTER TABLE public.referral_rewards
  ADD CONSTRAINT referral_rewards_status_check
  CHECK (status IN (
    'pending',
    'pending_hold',
    'granted',
    'clawed_back',
    'cancelled',
    'rejected'
  ));

ALTER TABLE public.referral_rewards
  ADD COLUMN IF NOT EXISTS growsurf_prew_id TEXT,
  ADD COLUMN IF NOT EXISTS hold_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS referral_rewards_growsurf_prew_uidx
  ON public.referral_rewards (growsurf_prew_id)
  WHERE growsurf_prew_id IS NOT NULL;

ALTER TABLE public.referral_participants
  ADD COLUMN IF NOT EXISTS growsurf_synced_at TIMESTAMPTZ;
