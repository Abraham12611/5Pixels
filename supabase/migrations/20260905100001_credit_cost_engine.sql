-- Credit Cost Engine (PR B)
-- Adds output_size support to product_versions and makes generation credit
-- reservation/finalization dynamic based on provider model pricing, output
-- dimensions, active plan markup, and a 10% safety buffer.

-- ---------------------------------------------------------------------------
-- 1. Schema changes
-- ---------------------------------------------------------------------------

ALTER TABLE public.product_versions
  ADD COLUMN IF NOT EXISTS output_sizes JSONB;

-- Seed default output sizes for existing versions that have width/height in
-- model_config.  This is a one-time backfill; new versions will set it via UI.
UPDATE public.product_versions
SET output_sizes = jsonb_build_array(
  jsonb_build_object(
    'name', concat(COALESCE(model_config->>'width','1024'), 'x', COALESCE(model_config->>'height','1024')),
    'width', COALESCE((model_config->>'width')::int, 1024),
    'height', COALESCE((model_config->>'height')::int, 1024),
    'is_default', true
  )
)
WHERE output_sizes IS NULL
  AND (model_config->>'width') IS NOT NULL
  AND (model_config->>'height') IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Helper functions
-- ---------------------------------------------------------------------------

-- Compute credits from a raw provider cost, markup, and 10% safety buffer.
-- Result is rounded UP to 2 decimal places (whole-cent credit precision).
DROP FUNCTION IF EXISTS public.calculate_credit_cost(NUMERIC, NUMERIC, NUMERIC);
CREATE OR REPLACE FUNCTION public.calculate_credit_cost(
  p_unit_price NUMERIC(12,8),
  p_quantity NUMERIC(12,4),
  p_markup_multiplier NUMERIC(6,4)
)
RETURNS NUMERIC(12,4)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CEIL((p_unit_price * p_quantity * 1.10 * p_markup_multiplier / 0.01) * 100) / 100;
$$;

REVOKE ALL ON FUNCTION public.calculate_credit_cost(NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_credit_cost(NUMERIC, NUMERIC, NUMERIC) TO authenticated;

-- Return the markup multiplier for a user based on active subscription,
-- recent weekly trial invoice, or the default weekly-starter markup.
DROP FUNCTION IF EXISTS public.get_user_markup_multiplier(UUID);
CREATE OR REPLACE FUNCTION public.get_user_markup_multiplier(p_user_id UUID)
RETURNS NUMERIC(6,4)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    -- Active monthly subscription
    (
      SELECT pl.markup_multiplier
      FROM public.subscriptions s
      JOIN public.plans pl ON pl.id = s.plan_id
      WHERE s.user_id = p_user_id
        AND s.status = 'active'
        AND s.current_period_end > NOW()
      ORDER BY s.current_period_end DESC
      LIMIT 1
    ),
    -- Recent weekly trial (within 7 days of purchase)
    (
      SELECT pl.markup_multiplier
      FROM public.invoices i
      JOIN public.plans pl ON pl.id = i.plan_id
      WHERE i.user_id = p_user_id
        AND i.status = 'paid'
        AND pl.type = 'weekly_trial'
        AND i.created_at > NOW() - INTERVAL '7 days'
      ORDER BY i.created_at DESC
      LIMIT 1
    ),
    -- Default no-plan markup
    (
      SELECT pl.markup_multiplier
      FROM public.plans pl
      WHERE pl.slug = 'weekly-starter'
      LIMIT 1
    ),
    4.0000
  );
$$;

REVOKE ALL ON FUNCTION public.get_user_markup_multiplier(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_markup_multiplier(UUID) TO authenticated;

-- Return the active plan for a user.  For now this is just the plan_id used
-- to derive markup, but it can be expanded for entitlement checks later.
DROP FUNCTION IF EXISTS public.get_active_plan_id(UUID);
CREATE OR REPLACE FUNCTION public.get_active_plan_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
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
  );
