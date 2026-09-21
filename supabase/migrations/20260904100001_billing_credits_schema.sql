-- Billing & Credits Schema (PR A)
-- Creates plan, subscription, invoice, and provider pricing tables.
-- Also migrates existing credit columns from INT to NUMERIC(12,4) to
-- support fractional dynamic credits.

-- ---------------------------------------------------------------------------
-- 1. New tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('weekly_trial', 'monthly', 'extra_credit')),
  price_cents INT NOT NULL,
  currency TEXT DEFAULT 'USD',
  credits_grant NUMERIC(12,4) DEFAULT 0,
  markup_multiplier NUMERIC(6,4) NOT NULL,
  interval TEXT CHECK (interval IN ('weekly', 'monthly', 'one_time')),
  is_trial BOOLEAN DEFAULT false,
  can_repurchase BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  trial BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  dodo_subscription_id TEXT,
  dodo_customer_id TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  plan_id UUID REFERENCES public.plans(id),
  subscription_id UUID REFERENCES public.subscriptions(id),
  amount_cents INT NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  dodo_payment_id TEXT,
  dodo_checkout_session_id TEXT,
  dodo_subscription_id TEXT,
  credit_ledger_entry_id UUID REFERENCES public.credit_ledger(id),
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.provider_model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  provider TEXT NOT NULL DEFAULT 'fal',
  endpoint_id TEXT NOT NULL,
  unit_price NUMERIC(12,8) NOT NULL,
  unit TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  UNIQUE(provider, endpoint_id, effective_from)
);

