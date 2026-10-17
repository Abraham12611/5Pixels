-- fix(db): forward-port hosted caller-check on get_active_plan_id
--
-- The hosted project carries a manual hardening (recorded there as
-- 20261023000001 get_active_plan_id_caller_check) that was never in the
-- repo: the function reads another user's subscription/invoice rows, so
-- callers must be the subject themselves or the service role. Without this
-- forward-port, the next `supabase db reset` or fresh environment would
-- silently drop the authorization check.

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
GRANT EXECUTE ON FUNCTION public.get_active_plan_id(UUID) TO authenticated;
