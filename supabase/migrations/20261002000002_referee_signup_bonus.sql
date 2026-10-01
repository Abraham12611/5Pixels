-- Referee signup bonus (07 §6.6): the referred friend gets 25 credits
-- at claim, alongside the referrer's 50-credit bonus and the existing
-- free-transformation unlock. Extends the kind CHECK and adds the
-- same once-ever partial unique index the other kinds use.

ALTER TABLE public.referral_rewards
  DROP CONSTRAINT referral_rewards_kind_check;

ALTER TABLE public.referral_rewards
  ADD CONSTRAINT referral_rewards_kind_check
  CHECK (kind IN (
    'referee_unlock',
    'referrer_payment_share',
    'growsurf_milestone',
    'referrer_signup_bonus',
    'referee_signup_bonus'
  ));

-- One referee signup bonus per referee.
CREATE UNIQUE INDEX IF NOT EXISTS referral_rewards_referee_signup_once
  ON public.referral_rewards (referee_user_id, kind)
  WHERE kind = 'referee_signup_bonus' AND referee_user_id IS NOT NULL;
