-- Launch catalog route remediation (issue #113)
-- ---------------------------------------------------------------------------
-- The published catalog was seeded against `openai/gpt-image-2/edit`, which the
-- provider resolver expands to `fal-ai/openai/gpt-image-2/edit` — an endpoint
-- that does not exist on Fal and has no verified pricing definition. Every
-- customer on those presets hits the fail-closed quote path
-- ("This preset is temporarily unavailable"). `fal-ai/flux/dev/image-to-image`
-- (cyber-punk) is also unquotable: image-to-image per-megapixel billing is not
-- a safely bounded shape.
--
-- Launch strategy chosen per preset (per #113 "verify, switch, or unpublish"):
--
--   repoint → NB2 primary + NB fallback (new draft versions, activated only
--             after a visual QA generation each — see follow-up migration):
--             studio-standard, founder-portrait, modern-professional,
--             creative-headshot, cover-star, manga-cutout
--   fallback cleanup → active route unchanged, dead/redundant fallback fixed:
--             editorial-profile, ink-portrait  (NB2 primary → NB fallback)
--             retro-slam-manga                 (NB primary → no fallback;
--             its NB2 fallback could never fit the $0.0458 max envelope)
--             cinematic-still v2 draft          (NB primary → drop dead NB2
--             fallback; draft recipe is mutable, edited in place)
--   pause  → cyber-punk: flux i2i stays intentionally unsupported until
--             #106/#107 or a separately QA'd version restores it.
--
-- Routes referenced: fal-ai/nano-banana-2/edit (verified resolution_tier),
-- fal-ai/nano-banana/edit (verified flat_per_request). Unsupported routes
-- remain fail-closed — nothing here loosens the quote path.
--
-- Idempotent: version inserts are guarded by "no version already carries the
-- target strategy", the draft fix by the fallback key still being present,
-- and the pause by status='active'. Safe to re-run.
--
-- History is append-only: active-version recipes are immutable by trigger, so
-- every route change lands as a new draft version; activation happens only
-- after the per-preset QA generation.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_admin UUID;
  v_nb2_fb JSONB := '{
    "primary_provider": "fal.ai", "primary_model": "fal-ai/nano-banana-2/edit",
    "fallback_provider": "fal.ai", "fallback_model": "fal-ai/nano-banana/edit"
  }'::jsonb;
  v_nb_only JSONB := '{
    "primary_provider": "fal.ai", "primary_model": "fal-ai/nano-banana/edit"
  }'::jsonb;
  v_rec RECORD;
  v_src public.product_versions;
  v_next INT;
  v_new_id UUID;
  v_created UUID[] := '{}';
  v_payload JSONB;
  v_price NUMERIC(12,8);
  v_min_px NUMERIC;
  v_endpoint TEXT;
  v_provider TEXT;
  v_model TEXT;