CREATE TABLE IF NOT EXISTS public.fal_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  generation_id UUID REFERENCES public.generations(id),
  endpoint_id TEXT,
  raw_cost_usd NUMERIC(12,8),
  quantity NUMERIC(12,4),
  unit TEXT,
  compute_seconds NUMERIC(8,2),
  invoice_id TEXT
);

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_plans_active_sort ON public.plans(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_plans_slug ON public.plans(slug);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_dodo ON public.subscriptions(dodo_subscription_id);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON public.invoices(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_dodo_payment ON public.invoices(dodo_payment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_dodo_session ON public.invoices(dodo_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_provider_pricing_endpoint ON public.provider_model_pricing(provider, endpoint_id, effective_from DESC, is_active);
CREATE INDEX IF NOT EXISTS idx_fal_usage_generation ON public.fal_usage_logs(generation_id);

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_model_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fal_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plans_public_read ON public.plans;
CREATE POLICY plans_public_read ON public.plans
  FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS subscriptions_owner ON public.subscriptions;
CREATE POLICY subscriptions_owner ON public.subscriptions
  FOR ALL TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS invoices_owner ON public.invoices;
CREATE POLICY invoices_owner ON public.invoices
  FOR ALL TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS provider_pricing_authenticated_read ON public.provider_model_pricing;
CREATE POLICY provider_pricing_authenticated_read ON public.provider_model_pricing
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS fal_usage_logs_no_user_read ON public.fal_usage_logs;
CREATE POLICY fal_usage_logs_no_user_read ON public.fal_usage_logs
  FOR SELECT TO authenticated USING (false);

-- ---------------------------------------------------------------------------
-- 4. Existing credit columns migration
-- ---------------------------------------------------------------------------

ALTER TABLE public.credit_ledger
  ALTER COLUMN amount TYPE NUMERIC(12,4);

ALTER TABLE public.product_versions
  ALTER COLUMN credit_cost TYPE NUMERIC(12,4);

ALTER TABLE public.generations
  ALTER COLUMN credit_cost TYPE NUMERIC(12,4);

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS actual_credit_cost NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS markup_multiplier NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS provider_cost_usd NUMERIC(12,8);

-- ---------------------------------------------------------------------------
-- 5. Updated helper functions to use NUMERIC credit amounts
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_user_balance();
CREATE OR REPLACE FUNCTION public.get_user_balance()
RETURNS NUMERIC(12,4)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,4)
  FROM public.credit_ledger
  WHERE user_id = (SELECT auth.uid());
$$;

DROP FUNCTION IF EXISTS public.get_available_balance();
CREATE OR REPLACE FUNCTION public.get_available_balance()
RETURNS NUMERIC(12,4)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,4)
  FROM public.credit_ledger
  WHERE user_id = (SELECT auth.uid())
    AND entry_type <> 'reservation';
$$;

-- Recreate create_generation with NUMERIC credit fields.
-- The static cost logic is preserved for PR A; dynamic cost logic arrives in PR B.
DROP FUNCTION IF EXISTS public.create_generation(UUID, UUID, UUID, JSONB, TEXT);
CREATE OR REPLACE FUNCTION public.create_generation(
  p_product_id UUID,
  p_product_version_id UUID,
  p_source_asset_id UUID,
  p_options JSONB,
  p_idempotency_key TEXT
)
RETURNS TABLE (
  generation_id UUID,
  status TEXT,
  processing_token TEXT,
  balance_after NUMERIC(12,4),
  credit_cost NUMERIC(12,4)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing_id UUID;
  v_existing_status TEXT;
  v_credit_cost NUMERIC(12,4);
  v_source_owner UUID;
  v_source_bucket TEXT;
  v_balance NUMERIC(12,4);
  v_token TEXT;
  v_token_hash TEXT;
  v_validation_error TEXT;
  v_generation_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
  END IF;

  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 16 OR length(p_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'Invalid idempotency key' USING ERRCODE = 'P0001';
  END IF;

  IF p_options IS NULL OR jsonb_typeof(p_options) <> 'object' OR pg_column_size(p_options) > 16384 THEN
    RAISE EXCEPTION 'Invalid generation options' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::TEXT, 0));

  -- Idempotency: return the existing generation without charging again.
  SELECT g.id, g.status, g.credit_cost
    INTO v_existing_id, v_existing_status, v_credit_cost
  FROM public.generations g
  WHERE g.user_id = v_user_id AND g.idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    generation_id := v_existing_id;
    status := v_existing_status;
    processing_token := NULL;
    balance_after := (
      SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,4)
      FROM public.credit_ledger
      WHERE user_id = v_user_id
    );
    credit_cost := COALESCE(v_credit_cost, 0);
    RETURN NEXT;
    RETURN;
  END IF;

  -- Verify active public product + active version, and load the authoritative cost.
  SELECT v.credit_cost
    INTO v_credit_cost
  FROM public.products p
  JOIN public.product_versions v ON v.product_id = p.id
  WHERE p.id = p_product_id
    AND p.public_status = 'active'
    AND p.visibility = 'public'
    AND v.id = p_product_version_id
    AND v.state = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid product or version' USING ERRCODE = 'P0001';
  END IF;

  -- Verify source asset exists, is owned by the caller, and lives in user-assets.
  SELECT owner_user_id, bucket INTO v_source_owner, v_source_bucket
  FROM public.assets
  WHERE id = p_source_asset_id;

  IF v_source_owner IS NULL OR v_source_owner <> v_user_id OR v_source_bucket <> 'user-assets' THEN
    RAISE EXCEPTION 'Invalid source asset' USING ERRCODE = 'P0001';
  END IF;

  -- Validate options against active product_fields.
  v_validation_error := public.validate_generation_options(p_product_id, p_options);
  IF v_validation_error IS NOT NULL THEN
    RAISE EXCEPTION '%', v_validation_error USING ERRCODE = 'P0001';
  END IF;

  -- Credit check (use the authoritative cost from the active version).
  SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,4) INTO v_balance
  FROM public.credit_ledger
  WHERE user_id = v_user_id;

  IF v_balance < v_credit_cost THEN
    RAISE EXCEPTION 'Insufficient credits' USING ERRCODE = 'P0001';
  END IF;

  -- One-time processing token returned only on creation.
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_token::bytea, 'sha256'), 'hex');

  -- Create the generation row first so the ledger reservation can reference it.
  INSERT INTO public.generations (
    user_id,
    product_id,
    product_version_id,
    source_asset_id,
    status,
    requested_options,
    compiled_request_fingerprint,
    idempotency_key,
    processing_token_hash,
    credit_cost,
    actual_credit_cost,
    markup_multiplier,
    provider_cost_usd
  )
  VALUES (
    v_user_id,
    p_product_id,
    p_product_version_id,
    p_source_asset_id,
    'created',
    p_options,
    encode(extensions.digest(p_options::text::bytea, 'sha256'), 'hex'),
    p_idempotency_key,
    v_token_hash,
    v_credit_cost,
    NULL,
    NULL,
    NULL
  )
  RETURNING id INTO v_generation_id;

  -- Reserve credits atomically and link the ledger row to the generation.
  IF v_credit_cost > 0 THEN
    INSERT INTO public.credit_ledger (
      user_id,
      entry_type,
      amount,
      generation_id,
      idempotency_key,
      metadata
    ) VALUES (
      v_user_id,
      'reservation',
      -v_credit_cost,
      v_generation_id,
      'reserve:' || p_idempotency_key,
      jsonb_build_object('product_id', p_product_id, 'product_version_id', p_product_version_id)
    );
  END IF;

  generation_id := v_generation_id;
  status := 'created';
  processing_token := v_token;
  balance_after := (
    SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,4)
    FROM public.credit_ledger
    WHERE user_id = v_user_id
  );
  credit_cost := v_credit_cost;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_generation(UUID, UUID, UUID, JSONB, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_generation(UUID, UUID, UUID, JSONB, TEXT)
  TO authenticated;

-- Ensure get_available_balance is also callable by authenticated users.
REVOKE ALL ON FUNCTION public.get_available_balance() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_balance() TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Seed plans
-- Dodo product IDs must be filled in after products are created in the Dodo
-- dashboard.  Placeholder slugs are stored in metadata.
-- ---------------------------------------------------------------------------

INSERT INTO public.plans (
  slug, name, type, price_cents, currency, credits_grant, markup_multiplier,
  interval, is_trial, can_repurchase, sort_order, is_active, metadata
) VALUES
  ('weekly-starter', 'Weekly Trial — Starter', 'weekly_trial', 500, 'USD', 500, 4.0000,
   'one_time', true, false, 10, true,
   '{"dodo_product_slug": "weekly-starter", "dodo_product_id": null, "trial_days": 7}'::jsonb),
  ('weekly-plus', 'Weekly Trial — Plus', 'weekly_trial', 1000, 'USD', 1000, 3.5000,
   'one_time', true, false, 20, true,
   '{"dodo_product_slug": "weekly-plus", "dodo_product_id": null, "trial_days": 7}'::jsonb),
  ('monthly-creator', 'Creator', 'monthly', 2000, 'USD', 2000, 3.0000,
   'monthly', false, true, 30, true,
   '{"dodo_product_slug": "monthly-creator", "dodo_product_id": null}'::jsonb),
  ('monthly-pro', 'Pro', 'monthly', 3000, 'USD', 3000, 2.5000,
   'monthly', false, true, 40, true,
   '{"dodo_product_slug": "monthly-pro", "dodo_product_id": null}'::jsonb),
  ('monthly-studio', 'Studio', 'monthly', 5000, 'USD', 5500, 2.0000,
   'monthly', false, true, 50, true,
   '{"dodo_product_slug": "monthly-studio", "dodo_product_id": null}'::jsonb),
  ('monthly-agency', 'Agency', 'monthly', 10000, 'USD', 12000, 1.7000,
   'monthly', false, true, 60, true,
   '{"dodo_product_slug": "monthly-agency", "dodo_product_id": null}'::jsonb),
  ('extra-credits', 'Extra Credits', 'extra_credit', 1000, 'USD', 0, 1.5000,
   'one_time', false, true, 70, true,
   '{"dodo_product_slug": "extra-credits", "dodo_product_id": null, "min_price_cents": 1000, "is_variable_price": true}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. Grants
-- ---------------------------------------------------------------------------

GRANT SELECT ON public.plans TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT ON public.invoices TO authenticated;
GRANT SELECT ON public.provider_model_pricing TO authenticated;
