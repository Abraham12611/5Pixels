-- Whop provider migration.
--
-- Whop is the active payment processor (PAYMENT_PROVIDER default). A Whop
-- *membership* (mem_*) is the subscription analogue; charges are payments
-- (pay_*) created through checkout configurations (ch_*). Buyers are Whop
-- users (user_*), stored on profiles.
--
-- The live catalog was provisioned 2026-10-05 (account biz_KC7AbStsyuhQyX):
-- one product per tier with monthly+annual variants, weekly pass products,
-- and a hidden "Credit Packs" product with four one-time variants.

-- 1. profiles: Whop user id (customer analogue).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whop_user_id TEXT;

-- 2. subscriptions: membership linkage + hosted portal url.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS whop_membership_id TEXT,
  ADD COLUMN IF NOT EXISTS whop_user_id TEXT,
  ADD COLUMN IF NOT EXISTS whop_manage_url TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_whop_membership
  ON public.subscriptions(whop_membership_id)
  WHERE whop_membership_id IS NOT NULL;

-- 3. invoices: payment / checkout-configuration / membership refs.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS whop_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS whop_checkout_id TEXT,
  ADD COLUMN IF NOT EXISTS whop_membership_id TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_whop_payment
  ON public.invoices(whop_payment_id)
  WHERE whop_payment_id IS NOT NULL;

-- 4. Plan → Whop variant mapping (live ids; scoped whop_variant_id_live so
--    a sandbox catalog can land under whop_variant_id_sandbox without
--    colliding).
UPDATE public.plans
SET metadata = metadata || jsonb_build_object(
  'whop_variant_id_live', v.variant_id,
  'whop_product_id_live', v.product_id
)
FROM (VALUES
  ('weekly-starter',  'plan_xl4pxRLqWF12u', 'prod_qX9saGPMUEeBW'),
  ('weekly-plus',     'plan_ZSzOTsaN8wjTP', 'prod_SNI4gZWX8DahT'),
  ('monthly-creator', 'plan_VtJfJaTwpxEf7', 'prod_40WnQe7O1CAby'),
  ('monthly-pro',     'plan_iObsXuLle4FLb', 'prod_238H5JI59oaXa'),
  ('monthly-studio',  'plan_iaWNW1JVhNWkE', 'prod_6ONgEMlRjCGfz'),
  ('monthly-agency',  'plan_83TjdANDitaJD', 'prod_uo0IisZ6qsUS2'),
  ('annual-creator',  'plan_xAib86Kem1kfm', 'prod_40WnQe7O1CAby'),
  ('annual-pro',      'plan_1XkFlr4vDGGZp', 'prod_238H5JI59oaXa'),
  ('annual-studio',   'plan_wAZQpswb2dXdg', 'prod_6ONgEMlRjCGfz'),
  ('annual-agency',   'plan_IKDYCM18qDja3', 'prod_uo0IisZ6qsUS2')
) AS v(slug, variant_id, product_id)
WHERE plans.slug = v.slug;

-- 5. Fixed credit packs — each row is one Whop one-time variant.
--    credits_grant is the authoritative grant (fixed packs don't price by
--    amount); markup_multiplier 1.0 keeps the 1 credit = $0.01 rate.
INSERT INTO public.plans (
  slug, name, type, price_cents, currency, credits_grant, markup_multiplier,
  interval, is_trial, can_repurchase, sort_order, is_active,
  credit_drip_months, metadata
) VALUES
  ('credits-1000',  '1,000 Credits',  'extra_credit',  1000, 'USD',  1000, 1.0000,
   'one_time', false, true, 90, true, 1,
   '{"whop_variant_id_live": "plan_tjuVsaVQBVgfh", "whop_product_id_live": "prod_Oiw4SaQYZJvzj", "credit_pack": true}'::jsonb),
  ('credits-2500',  '2,500 Credits',  'extra_credit',  2500, 'USD',  2500, 1.0000,
   'one_time', false, true, 91, true, 1,
   '{"whop_variant_id_live": "plan_ZNreFbUzQAcvJ", "whop_product_id_live": "prod_Oiw4SaQYZJvzj", "credit_pack": true}'::jsonb),
  ('credits-5000',  '5,000 Credits',  'extra_credit',  5000, 'USD',  5000, 1.0000,
   'one_time', false, true, 92, true, 1,
   '{"whop_variant_id_live": "plan_Idx3aHEHMLrrg", "whop_product_id_live": "prod_Oiw4SaQYZJvzj", "credit_pack": true}'::jsonb),
  ('credits-10000', '10,000 Credits', 'extra_credit', 10000, 'USD', 10000, 1.0000,
   'one_time', false, true, 93, true, 1,
   '{"whop_variant_id_live": "plan_N5G2awsZ8WsNj", "whop_product_id_live": "prod_Oiw4SaQYZJvzj", "credit_pack": true}'::jsonb)
ON CONFLICT (slug) DO UPDATE
  SET metadata = plans.metadata || EXCLUDED.metadata;

-- 6. The legacy variable-price extra-credits row is superseded by the fixed
--    packs — deactivate it so it no longer appears in plan lists.
UPDATE public.plans
SET is_active = false, updated_at = NOW()
WHERE slug = 'extra-credits' AND type = 'extra_credit';