$$;

REVOKE ALL ON FUNCTION public.get_active_plan_id(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_plan_id(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Updated create_generation with dynamic cost reservation
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.create_generation(UUID, UUID, UUID, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.create_generation(UUID, UUID, UUID, JSONB, TEXT, TEXT, INT, INT);
CREATE OR REPLACE FUNCTION public.create_generation(
  p_product_id UUID,
  p_product_version_id UUID,
  p_source_asset_id UUID,
  p_options JSONB,
  p_idempotency_key TEXT,
  p_provider_endpoint TEXT,
  p_output_width INT,
  p_output_height INT
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
  v_version_credit_cost NUMERIC(12,4);
  v_provider_strategy JSONB;
  v_source_owner UUID;
  v_source_bucket TEXT;
  v_balance NUMERIC(12,4);
  v_available NUMERIC(12,4);
  v_token TEXT;
  v_token_hash TEXT;
  v_validation_error TEXT;
  v_generation_id UUID;
  v_markup NUMERIC(6,4);
  v_pricing RECORD;
  v_quantity NUMERIC(12,4);
  v_unit_price NUMERIC(12,8);
  v_unit TEXT;
  v_raw_cost NUMERIC(12,8);
  v_credit_cost NUMERIC(12,4);
  v_provider_cost_usd NUMERIC(12,8);
  v_max_pixels INT := 4000000;
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

  IF p_output_width IS NULL OR p_output_height IS NULL
     OR p_output_width <= 0 OR p_output_height <= 0
     OR (p_output_width::bigint * p_output_height::bigint) > v_max_pixels THEN
    RAISE EXCEPTION 'Invalid output size' USING ERRCODE = 'P0001';
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

  -- Verify active public product + active version, and load the static cost fallback.
  SELECT v.credit_cost, v.provider_strategy
    INTO v_version_credit_cost, v_provider_strategy
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

  -- Determine the user's markup.
  v_markup := public.get_user_markup_multiplier(v_user_id);

  -- Look up pricing for the requested endpoint.
  SELECT unit_price, unit
    INTO v_pricing
  FROM public.provider_model_pricing
  WHERE provider = 'fal'
    AND endpoint_id = p_provider_endpoint
    AND is_active = true
    AND effective_from <= NOW()
  ORDER BY effective_from DESC
  LIMIT 1;

  IF FOUND THEN
    v_unit_price := v_pricing.unit_price;
    v_unit := v_pricing.unit;

    -- Compute quantity from unit + selected output size.
    v_quantity := CASE
      WHEN v_unit IN ('images', 'generations') THEN 1::NUMERIC(12,4)
      WHEN v_unit = 'megapixel' THEN (p_output_width::NUMERIC(12,4) * p_output_height::NUMERIC(12,4)) / 1000000
      WHEN v_unit IN ('compute seconds', 'seconds') THEN 15::NUMERIC(12,4) -- worst-case cap
      ELSE 1::NUMERIC(12,4)
    END;

    v_raw_cost := v_unit_price * v_quantity;
    v_credit_cost := public.calculate_credit_cost(v_unit_price, v_quantity, v_markup);
    v_provider_cost_usd := v_raw_cost;
  ELSE
    -- No provider pricing: fall back to the product version's static credit cost.
    v_credit_cost := COALESCE(v_version_credit_cost, 0);
    v_markup := 1.0000;
    v_provider_cost_usd := NULL;
  END IF;

  -- Credit check uses available balance (excludes open reservations).
  SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,4) INTO v_balance
  FROM public.credit_ledger
  WHERE user_id = v_user_id;

  SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,4) INTO v_available
  FROM public.credit_ledger
  WHERE user_id = v_user_id
    AND entry_type <> 'reservation';

  IF v_available < v_credit_cost THEN
    RAISE EXCEPTION 'Insufficient credits' USING ERRCODE = 'P0001';
  END IF;

  -- One-time processing token returned only on creation.
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_token::bytea, 'sha256'), 'hex');

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
    v_markup,
    v_provider_cost_usd
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
      jsonb_build_object(
        'product_id', p_product_id,
        'product_version_id', p_product_version_id,
        'provider_endpoint', p_provider_endpoint,
        'output_width', p_output_width,
        'output_height', p_output_height,
        'estimated_quantity', v_quantity,
        'unit', v_unit
      )
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

