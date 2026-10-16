-- fix(db): converge repo migrations with hosted-DB state (#139)
--
-- Two deltas found by fingerprinting the hosted project against a local
-- `supabase db reset` of this repo. This migration is a NO-OP on the hosted
-- database (prod already has the correct definitions) and is idempotent.
--
-- 1. RLS policies — prod's admin checks call public.is_admin() (SECURITY
--    DEFINER, search_path=''), while 00000000000000_initial_schema.sql
--    inlined `(SELECT is_admin FROM public.profiles WHERE id = auth.uid())`.
--    The inline form recurses on profiles_read_self ("infinite recursion
--    detected in policy for relation profiles") for any authenticated
--    SELECT on profiles. Re-state the policies exactly as hosted.
--
-- 2. public.create_generation(uuid,uuid,jsonb,text) — prod still carries an
--    earlier draft whose reservation ledger insert writes p_idempotency_key
--    instead of 'reserve:' || p_idempotency_key. Re-state the function
--    verbatim from 20261010000001_fixed_credit_pricing.sql (the correct
--    def). Prod has 0 reservation ledger rows, so no data impact.

ALTER POLICY admin_audit_logs_admin ON public.admin_audit_logs
  USING (public.is_admin());

ALTER POLICY categories_admin ON public.categories
  USING (public.is_admin());

ALTER POLICY product_assets_admin ON public.product_assets
  USING (public.is_admin());

ALTER POLICY product_fields_admin ON public.product_fields
  USING (public.is_admin());

ALTER POLICY product_versions_admin ON public.product_versions
  USING (public.is_admin());

ALTER POLICY products_admin ON public.products
  USING (public.is_admin());

ALTER POLICY products_select ON public.products
  USING ((public_status = 'active' AND visibility = 'public') OR public.is_admin());

ALTER POLICY product_fields_select ON public.product_fields
  USING ((active = true AND product_id IN (SELECT products.id FROM public.products WHERE products.public_status = 'active' AND products.visibility = 'public')) OR public.is_admin());

ALTER POLICY product_assets_select ON public.product_assets
  USING ((internal_only = false AND product_id IN (SELECT products.id FROM public.products WHERE products.public_status = 'active')) OR public.is_admin());

ALTER POLICY profiles_read_self ON public.profiles
  USING (auth.uid() = id OR public.is_admin());

ALTER POLICY profiles_update_self ON public.profiles
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.create_generation(
  p_quote_id UUID,
  p_source_asset_id UUID,
  p_options JSONB,
  p_idempotency_key TEXT
)
RETURNS TABLE (
  generation_id UUID,
  status TEXT,
  processing_token TEXT,
  balance_after NUMERIC(12,4),
  credit_cost NUMERIC(12,4),
  provider_endpoint TEXT,
  output_width INT,
  output_height INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_quote RECORD;
  v_existing_id UUID;
  v_existing_status TEXT;
  v_existing_cost NUMERIC(12,4);
  v_source_owner UUID;
  v_source_bucket TEXT;
  v_available NUMERIC(12,4);
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
    INTO v_existing_id, v_existing_status, v_existing_cost
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
    credit_cost := COALESCE(v_existing_cost, 0);
    provider_endpoint := NULL;
    output_width := NULL;
    output_height := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Load and lock the quote. It must belong to the caller, be fresh, and be
  -- unconsumed — a quote is single-use and short-lived by design.
  SELECT * INTO v_quote
  FROM public.generation_quotes q
  WHERE q.id = p_quote_id
    AND q.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid generation quote' USING ERRCODE = 'P0001';
  END IF;
  IF v_quote.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Quote already used' USING ERRCODE = 'P0001';
  END IF;
  IF v_quote.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Quote expired' USING ERRCODE = 'P0001';
  END IF;

  -- The options submitted now must be the options that were priced.
  IF v_quote.options_fingerprint <>
     encode(extensions.digest(p_options::text::bytea, 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'Quote does not match request' USING ERRCODE = 'P0001';
  END IF;

  -- Verify source asset exists, is owned by the caller, and lives in user-assets.
  SELECT owner_user_id, bucket INTO v_source_owner, v_source_bucket
  FROM public.assets
  WHERE id = p_source_asset_id;

  IF v_source_owner IS NULL OR v_source_owner <> v_user_id OR v_source_bucket <> 'user-assets' THEN
    RAISE EXCEPTION 'Invalid source asset' USING ERRCODE = 'P0001';
  END IF;

  -- Validate options against active product_fields.
  v_validation_error := public.validate_generation_options(v_quote.product_id, p_options);
  IF v_validation_error IS NOT NULL THEN
    RAISE EXCEPTION '%', v_validation_error USING ERRCODE = 'P0001';
  END IF;

  -- Availability = full ledger sum (reservations are negative holds).
  SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,4) INTO v_available
  FROM public.credit_ledger
  WHERE user_id = v_user_id;

  IF v_available < v_quote.reserve_credits THEN
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
    quote_id,
    quote_expected_cost_usd,
    quote_max_cost_usd,
    provider_cost_usd
  )
  VALUES (
    v_user_id,
    v_quote.product_id,
    v_quote.product_version_id,
    p_source_asset_id,
    'created',
    p_options,
    encode(extensions.digest(p_options::text::bytea, 'sha256'), 'hex'),
    p_idempotency_key,
    v_token_hash,
    v_quote.reserve_credits,
    NULL,
    v_quote.id,
    v_quote.expected_cost_usd,
    v_quote.maximum_cost_usd,
    v_quote.expected_cost_usd
  )
  RETURNING id INTO v_generation_id;

  IF v_quote.reserve_credits > 0 THEN
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
      -v_quote.reserve_credits,
      v_generation_id,
      'reserve:' || p_idempotency_key,
      jsonb_build_object(
        'quote_id', v_quote.id,
        'product_id', v_quote.product_id,
        'product_version_id', v_quote.product_version_id,
        'provider_endpoint', v_quote.endpoint_id,
        'pricing_snapshot_id', v_quote.pricing_snapshot_id,
        'policy_version', v_quote.policy_version,
        'expected_cost_usd', v_quote.expected_cost_usd,
        'maximum_cost_usd', v_quote.maximum_cost_usd
      )
    );
  END IF;

  UPDATE public.generation_quotes
  SET consumed_at = NOW(), generation_id = v_generation_id
  WHERE id = v_quote.id;

  UPDATE public.provider_endpoint_state
  SET last_seen_at = NOW()
  WHERE provider = v_quote.provider AND endpoint_id = v_quote.endpoint_id;

  generation_id := v_generation_id;
  status := 'created';
  processing_token := v_token;
  balance_after := (
    SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,4)
    FROM public.credit_ledger
    WHERE user_id = v_user_id
  );
  credit_cost := v_quote.reserve_credits;
  provider_endpoint := v_quote.endpoint_id;
  output_width := (v_quote.params->>'width')::INT;
  output_height := (v_quote.params->>'height')::INT;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_generation(UUID, UUID, JSONB, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_generation(UUID, UUID, JSONB, TEXT)
  TO authenticated;
