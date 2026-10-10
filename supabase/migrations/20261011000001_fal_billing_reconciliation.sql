-- Fal Billing Events reconciliation + circuit-breaker activation
-- ---------------------------------------------------------------------------
-- Tranche 1 priced generations from verified snapshots and settled them from
-- pinned quote components. This tranche closes the loop: after fal bills a
-- request, we fetch the authoritative billing event (GET /v1/models/billing-
-- events, filtered by request_id) and compare cost_total against the quoted
-- maximum. Three outcomes:
--
--   cost_total <= quote maximum   → 'settled'   (quote was honest)
--   cost_total  > quote maximum   → 'overrun_absorbed'
--                                   absorb the delta (customer is NEVER
--                                   debited above what was reserved), suspend
--                                   the endpoint, raise a critical alert.
--   no matching generation        → 'unmatched' (event recorded for audit)
--
-- The customer's FINAL debit is reconciled to the authoritative billed cost:
--
--   authoritative_credits = min(ceil(cost_total / $0.001), reserved_credits)
--
-- An auditable 'adjustment' ledger row moves the charge from the provisional
-- completion debit to the authoritative amount — refunding when fal billed
-- less than our estimate, charging more (never above the reservation) when
-- it billed more. Everything above the reservation is absorbed by 5Pixels
-- and trips the circuit breaker.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. provider_billing_events — immutable authoritative billed-cost records
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.provider_billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  provider TEXT NOT NULL,
  request_id TEXT NOT NULL,
  endpoint_id TEXT,
  event_timestamp TIMESTAMPTZ,
  output_units NUMERIC(12,4),
  unit TEXT,
  unit_price NUMERIC(12,8),
  percent_discount NUMERIC(8,4),
  cost_subtotal NUMERIC(12,8),
  cost_discount NUMERIC(12,8),
  cost_total NUMERIC(12,8) NOT NULL,

  -- Reconciliation output
  generation_id UUID REFERENCES public.generations(id),
  quote_maximum_usd NUMERIC(12,8),
  overrun BOOLEAN,
  -- Signed credit adjustment applied to the customer's ledger (+ refund /
  -- - extra charge); NULL when no provisional debit existed to correct.
  ledger_credit_delta NUMERIC(12,4),
  raw JSONB,
  received_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (provider, request_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_events_generation
  ON public.provider_billing_events (generation_id)
  WHERE generation_id IS NOT NULL;

ALTER TABLE public.provider_billing_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.provider_billing_events FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. generations.billing_reconciled_at — sweep marker for the cron job
-- ---------------------------------------------------------------------------

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS billing_reconciled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_generations_unreconciled
  ON public.generations (completed_at)
  WHERE status = 'completed'
    AND provider_request_id IS NOT NULL
    AND billing_reconciled_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. reconcile_billing_event — atomic record + compare + break
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

  -- Join the event to the generation that produced the request. The quote's
  -- provider is checked so request_id collisions across future providers
  -- (Replicate/OpenRouter/…) can't attach a fal bill to a non-fal row.
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
  LIMIT 1;

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

  -- Reconcile the ledger from the provisional completion debit to the
  -- authoritative amount via an auditable 'adjustment' row:
  --   billed below estimate → negative delta → positive adjustment (refund)
  --   billed above estimate → positive delta → negative adjustment (charge,
  --                           still capped at the reservation)
  -- Only applies when a provisional debit actually exists (completed gens);
  -- idempotency_key makes a retried reconcile a no-op.
  IF v_gen.status = 'completed' AND v_gen.actual_credit_cost IS NOT NULL THEN
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
      ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
  END IF;

  -- The authoritative billed cost replaces the estimate on the generation;
  -- actual_credit_cost moves to the authoritative charge so the row carries
  -- consistent financial truth.
  UPDATE public.generations
  SET billing_reconciled_at = NOW(),
      provider_cost_usd = p_cost_total,
      actual_credit_cost = CASE
        WHEN status = 'completed' AND actual_credit_cost IS NOT NULL
          THEN v_authoritative
        ELSE actual_credit_cost
      END,
      updated_at = NOW()
  WHERE id = v_gen.id
    AND billing_reconciled_at IS NULL;

  UPDATE public.provider_billing_events
  SET generation_id = v_gen.id,
      quote_maximum_usd = v_quote.maximum_cost_usd,
      overrun = v_overrun,
      ledger_credit_delta = v_delta
  WHERE id = v_event_id;

  IF v_overrun THEN
    -- CIRCUIT BREAKER: the billed cost exceeded the reserved envelope. The
    -- customer has been reconciled up to (at most) their reservation — the
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
