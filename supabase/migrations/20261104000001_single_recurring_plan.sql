-- Issue #247: one active/past_due recurring (monthly/annual) subscription
-- per user.
--
-- Checkout already gates weekly passes and trials, but nothing stopped a
-- second monthly/annual checkout — or two racing Bachs webhooks — from
-- leaving one user with two live recurring plans. Until a real
-- upgrade/downgrade flow exists the system fails closed: a second
-- recurring subscription for the same user can never be written as
-- active/past_due.
--
-- Scope: only plans.type IN ('monthly','annual') occupy the invariant.
-- Weekly-pass and extra-credit rules are unchanged; cancelled/expired
-- rows never conflict (a lapsed user can subscribe again).
--
-- 1. Predicate used by the checkout guard and admin surfaces.
--    Mirrors the get_active_plan_id (#139) authorization contract:
--    self or service_role only; anon gets no EXECUTE.

CREATE OR REPLACE FUNCTION public.has_active_recurring_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Self or trusted server context only. auth.role() is NULL for direct
  -- service/DB access (and under `SET ROLE` without claims); a JWT caller
  -- always presents a role, so '' can only mean server-side.
  IF p_user_id IS NULL
     OR ((SELECT auth.uid()) IS DISTINCT FROM p_user_id
         AND COALESCE((SELECT auth.role()), '') NOT IN ('service_role', '')) THEN
    RAISE EXCEPTION 'not authorized to read subscriptions for this user'
      USING ERRCODE = '42501';
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.user_id = p_user_id
      AND s.status IN ('active', 'past_due')
      AND p.type IN ('monthly', 'annual')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.has_active_recurring_subscription(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_recurring_subscription(UUID)
  TO authenticated, service_role;

-- 2. Defense-in-depth: trigger on subscriptions. The existence check
--    alone races under concurrent webhook deliveries, so the trigger
--    first takes a per-user transaction-scoped advisory lock — the same
--    serialization primitive create_generation uses — forcing the second
--    writer to re-check against committed state before inserting.

CREATE OR REPLACE FUNCTION public.enforce_single_recurring_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_conflict UUID;
BEGIN
  -- Terminal/inactive rows never conflict: cancellation and expiry must
  -- always be writable — they are the recovery path out of a conflict.
  IF NEW.status NOT IN ('active', 'past_due') THEN
    RETURN NEW;
  END IF;

  -- Only recurring plans occupy the invariant; weekly-pass and
  -- extra-credit subscription rows are governed by their own rules.
  IF NOT EXISTS (
    SELECT 1 FROM public.plans
    WHERE id = NEW.plan_id AND type IN ('monthly', 'annual')
  ) THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::TEXT, 0));

  SELECT s.id INTO v_conflict
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.user_id = NEW.user_id
    AND s.status IN ('active', 'past_due')
    AND p.type IN ('monthly', 'annual')
    AND s.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  LIMIT 1;

  IF v_conflict IS NOT NULL THEN
    -- Distinct message prefix lets fulfillment classify this as a
    -- billing anomaly rather than a generic failure.
    RAISE EXCEPTION
      'single_recurring_plan: user % already holds active recurring subscription %',
      NEW.user_id, v_conflict;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_single_recurring ON public.subscriptions;
CREATE TRIGGER subscriptions_single_recurring
  BEFORE INSERT OR UPDATE OF user_id, plan_id, status
  ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_recurring_subscription();
