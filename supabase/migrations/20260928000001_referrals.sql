-- Referral program (03 §5): participants + rewards, service-role only.
-- source_ref generalizes the doc's growsurf_reward_id so first-party
-- rewards (pre-GrowSurf) and future GrowSurf reward ids share one
-- idempotency column. UNIQUE on source_ref is the DB-level idempotency
-- guarantee — it holds even if application logic has a bug.

CREATE TABLE IF NOT EXISTS public.referral_participants (
  user_id       UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  growsurf_id   TEXT UNIQUE,
  referral_code TEXT,
  referred_by   UUID REFERENCES public.profiles(id),
  fraud_score   NUMERIC,
  blocked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_referral CHECK (user_id <> referred_by)
);

CREATE INDEX IF NOT EXISTS idx_referral_participants_referrer
  ON public.referral_participants(referred_by)
  WHERE referred_by IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ref       TEXT NOT NULL UNIQUE,
  referrer_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_user_id  UUID REFERENCES public.profiles(id),
  kind             TEXT NOT NULL
    CHECK (kind IN ('referee_unlock','referrer_payment_share')),
  credits          INTEGER,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','granted','clawed_back','rejected')),
  ledger_entry_id  UUID REFERENCES public.credit_ledger(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_at       TIMESTAMPTZ
);

-- The referrer's payment-share fires exactly once per referee, on their
-- first payment (03 §1). Partial unique index enforces once-ever at the
-- DB level; a second payment can never re-grant.
CREATE UNIQUE INDEX IF NOT EXISTS referral_rewards_payment_share_once
  ON public.referral_rewards (referee_user_id, kind)
  WHERE kind = 'referrer_payment_share' AND referee_user_id IS NOT NULL;

-- Same for the referee's free unlock — one per referred account.
CREATE UNIQUE INDEX IF NOT EXISTS referral_rewards_unlock_once
  ON public.referral_rewards (referee_user_id, kind)
  WHERE kind = 'referee_unlock' AND referee_user_id IS NOT NULL;

ALTER TABLE public.referral_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
-- No policies: all reads/writes go through the service role.
