-- Creem test-mode product IDs, mapped onto plans.metadata.
-- Scoped as creem_product_id_test so live-mode resolution (creem_product_id_live)
-- never falls back to a test product by accident.
UPDATE public.plans
SET metadata = metadata || jsonb_build_object('creem_product_id_test', v.creem_id)
FROM (VALUES
  ('weekly-starter',  'prod_3omO8C1NTUAeTZ51G3ZwSw'),
  ('weekly-plus',     'prod_3PVkIhS8LG81ORT4jBsL2D'),
  ('monthly-creator', 'prod_IY8cDQ8e9xnHWBajKeERy'),
  ('monthly-pro',     'prod_6obwIEgSV3DS37Gh8ovv5D'),
  ('monthly-studio',  'prod_3V17b8kCwX8hMysjq1HKtM'),
  ('monthly-agency',  'prod_15ZQkOH6lV6iTx1CM07Fxs'),
  ('extra-credits',   'prod_5jQLeSlEBQbvFSELacYVWP'),
  ('annual-creator',  'prod_4AOw599aPvqnO4u8HjDAWT'),
  ('annual-pro',      'prod_1js3ccqbq7rGNCvidD4e0t'),
  ('annual-studio',   'prod_6g5z20l3fP8UwC0kbnIjCn'),
  ('annual-agency',   'prod_3S2GZ1qZg4gsQpMHqvlPNP')
) AS v(slug, creem_id)
WHERE plans.slug = v.slug;
