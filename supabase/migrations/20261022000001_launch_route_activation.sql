-- Launch route activation (issue #113, step 2 of 2)
-- ---------------------------------------------------------------------------
-- Activates the QA-passed draft versions created by
-- 20261021000001_launch_safe_routes.sql. Each activation mirrors
-- publish_product_version's atomic transition: retire the current active
-- version, activate the target draft, keep the product 'active'.
--
-- QA evidence (2026-10-15, scripts/qa-route-generation.mjs, real Fal jobs on
-- the launch routes): 7/7 generations matched the preset's look on the new
-- route — studio-standard, founder-portrait, modern-professional,
-- creative-headshot, cover-star, manga-cutout (NB2), cinematic-still (NB).
--
-- Guard rail: a draft is only activated while its resolved primary endpoint
-- still has a fresh, quotable (non-'unsupported') pricing snapshot. If
-- pricing lapses between draft creation and this migration, activation skips
-- that preset with a NOTICE rather than going live unquotable — same
-- fail-closed rule the quote path enforces.
--
-- Idempotent: targets are drafts carrying the launch strategy; once
-- activated they are no longer drafts, so a re-run skips them.
--
-- cyber-punk stays 'paused' (its flux route is intentionally unsupported).
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
  v_draft_id UUID;
  v_draft_strategy JSONB;
  v_product_id UUID;
  v_prev_active UUID;
  v_endpoint TEXT;
  v_payload JSONB;
BEGIN
  SELECT id INTO v_admin FROM public.profiles
    WHERE id = '41b01f9c-f4bc-4bb8-912a-d13396b19be0';

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
      ('retro-slam-manga',     'nb_only'),
      ('cinematic-still',      'nb_only')
    ) AS t(slug, plan)
  LOOP
    v_draft_strategy := CASE v_rec.plan WHEN 'nb2_fb' THEN v_nb2_fb ELSE v_nb_only END;

    SELECT p.id INTO v_product_id FROM public.products p WHERE p.slug = v_rec.slug;
    IF NOT FOUND THEN
      RAISE NOTICE 'issue-113: product % not found — skipped', v_rec.slug;
      CONTINUE;
    END IF;

    SELECT pv.id INTO v_draft_id
    FROM public.product_versions pv
    WHERE pv.product_id = v_product_id
      AND pv.state = 'draft'
      AND pv.provider_strategy = v_draft_strategy
    ORDER BY pv.version_number DESC
    LIMIT 1;
    IF NOT FOUND THEN
      RAISE NOTICE 'issue-113: % has no draft with the launch strategy (already activated or not created) — skipped', v_rec.slug;
      CONTINUE;
    END IF;

    -- Quotability guard: same resolution rule as lib/ai/provider-routing.ts.
    v_endpoint := CASE
      WHEN replace(v_draft_strategy->>'primary_provider', '.', '-') = 'fal-ai'
           AND v_draft_strategy->>'primary_model' = 'flux-pro'
        THEN 'fal-ai/flux/dev/image-to-image'
      WHEN v_draft_strategy->>'primary_model' LIKE 'fal-ai/%'
        THEN v_draft_strategy->>'primary_model'
      WHEN replace(v_draft_strategy->>'primary_provider', '.', '-') = 'fal-ai'
        THEN 'fal-ai/' || (v_draft_strategy->>'primary_model')
      ELSE NULL END;

    SELECT s.payload INTO v_payload
    FROM public.provider_pricing_snapshots s
    WHERE s.provider = 'fal' AND s.endpoint_id = v_endpoint AND s.expires_at > NOW()
    ORDER BY s.fetched_at DESC
    LIMIT 1;

    IF v_payload IS NULL OR v_payload->>'pricing_type' = 'unsupported' THEN
      RAISE NOTICE 'issue-113: % route % has no fresh quotable snapshot — NOT activated', v_rec.slug, v_endpoint;
      CONTINUE;
    END IF;

    SELECT pv.id INTO v_prev_active
    FROM public.product_versions pv
    WHERE pv.product_id = v_product_id AND pv.state = 'active'
    ORDER BY pv.version_number DESC LIMIT 1;

    UPDATE public.product_versions
    SET state = 'retired', retired_at = NOW()
    WHERE product_id = v_product_id AND state = 'active';

    UPDATE public.product_versions
    SET state = 'active', published_at = NOW()
    WHERE id = v_draft_id;

    UPDATE public.products
    SET public_status = 'active'
    WHERE id = v_product_id;

    INSERT INTO public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, before, after, reason)
    VALUES (
      v_admin, 'product_version.publish', 'product_version', v_draft_id,
      jsonb_build_object('previous_active_version_id', v_prev_active),
      jsonb_build_object('product_id', v_product_id, 'version_id', v_draft_id,
        'provider_endpoint', v_endpoint, 'override', false),
      'issue-113: launch route remediation — activated after visual QA on the launch route'
    );
  END LOOP;
END $$;
