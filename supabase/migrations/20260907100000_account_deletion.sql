-- Account deletion support (Phase 9.3)
-- Adds a soft-deletion timestamp to profiles and a helper to cancel active subscriptions on delete.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at)
  WHERE deleted_at IS NOT NULL;