REVOKE ALL ON FUNCTION public.create_generation(UUID, UUID, UUID, JSONB, TEXT, TEXT, INT, INT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_generation(UUID, UUID, UUID, JSONB, TEXT, TEXT, INT, INT)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Updated complete_generation with dynamic final debit
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.complete_generation(UUID, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.complete_generation(
  p_generation_id UUID,
  p_token TEXT,
  p_output_asset_id UUID,
  p_compute_seconds NUMERIC(8,2) DEFAULT NULL
)
RETURNS TABLE (status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_record RECORD;
  v_token_hash TEXT;
  v_has_debit BOOLEAN;
  v_output_owner UUID;
  v_output_bucket TEXT;
  v_output_width INT;
  v_output_height INT;
  v_pricing RECORD;
  v_unit TEXT;
  v_unit_price NUMERIC(12,8);
  v_actual_quantity NUMERIC(12,4);
  v_actual_raw_cost NUMERIC(12,8);
  v_actual_credit_cost NUMERIC(12,4);
  v_estimate_credit_cost NUMERIC(12,4);
  v_markup NUMERIC(6,4);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
  END IF;

  v_token_hash := encode(extensions.digest(p_token::bytea, 'sha256'), 'hex');

  SELECT * INTO v_record
  FROM public.generations
  WHERE id = p_generation_id
  FOR UPDATE;

  IF v_record IS NULL OR v_record.user_id <> v_user_id THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
  END IF;

  IF v_record.processing_token_hash IS NULL
     OR v_record.processing_token_hash <> v_token_hash THEN
    RAISE EXCEPTION 'Invalid processing token' USING ERRCODE = 'P0001';
  END IF;

  IF v_record.status NOT IN ('queued', 'generating', 'post_processing') THEN
    RAISE EXCEPTION 'Generation cannot be completed' USING ERRCODE = 'P0001';
  END IF;

  -- Verify output asset belongs to the user and is stored privately.
  SELECT owner_user_id, bucket, width, height
    INTO v_output_owner, v_output_bucket, v_output_width, v_output_height
  FROM public.assets
  WHERE id = p_output_asset_id;

  IF v_output_owner IS NULL OR v_output_owner <> v_user_id OR v_output_bucket <> 'user-assets' THEN
    RAISE EXCEPTION 'Invalid output asset' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.credit_ledger
    WHERE user_id = v_user_id
      AND generation_id = p_generation_id
      AND entry_type = 'debit'
  ) INTO v_has_debit;

  IF v_has_debit THEN
    RAISE EXCEPTION 'Generation already debited' USING ERRCODE = 'P0001';
  END IF;

  v_estimate_credit_cost := COALESCE(v_record.credit_cost, 0);
  v_markup := COALESCE(v_record.markup_multiplier, public.get_user_markup_multiplier(v_user_id), 4.0000);

  -- Look up actual pricing by the endpoint that was used.
  SELECT unit_price, unit
    INTO v_pricing
  FROM public.provider_model_pricing
  WHERE provider = 'fal'
    AND endpoint_id = v_record.provider_endpoint
    AND is_active = true
    AND effective_from <= NOW()
  ORDER BY effective_from DESC
  LIMIT 1;

  IF FOUND THEN
    v_unit_price := v_pricing.unit_price;
    v_unit := v_pricing.unit;

    v_actual_quantity := CASE
      WHEN v_unit IN ('images', 'generations') THEN 1::NUMERIC(12,4)
      WHEN v_unit = 'megapixel' THEN
        COALESCE(v_output_width::NUMERIC(12,4) * v_output_height::NUMERIC(12,4) / 1000000, 1)
      WHEN v_unit IN ('compute seconds', 'seconds') THEN
        LEAST(COALESCE(p_compute_seconds, 15)::NUMERIC(12,4), 15::NUMERIC(12,4))
      ELSE 1::NUMERIC(12,4)
    END;

    v_actual_raw_cost := v_unit_price * v_actual_quantity;
    v_actual_credit_cost := public.calculate_credit_cost(v_unit_price, v_actual_quantity, v_markup);

    -- Cap the final charge at the estimate so users are never surprised.
    v_actual_credit_cost := LEAST(v_actual_credit_cost, v_estimate_credit_cost);
  ELSE
    -- No live pricing: charge the estimate.
    v_actual_credit_cost := v_estimate_credit_cost;
    v_actual_raw_cost := v_record.provider_cost_usd;
    v_unit := 'credits';
    v_actual_quantity := 0;
  END IF;

  -- Convert the reservation to a debit with the actual (capped) amount.
  UPDATE public.credit_ledger
  SET entry_type = 'debit',
      amount = -v_actual_credit_cost,
      metadata = metadata || jsonb_build_object(
        'converted_at', NOW()::text,
        'actual_credit_cost', v_actual_credit_cost,
        'actual_quantity', v_actual_quantity,
        'unit', v_unit,
        'compute_seconds', p_compute_seconds
      )
  WHERE user_id = v_user_id
    AND generation_id = p_generation_id
    AND entry_type = 'reservation';

  IF NOT FOUND THEN
    -- No reservation row found; insert a fresh debit.
    INSERT INTO public.credit_ledger (
      user_id, entry_type, amount, generation_id, idempotency_key, metadata
    ) VALUES (
      v_user_id,
      'debit',
      -v_actual_credit_cost,
      p_generation_id,
      'debit:' || p_generation_id::text,
      jsonb_build_object('actual_quantity', v_actual_quantity, 'unit', v_unit)
    );
  END IF;

  INSERT INTO public.generation_outputs (
    generation_id, asset_id, output_role, is_primary
  ) VALUES (
    p_generation_id, p_output_asset_id, 'primary', TRUE
  );

  UPDATE public.generations
  SET status = 'completed',
      status_detail = 'Generation complete',
      actual_credit_cost = v_actual_credit_cost,
      provider_cost_usd = v_actual_raw_cost,
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_generation_id;

  -- Record usage for reconciliation / margin reporting.
  INSERT INTO public.fal_usage_logs (
    generation_id,
    endpoint_id,
    raw_cost_usd,
    quantity,
    unit,
    compute_seconds
  ) VALUES (
    p_generation_id,
    v_record.provider_endpoint,
    v_actual_raw_cost,
    v_actual_quantity,
    v_unit,
    p_compute_seconds
  );

  RETURN QUERY SELECT 'completed'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_generation(UUID, TEXT, UUID, NUMERIC)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_generation(UUID, TEXT, UUID, NUMERIC)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Updated fail_generation_refund to handle NUMERIC and release reservation
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.fail_generation_refund(UUID, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.fail_generation_refund(
  p_generation_id UUID,
  p_token TEXT,
  p_failure_code TEXT,
  p_failure_stage TEXT
)
RETURNS TABLE (status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_record RECORD;
  v_token_hash TEXT;
  v_has_refund BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
  END IF;

  v_token_hash := encode(extensions.digest(p_token::bytea, 'sha256'), 'hex');

  SELECT * INTO v_record
  FROM public.generations
  WHERE id = p_generation_id
  FOR UPDATE;

  IF v_record IS NULL OR v_record.user_id <> v_user_id THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
  END IF;

  IF v_record.processing_token_hash IS NULL
     OR v_record.processing_token_hash <> v_token_hash THEN
    RAISE EXCEPTION 'Invalid processing token' USING ERRCODE = 'P0001';
  END IF;

  IF v_record.status IN ('completed', 'failed', 'cancelled', 'blocked') THEN
    RAISE EXCEPTION 'Terminal state already reached' USING ERRCODE = 'P0001';
  END IF;

  -- Refund exactly once.
  SELECT EXISTS (
    SELECT 1 FROM public.credit_ledger
    WHERE user_id = v_user_id
      AND generation_id = p_generation_id
      AND entry_type = 'refund'
  ) INTO v_has_refund;

  IF NOT v_has_refund AND COALESCE(v_record.credit_cost, 0) > 0 THEN
    INSERT INTO public.credit_ledger (
      user_id, entry_type, amount, generation_id, idempotency_key, metadata
    ) VALUES (
      v_user_id,
      'refund',
      v_record.credit_cost,
      p_generation_id,
      'refund:' || p_generation_id::text,
      jsonb_build_object('failure_code', p_failure_code, 'failure_stage', p_failure_stage)
    );
  END IF;

  UPDATE public.generations
  SET status = 'failed',
      failure_code = p_failure_code,
      failure_stage = p_failure_stage,
      status_detail = COALESCE(p_failure_code, 'Generation failed'),
      updated_at = NOW()
  WHERE id = p_generation_id;

  RETURN QUERY SELECT 'failed'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.fail_generation_refund(UUID, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_generation_refund(UUID, TEXT, TEXT, TEXT)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Update catalog and generation RPCs to return NUMERIC credit_cost
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_user_generations();
CREATE OR REPLACE FUNCTION public.get_user_generations()
RETURNS TABLE (
  id UUID,
  product_id UUID,
  product_name TEXT,
  product_slug TEXT,
  product_type TEXT,
  status TEXT,
  status_detail TEXT,
  progress JSONB,
  credit_cost NUMERIC(12,4),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  output_asset_id UUID,
  output_role TEXT,
  output_bucket TEXT,
  output_storage_key TEXT,
  output_mime_type TEXT,
  output_width INT,
  output_height INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    g.id,
    p.id AS product_id,
    p.name AS product_name,
    p.slug AS product_slug,
    p.type AS product_type,
    g.status,
    g.status_detail,
    g.progress,
    g.credit_cost,
    g.created_at,
    g.updated_at,
    a.id AS output_asset_id,
    go.output_role,
    a.bucket AS output_bucket,
    a.storage_key AS output_storage_key,
    a.mime_type AS output_mime_type,
    a.width AS output_width,
    a.height AS output_height
  FROM public.generations g
  JOIN public.products p ON p.id = g.product_id
  LEFT JOIN public.generation_outputs go ON go.generation_id = g.id AND go.is_primary = TRUE
  LEFT JOIN public.assets a ON a.id = go.asset_id
  WHERE g.user_id = (SELECT auth.uid())
  ORDER BY g.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_user_generations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_generations() TO authenticated;

DROP FUNCTION IF EXISTS public.get_user_generation_by_id(UUID);
CREATE OR REPLACE FUNCTION public.get_user_generation_by_id(p_generation_id UUID)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  product_name TEXT,
  product_slug TEXT,
  product_type TEXT,
  status TEXT,
  status_detail TEXT,
  progress JSONB,
  credit_cost NUMERIC(12,4),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  output_asset_id UUID,
  output_role TEXT,
  output_bucket TEXT,
  output_storage_key TEXT,
  output_mime_type TEXT,
  output_width INT,
  output_height INT,
  source_asset_id UUID,
  source_bucket TEXT,
  source_storage_key TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    g.id,
    p.id AS product_id,
    p.name AS product_name,
    p.slug AS product_slug,
    p.type AS product_type,
    g.status,
    g.status_detail,
    g.progress,
    g.credit_cost,
    g.created_at,
    g.updated_at,
    a.id AS output_asset_id,
    go.output_role,
    a.bucket AS output_bucket,
    a.storage_key AS output_storage_key,
    a.mime_type AS output_mime_type,
    a.width AS output_width,
    a.height AS output_height,
    sa.id AS source_asset_id,
    sa.bucket AS source_bucket,
    sa.storage_key AS source_storage_key
  FROM public.generations g
  JOIN public.products p ON p.id = g.product_id
  LEFT JOIN public.generation_outputs go ON go.generation_id = g.id AND go.is_primary = TRUE
  LEFT JOIN public.assets a ON a.id = go.asset_id
  LEFT JOIN public.assets sa ON sa.id = g.source_asset_id
  WHERE g.user_id = (SELECT auth.uid())
    AND g.id = p_generation_id;
$$;

REVOKE ALL ON FUNCTION public.get_user_generation_by_id(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_generation_by_id(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.get_public_catalog(TEXT, TEXT, UUID[], TEXT, TEXT, INT, INT);
CREATE OR REPLACE FUNCTION public.get_public_catalog(
  p_type TEXT DEFAULT NULL,
  p_category_slug TEXT DEFAULT NULL,
  p_product_ids UUID[] DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'featured',
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 24
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  type TEXT,
  short_description TEXT,
  long_description TEXT,
  category_id UUID,
  category_slug TEXT,
  category_name TEXT,
  featured_rank INT,
  version_number INT,
  credit_cost NUMERIC(12,4),
  metadata JSONB,
  hero_asset_id UUID,
  poster_asset_id UUID,
  preview_gif_asset_id UUID,
  preview_video_asset_id UUID,
  public_assets JSONB,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH filtered AS (
    SELECT
      p.id,
      p.slug,
      p.name,
      p.type,
      p.short_description,
      p.long_description,
      c.id AS category_id,
      c.slug AS category_slug,
      c.name AS category_name,
      p.featured_rank,
      v.version_number,
      COALESCE(v.credit_cost, 0) AS credit_cost,
      p.metadata,
      p.created_at,
      p.hero_asset_id,
      p.poster_asset_id,
      p.preview_gif_asset_id,
      p.preview_video_asset_id,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'role', sub.role,
              'asset_id', sub.asset_id,
              'sort_order', sub.sort_order,
              'rights_metadata', sub.rights_metadata,
              'bucket', sub.bucket,
              'storage_key', sub.storage_key,
              'mime_type', sub.mime_type,
              'width', sub.width,
              'height', sub.height
            )
            ORDER BY sub.sort_order, sub.created_at
          )
          FROM (
            SELECT DISTINCT ON (combined.role)
              combined.role,
              combined.asset_id,
              combined.sort_order,
              combined.rights_metadata,
              combined.bucket,
              combined.storage_key,
              combined.mime_type,
              combined.width,
              combined.height,
              combined.created_at
            FROM (
              SELECT
                pa.role,
                pa.asset_id,
                pa.sort_order,
                pa.rights_metadata,
                a.bucket,
                a.storage_key,
                a.mime_type,
                a.width,
                a.height,
                a.created_at
              FROM public.product_assets pa
              JOIN public.assets a ON a.id = pa.asset_id
              WHERE pa.product_id = p.id
                AND pa.internal_only = false
                AND a.visibility = 'public'

              UNION ALL

              SELECT
                'hero' AS role,
                p.hero_asset_id AS asset_id,
                0 AS sort_order,
                NULL::JSONB AS rights_metadata,
                a.bucket,
                a.storage_key,
                a.mime_type,
                a.width,
                a.height,
                a.created_at
              FROM public.assets a
              WHERE a.id = p.hero_asset_id
                AND a.visibility = 'public'
            ) combined
            ORDER BY combined.role, combined.sort_order, combined.created_at
          ) sub
        ),
        '[]'::JSONB
      ) AS public_assets
    FROM public.products p
    LEFT JOIN public.categories c ON c.id = p.category_id
    JOIN public.product_versions v ON v.id = (
      SELECT id
      FROM public.product_versions
      WHERE product_id = p.id AND state = 'active'
      ORDER BY version_number DESC
      LIMIT 1
    )
    WHERE p.visibility = 'public'
      AND p.public_status = 'active'
      AND (p_type IS NULL OR p.type = p_type)
      AND (p_category_slug IS NULL OR c.slug = p_category_slug)
      AND (p_product_ids IS NULL OR p.id = ANY(p_product_ids))
      AND (p_search IS NULL OR p_search = ''
           OR p.name ILIKE '%' || p_search || '%'
           OR p.short_description ILIKE '%' || p_search || '%'
           OR p.long_description ILIKE '%' || p_search || '%')
  ),
  counted AS (
    SELECT COUNT(*) AS total_count FROM filtered
  ),
  ranked AS (
    SELECT
      filtered.*,
      CASE
        WHEN p_sort = 'newest' THEN ROW_NUMBER() OVER (ORDER BY filtered.created_at DESC)
        WHEN p_sort = 'name_asc' THEN ROW_NUMBER() OVER (ORDER BY filtered.name ASC)
        WHEN p_sort = 'name_desc' THEN ROW_NUMBER() OVER (ORDER BY filtered.name DESC)
        WHEN p_sort = 'credits_asc' THEN ROW_NUMBER() OVER (ORDER BY filtered.credit_cost ASC, filtered.name ASC)
        WHEN p_sort = 'credits_desc' THEN ROW_NUMBER() OVER (ORDER BY filtered.credit_cost DESC, filtered.name ASC)
        ELSE ROW_NUMBER() OVER (
          ORDER BY
            CASE WHEN filtered.featured_rank IS NULL THEN 1 ELSE 0 END,
            filtered.featured_rank,
            filtered.created_at DESC
        )
      END AS row_num
    FROM filtered
  )
  SELECT
    r.id,
    r.slug,
    r.name,
    r.type,
    r.short_description,
    r.long_description,
    r.category_id,
    r.category_slug,
    r.category_name,
    r.featured_rank,
    r.version_number,
    r.credit_cost,
    r.metadata,
    r.hero_asset_id,
    r.poster_asset_id,
    r.preview_gif_asset_id,
    r.preview_video_asset_id,
    r.public_assets,
    c.total_count
  FROM ranked r
  CROSS JOIN counted c
  WHERE r.row_num BETWEEN ((p_page - 1) * p_page_size + 1) AND (p_page * p_page_size)
  ORDER BY r.row_num;
$$;

REVOKE ALL ON FUNCTION public.get_public_catalog(TEXT, TEXT, UUID[], TEXT, TEXT, INT, INT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_catalog(TEXT, TEXT, UUID[], TEXT, TEXT, INT, INT)
  TO authenticated;

DROP FUNCTION IF EXISTS public.get_public_product_by_slug(TEXT);
CREATE OR REPLACE FUNCTION public.get_public_product_by_slug(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  type TEXT,
  short_description TEXT,
  long_description TEXT,
  category_id UUID,
  category_slug TEXT,
  category_name TEXT,
  featured_rank INT,
  version_id UUID,
  version_number INT,
  credit_cost NUMERIC(12,4),
  output_sizes JSONB,
  metadata JSONB,
  hero_asset_id UUID,
  poster_asset_id UUID,
  preview_gif_asset_id UUID,
  preview_video_asset_id UUID,
  active_fields JSONB,
  public_assets JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.slug,
    p.name,
    p.type,
    p.short_description,
    p.long_description,
    c.id AS category_id,
    c.slug AS category_slug,
    c.name AS category_name,
    p.featured_rank,
    v.id AS version_id,
    v.version_number,
    COALESCE(v.credit_cost, 0) AS credit_cost,
    COALESCE(
      v.output_sizes,
      CASE
        WHEN v.model_config->>'width' IS NOT NULL AND v.model_config->>'height' IS NOT NULL THEN
          jsonb_build_array(
            jsonb_build_object(
              'name', concat(v.model_config->>'width', 'x', v.model_config->>'height'),
              'width', (v.model_config->>'width')::int,
              'height', (v.model_config->>'height')::int,
              'is_default', true
            )
          )
        ELSE '[]'::JSONB
      END
    ) AS output_sizes,
    CASE
      WHEN p.type = 'filter' THEN jsonb_build_object('filter_config', COALESCE(p.metadata->'filter_config', '{}'::JSONB))
      WHEN p.type = 'poster' THEN jsonb_build_object('poster_config', COALESCE(p.metadata->'poster_config', '{}'::JSONB))
      ELSE '{}'::JSONB
    END AS metadata,
    p.hero_asset_id,
    p.poster_asset_id,
    p.preview_gif_asset_id,
    p.preview_video_asset_id,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', f.id,
            'field_key', f.field_key,
            'label', f.label,
            'help_text', f.help_text,
            'field_type', f.field_type,
            'required', f.required,
            'sort_order', f.sort_order,
            'config', f.config,
            'validation', f.validation
          )
          ORDER BY f.sort_order, f.id
        )
        FROM public.product_fields f
        WHERE f.product_id = p.id AND f.active = TRUE
      ),
      '[]'::JSONB
    ) AS active_fields,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'role', sub.role,
            'asset_id', sub.asset_id,
            'sort_order', sub.sort_order,
            'rights_metadata', sub.rights_metadata,
            'bucket', sub.bucket,
            'storage_key', sub.storage_key,
            'mime_type', sub.mime_type,
            'width', sub.width,
            'height', sub.height
          )
          ORDER BY sub.sort_order, sub.created_at
        )
        FROM (
          SELECT DISTINCT ON (combined.role)
            combined.role,
            combined.asset_id,
            combined.sort_order,
            combined.rights_metadata,
            combined.bucket,
            combined.storage_key,
            combined.mime_type,
            combined.width,
            combined.height,
            combined.created_at
          FROM (
            SELECT
              pa.role,
              pa.asset_id,
              pa.sort_order,
              pa.rights_metadata,
              a.bucket,
              a.storage_key,
              a.mime_type,
              a.width,
              a.height,
              a.created_at
            FROM public.product_assets pa
            JOIN public.assets a ON a.id = pa.asset_id
            WHERE pa.product_id = p.id
              AND pa.internal_only = false
              AND a.visibility = 'public'

            UNION ALL

            SELECT
              'hero' AS role,
              p.hero_asset_id AS asset_id,
              0 AS sort_order,
              NULL::JSONB AS rights_metadata,
              a.bucket,
              a.storage_key,
              a.mime_type,
              a.width,
              a.height,
              a.created_at
            FROM public.assets a
            WHERE a.id = p.hero_asset_id
              AND a.visibility = 'public'
          ) combined
          ORDER BY combined.role, combined.sort_order, combined.created_at
        ) sub
      ),
      '[]'::JSONB
    ) AS public_assets
  FROM public.products p
  LEFT JOIN public.categories c ON c.id = p.category_id
  JOIN public.product_versions v ON v.id = (
    SELECT id
    FROM public.product_versions
    WHERE product_id = p.id AND state = 'active'
    ORDER BY version_number DESC
    LIMIT 1
  )
  WHERE p.slug = p_slug
    AND p.visibility = 'public'
    AND p.public_status = 'active';
$$;

REVOKE ALL ON FUNCTION public.get_public_product_by_slug(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_product_by_slug(TEXT)
  TO authenticated;
