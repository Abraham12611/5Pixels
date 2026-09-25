-- Offer engine (08 §3, 09 §2): campaigns, ordered ladder steps per variant,
-- write-once assignments, and the promo event stream. All access is
-- service-role only — clients talk to validated server actions.
CREATE TABLE IF NOT EXISTS public.promo_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  audience        TEXT[] NOT NULL,
  surfaces        TEXT[] NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','live','paused','archived')),
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  frequency       JSONB NOT NULL DEFAULT '{}',
  variant_weights JSONB NOT NULL DEFAULT '{}',
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.promo_steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.promo_campaigns(id) ON DELETE CASCADE,
  variant     TEXT NOT NULL DEFAULT 'default',
  position    SMALLINT NOT NULL,
  kind        TEXT NOT NULL
    CHECK (kind IN ('weekly_pair','discount','plans','referral','topup','exit')),
  payload     JSONB NOT NULL DEFAULT '{}',
  UNIQUE (campaign_id, variant, position)
);

-- Sticky, write-once bucketing (08 §4/§5): one row per subject per campaign.
CREATE TABLE IF NOT EXISTS public.promo_assignments (
  user_id      UUID REFERENCES public.profiles(id),
  anon_id      UUID,
  campaign_id  UUID NOT NULL REFERENCES public.promo_campaigns(id),
  variant      TEXT NOT NULL,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR anon_id IS NOT NULL)
);

-- Uniqueness on an expression needs an index, not a constraint. The subject
-- key is user_id when known else anon_id — the CHECK guarantees one is set.
CREATE UNIQUE INDEX IF NOT EXISTS promo_assignments_subject_key
  ON public.promo_assignments (COALESCE(user_id, anon_id), campaign_id);

CREATE TABLE IF NOT EXISTS public.promo_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id),
  anon_id     UUID,
  campaign_id UUID REFERENCES public.promo_campaigns(id),
  variant     TEXT,
  step        SMALLINT,
  surface     TEXT,
  event       TEXT NOT NULL
    CHECK (event IN ('impression','step_view','accept','decline','dismiss','opt_out','checkout_started','converted','refunded')),
  context     TEXT,
  meta        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_events_funnel
  ON public.promo_events(campaign_id, variant, event, created_at);
CREATE INDEX IF NOT EXISTS idx_promo_events_user
  ON public.promo_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_promo_events_anon
  ON public.promo_events(anon_id, created_at);
CREATE INDEX IF NOT EXISTS idx_promo_assignments_user
  ON public.promo_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_assignments_anon
  ON public.promo_assignments(anon_id);

ALTER TABLE public.promo_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_events ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only. Admin reads/writes go through server code;
-- consumer clients can never read another subject's bucket or forge events.

-- Seed the post-signup ladder (08 §3 A_default): weekly trials → referral →
-- plans, all traffic on one variant until the admin console ships weights.
INSERT INTO public.promo_campaigns (slug, name, audience, surfaces, status, variant_weights, frequency)
VALUES (
  'post_signup_ladder',
  'Post-signup result unlock',
  ARRAY['new_signup','free'],
  ARRAY['takeover'],
  'live',
  '{"A_default":100}'::jsonb,
  '{"takeover_per_day":1,"takeover_lifetime":3,"full_decline_cooldown_hours":72}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.promo_steps (campaign_id, variant, position, kind, payload)
SELECT c.id, 'A_default', s.position, s.kind, s.payload
FROM public.promo_campaigns c
CROSS JOIN (VALUES
  (0::smallint, 'weekly_pair'::text, '{"headline":"Start with a weekly pass"}'::jsonb),
  (1::smallint, 'referral'::text, '{}'::jsonb),
  (2::smallint, 'plans'::text, '{"headline":"Unlock every look"}'::jsonb),
  (3::smallint, 'exit'::text, '{}'::jsonb)
) AS s(position, kind, payload)
WHERE c.slug = 'post_signup_ladder'
ON CONFLICT (campaign_id, variant, position) DO NOTHING;
