-- Generations are driven by client-side polling gated on a one-time
-- processing token that is only ever delivered into an httpOnly cookie
-- (gen_token_<id>, 4h maxAge) on the browser that started the run. If that
-- cookie is lost — tab closed, expiry, another browser — no code path can
-- ever advance the generation again: it stays 'queued'/'generating'
-- forever with its credit reservation still locked.
--
-- resume_generation lets the owning user mint a fresh processing token for
-- a non-terminal generation so the status page can re-attach and reconcile
-- it against the provider's real state.

CREATE OR REPLACE FUNCTION public.resume_generation(p_generation_id UUID)
RETURNS TABLE (processing_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_status TEXT;
  v_token TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
  END IF;

  SELECT g.status INTO v_status
  FROM public.generations g
  WHERE g.id = p_generation_id AND g.user_id = v_user_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Generation not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_status IN ('completed', 'failed', 'cancelled', 'blocked') THEN
    RAISE EXCEPTION 'Generation already finished' USING ERRCODE = 'P0001';
  END IF;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  UPDATE public.generations
  SET processing_token_hash = encode(extensions.digest(v_token::bytea, 'sha256'), 'hex'),
      updated_at = NOW()
  WHERE id = p_generation_id;

  RETURN QUERY SELECT v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.resume_generation(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resume_generation(UUID) TO authenticated;
