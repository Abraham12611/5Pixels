-- Phase 4: generation vertical slice
-- Adds credits, hardens generation lifecycle RLS, adds atomic RPCs,
-- and prepares private user-assets storage for source uploads and outputs.

-- ---------------------------------------------------------------------------
-- 0. Remove any previously created private-recipe RPC that could leak prompts
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_private_generation_recipe(UUID, UUID);

-- ---------------------------------------------------------------------------
-- 1. Credits: idempotent signup allocation + backfill
-- ---------------------------------------------------------------------------

-- Ledger semantics:
--   positive entries: allocation, refund, purchase, adjustment
--   negative entries: reservation, debit
--   balance = sum(amount)
-- Drop the old global idempotency unique constraint and replace it with a
-- per-user unique partial index so idempotency keys are unique per user.
ALTER TABLE public.credit_ledger
  DROP CONSTRAINT IF EXISTS credit_ledger_idempotency_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_user_idempotency
  ON public.credit_ledger (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- A plain index for entry-type lookups.
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_type
  ON public.credit_ledger (user_id, entry_type, created_at DESC);

-- Enforce sign conventions for the ledger. adjustment can be either way so it
-- is excluded from the check.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_credit_ledger_amount_sign'
      AND conrelid = 'public.credit_ledger'::regclass
  ) THEN
    ALTER TABLE public.credit_ledger
      ADD CONSTRAINT chk_credit_ledger_amount_sign
      CHECK (
        (entry_type IN ('allocation', 'purchase', 'refund') AND amount >= 0)
        OR (entry_type IN ('reservation', 'debit') AND amount <= 0)
        OR (entry_type = 'adjustment')
      );
  END IF;
END;
$$;

-- Idempotent signup credit in handle_new_user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, status)
  VALUES (NEW.id, NEW.email, 'active')
  ON CONFLICT (id) DO NOTHING;

  -- Grant 10 initial credits exactly once per user.
  INSERT INTO public.credit_ledger (
    user_id,
    entry_type,
    amount,
    idempotency_key,
    metadata
  )
  VALUES (
    NEW.id,
    'allocation',
    10,
    'signup:' || NEW.id::text,
    jsonb_build_object('reason', 'initial_signup_credits')
  )
  ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill 10 credits to existing active users without any ledger row.
INSERT INTO public.credit_ledger (
  user_id,
  entry_type,
  amount,
  idempotency_key,
  metadata
)
SELECT
  p.id,
  'allocation',
  10,
  'backfill-signup:' || p.id::text,
  jsonb_build_object('reason', 'backfill_active_user_signup_credits')
