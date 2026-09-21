-- Allow admins/owners to create generations against draft/testing products and
-- non-active versions. The admin test lab exists to validate presets *before*
-- publication; without this, create_generation rejects any preset that is not
-- already live. Consumer access is unchanged — non-admin callers still require
-- an active+public product with an active version.

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
  v_is_staff BOOLEAN;
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

  -- Staff may generate against any version (draft/testing presets in the lab);
  -- everyone else still requires a live product with an active version.
  SELECT COALESCE(pr.is_admin, FALSE) OR COALESCE(pr.is_owner, FALSE)
    INTO v_is_staff
  FROM public.profiles pr
  WHERE pr.id = v_user_id;

  SELECT v.credit_cost, v.provider_strategy
    INTO v_version_credit_cost, v_provider_strategy
  FROM public.products p
  JOIN public.product_versions v ON v.product_id = p.id
  WHERE p.id = p_product_id
    AND v.id = p_product_version_id
    AND (
      COALESCE(v_is_staff, FALSE)
      OR (
        p.public_status = 'active'
        AND p.visibility = 'public'
        AND v.state = 'active'
      )
    );

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
