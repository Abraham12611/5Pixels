-- Teaser funnel: anonymous uploads + pending generations (02 §6, 08 §1).
-- A visitor can upload a source photo and "generate" before signup; the
-- intent is stored against an anon session and claimed on auth so that
-- unlock → real generation replays with zero re-input.

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS anon_session_id UUID;

CREATE INDEX IF NOT EXISTS idx_assets_anon_session
  ON public.assets(anon_session_id)
  WHERE anon_session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.pending_generations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  anon_session_id    UUID,
  product_version_id UUID NOT NULL REFERENCES public.product_versions(id),
  source_asset_id    UUID NOT NULL REFERENCES public.assets(id),
  params             JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_size        JSONB,
  teaser_variant     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at        TIMESTAMPTZ,
  expires_at         TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  CHECK (user_id IS NOT NULL OR anon_session_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_pending_generations_user
  ON public.pending_generations(user_id)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pending_generations_anon
  ON public.pending_generations(anon_session_id)
  WHERE consumed_at IS NULL;

ALTER TABLE public.pending_generations ENABLE ROW LEVEL SECURITY;
-- No policies: all access goes through the service role. Anon sessions
-- identify by unguessable UUID cookie, not by row-level grants.

-- Free-user teaser bookkeeping on profiles (02 §6).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_teaser_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS free_unlock_source TEXT
    CHECK (free_unlock_source IN ('payment', 'referral')),
  ADD COLUMN IF NOT EXISTS offers_opted_out BOOLEAN NOT NULL DEFAULT FALSE;
