-- Bachs live catalog, provisioned 2026-10-09 against https://api.bachs.io
-- (acct_Rd1ezw2qJXmmpmOA) — same 14 offerings as the sandbox catalog in
-- 20261008000001_bachs_provider.sql. Adds bachs_product_id_live alongside
-- bachs_product_id_sandbox; checkout selects per BACHS_ENVIRONMENT.
UPDATE public.plans
SET metadata = metadata || jsonb_build_object(
  'bachs_product_id_live', v.product_id
)
FROM (VALUES
  ('weekly-starter',  'prod_acd6c1f40abd455982fd'),
  ('weekly-plus',     'prod_0360a29640e049488ddd'),
  ('monthly-creator', 'prod_2514507c634f444f95b3'),
  ('monthly-pro',     'prod_91cfdbf2a4c84fceaeeb'),
  ('monthly-studio',  'prod_c4c36472d52149e6a356'),
  ('monthly-agency',  'prod_b6ec5839bfe94fb2b556'),
  ('annual-creator',  'prod_690dac560ea64b978608'),
  ('annual-pro',      'prod_fb9ae14cbaaa4040bda7'),
  ('annual-studio',   'prod_321cbf83dcfb4342b377'),
  ('annual-agency',   'prod_8c8481a81ed842a5b3e5'),
  ('credits-1000',    'prod_7406d26a370d4925b4c5'),
  ('credits-2500',    'prod_69d7bd262f554b799364'),
  ('credits-5000',    'prod_b4cd62fc62434899893f'),
  ('credits-10000',   'prod_14a1f52d440e450d92ca')
) AS v(slug, product_id)
WHERE plans.slug = v.slug;