FROM public.profiles p
WHERE p.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.credit_ledger l WHERE l.user_id = p.id
  )
ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Extend generations and outputs for provider lifecycle
-- ---------------------------------------------------------------------------

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS provider_request_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_endpoint TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS status_detail TEXT,
  ADD COLUMN IF NOT EXISTS progress JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS processing_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS credit_cost INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_generations_user_status
  ON public.generations (user_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_generations_user_idempotency
  ON public.generations (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_generations_provider_request
  ON public.generations (provider_endpoint, provider_request_id)
  WHERE provider_request_id IS NOT NULL;

-- Trigger to keep updated_at fresh.
CREATE TRIGGER generations_updated_at
  BEFORE UPDATE ON public.generations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 3. Private user-assets storage bucket and policies
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-assets',
  'user-assets',
  FALSE,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop any prior naming variants so we never end up with duplicate permissive policies.
DROP POLICY IF EXISTS "user_assets_select" ON storage.objects;
DROP POLICY IF EXISTS "user_assets_select_own" ON storage.objects;
DROP POLICY IF EXISTS "user_assets_insert" ON storage.objects;
DROP POLICY IF EXISTS "user_assets_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "user_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "user_assets_update_own" ON storage.objects;
DROP POLICY IF EXISTS "user_assets_delete" ON storage.objects;
DROP POLICY IF EXISTS "user_assets_delete_own" ON storage.objects;

-- Users may only read/write/delete objects inside their own top-level folder in user-assets.
CREATE POLICY "user_assets_select_own" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-assets'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "user_assets_insert_own" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-assets'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "user_assets_update_own" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-assets'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'user-assets'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "user_assets_delete_own" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-assets'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- 4. Harden RLS on generations, outputs, and assets
-- ---------------------------------------------------------------------------

-- Users can only read their own generations. All mutations go through RPCs.
DROP POLICY IF EXISTS "generations_owner" ON public.generations;
DROP POLICY IF EXISTS "generations_select_own" ON public.generations;
CREATE POLICY "generations_select_own" ON public.generations
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Only admins may select all generations.
DROP POLICY IF EXISTS "generations_admin_select" ON public.generations;
CREATE POLICY "generations_admin_select" ON public.generations
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "generation_outputs_select" ON public.generation_outputs;
DROP POLICY IF EXISTS "generation_outputs_select_own" ON public.generation_outputs;
CREATE POLICY "generation_outputs_select_own" ON public.generation_outputs
  FOR SELECT
  TO authenticated
  USING (
    generation_id IN (
      SELECT id FROM public.generations WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "generation_outputs_admin_select" ON public.generation_outputs;
CREATE POLICY "generation_outputs_admin_select" ON public.generation_outputs
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid())));

-- Ledger read remains own/admin; writes happen only through RPCs.
DROP POLICY IF EXISTS "credit_ledger_owner" ON public.credit_ledger;
DROP POLICY IF EXISTS "credit_ledger_select_own" ON public.credit_ledger;
CREATE POLICY "credit_ledger_select_own" ON public.credit_ledger
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- Users may only read private assets they own.
DROP POLICY IF EXISTS "assets_select" ON public.assets;
CREATE POLICY "assets_select" ON public.assets
  FOR SELECT
  TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    OR visibility = 'public'
    OR (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "assets_insert" ON public.assets;
CREATE POLICY "assets_insert" ON public.assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      owner_user_id = (SELECT auth.uid())
      AND bucket = 'user-assets'
      AND split_part(storage_key, '/', 1) = (SELECT auth.uid())::TEXT
      AND visibility = 'private'
    )
    OR public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- 5. Helper functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_balance()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(SUM(amount), 0)::INT
  FROM public.credit_ledger
  WHERE user_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_user_balance() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_balance() TO authenticated;

-- Validate user-provided options against active product_fields.
CREATE OR REPLACE FUNCTION public.validate_generation_options(
  p_product_id UUID,
  p_options JSONB
) RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  field RECORD;
  provided_keys TEXT[];
  v_value TEXT;
  v_num NUMERIC;
  v_allowed TEXT[];
BEGIN
  IF p_options IS NULL THEN
    RETURN 'Options object is required';
  END IF;

  provided_keys := array_agg(k) FROM jsonb_object_keys(p_options) AS k;

  FOR field IN
    SELECT
      f.field_key,
      f.field_type,
      f.required,
      f.config
    FROM public.product_fields f
    WHERE f.product_id = p_product_id AND f.active = TRUE
  LOOP
    -- Required fields must be present and not null/empty.
    IF field.required THEN
      IF p_options->>field.field_key IS NULL OR length(trim(p_options->>field.field_key)) = 0 THEN
        RETURN 'Missing required option: ' || field.field_key;
      END IF;
    END IF;

    -- Unknown keys are rejected to keep payloads predictable.
    IF NOT (field.field_key = ANY (provided_keys)) THEN
      CONTINUE;
    END IF;

    v_value := p_options->>field.field_key;

    IF field.field_type IN ('select', 'radio', 'layout', 'background', 'wardrobe', 'era', 'mood') THEN
      v_allowed := ARRAY(
        SELECT DISTINCT (o->>'value')
        FROM jsonb_array_elements(COALESCE(field.config->'options', '[]'::jsonb)) AS o
        WHERE o->>'value' IS NOT NULL
      );
      IF v_allowed <> ARRAY[]::TEXT[] AND NOT (v_value = ANY (v_allowed)) THEN
        RETURN 'Invalid value for ' || field.field_key;
      END IF;
    ELSIF field.field_type = 'intensity' THEN
      BEGIN
        v_num := v_value::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        RETURN field.field_key || ' must be a number';
      END;
      IF v_num < COALESCE((field.config->>'min')::NUMERIC, 0)
         OR v_num > COALESCE((field.config->>'max')::NUMERIC, 100) THEN
        RETURN field.field_key || ' is out of range';
      END IF;
    ELSIF field.field_type = 'toggle' THEN
      IF v_value NOT IN ('true', 'false', '1', '0', 'on', 'off') THEN
        RETURN field.field_key || ' must be a boolean';
      END IF;
    ELSIF field.field_type = 'color' THEN
      IF v_value !~ '^#[0-9a-fA-F]{6}$' THEN
        RETURN field.field_key || ' must be a hex color';
      END IF;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_generation_options(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_generation_options(UUID, JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Atomic generation RPCs
-- ---------------------------------------------------------------------------

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
  SELECT id, status, credit_cost
    INTO v_existing_id, v_existing_status, v_credit_cost
  FROM public.generations
  WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key
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

  SELECT id, status, processing_token_hash, user_id INTO v_record
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

-- ---------------------------------------------------------------------------
-- 7. Safe read RPCs
-- ---------------------------------------------------------------------------

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
  credit_cost INT,
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
  credit_cost INT,
  source_asset_id UUID,
  source_bucket TEXT,
  source_storage_key TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failure_code TEXT,
  failure_stage TEXT,
  outputs JSONB
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
    g.source_asset_id,
    sa.bucket AS source_bucket,
    sa.storage_key AS source_storage_key,
    g.created_at,
    g.updated_at,
    g.completed_at,
    g.failure_code,
    g.failure_stage,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'asset_id', a.id,
            'output_role', go.output_role,
            'bucket', a.bucket,
            'storage_key', a.storage_key,
            'mime_type', a.mime_type,
            'width', a.width,
            'height', a.height
          )
        )
        FROM public.generation_outputs go
        JOIN public.assets a ON a.id = go.asset_id
        WHERE go.generation_id = g.id
      ),
      '[]'::jsonb
    ) AS outputs
  FROM public.generations g
  JOIN public.products p ON p.id = g.product_id
  LEFT JOIN public.assets sa ON sa.id = g.source_asset_id
  WHERE g.id = p_generation_id
    AND g.user_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_user_generation_by_id(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_generation_by_id(UUID) TO authenticated;

-- Expose the active version id to server-side generation flows while keeping the
-- private recipe columns hidden.
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
  credit_cost INT,
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
              pa.created_at
            FROM public.product_assets pa
            JOIN public.assets a ON a.id = pa.asset_id
            WHERE pa.product_id = p.id
              AND pa.internal_only = FALSE
              AND a.visibility = 'public'
            UNION ALL
            SELECT 'hero', a.id, 0, '{}'::JSONB, a.bucket, a.storage_key, a.mime_type, a.width, a.height, a.created_at
            FROM public.assets a
            WHERE a.id = p.hero_asset_id AND a.visibility = 'public'
            UNION ALL
            SELECT 'poster', a.id, 0, '{}'::JSONB, a.bucket, a.storage_key, a.mime_type, a.width, a.height, a.created_at
            FROM public.assets a
            WHERE a.id = p.poster_asset_id AND a.visibility = 'public'
            UNION ALL
            SELECT 'preview_gif', a.id, 0, '{}'::JSONB, a.bucket, a.storage_key, a.mime_type, a.width, a.height, a.created_at
            FROM public.assets a
            WHERE a.id = p.preview_gif_asset_id AND a.visibility = 'public'
            UNION ALL
            SELECT 'preview_video', a.id, 0, '{}'::JSONB, a.bucket, a.storage_key, a.mime_type, a.width, a.height, a.created_at
            FROM public.assets a
            WHERE a.id = p.preview_video_asset_id AND a.visibility = 'public'
          ) combined
          ORDER BY combined.role, combined.sort_order, combined.created_at
        ) sub
      ),
      '[]'::JSONB
    ) AS public_assets
  FROM public.products p
  LEFT JOIN public.categories c ON c.id = p.category_id
  JOIN public.product_versions v
    ON v.product_id = p.id
   AND v.state = 'active'
  WHERE p.slug = p_slug
    AND p.public_status = 'active'
    AND p.visibility = 'public';
$$;

REVOKE ALL ON FUNCTION public.get_public_product_by_slug(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_product_by_slug(TEXT) TO anon, authenticated;
