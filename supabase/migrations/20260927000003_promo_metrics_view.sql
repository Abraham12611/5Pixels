-- Aggregated promo funnel metrics for the admin offers console (09 §5).
-- Revenue rides in meta->>'amount_cents' on converted events. Read via
-- service role only — the view itself is revoked from anon/authenticated.
create view public.promo_funnel_metrics as
select
  campaign_id,
  variant,
  count(*) filter (where event = 'impression') as impressions,
  count(*) filter (where event = 'step_view') as step_views,
  count(*) filter (where event = 'accept') as accepts,
  count(*) filter (where event = 'decline') as declines,
  count(*) filter (where event = 'dismiss') as dismissals,
  count(*) filter (where event = 'checkout_started') as checkouts_started,
  count(*) filter (where event = 'converted') as conversions,
  count(*) filter (where event = 'refunded') as refunds,
  coalesce(
    sum((meta->>'amount_cents')::bigint) filter (where event = 'converted'),
    0
  ) as revenue_cents
from public.promo_events
group by campaign_id, variant;

revoke all on public.promo_funnel_metrics from anon, authenticated;
