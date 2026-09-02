-- Fix "column reference 'status' is ambiguous" in attach_provider_request.
-- The SELECT INTO used an unqualified `status` column that conflicted with
-- the function's RETURNS TABLE column named `status`.
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
