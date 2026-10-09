-- Fixed-value credit pricing architecture (issue #89 — pre-launch epic).
--
-- Credits stop being "1 credit = $0.01 with plan-dependent purchasing power"
-- and become a fixed denomination of provider-cost capacity:
--
--     1 credit = $0.001 of actual provider spend
--
-- Margin is encoded at issuance (plan grant sizes); generation-time code
-- knows only the balance and a server-created quote. Pricing is fail-closed:
-- no quote, no generation — the admin-entered product_versions.credit_cost
-- fallback, the plan markup multiplier, and the "unknown unit → quantity 1"
-- behaviour are all removed from the consumption path.
--
-- Flow: server resolves recipe → provider adapter produces a bounded quote
-- {expected, maximum} USD → generation_quotes row → create_generation
-- consumes the quote and reserves ceil(max/0.001) credits → completion
-- debits ceil(actual/0.001) <= reservation and releases the difference.

-- ---------------------------------------------------------------------------
-- 1. pricing_policies — versioned financial policy
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pricing_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  version INT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  -- Provider-cost capacity one credit buys, in USD.
  credit_capacity_usd NUMERIC(10,6) NOT NULL DEFAULT 0.001,
  -- Fraction of a top-up's price that becomes provider-cost budget.
  top_up_budget_ratio NUMERIC(6,4) NOT NULL DEFAULT 0.606,
  -- Multiplier adapters apply to expected cost to derive the bounded maximum.
  quote_max_slack_factor NUMERIC(6,4) NOT NULL DEFAULT 1.15,
  -- Quote validity window and snapshot staleness horizon.
  quote_ttl_seconds INT NOT NULL DEFAULT 600,
  snapshot_ttl_hours INT NOT NULL DEFAULT 6,
  metadata JSONB DEFAULT '{}'
);

-- The denomination is permanent, not tunable: 1 credit = $0.001 of provider
-- cost. credits_for_provider_cost hard-codes the same constant — the column
-- exists only so a row is self-describing, so pin it to the invariant.
ALTER TABLE public.pricing_policies
  DROP CONSTRAINT IF EXISTS pricing_policies_fixed_capacity,
  ADD CONSTRAINT pricing_policies_fixed_capacity
    CHECK (credit_capacity_usd = 0.001);

ALTER TABLE public.pricing_policies ENABLE ROW LEVEL SECURITY;
-- Financial policy is internal; only the service role reads it.
REVOKE ALL ON public.pricing_policies FROM PUBLIC, anon, authenticated;

INSERT INTO public.pricing_policies (version, is_active) VALUES (1, true)
ON CONFLICT (version) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. provider_pricing_snapshots — immutable provider price records
-- ---------------------------------------------------------------------------
-- Each sync inserts a new row rather than updating; quotes pin snapshot_id so
-- a generation's economics are reproducible after provider prices change.
-- payload.pricing_type drives the adapter:
--   flat_per_request | per_megapixel | unsupported
-- Per-second/time billing stays 'unsupported' until a provider-enforced
-- runtime ceiling exists — quoting off a guessed cap would underbill
-- silently on overruns.
-- Unsupported/missing/stale pricing disables the endpoint (fail closed).

CREATE TABLE IF NOT EXISTS public.provider_pricing_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  provider TEXT NOT NULL,
  endpoint_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  content_hash TEXT,
  source TEXT NOT NULL DEFAULT 'sync'
);

CREATE INDEX IF NOT EXISTS idx_pricing_snapshots_endpoint
  ON public.provider_pricing_snapshots (provider, endpoint_id, fetched_at DESC);

ALTER TABLE public.provider_pricing_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.provider_pricing_snapshots FROM PUBLIC, anon, authenticated;

-- Bootstrap: convert every active provider_model_pricing row into a snapshot.
-- Seed rows get a generous 14-day TTL so the system stays usable until the
-- scheduled pricing-sync job (follow-up PR) starts refreshing them.
INSERT INTO public.provider_pricing_snapshots (
  provider, endpoint_id, fetched_at, expires_at, payload, content_hash, source
)
SELECT DISTINCT ON (p.provider, p.endpoint_id)
  p.provider,
  p.endpoint_id,
  NOW(),
  NOW() + INTERVAL '14 days',
  jsonb_build_object(
    'pricing_type', CASE
      WHEN p.unit IN ('images', 'generations') THEN 'flat_per_request'
      WHEN p.unit IN ('megapixel', 'megapixels', 'processed megapixels') THEN 'per_megapixel'
      ELSE 'unsupported'
    END,
    'unit_price', p.unit_price,
    'unit', p.unit,
    'currency', p.currency
  ),
  encode(extensions.digest((p.provider || ':' || p.endpoint_id || ':' || p.unit_price::text || ':' || p.unit)::bytea, 'sha256'), 'hex'),
  'seed-20261009000001'
