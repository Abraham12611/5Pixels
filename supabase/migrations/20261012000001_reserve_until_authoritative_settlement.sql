-- Hold the full credit reservation until authoritative provider settlement
-- ---------------------------------------------------------------------------
-- Tranche 2 reconciled customer charges against fal Billing Events, but
-- complete_generation still converted the reservation into a provisional
-- debit immediately — releasing (reserve - provisional) back to spendable
-- balance before fal's true cost was known. If the authoritative cost later
-- exceeded the provisional charge, the adjustment could push a user who had
-- already spent the released remainder into a negative balance.
--
-- New lifecycle:
--   create_generation   reserves N credits (unchanged)
--   complete_generation keeps the full -N reservation open and only records
--                       the provisional charge + estimate on the generation
--   reconcile_billing_event
--     open reservation  → convert it to 'debit' at authoritative credits
--                         (release of the remainder is implicit)
--     already settled   → auditable 'adjustment' for the difference
--   settle_unbilled_generations (SLA fallback)
--     no billing event by the reconciliation deadline → debit the
--     provisional quote-math charge and release the remainder, marked
--     'fallback_timeout' — a permanently missing fal event can never clog
--     the sweep or hold customer credits hostage forever.
--
-- A billing event that arrives AFTER fallback settlement still reconciles
-- through the adjustment path, so late events self-correct.
-- ---------------------------------------------------------------------------

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS provisional_credit_cost NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS billing_reconcile_state TEXT;

