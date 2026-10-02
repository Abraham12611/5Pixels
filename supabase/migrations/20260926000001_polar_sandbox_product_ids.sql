-- Polar product ids, scoped per environment.
--
-- Polar issues DIFFERENT product ids in sandbox and production, so a single
-- `polar_product_id` key would make a production deploy attempt checkout
-- against sandbox products (404 at best, wrong price at worst). Ids are
-- therefore stored per environment and resolved at runtime from POLAR_SERVER:
--
--   metadata->>'polar_product_id_sandbox'
--   metadata->>'polar_product_id_production'
--
-- Verified against the sandbox API on 2026-09-24 — names, intervals and
-- price_amounts all match the corresponding plans rows:
--   Credits        custom   (one-time)
--   Agency         10000    month
--   Studio          5000    month
--   Pro             3000    month
--   Creator         2000    month
--   Weekly Plus     1000    one-time   (plans.interval = one_time, is_trial)
--   Weekly Starter   500    one-time   (plans.interval = one_time, is_trial)

UPDATE public.plans SET metadata = metadata
  || jsonb_build_object('polar_product_id_sandbox', '7c638527-d0ed-42b2-9b30-8f7a506ede98')
  WHERE slug = 'monthly-creator';

UPDATE public.plans SET metadata = metadata
  || jsonb_build_object('polar_product_id_sandbox', 'ebb72eaa-1612-443b-876c-a42bf279c61f')
  WHERE slug = 'monthly-pro';

UPDATE public.plans SET metadata = metadata
  || jsonb_build_object('polar_product_id_sandbox', '7a010e7d-f7c6-4726-a705-384490c84914')
  WHERE slug = 'monthly-studio';

UPDATE public.plans SET metadata = metadata
  || jsonb_build_object('polar_product_id_sandbox', '92b69622-5038-420a-a994-e6d4ec241916')
  WHERE slug = 'monthly-agency';

UPDATE public.plans SET metadata = metadata
  || jsonb_build_object('polar_product_id_sandbox', '3254ced2-4cf5-4c32-8b27-c3963aff82f4')
  WHERE slug = 'weekly-plus';

UPDATE public.plans SET metadata = metadata
  || jsonb_build_object('polar_product_id_sandbox', '764cde9e-58df-4d94-85a2-f50f9edc3fa6')
  WHERE slug = 'weekly-starter';

UPDATE public.plans SET metadata = metadata
  || jsonb_build_object('polar_product_id_sandbox', 'e5538d76-34ee-4077-b2fe-ac35e795c6c3')
  WHERE slug = 'extra-credits';

-- Annual plans (created 20260924000001). Studio Annual was originally created
-- in Polar with recurring_interval='month' — which would have billed $450/month
-- — and intervals are immutable once a product exists, so it was recreated as a
-- 'year' product (new id ce8593a9-...) and the misconfigured product archived.
UPDATE public.plans SET metadata = metadata
  || jsonb_build_object('polar_product_id_sandbox', '116d55c6-a309-46a6-a476-28e4531e67a7')
  WHERE slug = 'annual-creator';

UPDATE public.plans SET metadata = metadata
  || jsonb_build_object('polar_product_id_sandbox', '4775e22b-1a91-4c08-896b-9a2a2f97d706')
  WHERE slug = 'annual-pro';

UPDATE public.plans SET metadata = metadata
  || jsonb_build_object('polar_product_id_sandbox', 'ce8593a9-edd3-4b11-ba16-ba0d039a75de')
  WHERE slug = 'annual-studio';

UPDATE public.plans SET metadata = metadata
  || jsonb_build_object('polar_product_id_sandbox', '0b607586-7696-4669-8808-5ddedbe9a40f')
  WHERE slug = 'annual-agency';