FROM public.provider_model_pricing p
WHERE p.is_active = true
ORDER BY p.provider, p.endpoint_id, p.effective_from DESC;

-- ---------------------------------------------------------------------------
-- 3. provider_endpoint_state — per-route circuit breaker
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.provider_endpoint_state (
  provider TEXT NOT NULL,
  endpoint_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  suspend_reason TEXT,
  suspended_at TIMESTAMPTZ,
  overrun_count INT NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (provider, endpoint_id)
);

ALTER TABLE public.provider_endpoint_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.provider_endpoint_state FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. generation_quotes — server-authored, short-lived, single-use
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.generation_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  product_id UUID NOT NULL,
  product_version_id UUID NOT NULL,

  provider TEXT NOT NULL,
  endpoint_id TEXT NOT NULL,
  -- Endpoints the generation is allowed to fail over to within this quote's
  -- envelope. A pricier fallback is recorded but excluded.
  allowed_endpoint_ids TEXT[] NOT NULL,
  fallback_endpoint_id TEXT,

  expected_cost_usd NUMERIC(12,8) NOT NULL,
  maximum_cost_usd NUMERIC(12,8) NOT NULL,
  reserve_credits NUMERIC(12,4) NOT NULL,

  pricing_snapshot_id UUID NOT NULL REFERENCES public.provider_pricing_snapshots(id),
  fallback_snapshot_id UUID REFERENCES public.provider_pricing_snapshots(id),
  policy_version INT NOT NULL,

  -- Server-resolved billable envelope (never client-supplied pricing input).
  params JSONB NOT NULL,
  options_fingerprint TEXT NOT NULL,

  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  generation_id UUID
);

CREATE INDEX IF NOT EXISTS idx_generation_quotes_user
  ON public.generation_quotes (user_id, created_at DESC);

ALTER TABLE public.generation_quotes ENABLE ROW LEVEL SECURITY;

-- Quotes carry supplier routing and wholesale economics (provider, endpoint
-- ids, raw USD costs, snapshot lineage). No client may read them — the server
-- action owns the whole flow and returns only credits/status.
REVOKE ALL ON public.generation_quotes FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. generations — pin the quote
-- ---------------------------------------------------------------------------

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.generation_quotes(id),
  ADD COLUMN IF NOT EXISTS quote_expected_cost_usd NUMERIC(12,8),
  ADD COLUMN IF NOT EXISTS quote_max_cost_usd NUMERIC(12,8);

-- ---------------------------------------------------------------------------
-- 6. credits_for_provider_cost — the single conversion primitive
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.credits_for_provider_cost(p_cost_usd NUMERIC)
RETURNS NUMERIC(12,4)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CEIL(p_cost_usd / 0.001)::NUMERIC(12,4);
$$;