-- ---------------------------------------------------------------------------
-- 1. complete_generation — hold the reservation; record provisional charge
-- ---------------------------------------------------------------------------
-- Identical to the 20261009000001 definition except the settlement block:
-- the -reserve 'reservation' row is NOT converted to a debit here. It stays
-- open (still subtracted from available balance) until the provider's
-- authoritative billing event or the SLA fallback settles it. The generation
-- records provisional_credit_cost (what our pinned quote math predicts) and
-- mirrors it into actual_credit_cost as the current best estimate —
-- reconciliation overwrites actual_credit_cost with the authoritative value.

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
  v_provisional_credit_cost NUMERIC(12,4);
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

  -- Settle estimate from the snapshot of the endpoint that ACTUALLY ran —
  -- the fallback's own pricing AND the fallback's own pinned components,
  -- never the primary's when fallback executed.
  SELECT s.payload,
         CASE
           WHEN q.fallback_snapshot_id IS NOT NULL
                AND v_record.provider_endpoint IS NOT NULL
                AND v_record.provider_endpoint = q.fallback_endpoint_id
           THEN q.params->'fallback_components'
           ELSE q.params->'primary_components'
         END AS components
  INTO v_quote
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
      -- Fal bills DECIMAL megapixels rounded UP (their docs: 3840×2160 =
      -- 8.29 MP → billed as 9). Mirrors lib/pricing/adapters/fal.ts.
      v_actual_quantity := COALESCE(
        CEIL(v_output_width::NUMERIC(12,4) * v_output_height::NUMERIC(12,4) / 1000000), 1);
    ELSIF v_pricing_type = 'resolution_tier' THEN
      -- The tier and param surcharges were pinned at quote time and the
      -- submit path pins `resolution` to that same tier, so the quoted
      -- resolved_price IS the billed unit price.
      v_actual_quantity := 1::NUMERIC(12,4);
      v_unit_price := (v_quote.components->>'resolved_price')::NUMERIC(12,8);
      IF v_unit_price IS NULL OR v_unit_price <= 0 THEN
        RAISE EXCEPTION 'Missing resolved_price in pinned quote components'
          USING ERRCODE = 'P0001';
      END IF;
    ELSE
      RAISE EXCEPTION 'Unsupported pricing type in pinned snapshot: %', v_pricing_type
        USING ERRCODE = 'P0001';
    END IF;

    v_actual_cost_usd := v_unit_price * v_actual_quantity;
    v_provisional_credit_cost := LEAST(
      public.credits_for_provider_cost(v_actual_cost_usd),
      v_reserve
    );
  ELSE
    -- Quote/snapshot missing (legacy row): provisional = reservation.
    v_actual_cost_usd := v_record.provider_cost_usd;
    v_provisional_credit_cost := v_reserve;
    v_unit_price := NULL;
  END IF;

  -- HOLD THE RESERVE: the -reserve 'reservation' row stays open and keeps
  -- subtracting from available balance until the provider's authoritative
  -- billing event (or the SLA fallback) converts it. The customer can never
  -- spend credits that are still potentially owed on an in-flight bill.
  -- The provisional charge is annotated for audit/debugging.
  UPDATE public.credit_ledger
  SET metadata = metadata || jsonb_build_object(
        'provisional_at', NOW()::text,
        'provisional_credit_cost', v_provisional_credit_cost,
        'provisional_cost_usd', v_actual_cost_usd,
        'provisional_quantity', v_actual_quantity,
        'compute_seconds', p_compute_seconds,
        'settlement_mode', 'hold_for_authoritative'
      )
  WHERE user_id = v_user_id
    AND generation_id = p_generation_id
    AND entry_type = 'reservation';

  -- No reservation row found (zero-reserve quote or legacy path): the
  -- provisional charge is what the customer owes — record the debit now
  -- so the balance still reflects it. Only when a charge actually exists.
  IF NOT FOUND AND v_provisional_credit_cost > 0 THEN
    INSERT INTO public.credit_ledger (
      user_id, entry_type, amount, generation_id, idempotency_key, metadata
    ) VALUES (
      v_user_id,
      'debit',
      -v_provisional_credit_cost,
      p_generation_id,
      'debit:' || p_generation_id::text,
      jsonb_build_object(
        'provisional_cost_usd', v_actual_cost_usd,
        'settlement_mode', 'immediate_no_reservation'
      )
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
      provisional_credit_cost = v_provisional_credit_cost,
      actual_credit_cost = v_provisional_credit_cost,
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
-- 2. reconcile_billing_event — convert the held reservation at authoritative
-- ---------------------------------------------------------------------------
-- Returns: 'duplicate' | 'unmatched' | 'settled' | 'settled_unquoted' |
--          'overrun_absorbed'

CREATE OR REPLACE FUNCTION public.reconcile_billing_event(
  p_provider TEXT,
  p_request_id TEXT,
  p_endpoint_id TEXT,
  p_event_timestamp TIMESTAMPTZ,
  p_output_units NUMERIC(12,4),
  p_unit TEXT,
  p_unit_price NUMERIC(12,8),
  p_percent_discount NUMERIC(8,4),
  p_cost_subtotal NUMERIC(12,8),
  p_cost_discount NUMERIC(12,8),
  p_cost_total NUMERIC(12,8),
  p_raw JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_gen RECORD;
  v_quote RECORD;
  v_endpoint TEXT;
  v_overrun BOOLEAN := FALSE;
  v_result TEXT;
  v_reserved NUMERIC(12,4);
  v_authoritative NUMERIC(12,4);
  v_delta NUMERIC(12,4) := NULL;
BEGIN
  -- Idempotent: a retried cron run must not double-record an event.
  INSERT INTO public.provider_billing_events (
    provider, request_id, endpoint_id, event_timestamp,
    output_units, unit, unit_price, percent_discount,
    cost_subtotal, cost_discount, cost_total, raw
  ) VALUES (
    p_provider, p_request_id, p_endpoint_id, p_event_timestamp,
    p_output_units, p_unit, p_unit_price, p_percent_discount,
    p_cost_subtotal, p_cost_discount, p_cost_total, p_raw
  )
  ON CONFLICT (provider, request_id) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    -- Self-heal: if a prior attempt recorded the event but the generation
    -- never got marked, close it out now so the sweep stops rescanning.
    UPDATE public.generations g
    SET billing_reconciled_at = NOW(), updated_at = NOW()
    WHERE g.provider_request_id = p_request_id
      AND g.billing_reconciled_at IS NULL;
    RETURN 'duplicate';
  END IF;

  -- Join the event to the generation that produced the request (locked so
  -- the SLA fallback settle can't race this settlement). The quote's
  -- provider is checked so request_id collisions across future providers
  -- can't attach a fal bill to a non-fal row.
  SELECT g.id, g.user_id, g.status, g.quote_id, g.provider_endpoint,
         g.credit_cost, g.actual_credit_cost
  INTO v_gen
  FROM public.generations g
  WHERE g.provider_request_id = p_request_id
    AND (
      g.quote_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.generation_quotes q
        WHERE q.id = g.quote_id AND q.provider = p_provider
      )
    )
  LIMIT 1
  FOR UPDATE;

  IF v_gen.id IS NULL THEN
    -- A fal bill for a request we don't know: record it (unmatched stays
    -- visible for ops) but there's nothing to settle or suspend.
    RETURN 'unmatched';
  END IF;

  -- Quote maximum is the financial envelope the generation reserved.
  SELECT q.maximum_cost_usd
  INTO v_quote
  FROM public.generation_quotes q
  WHERE q.id = v_gen.quote_id;

  IF v_quote.maximum_cost_usd IS NOT NULL THEN
    v_overrun := p_cost_total > v_quote.maximum_cost_usd + 0.000001;
  END IF;

  -- Authoritative customer charge: ceil(cost_total / $0.001) capped at the
  -- reserved envelope (generations.credit_cost holds reserve_credits).
  v_reserved := COALESCE(v_gen.credit_cost, 0);
  v_authoritative := LEAST(
    public.credits_for_provider_cost(p_cost_total), v_reserved);

  -- Settle the customer's ledger. Only fixed-credit (quoted) generations —
  -- pre-#93 rows use the old denomination and are analytics-only here.
  IF v_gen.quote_id IS NOT NULL
     AND v_gen.status = 'completed'
     AND v_gen.actual_credit_cost IS NOT NULL THEN

    -- Preferred path: the held reservation converts directly into the
    -- authoritative debit; the unreleased remainder frees automatically.
    UPDATE public.credit_ledger
    SET entry_type = 'debit',
        amount = -v_authoritative,
        metadata = metadata || jsonb_build_object(
          'settled_at', NOW()::text,
          'authoritative_credit_cost', v_authoritative,
          'billed_total_usd', p_cost_total,
          'billing_event_id', v_event_id,
          'settlement_mode', 'authoritative'
        )
    WHERE user_id = v_gen.user_id
      AND generation_id = v_gen.id
      AND entry_type = 'reservation';

    IF NOT FOUND THEN
      -- The hold already closed (SLA fallback or the immediate-debit edge):
      -- move the recorded charge to authoritative via an auditable
      -- 'adjustment' row — negative delta → customer refund, positive →
      -- extra charge still capped at the reservation.
      v_delta := v_authoritative - v_gen.actual_credit_cost;
      IF v_delta <> 0 THEN
        INSERT INTO public.credit_ledger (
          user_id, entry_type, amount, generation_id, idempotency_key, metadata
        ) VALUES (
          v_gen.user_id,
          'adjustment',
          -v_delta,
          v_gen.id,
          'reconcile:' || v_gen.id::text,
          jsonb_build_object(
            'reason', 'provider_billing_reconciliation',
            'request_id', p_request_id,
            'billing_event_id', v_event_id,
            'billed_total_usd', p_cost_total,
            'provisional_credit_debit', v_gen.actual_credit_cost,
            'authoritative_credit_cost', v_authoritative
          )
        )
        -- credit_ledger uniqueness is the partial composite index
        -- (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL.
        ON CONFLICT (user_id, idempotency_key)
        WHERE idempotency_key IS NOT NULL
        DO NOTHING;
      END IF;
    END IF;
  END IF;

  -- Authoritative truth on the generation. actual_credit_cost updates only
  -- for quoted completed rows; a row already fallback-settled flips to the
  -- provider-settled state because the event DID arrive.
  UPDATE public.generations
  SET billing_reconciled_at = NOW(),
      billing_reconcile_state = CASE
        WHEN quote_id IS NULL THEN 'provider_unquoted'
        WHEN billing_reconcile_state = 'fallback_timeout'
          THEN 'provider_late'
        ELSE 'provider'
      END,
      provider_cost_usd = p_cost_total,
      actual_credit_cost = CASE
        WHEN quote_id IS NOT NULL
             AND status = 'completed'
             AND actual_credit_cost IS NOT NULL
          THEN v_authoritative
        ELSE actual_credit_cost
      END,
      updated_at = NOW()
  WHERE id = v_gen.id;

  UPDATE public.provider_billing_events
  SET generation_id = v_gen.id,
      quote_maximum_usd = v_quote.maximum_cost_usd,
      overrun = v_overrun,
      ledger_credit_delta = v_delta
  WHERE id = v_event_id;

  IF v_overrun THEN
    -- CIRCUIT BREAKER: the billed cost exceeded the reserved envelope. The
    -- customer has been settled at (at most) their reservation — the
    -- remainder is absorbed by 5Pixels — and the route is suspended until a
    -- human reviews.
    v_endpoint := COALESCE(v_gen.provider_endpoint, p_endpoint_id);

    INSERT INTO public.provider_endpoint_state (
      provider, endpoint_id, status, suspend_reason, suspended_at,
      overrun_count, last_seen_at
    ) VALUES (
      p_provider, v_endpoint, 'suspended', 'billing_overrun', NOW(), 1, NOW()
    )
    ON CONFLICT (provider, endpoint_id) DO UPDATE SET
      status = 'suspended',
      suspend_reason = 'billing_overrun',
      suspended_at = NOW(),
      overrun_count = public.provider_endpoint_state.overrun_count + 1,
      last_seen_at = NOW();

    INSERT INTO public.admin_alerts (rule, severity, message, details)
    VALUES (
      'provider_billing_overrun',
      'critical',
      format('Provider billed $%s above the quoted maximum on %s — route suspended',
             ROUND((p_cost_total - v_quote.maximum_cost_usd)::NUMERIC, 6),
             v_endpoint),
      jsonb_build_object(
        'generation_id', v_gen.id,
        'request_id', p_request_id,
        'endpoint_id', v_endpoint,
        'quote_maximum_usd', v_quote.maximum_cost_usd,
        'billed_total_usd', p_cost_total,
        'absorbed_usd', p_cost_total - v_quote.maximum_cost_usd,
        'reserved_credits', v_reserved,
        'authoritative_credits', v_authoritative,
        'ledger_credit_delta', v_delta,
        'billing_event_id', v_event_id
      )
    );

    v_result := 'overrun_absorbed';
  ELSIF v_quote.maximum_cost_usd IS NULL THEN
    v_result := 'settled_unquoted';
  ELSE
    v_result := 'settled';
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_billing_event(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, NUMERIC, TEXT, NUMERIC, NUMERIC, NUMERIC,
  NUMERIC, NUMERIC, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_billing_event(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, NUMERIC, TEXT, NUMERIC, NUMERIC, NUMERIC,
  NUMERIC, NUMERIC, JSONB
) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. settle_unbilled_generations — SLA fallback for missing billing events
-- ---------------------------------------------------------------------------
-- A fal billing event that never arrives must not hold a customer's reserve
-- forever or clog the oldest-first sweep. Past the deadline we settle at
-- the provisional quote-math charge (already recorded on the generation),
-- release the remainder, and mark the row 'fallback_timeout'. If the event
-- ever shows up later it reconciles through the adjustment path above.

CREATE OR REPLACE FUNCTION public.settle_unbilled_generations(
  p_completed_before TIMESTAMPTZ,
  p_limit INT DEFAULT 200
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gen RECORD;
  v_count INT := 0;
BEGIN
  FOR v_gen IN
    SELECT g.id, g.user_id, g.quote_id, g.provider_endpoint,
           g.credit_cost, g.actual_credit_cost, g.provider_request_id
    FROM public.generations g
    WHERE g.status = 'completed'
      AND g.provider_request_id IS NOT NULL
      AND g.billing_reconciled_at IS NULL
      AND g.completed_at < p_completed_before
    ORDER BY g.completed_at
    LIMIT p_limit
    FOR UPDATE OF g SKIP LOCKED
  LOOP
    -- Convert any still-open hold into the provisional debit; the remainder
    -- releases implicitly. Unquoted/legacy rows have no hold to convert.
    UPDATE public.credit_ledger
    SET entry_type = 'debit',
        amount = -COALESCE(v_gen.actual_credit_cost, v_gen.credit_cost),
        metadata = metadata || jsonb_build_object(
          'settled_at', NOW()::text,
          'settlement_mode', 'fallback_timeout',
          'reason', 'no_provider_billing_event'
        )
    WHERE user_id = v_gen.user_id
      AND generation_id = v_gen.id
      AND entry_type = 'reservation';

    UPDATE public.generations
    SET billing_reconciled_at = NOW(),
        billing_reconcile_state = 'fallback_timeout',
        updated_at = NOW()
    WHERE id = v_gen.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_unbilled_generations(TIMESTAMPTZ, INT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_unbilled_generations(TIMESTAMPTZ, INT)
  TO service_role;
