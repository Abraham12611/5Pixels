-- GrowSurf milestone rewards: with the program's referral trigger set to
-- "Sign Up", PARTICIPANT_REACHED_A_GOAL fires at signup for campaign
-- rewards configured in the Program Editor. The reward's editor metadata
-- key `spx_credits` (arrives camelCased as `spxCredits`) carries the
-- credit amount; the webhook grants it as kind='growsurf_milestone'.
-- earner_user_id records who received the credits because milestone
-- rewards can pay either side (isReferrer distinguishes them); the
-- referrer/referee columns stay for payment-share/unlock context.

ALTER TABLE public.referral_rewards
  DROP CONSTRAINT referral_rewards_kind_check;

ALTER TABLE public.referral_rewards
  ADD CONSTRAINT referral_rewards_kind_check
  CHECK (kind IN ('referee_unlock','referrer_payment_share','growsurf_milestone'));

ALTER TABLE public.referral_rewards
  ADD COLUMN IF NOT EXISTS earner_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_referral_rewards_earner
  ON public.referral_rewards(earner_user_id)
  WHERE earner_user_id IS NOT NULL;