REVOKE ALL ON FUNCTION public.credits_for_provider_cost(NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credits_for_provider_cost(NUMERIC) TO authenticated;

-- Canonical options fingerprint. Quotes hash the exact jsonb Postgres will
-- receive in create_generation — computing it in SQL guarantees the digest
-- sees identical text (jsonb normalization makes JS-side hashing unreliable).
CREATE OR REPLACE FUNCTION public.options_fingerprint(p_options JSONB)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT encode(extensions.digest(p_options::text::bytea, 'sha256'), 'hex');
$$;

REVOKE ALL ON FUNCTION public.options_fingerprint(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.options_fingerprint(JSONB) TO service_role;

-- ---------------------------------------------------------------------------
-- 7. create_generation — consumes a quote instead of trusting client pricing
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.create_generation(UUID, UUID, UUID, JSONB, TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS public.create_generation(UUID, UUID, UUID, JSONB, TEXT);

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

-- ---------------------------------------------------------------------------
-- 8. complete_generation — settle at ceil(actual / $0.001), capped at reserve
-- ---------------------------------------------------------------------------
-- "Actual" is computed from the generation's pinned quote (snapshot pricing),
-- not the live pricing table. Provider-reported billing events override this
-- in the async reconciliation job (follow-up PR).

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
  v_quote RECORD;
  v_token_hash TEXT;
  v_has_debit BOOLEAN;
  v_output_owner UUID;
  v_output_bucket TEXT;
  v_output_width INT;
  v_output_height INT;
  v_actual_quantity NUMERIC(12,4);
  v_actual_cost_usd NUMERIC(12,8);
  v_actual_credit_cost NUMERIC(12,4);
  v_reserve NUMERIC(12,4);
  v_pricing_type TEXT;
  v_unit_price NUMERIC(12,8);
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

  v_reserve := COALESCE(v_record.credit_cost, 0);

  -- Settle from the snapshot of the endpoint that ACTUALLY ran — the
  -- fallback's own pricing, never the primary's when fallback executed.
  SELECT s.payload INTO v_quote
  FROM public.generation_quotes q
  JOIN public.provider_pricing_snapshots s
    ON s.id = CASE
      WHEN q.fallback_snapshot_id IS NOT NULL
           AND v_record.provider_endpoint IS NOT NULL
           AND v_record.provider_endpoint = q.fallback_endpoint_id
      THEN q.fallback_snapshot_id
      ELSE q.pricing_snapshot_id
    END
  WHERE q.id = v_record.quote_id;

  IF FOUND AND v_quote.payload IS NOT NULL THEN
    v_pricing_type := v_quote.payload->>'pricing_type';
    v_unit_price := (v_quote.payload->>'unit_price')::NUMERIC(12,8);

    -- Unknown pricing types fail closed — never silently bill 1 unit.
    IF v_pricing_type = 'flat_per_request' THEN
      v_actual_quantity := 1::NUMERIC(12,4);
    ELSIF v_pricing_type = 'per_megapixel' THEN
      v_actual_quantity := COALESCE(v_output_width::NUMERIC(12,4) * v_output_height::NUMERIC(12,4) / 1000000, 1);
    ELSE
      RAISE EXCEPTION 'Unsupported pricing type in pinned snapshot: %', v_pricing_type
        USING ERRCODE = 'P0001';
    END IF;

    v_actual_cost_usd := v_unit_price * v_actual_quantity;
    v_actual_credit_cost := LEAST(
      public.credits_for_provider_cost(v_actual_cost_usd),
      v_reserve
    );
  ELSE
    -- Quote/snapshot missing (legacy row): charge the reservation as-is.
    v_actual_cost_usd := v_record.provider_cost_usd;
    v_actual_credit_cost := v_reserve;
    v_unit_price := NULL;
  END IF;

  -- Convert the reservation to a debit with the actual (capped) amount.
  UPDATE public.credit_ledger
  SET entry_type = 'debit',
      amount = -v_actual_credit_cost,
      metadata = metadata || jsonb_build_object(
        'converted_at', NOW()::text,
        'actual_credit_cost', v_actual_credit_cost,
        'actual_cost_usd', v_actual_cost_usd,
        'actual_quantity', v_actual_quantity,
        'compute_seconds', p_compute_seconds
      )
  WHERE user_id = v_user_id
    AND generation_id = p_generation_id
    AND entry_type = 'reservation';

  IF NOT FOUND THEN
    INSERT INTO public.credit_ledger (
      user_id, entry_type, amount, generation_id, idempotency_key, metadata
    ) VALUES (
      v_user_id,
      'debit',
      -v_actual_credit_cost,
      p_generation_id,
      'debit:' || p_generation_id::text,
      jsonb_build_object('actual_cost_usd', v_actual_cost_usd)
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
      provider_cost_usd = COALESCE(v_actual_cost_usd, v_record.provider_cost_usd),
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_generation_id;

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
    v_actual_cost_usd,
    v_actual_quantity,
    v_pricing_type,
    p_compute_seconds
  );

  RETURN QUERY SELECT 'completed'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_generation(UUID, TEXT, UUID, NUMERIC(8,2))
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_generation(UUID, TEXT, UUID, NUMERIC(8,2))
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 9. Retire markup-based consumption pricing
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.calculate_credit_cost(NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_markup_multiplier(UUID) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 10. Re-denominate plan grants (1 credit = $0.001 provider-cost capacity)
-- ---------------------------------------------------------------------------
-- Each grant preserves the plan's existing provider budget exactly, so per-plan
-- margins are unchanged — only the denomination (and the arbitrage) changes.

UPDATE public.plans SET credits_grant = 1136  WHERE slug = 'weekly-starter';
UPDATE public.plans SET credits_grant = 2597  WHERE slug = 'weekly-plus';
UPDATE public.plans SET credits_grant = 6060  WHERE slug IN ('monthly-creator', 'annual-creator');
UPDATE public.plans SET credits_grant = 10909 WHERE slug IN ('monthly-pro', 'annual-pro');
UPDATE public.plans SET credits_grant = 25000 WHERE slug IN ('monthly-studio', 'annual-studio');
UPDATE public.plans SET credits_grant = 64171 WHERE slug IN ('monthly-agency', 'annual-agency');

-- Credit packs (extra_credit) must agree with the financial policy: a pack's
-- credits_grant is the immutable pinned purchase amount that fulfillment
-- trusts, so it is derived here from the active policy — provider budget =
-- price × top_up_budget_ratio, denominated at $0.001/credit. Pack grants
-- must be recomputed from the policy whenever the ratio changes, not set by
-- hand: price $10/$25/$50/$100 → 6,060/15,150/30,300/60,600 credits at 0.606.
UPDATE public.plans p
SET credits_grant = FLOOR(p.price_cents / 100.0 * pol.top_up_budget_ratio / 0.001)
FROM public.pricing_policies pol
WHERE p.type = 'extra_credit' AND p.price_cents > 0 AND pol.is_active;

-- ---------------------------------------------------------------------------
-- 11. Pre-launch balance reset
-- ---------------------------------------------------------------------------
-- Testers only: insert an offsetting adjustment per user so balances become
-- zero under the new denomination while ledger history stays auditable.

INSERT INTO public.credit_ledger (user_id, entry_type, amount, idempotency_key, metadata)
SELECT user_id,
       'adjustment',
       -SUM(amount),
       'reset:20261009000001:' || user_id::text,
       jsonb_build_object('reason', 'pre-launch fixed-credit redenomination')
FROM public.credit_ledger
GROUP BY user_id
HAVING SUM(amount) <> 0;

-- ---------------------------------------------------------------------------
-- 12. Re-denominate product_versions.credit_cost display hints
-- ---------------------------------------------------------------------------
-- The column is no longer authoritative — generation pricing comes from
-- quotes — but catalog cards still show it as the "From ~N credits" hint.
-- Recompute it at the new denomination: smallest declared output size against
-- the endpoint's fresh snapshot. Endpoints without quotable pricing are left
-- at 0 so they don't advertise a wrong-scale number (fail-closed anyway).

DO $$
DECLARE
  v_ver RECORD;
  v_provider TEXT;
  v_model TEXT;
  v_endpoint TEXT;
  v_payload JSONB;
  v_qty NUMERIC(12,4);
  v_min_px NUMERIC;
  v_credits NUMERIC(12,4);
BEGIN
  FOR v_ver IN
    SELECT pv.id, pv.product_id, pv.provider_strategy, pv.output_sizes
    FROM public.product_versions pv
    WHERE pv.state = 'active'
  LOOP
    v_provider := replace(COALESCE(v_ver.provider_strategy->>'primary_provider', ''), '.', '-');
    v_model := COALESCE(v_ver.provider_strategy->>'primary_model', '');
    v_endpoint := CASE
      WHEN v_provider = 'fal-ai' AND v_model = 'flux-pro' THEN 'fal-ai/flux/dev/image-to-image'
      WHEN v_model LIKE 'fal-ai/%' THEN v_model
      WHEN v_provider = 'fal-ai' AND v_model <> '' THEN 'fal-ai/' || v_model
      ELSE NULL
    END;
    IF v_endpoint IS NULL THEN
      UPDATE public.product_versions SET credit_cost = 0 WHERE id = v_ver.id;
      CONTINUE;
    END IF;

    SELECT s.payload INTO v_payload
    FROM public.provider_pricing_snapshots s
    WHERE s.provider = 'fal'
      AND s.endpoint_id = v_endpoint
      AND s.expires_at > NOW()
    ORDER BY s.fetched_at DESC
    LIMIT 1;

    IF v_payload IS NULL OR v_payload->>'pricing_type' = 'unsupported' THEN
      UPDATE public.product_versions SET credit_cost = 0 WHERE id = v_ver.id;
      CONTINUE;
    END IF;

    SELECT MIN((o->>'width')::NUMERIC * (o->>'height')::NUMERIC) INTO v_min_px
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(v_ver.output_sizes) = 'array' AND jsonb_array_length(v_ver.output_sizes) > 0
           THEN v_ver.output_sizes
           ELSE '[{"width":1024,"height":1024}]'::jsonb
      END
    ) o;
    v_min_px := COALESCE(v_min_px, 1048576); -- 1024×1024

    v_qty := CASE v_payload->>'pricing_type'
      WHEN 'flat_per_request' THEN 1
      WHEN 'per_megapixel' THEN (v_min_px / 1000000)::NUMERIC(12,4)
      ELSE NULL
    END;

    IF v_qty IS NULL THEN
      UPDATE public.product_versions SET credit_cost = 0 WHERE id = v_ver.id;
      CONTINUE;
    END IF;

    v_credits := CEIL(
      (v_payload->>'unit_price')::NUMERIC(12,8) * v_qty / 0.001
    )::NUMERIC(12,4);
    UPDATE public.product_versions SET credit_cost = v_credits WHERE id = v_ver.id;
  END LOOP;
END $$;
