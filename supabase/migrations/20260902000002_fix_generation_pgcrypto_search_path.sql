-- The generation lifecycle functions use pgcrypto functions (gen_random_bytes,
-- digest) but run with SET search_path = ''. The pgcrypto extension is installed
-- in the extensions schema, so we must qualify those calls as extensions.*.
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

CREATE OR REPLACE FUNCTION public.attach_provider_request(
  p_generation_id UUID,
  p_token TEXT,
  p_provider_request_id TEXT,
  p_provider_endpoint TEXT
)
RETURNS TABLE (status TEXT, provider_request_id TEXT, provider_endpoint TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_record RECORD;
  v_token_hash TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
  END IF;

  v_token_hash := encode(extensions.digest(p_token::bytea, 'sha256'), 'hex');

  SELECT g.id, g.status, g.processing_token_hash, g.user_id INTO v_record
  FROM public.generations g
  WHERE g.id = p_generation_id
  FOR UPDATE;

  IF v_record IS NULL OR v_record.user_id <> v_user_id THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
  END IF;

  IF v_record.processing_token_hash IS NULL
     OR v_record.processing_token_hash <> v_token_hash THEN
    RAISE EXCEPTION 'Invalid processing token' USING ERRCODE = 'P0001';
  END IF;

  IF v_record.status NOT IN ('created', 'uploaded') THEN
    RAISE EXCEPTION 'Generation is not in a submittable state' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.generations
  SET status = 'queued',
      provider_request_id = p_provider_request_id,
      provider_endpoint = p_provider_endpoint,
      status_detail = 'Submitted to provider queue',
      progress = jsonb_build_object('submitted_at', NOW()::text) || COALESCE(progress, '{}'::jsonb),
      updated_at = NOW()
  WHERE id = p_generation_id;

  RETURN QUERY
  SELECT g.status, g.provider_request_id, g.provider_endpoint
  FROM public.generations g
  WHERE g.id = p_generation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_provider_request(UUID, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_provider_request(UUID, TEXT, TEXT, TEXT)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_generation(
  p_generation_id UUID,
  p_token TEXT,
  p_output_asset_id UUID
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
  SELECT owner_user_id, bucket INTO v_output_owner, v_output_bucket
  FROM public.assets
  WHERE id = p_output_asset_id;

  IF v_output_owner IS NULL OR v_output_owner <> v_user_id OR v_output_bucket <> 'user-assets' THEN
    RAISE EXCEPTION 'Invalid output asset' USING ERRCODE = 'P0001';
  END IF;

  -- Convert the reservation to a debit exactly once.
  SELECT EXISTS (
    SELECT 1 FROM public.credit_ledger
    WHERE user_id = v_user_id
      AND generation_id = p_generation_id
      AND entry_type = 'debit'
  ) INTO v_has_debit;

  IF NOT v_has_debit THEN
    UPDATE public.credit_ledger
    SET entry_type = 'debit',
        metadata = jsonb_build_object('converted_at', NOW()::text) || COALESCE(metadata, '{}'::jsonb)
    WHERE user_id = v_user_id
      AND generation_id = p_generation_id
      AND entry_type = 'reservation';
  END IF;

  INSERT INTO public.generation_outputs (
    generation_id, asset_id, output_role, is_primary
  ) VALUES (
    p_generation_id, p_output_asset_id, 'primary', TRUE
  );

  UPDATE public.generations
  SET status = 'completed',
      status_detail = 'Generation complete',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_generation_id;

  RETURN QUERY SELECT 'completed'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_generation(UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_generation(UUID, TEXT, UUID)
  TO authenticated;

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
