# Promo Admin Console & Metrics — Control Surface, Event Schema, Guardrails

Status: **Proposal.** The admin half of the offer engine (`08`). Goals stated by the owner: see which offers/variants/flows work, disable anything instantly, edit ladders without a deploy.

---

## 1. Admin IA

Dense, operational admin (bible rule: admin UX may be dense) under a new `Offers` section of `/admin`:

| Route | Purpose |
|---|---|
| `/admin/offers` | Campaign list: status, audience, impressions / accepts / conv.7d / revenue, enable toggle, duplicate |
| `/admin/offers/new` + `/admin/offers/[id]` | Campaign editor: name, audience, surfaces, ordered step list, caps, variant assignments, live preview |
| `/admin/offers/[id]/steps/[n]` | Step editor: kind (`weekly_pair`/`plans`/`discount`/`referral`/`topup`/`exit`), payload (plan slugs, `discount_id`, `deadline_display: none\|date\|countdown`, referral reward override, copy overrides) |
| `/admin/offers/metrics` | Dashboard: funnel per campaign/variant, daily time series, guardrail alerts |
| `/admin/offers/flags` | Global kill switches + default caps (`08 §6`) |

### Campaign editor — key affordances

- **Drag-ordered step list** rendered as the actual ladder will appear (compact `PlanRow` previews per step).
- **Surface preview** toggle per step: takeover / paywall-sheet / mobile render, using the real components (admin embeds `S7` in a framed viewport — what you see is what's shipped).
- **Variant table**: rows = variant slugs, columns = step order editor + traffic weight. Weights sum to 100; `control` is a real row, not a special case.
- **Audience picker**: checkboxes over tiers + flags (`anon`, `new_signup`, `free_returning`, `exhausted`, `churned`).
- **Status**: `draft → scheduled/live → paused → archived`. `paused` stops new impressions instantly (clients read assignments + enabled state per request); `archived` preserves data.
- **One-click disable** on every row and a global `PROMO ENGINE` master switch — banners, tiles, takeovers, ribbons, all of it. Server-enforced `OFFERS_ENABLED` env/flag as the backstop.

## 2. Schema

```sql
CREATE TABLE public.promo_campaigns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL UNIQUE,               -- 'post_signup_ladder'
  name         TEXT NOT NULL,
  audience     TEXT[] NOT NULL,                    -- tiers/flags targeted
  surfaces     TEXT[] NOT NULL,                    -- 'takeover','ribbon','tile','paywall','banner'
  status       TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','live','paused','archived')),
  starts_at    TIMESTAMPTZ, ends_at TIMESTAMPTZ,   -- real deadlines only
  frequency    JSONB NOT NULL DEFAULT '{}',        -- per-campaign cap overrides
  created_by   UUID REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.promo_steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.promo_campaigns(id) ON DELETE CASCADE,
  variant     TEXT NOT NULL DEFAULT 'default',     -- 'A_default','B_referral_first',…
  position    SMALLINT NOT NULL,                   -- ladder order within variant
  kind        TEXT NOT NULL
    CHECK (kind IN ('weekly_pair','discount','plans','referral','topup','exit')),
  payload     JSONB NOT NULL DEFAULT '{}',         -- plan slugs, discount_id, copy overrides, ends_at
  UNIQUE (campaign_id, variant, position)
);

CREATE TABLE public.promo_assignments (            -- sticky, server-side
  user_id      UUID REFERENCES public.profiles(id),
  anon_id      UUID,
  campaign_id  UUID NOT NULL REFERENCES public.promo_campaigns(id),
  variant      TEXT NOT NULL,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR anon_id IS NOT NULL),
  UNIQUE (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), campaign_id)
);

CREATE TABLE public.promo_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id),
  anon_id     UUID,
  campaign_id UUID REFERENCES public.promo_campaigns(id),
  variant     TEXT,
  step        SMALLINT,
  surface     TEXT,                                -- 'takeover','paywall','ribbon','tile','blur_gate'
  event       TEXT NOT NULL
    CHECK (event IN ('impression','step_view','accept','decline','dismiss','opt_out','checkout_started','converted','refunded')),
  context     TEXT,                                -- 'first_run_unlock','insufficient_credits',…
  meta        JSONB NOT NULL DEFAULT '{}',         -- plan_id, discount_id, amount
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_promo_events_funnel ON public.promo_events(campaign_id, variant, event, created_at);
```

RLS: reads/writes for admins only (`profiles.role='admin'`); event inserts go through a service-route that validates the surface/context pair so clients can't forge `converted`. `converted`/`refunded` are written **server-side from the Polar webhook** (`order.paid` reads `checkout.metadata.campaign_id`), never from the client — the same discipline as credit grants.

## 3. Metrics & definitions

Funnel per (campaign, variant, step): `impression → step_view → accept | decline | dismiss | opt_out → checkout_started → converted → (refunded)`.

| Metric | Definition |
|---|---|
| Accept rate | accepts / step_views |
| Takeover conversion | converted / impressions, attribution window **7d**, counted on first paid order only |
| Revenue per impression | Σ order net / impressions |
| Referral yield | referral-step accepts → `goal_reached` events / step views |
| Decline-to-purchase | % of decliners who purchase within 7d anyway (baseline demand — tells you the offer's true lift) |
| Guardrails | refund rate per campaign, opt-out rate, complaint emails |

Dashboard renders variant columns side-by-side with impressions and a wilson-interval band — the point is *which ordering wins*, so never show a bare %; always `conv% (n)`.

## 4. Guardrails (enforced server-side, not convention)

1. Discount floor: step save rejects anything pricing a plan below 50% catalog or below `06`'s COGS floor.
2. Caps from `08 §6` are checked at assignment time, not render time.
3. `opt_out`/`offers_opted_out` suppresses every promotional surface globally.
4. Takeover never renders on excluded routes (checkout, billing, success, in-flight generation).
5. Campaign with a `discount` step whose Polar discount was deleted → step auto-pauses, alert in metrics dashboard + admin notification.
6. Assignment is write-once: `promo_assignments` rows are never updated (except the anon→user `claim` rewrite); re-bucketing is impossible by construction.

## 5. Audit & review

Every campaign mutation writes `admin_audit` (existing table) with actor, diff, and reason field — offers change prices users see, so they're held to the same bar as billing changes. Campaign `live` transition requires a non-empty `control` variant weight ≥10% or an explicit `control_waived` note in audit — protecting future measurement from "we forgot the baseline".

## 6. Build notes

- Reuse the admin table/filter idioms from `/admin/filters` and `/admin/audit`.
- Step previews embed real consumer components with `preview` props — no duplicated mock markup.
- `promo_steps.payload` copy overrides are *additive only* (badge text, headline); pricing fields are never overridable — prices come from `plans` rows only.
- `deadline_display` (`none`/`date`/`countdown`) is a per-step admin control on `discount` steps — both visual styles ship in the component; admin picks per campaign. Countdowns always bind to the real `ends_at`; a step with `countdown` and no `ends_at` fails validation on save.
- v1 ships campaigns + events + metrics; variant weighting can start as 100/0 toggles and graduate to real splits once traffic justifies it (`04` gates experiments on traffic anyway).
