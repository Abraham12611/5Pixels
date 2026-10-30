-- fix(security): grant legitimate profile-edit columns to authenticated (#139)
--
-- profile/actions.ts lets a user edit username, headline, bio, location,
-- socials and show_spent_credits (added by 20260913100000_profile_fields),
-- but the column-level grant in 20260901000000_admin_asset_storage only
-- covered display_name, avatar_asset_id, locale and timezone — so every
-- update to the newer fields failed with "permission denied for table
-- profiles". Extend the grant to exactly the editable set.
--
-- Privileged columns stay ungranted (id, email, is_admin, is_owner, status,
-- created_at) — column-level ACL is the primary control, and the
-- prevent_profile_privilege_escalation trigger still rejects any attempt
-- that would change them as a second layer.
GRANT UPDATE (username, headline, bio, location, socials, show_spent_credits)
  ON public.profiles TO authenticated;
