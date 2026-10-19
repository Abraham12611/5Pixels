-- #195: eliminate infinite recursion in RLS evaluation on public.profiles.
--
-- Root cause — two cooperating defects:
--
--   1. public.is_admin() / public.is_owner() are LANGUAGE sql SECURITY
--      DEFINER functions. Inlinable SQL functions lose their definer
--      context when the planner inlines them into a caller's query tree:
--      the inner `SELECT ... FROM public.profiles` then executes under the
--      *caller's* RLS, expanding profiles' policies mid-plan.
--
--   2. profiles_read_self contains a raw self-referencing subquery
--      `SELECT is_admin FROM public.profiles WHERE id = auth.uid()` on the
--      table the policy protects. Any plan that expands profiles RLS
--      re-enters the same policy → 42P17
--      "infinite recursion detected in policy for relation profiles".
--
-- Net effect: every PostgREST request whose policy path touches profiles
-- under caller RLS — assets_select/insert/update, products_select,
-- generations_owner, favorites, catalog policies — returns 500 for
-- authenticated callers. Reproduced with an owner PATCH on public.assets:
-- HTTP 500, code 42P17.
--
-- Fix:
--
--   a) is_admin() / is_owner() → LANGUAGE plpgsql. plpgsql bodies can
--      never be inlined, so the profiles read always executes under the
--      function owner (bypasses RLS) — re-entry is impossible.
--   b) profiles_read_self → `id = auth.uid() OR public.is_admin()`: the
--      self-subquery seed is removed, so raw profiles subqueries that
--      remain in older policies (products_select, generations_owner, …)
--      now terminate: expansion reaches is_admin() → definer read → done.
--   c) anon gets EXECUTE on both helpers. Policy expressions are planned
--      for every role a policy covers (no TO clause → all roles); a
--      missing grant turns clean denials into permission errors. The
--      helpers return FALSE whenever auth.uid() is NULL — no leakage.
--
-- Access semantics are unchanged: same tables, same role gates, same
-- results. Only the evaluation path changes. The #179/#193 moderation
-- protections (prevent_asset_moderation_escalation trigger, approved
-- object immutability, version-bound approvals) are untouched and are
-- re-verified by the DB suite.

-- 1. Non-inlinable audited role helpers ------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid())),
    FALSE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT is_owner FROM public.profiles WHERE id = (SELECT auth.uid())),
    FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
REVOKE ALL ON FUNCTION public.is_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_owner() TO anon, authenticated;

-- 2. Remove the self-referencing subquery from profiles --------------------

DROP POLICY IF EXISTS "profiles_read_self" ON public.profiles;
CREATE POLICY "profiles_read_self" ON public.profiles
  FOR SELECT
  USING (
    id = (SELECT auth.uid())
    OR public.is_admin()
  );
