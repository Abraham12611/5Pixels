-- Fix for GitHub issue #139: public.get_active_plan_id(p_user_id uuid) was
-- callable by any authenticated session with an arbitrary user id, leaking
-- whether another account holds an active plan (cross-account lookup).
-- The function keeps its SECURITY DEFINER lookup but now refuses to answer
-- for anyone other than the JWT subject (auth.uid()), with a service_role
-- exemption for server-side callers. EXECUTE stays limited to
-- authenticated + service_role; anon/PUBLIC get nothing.
-- Idempotent: safe to re-apply.

CREATE OR REPLACE FUNCTION public.get_active_plan_id(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_user_id IS NULL
     OR ((SELECT auth.uid()) IS DISTINCT FROM p_user_id
         AND COALESCE((SELECT auth.role()), '') <> 'service_role') THEN
    RAISE EXCEPTION 'not authorized to read plan for this user'
      USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT COALESCE(
      (
        SELECT s.plan_id
        FROM public.subscriptions s
        WHERE s.user_id = p_user_id
          AND s.status = 'active'
          AND s.current_period_end > NOW()
        ORDER BY s.current_period_end DESC
        LIMIT 1
      ),
      (
        SELECT i.plan_id
        FROM public.invoices i
        JOIN public.plans pl ON pl.id = i.plan_id
        WHERE i.user_id = p_user_id
          AND i.status = 'paid'
          AND pl.type = 'weekly_trial'
          AND i.created_at > NOW() - INTERVAL '7 days'
        ORDER BY i.created_at DESC
        LIMIT 1
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_plan_id(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_plan_id(UUID) TO authenticated, service_role;
