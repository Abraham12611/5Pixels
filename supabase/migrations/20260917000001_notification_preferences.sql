-- Notification preference columns for the Account > Notifications page.
-- Stores per-user opt-ins for transactional product channels; account/security
-- notices remain system-managed and are not toggleable.
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notify_generation_completed BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_billing BOOLEAN NOT NULL DEFAULT true;