BEGIN
  SELECT id INTO v_admin FROM public.profiles
    WHERE id = '41b01f9c-f4bc-4bb8-912a-d13396b19be0';

  -- ── 1. Pause cyber-punk ─────────────────────────────────────────────────
  UPDATE public.products
  SET public_status = 'paused'
  WHERE slug = 'cyber-punk' AND public_status = 'active';
  IF FOUND THEN
    INSERT INTO public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, before, after, reason)
    SELECT v_admin, 'product.status.transition', 'product', p.id,
      jsonb_build_object('public_status', 'active'),
      jsonb_build_object('public_status', 'paused'),
      'issue-113: flux i2i route unquotable (unsupported per-megapixel i2i billing); paused for launch, restore via #106/#107'
    FROM public.products p WHERE p.slug = 'cyber-punk';
  END IF;

  -- ── 2. New draft versions ────────────────────────────────────────────────
  -- Clone each product's ACTIVE version into the next draft with a corrected
  -- provider_strategy. Sources: repoint targets are the gpt-image-2 v1s;
  -- editorial/ink are the nb2+nb2 v2s; retro-slam is the nb+nb2 v3.
  FOR v_rec IN
    SELECT * FROM (VALUES
      ('studio-standard',      'nb2_fb'),
      ('founder-portrait',     'nb2_fb'),
      ('modern-professional',  'nb2_fb'),
      ('creative-headshot',    'nb2_fb'),
      ('cover-star',           'nb2_fb'),
      ('manga-cutout',         'nb2_fb'),
      ('editorial-profile',    'nb2_fb'),
      ('ink-portrait',         'nb2_fb'),
      ('retro-slam-manga',     'nb_only')
    ) AS t(slug, plan)
  LOOP
    SELECT pv.* INTO v_src
    FROM public.product_versions pv
    JOIN public.products p ON p.id = pv.product_id
    WHERE p.slug = v_rec.slug AND pv.state = 'active'
    ORDER BY pv.version_number DESC
    LIMIT 1;
    IF NOT FOUND THEN
      RAISE NOTICE 'issue-113: % has no active version — skipped', v_rec.slug;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.product_versions nx
      WHERE nx.product_id = v_src.product_id
        AND nx.provider_strategy =
          CASE v_rec.plan WHEN 'nb2_fb' THEN v_nb2_fb ELSE v_nb_only END
    ) THEN
      CONTINUE; -- already remediated — idempotent
    END IF;

    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next
    FROM public.product_versions WHERE product_id = v_src.product_id;

    INSERT INTO public.product_versions (
      product_id, version_number, state,
      private_instruction_template, private_negative_instruction,
      provider_strategy, model_config, input_validation_config,
      post_process_config, safety_config, credit_cost, output_sizes,
      created_by_admin_id
    )
    VALUES (
      v_src.product_id, v_next, 'draft',
      v_src.private_instruction_template, v_src.private_negative_instruction,
      CASE v_rec.plan WHEN 'nb2_fb' THEN v_nb2_fb ELSE v_nb_only END,
      v_src.model_config, v_src.input_validation_config,
      v_src.post_process_config, v_src.safety_config, 0, v_src.output_sizes,
      v_admin
    )
    RETURNING id INTO v_new_id;
    v_created := v_created || v_new_id;

    INSERT INTO public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, before, after, reason)
    VALUES (
      v_admin, 'product_version.clone_draft', 'product_version', v_new_id,
      jsonb_build_object('source_version_id', v_src.id,
        'provider_strategy', v_src.provider_strategy),
      jsonb_build_object('product_id', v_src.product_id, 'version_number', v_next,
        'provider_strategy', CASE v_rec.plan WHEN 'nb2_fb' THEN v_nb2_fb ELSE v_nb_only END),
      'issue-113: launch route remediation'
    );
  END LOOP;

  -- ── 3. cinematic-still v2 draft — strip the dead NB2 fallback ────────────
  -- The draft already routes NB primary; its NB2 fallback can never fit the
  -- flat-rate envelope, so per #113 criteria it is removed (drafts are
  -- mutable — no new version needed).
  UPDATE public.product_versions
  SET provider_strategy = v_nb_only
  WHERE state = 'draft'
    AND provider_strategy->>'fallback_model' IS NOT NULL
    AND product_id = (SELECT id FROM public.products WHERE slug = 'cinematic-still');
  IF FOUND THEN
    INSERT INTO public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, before, after, reason)
    SELECT v_admin, 'product_version.route_fix', 'product_version', pv.id,
      jsonb_build_object('provider_strategy', jsonb_build_object(
        'primary_model', 'fal-ai/nano-banana/edit',
        'fallback_model', 'fal-ai/nano-banana-2/edit')),
      jsonb_build_object('provider_strategy', v_nb_only),
      'issue-113: remove fallback that cannot fit the primary quote envelope'
    FROM public.product_versions pv
    WHERE pv.product_id = (SELECT id FROM public.products WHERE slug = 'cinematic-still')
      AND pv.state = 'draft';
  END IF;

  -- ── 4. credit_cost display hints for the touched drafts ──────────────────
  -- Same sanctioned formula as 20261010000001 §12, at the post-#101 $0.01
  -- denomination: endpoint's fresh snapshot price at the smallest declared
  -- output size ÷ $0.01. Unquotable → 0 (never advertise a wrong-scale hint).
  FOR v_rec IN
    SELECT pv.id, pv.provider_strategy, pv.output_sizes
    FROM public.product_versions pv
    WHERE pv.id = ANY (v_created)
       OR (pv.state = 'draft' AND pv.provider_strategy = v_nb_only
           AND pv.product_id = (SELECT id FROM public.products WHERE slug = 'cinematic-still'))
  LOOP
    v_provider := replace(COALESCE(v_rec.provider_strategy->>'primary_provider', ''), '.', '-');
    v_model := COALESCE(v_rec.provider_strategy->>'primary_model', '');
    v_endpoint := CASE
      WHEN v_provider = 'fal-ai' AND v_model = 'flux-pro' THEN 'fal-ai/flux/dev/image-to-image'
      WHEN v_model LIKE 'fal-ai/%' THEN v_model
      WHEN v_provider = 'fal-ai' AND v_model <> '' THEN 'fal-ai/' || v_model
      ELSE NULL
    END;
    IF v_endpoint IS NULL THEN CONTINUE; END IF;

    SELECT s.payload INTO v_payload
    FROM public.provider_pricing_snapshots s
    WHERE s.provider = 'fal' AND s.endpoint_id = v_endpoint AND s.expires_at > NOW()
    ORDER BY s.fetched_at DESC LIMIT 1;
    IF v_payload IS NULL OR v_payload->>'pricing_type' = 'unsupported' THEN CONTINUE; END IF;

    SELECT MIN((o->>'width')::NUMERIC * (o->>'height')::NUMERIC) INTO v_min_px
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(v_rec.output_sizes) = 'array' AND jsonb_array_length(v_rec.output_sizes) > 0
           THEN v_rec.output_sizes ELSE '[{"width":1024,"height":1024}]'::jsonb END
    ) o;
    v_min_px := COALESCE(v_min_px, 1048576);

    v_price := CASE v_payload->>'pricing_type'
      WHEN 'flat_per_request' THEN (v_payload->>'unit_price')::NUMERIC(12,8)
      WHEN 'per_megapixel' THEN (v_payload->>'unit_price')::NUMERIC(12,8) * CEIL(v_min_px / 1000000)
      WHEN 'resolution_tier' THEN
        CASE v_payload->>'tier_map'
          WHEN 'fal_resolution' THEN
            (v_payload->'tiers'->>(CASE
              WHEN v_min_px <= 1100000 THEN '1K'
              WHEN v_min_px <= 4500000 THEN '2K'
              ELSE '4K' END))::NUMERIC(12,8)
          ELSE NULL END
      ELSE NULL END;

    IF v_price IS NOT NULL AND v_price > 0 THEN
      UPDATE public.product_versions
      SET credit_cost = CEIL(v_price / 0.01)::NUMERIC(12,4)
      WHERE id = v_rec.id;
    END IF;
  END LOOP;
END $$;
