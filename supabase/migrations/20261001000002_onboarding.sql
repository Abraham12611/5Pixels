-- Onboarding flow (08 §2B): multi-step post-signup questionnaire.
-- onboarding_completed_at NULL = the user belongs in /onboarding;
-- existing accounts are backfilled so only post-deploy signups see it.
-- username already exists (20260913100000_profile_fields) — the flow
-- writes it; the unique index enforces uniqueness case-insensitively.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_answers JSONB,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Everyone with an existing account is grandfathered past the flow.
UPDATE public.profiles
  SET onboarding_completed_at = NOW()
  WHERE onboarding_completed_at IS NULL;
