-- fix(security): least-privilege EXECUTE grants (#139 PR D)
--
-- Privileged-RPC audit of all 73 SECURITY DEFINER functions in public
-- (matrix: docs/security/issue-139-rpc-permissions.md):
--   * every definer already pins search_path, every public table has RLS,
--     and privileged RPCs self-guard internally (is_admin/is_owner/
--     is_editorial_staff/ownership checks);
--   * remaining gaps: three newer trigger functions kept the default
--     PUBLIC EXECUTE grant, and get_user_balance() is callable by PUBLIC
--     although its only caller short-circuits signed-out users.

-- 1. Trigger functions fire regardless of function grants; EXECUTE only
--    controls direct calls, which can never succeed for a trigger-returning
--    function anyway. These three were granted to anon+authenticated by a
--    later blanket grant — revoke so the ACL matches the other trigger
--    functions hardened in 20260831190000_harden_security.
REVOKE EXECUTE ON FUNCTION public.notify_on_generation_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_approved_asset_content_overwrite() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_asset_moderation_escalation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_on_generation_status_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_approved_asset_content_overwrite() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_asset_moderation_escalation() TO service_role;

-- 2. get_user_balance() is SECURITY DEFINER over credit_ledger and was
--    callable by PUBLIC via the default grant. auth.uid() scoping meant
--    anon only ever saw 0, and lib/generation/balance.ts returns 0 for
--    signed-out users before calling the RPC — PUBLIC EXECUTE is
--    unnecessary. Restrict to the roles the app actually uses.
REVOKE EXECUTE ON FUNCTION public.get_user_balance() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_balance() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_balance() TO service_role;

-- 3. Convention: every definer function runs with SET search_path = ''.
--    notify_on_generation_status_change used 'public' — harmless today
--    (PUBLIC has no CREATE on the schema) but inconsistent.
ALTER FUNCTION public.notify_on_generation_status_change() SET search_path TO '';
