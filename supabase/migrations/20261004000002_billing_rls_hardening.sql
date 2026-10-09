-- Billing trust-boundary hardening (external billing review).
--
-- subscriptions and invoices previously granted INSERT/UPDATE to the
-- authenticated role with owner-scoped FOR ALL policies. A signed-in user
-- could therefore fabricate billing state:
--   * an "active" subscription row → get_user_markup_multiplier() applies the
--     plan's lower burn markup (e.g. Agency 1.7x) without paying;
--   * a "paid" invoice row → hasEverPaid() suppresses promo/offer surfaces.
-- Billing authority must flow only through verified webhooks + service-role
-- fulfillment. All application writes to these tables already go through
-- createServiceClient(), so narrowing the grants breaks nothing.
--
-- provider_model_pricing was also readable by any authenticated user, leaking
-- internal provider endpoint IDs and unit prices — a "private intelligence"
-- violation. All server-side readers use the service client, so the
-- authenticated grant/policy is dropped entirely.

-- ---------------------------------------------------------------------------
-- subscriptions: read-only for owners
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS subscriptions_owner ON public.subscriptions;

CREATE POLICY subscriptions_owner_read ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;

-- ---------------------------------------------------------------------------
-- invoices: read-only for owners
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS invoices_owner ON public.invoices;

CREATE POLICY invoices_owner_read ON public.invoices
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.invoices FROM authenticated;

-- ---------------------------------------------------------------------------
-- provider_model_pricing: internal data — no client access at all
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS provider_pricing_authenticated_read ON public.provider_model_pricing;

REVOKE SELECT ON public.provider_model_pricing FROM authenticated;
