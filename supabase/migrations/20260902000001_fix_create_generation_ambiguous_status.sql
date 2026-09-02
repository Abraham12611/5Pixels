-- Fix "column reference 'status' is ambiguous" in create_generation.
-- The idempotency SELECT used unqualified column names that conflicted with
-- the function's RETURN TABLE columns (id, status, credit_cost).
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
  balance_after INT,
  credit_cost INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing_id UUID;
  v_existing_status TEXT;
  v_credit_cost INT;
  v_source_owner UUID;
  v_source_bucket TEXT;
  v_balance INT;
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
    processing_token := NULL; -- token was already returned on the first call
    balance_after := (
      SELECT COALESCE(SUM(amount), 0)::INT
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
  SELECT COALESCE(SUM(amount), 0)::INT INTO v_balance
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
    credit_cost
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
    v_credit_cost
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
    SELECT COALESCE(SUM(amount), 0)::INT
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
