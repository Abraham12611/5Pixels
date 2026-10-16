# 5Pixels Billing & Dynamic Credits Implementation Plan

**Status:** Canonical reference — describes the shipped billing architecture
(post #89/#93/#99/#100/#101). Sections that document an earlier design are
marked **[superseded]** inline.

This document defines the architecture for 5Pixels paid plans, credits, and
per-generation pricing. It protects margins across the provider model catalog
while keeping the user-facing model simple: **credits are spent when you
create; the estimated cost is shown before you generate.**

Payment processing is handled by **Bachs** (`PAYMENT_PROVIDER=bachs`, the
default). **5Pixels is the seller of record** — Bachs is a payment processor,
not a merchant of record. Whop and Creem remain behind `PAYMENT_PROVIDER` as
rollback providers; Dodo and Polar are historical integrations.

## Canonical credit policy (Oct 2026 — supersedes earlier wording)

This is the single source of truth for credit denomination and
expiry/rollover semantics. Any document, mock, or UI spec that describes
expiring credits, period resets, forfeiture at period end, "N of M credits
left" meters, or a different credit denomination is superseded by this
section (notably `new-design-look/13_BILLING.md` "Resets …" mock copy and
older weekly-expiry/no-rollover sketches elsewhere in this doc's history).

- **1 credit = $0.01 of provider-cost capacity — permanently.** This is an
  internal accounting denomination pinned by a CHECK constraint on
  `pricing_policies.credit_capacity_usd` and by
  `credits_for_provider_cost()`. It was $0.001 briefly under the first
  fixed-pricing migration and was re-denominated to $0.01 because large
  balances read dishonestly to customers; all stored figures were divided by
  10 with economics unchanged.
- **A credit is not money.** It is not a cash value, a redemption promise, or
  a "$0.01 wallet balance." Customer-facing copy must never describe credits
  in cents/dollars or imply cash redemption. Internally the denomination is
  how we map provider cost to a spendable unit — nothing more.
- **Margin is set at issuance, not at consumption.** A plan's economics come
  from how many credits it grants (`plans.credits_grant`, sized so the grant ×
  $0.01 = the plan's provider-cost budget). The retired `markup_multiplier`
  consumption model — where plan tier changed each credit's purchasing power —
  is gone (`get_user_markup_multiplier` revoked). The column remains on
  `plans` for reference only.
- **Consumption is quote-priced.** Different models, resolutions, and quality
  settings consume different credit amounts, priced per generation from a
  bounded provider-cost quote — see §3. Customers always see the estimated /
  up-to credit cost before generating.
- **Credits never expire** while the account remains active — plan grants,
  weekly-pass credits, top-ups, referral rewards, retention and promo credits
  are all fungible and persist until spent. There is no per-source expiry for
  launch; if source-aware expiry is ever wanted, it requires a dedicated
  credit-bucket project.
- **Balances accumulate.** A balance can exceed one period's grant. UI must
  never present `plan.credits_grant` as the balance's maximum or describe the
  balance as "X of Y credits left" — show the balance, the plan's per-period
  grant cadence (`+N credits each month`), and the next grant date separately.
- **Account deletion/termination** forfeits unused credits as described in
  the Terms; that is an account-state rule, not credit expiry.

---

## 1. Goals & Non-Goals

### 1.1 Goals
- Replace any static “1 credit = 1 image” rule with provider-cost-based per-generation pricing.
- Pin credit value to a fixed internal denomination: **1 credit = $0.01 of provider-cost capacity** (not a customer-facing dollar value).
- Protect gross margins by sizing plan grants against each plan's provider-cost budget, and by bounding every generation with a server-side quote.
- Support weekly passes, monthly and annual subscriptions, and fixed extra-credit packs.
- Make the credit ledger the single source of truth; never mutate a balance column directly.
- Hold the credit reservation until authoritative provider settlement (or a bounded fallback), not just until generation completes.
- Use Bachs for checkout, subscriptions, and webhooks (5Pixels is seller of record); keep Whop/Creem available as rollback providers.

### 1.2 Non-Goals
- This plan does not cover profit reporting dashboards (Phase 10).
- It does not cover promotional coupons or referral credits.
- It does not cover premium-preset entitlement gating (planned for a later phase; see section 9).

---

## 2. Product Catalog

### 2.1 Weekly Passes (repurchasable while un-graduated)
| Plan | Price | Credits | Duration | Renewal |
| --- | --- | --- | --- | --- |
| Weekly Starter | $5 | 113 | 7 days | No auto-renew |
| Weekly Plus | $10 | 259 | 7 days | No auto-renew |

Rules (shipped — `canPurchaseWeeklyPass`):
- Blocked while the user holds any `active`/`past_due` subscription — passes can't stack.
- **Repurchasable** ("Get another week") while the user's history is only weekly passes and credit packs.
- Permanently blocked once the user has any monthly/annual subscription or any non-weekly paid invoice — they graduate to the plan/top-up ladder.
- Weekly-pass credits **never expire** — the 7-day period only governs the pass window, not the balance.
- Implemented as Bachs **one-time** products (`collection.succeeded`).

### 2.2 Monthly Core Plans (auto-renewing)
| Plan | Price | Credits / month | Tier role |
| --- | --- | --- | --- |
| Creator | $20 | 606 | Entry monthly |
| Pro | $30 | 1,090 | Standard creator |
| Studio | $50 | 2,500 | Power user |
| Agency | $100 | 6,417 | High-volume |

### 2.3 Annual Plans (auto-renewing, monthly drip)
Same per-month credit grant as the sibling monthly plan, released as **12
monthly drips** (`credit_drip_months = 12`, `subscriptions.next_drip_at`) —
never one upfront grant, so a year's provider-cost liability is never
exposed on day one.

| Plan | Price | Credits / month | Effective /mo | Discount vs monthly |
| --- | --- | --- | --- | --- |
| Creator Annual | $120 | 606 | $10.00 | 50% |
| Pro Annual | $216 | 1,090 | $18.00 | 40% |
| Studio Annual | $450 | 2,500 | $37.50 | 25% |
| Agency Annual | $1,140 | 6,417 | $95.00 | 5% |

Rules (monthly + annual):
- Auto-renew unless cancelled.
- Each period/drip **grants** new credits; unused credits persist indefinitely (see "Canonical credit policy").
- Cancel at period end — grants stop, the balance remains.
- Implemented as Bachs **subscription** products (`invoice.paid` for initial + renewals).

### 2.4 Extra Credits (fixed packs)
| Pack | Price | Credits |
| --- | --- | --- |
| credits-1000 | $10 | 606 |
| credits-2500 | $25 | 1,515 |
| credits-5000 | $50 | 3,030 |
| credits-10000 | $100 | 6,060 |

Rules (shipped):
- Fixed packs only — the variable "pay-what-you-want" top-up is superseded.
- Pack grants derive from policy: `floor(price × top_up_budget_ratio / $0.01)` with `top_up_budget_ratio = 0.606`; recompute from the policy if the ratio changes, never hand-set.
- **Eligibility: any signed-in user** (`canPurchaseExtraCredits`) — subscribers, lapsed users, and free users.
- Expiry: none.

### 2.5 Free Credits Removal (done)
- No unconditional signup grant — new users start with **0 credits**.
- The funded free path is the referral program instead: referee +10 credits
  and a free first transformation; referrer +25 credits at signup plus 30% of
  the referee's first plan grant after a 14-day hold (`lib/referrals/`).
- **Grandfathered:** any pre-existing `allocation` rows remain untouched.

### 2.6 Output Dimensions & Quote Bounding
- Users select from a **curated output-size list per preset** (e.g. square, portrait, landscape, poster A4, social 1080×1350) rather than arbitrary dimensions.
- The **maximum allowed output size** is **4 megapixels** to cap worst-case provider costs.
- The reservation at generation start is the quote's bounded **maximum** cost (`quote_max_slack_factor` over expected), denominated in credits — the user can never be charged more than reserved.
- Final settlement uses the provider's authoritative billed cost (§3); until then the provisional quote-math charge is displayed.
- Credit values are stored as `NUMERIC(12,4)` and displayed with **0 decimals** in customer UI (whole credits; balances are integer-valued in practice). Internal calculations keep 4 decimals.

---

## 3. Quote-Priced Consumption (shipped — #89/#99/#100)

The markup-multiplier model in this section's history is **superseded**.
Consumption is now priced per generation from a bounded provider-cost quote;
margin lives in the grant sizes at issuance (§2), not in a per-plan burn rate.

### 3.1 Quote → reserve → settle lifecycle

1. **Quote.** The server resolves the preset's recipe to a provider route and
   reads a fresh `provider_pricing_snapshots` row (immutable, 6h TTL — pricing
   is synced on a cron and must verify structurally). The adapter produces a
   bounded quote `{expected, maximum}` USD; `maximum = expected ×
   quote_max_slack_factor` (default 1.15). A `generation_quotes` row is
   persisted with a 10-minute TTL.
2. **Reserve.** `create_generation` consumes the quote and inserts a
   `reservation` ledger entry for `-ceil(maximum / $0.01)` credits. No quote,
   no generation — **pricing is fail-closed**: unsupported/missing/stale
   pricing disables the endpoint rather than falling back to an estimate.
3. **Provisional charge.** `complete_generation` records the provisional
   quote-math charge (`provisional_credit_cost`, mirrored to
   `actual_credit_cost`) but leaves the reservation **open**.
4. **Settlement.**
   - `reconcile_billing_event` (provider billing events, pulled by the
     billing-reconcile cron) converts the open reservation to a `debit` at the
     authoritative cost, releasing the remainder; on an already-settled row it
     posts an auditable `adjustment`.
   - `settle_unbilled_generations` is the **72h SLA fallback**: rows with no
     billing event by then settle at the provisional charge, marked
     `fallback_timeout`, and move to a bounded late sweep. A late event still
     reconciles via adjustment (`provider_late`).
   - **Late upward differences after fallback are absorbed by 5Pixels** —
     a settled customer is never debited retroactively past their reserved
     maximum.

### 3.2 What replaced the formula

| Retired | Replaced by |
| --- | --- |
| `unit_price × quantity` with `min(seconds, 15)` caps | Typed pricing snapshots (`flat_per_request`, `per_megapixel`, `resolution_tier`); `unsupported` types fail closed |
| 1.10 safety buffer | `quote_max_slack_factor` on the reservation bound + authoritative settlement |
| `markup_multiplier` consumption rate | Grant sizing at issuance; `plans.markup_multiplier` kept for reference only |
| Admin-entered `product_versions.credit_cost` fallback | Server-issued quotes; the stored estimate is display-only |

### 3.3 Pricing policy
`pricing_policies` is the versioned, service-role-only financial policy:
`credit_capacity_usd` (pinned $0.01), `top_up_budget_ratio` (0.606),
`quote_max_slack_factor`, `quote_ttl_seconds` (600), `snapshot_ttl_hours` (6).
Static pricing components carry 30-day verification deadlines; changed-price
persistence failures raise critical admin alerts and fail the sync run —
stale pricing must never remain quotable silently.

### 3.4 Precision
- `credit_ledger.amount`, `generations.credit_cost`, `generation_quotes.*`,
  and `product_versions.credit_cost` are `NUMERIC(12,4)`.
- User-facing balances and costs display as whole credits (reservations and
  debits are `ceil`-ed); internal calculations keep 4 decimals.

---

## 4. Data Model (current shape)

The original "Data Model Changes" section described the migration diff; the
schema below is the shipped state. Authoritative definitions live in
`supabase/migrations/`.

### 4.1 Tables

#### `plans`
```
id UUID PRIMARY KEY
created_at TIMESTAMPTZ
slug TEXT UNIQUE NOT NULL
name TEXT NOT NULL
type TEXT NOT NULL CHECK ('weekly_trial', 'monthly', 'annual', 'extra_credit')
price_cents INT NOT NULL
currency TEXT DEFAULT 'USD'
credits_grant NUMERIC(12,4) DEFAULT 0    -- per-period grant; annual = per-drip
markup_multiplier NUMERIC(6,4)           -- reference only; consumption is quote-priced (§3)
interval TEXT CHECK ('weekly', 'monthly', 'annual', 'one_time')
is_trial BOOLEAN DEFAULT false
can_repurchase BOOLEAN DEFAULT false     -- catalog flag; weekly-pass repurchase
                                         -- is governed by canPurchaseWeeklyPass() (§2.1)
sort_order INT DEFAULT 0
is_active BOOLEAN DEFAULT true
credit_drip_months INT DEFAULT 1         -- 12 for annual (CHECK enforced)
metadata JSONB DEFAULT '{}'
-- metadata carries per-provider product ids:
--   bachs_product_id_sandbox / bachs_product_id_live   (current)
--   whop_product_id, creem_product_id_{test,live}      (rollback providers)
--   dodo_product_id / polar_product_id                 (historical)
```

#### `subscriptions`
```
id UUID PRIMARY KEY
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
user_id UUID REFERENCES profiles(id)
plan_id UUID REFERENCES plans(id)
status TEXT CHECK ('active', 'cancelled', 'expired', 'past_due')
trial BOOLEAN DEFAULT false
started_at TIMESTAMPTZ
ended_at TIMESTAMPTZ
current_period_start TIMESTAMPTZ
current_period_end TIMESTAMPTZ
cancel_at_period_end BOOLEAN DEFAULT false
next_drip_at TIMESTAMPTZ                 -- annual drip scheduler cursor
drips_granted INT DEFAULT 0
bachs_subscription_id TEXT               -- current provider
bachs_customer_id TEXT
whop_*, creem_*, dodo_*, polar_* columns -- rollback/historical provider ids
metadata JSONB DEFAULT '{}'
```

#### `invoices`
```
id UUID PRIMARY KEY
created_at TIMESTAMPTZ
user_id UUID REFERENCES profiles(id)
plan_id UUID REFERENCES plans(id)
subscription_id UUID REFERENCES subscriptions(id)
amount_cents INT NOT NULL
currency TEXT DEFAULT 'USD'
status TEXT CHECK ('pending', 'paid', 'failed', 'refunded')
credit_ledger_entry_id UUID REFERENCES credit_ledger(id)
bachs_* / whop_* / creem_* / dodo_* / polar_* ids — per-provider idempotency
metadata JSONB DEFAULT '{}'
```

#### `pricing_policies`
Versioned financial policy (service-role only): `credit_capacity_usd` pinned
to `0.01` by CHECK, `top_up_budget_ratio`, `quote_max_slack_factor`,
`quote_ttl_seconds`, `snapshot_ttl_hours`. See §3.3.

#### `provider_pricing_snapshots`
Immutable provider price records — each sync inserts a new row with
`fetched_at`/`expires_at`; quotes pin `snapshot_id` so a generation's
economics are reproducible after provider prices change. `payload` is a
typed pricing definition (`flat_per_request` / `per_megapixel` /
`resolution_tier` / `unsupported`). **Supersedes `provider_model_pricing`**
(mutable price rows), which is no longer the quoting source.

#### `generation_quotes`
Server-issued bounded quotes: `{expected, maximum}` USD, `reserve_credits`,
snapshot references, TTL — consumed by `create_generation`.

#### `fal_usage_logs` (for reconciliation)
```
id UUID PRIMARY KEY
created_at TIMESTAMPTZ
generation_id UUID REFERENCES generations(id)
endpoint_id TEXT
raw_cost_usd NUMERIC(12,8)
quantity NUMERIC(12,4)
unit TEXT
compute_seconds NUMERIC(8,2)
invoice_id TEXT
```

### 4.2 Notable columns

#### `generations`
- `credit_cost` / `actual_credit_cost` / `provisional_credit_cost NUMERIC(12,4)`.
- `provider_cost_usd NUMERIC(12,8)`, `provider_endpoint`, `provider_request_id`.
- `billing_reconcile_state` / `billing_reconciled_at` — settlement state
  (`NULL` awaiting settlement; `fallback_timeout` after SLA; `provider_late`
  when an event arrives post-fallback).

#### `product_versions`
- `credit_cost NUMERIC(12,4)` is a **display estimate** only — the
  authoritative cost comes from a server-issued quote at generation time (§3).

#### `credit_ledger`
- `amount NUMERIC(12,4)`; `entry_type` includes `reservation`, `debit`,
  `release`, `refund`, `adjustment`, `purchase`, `allocation`.

### 4.3 Key functions
- `get_user_balance(user_id)` → total balance (excluding reservations).
- `get_available_balance(user_id)` → balance minus open reservations.
- `credits_for_provider_cost(usd)` → `ceil(usd / $0.01)` conversion primitive.
- `create_generation(...)` → consume quote, insert reservation.
- `complete_generation(...)` → record provisional charge; reservation stays open.
- `reconcile_billing_event(...)` → settle at authoritative provider cost.
- `settle_unbilled_generations(deadline, limit)` → 72h SLA fallback sweep.
- `refund_generation(...)` → release reservation on failure.
- `grant_subsidy_credits(...)` → referral/retention/promo grants against
  monthly `subsidy_budgets` caps.

---

## 5. Payment Provider Integration

**Current: Bachs** (`lib/billing/bachs-client.ts`, `checkout-bachs.ts`,
`fulfillment-bachs.ts`, `app/api/webhooks/bachs`). Provider dispatch lives in
`lib/billing/payment-provider.ts` behind `PAYMENT_PROVIDER` = `bachs`
(default) | `whop` | `creem`. Dodo and Polar integrations are historical —
their notes below are kept only as design ancestry, marked **[superseded]**.

5Pixels is the **seller of record**; Bachs processes payments but is not a
merchant of record — tax/compliance framing in Terms and Privacy reflects
this.

### 5.1 Environment Variables
```
PAYMENT_PROVIDER=bachs          # default; whop | creem to roll back
BACHS_API_KEY                   # sk_sandbox_* or sk_live_*
BACHS_WEBHOOK_SECRET
BACHS_ENVIRONMENT=sandbox       # omit for live
CRON_SECRET
NEXT_PUBLIC_SITE_URL
```

### 5.2 Product Setup
- One Bachs product per active `plans` row (weekly passes, monthly, annual,
  credit packs); sandbox and live ids are both stored:
  `plans.metadata.bachs_product_id_sandbox` / `bachs_product_id_live`
  (migrations `20261008000001_bachs_provider.sql`,
  `20261009000002_bachs_live_catalog.sql`).
- `resolveBachsProductId` picks the key matching `BACHS_ENVIRONMENT`; a plan
  with no resolvable id renders "not available for purchase yet".
- Webhook endpoint: `https://<site>/api/webhooks/bachs`, subscribed to
  billing-relevant events.

### 5.3 Checkout Flow
- `createBachsPlanCheckoutSession(planId, returnPath, attribution)`:
  resolves the product id, enforces the entitlement gate for the plan type
  (`canPurchaseWeeklyPass` / `canPurchaseTrial` / `canPurchaseExtraCredits`),
  creates a hosted checkout session carrying `user_id` / `plan_id` /
  attribution metadata, and returns the checkout URL. The client never sends
  a price.
- Fulfillment never trusts the redirect — only signed webhooks.

### 5.4 Webhook Route: `/api/webhooks/bachs`
| Event | Handling |
| --- | --- |
| `collection.succeeded` | One-time purchases (weekly passes, credit packs): create `invoice`, grant credits |
| `invoice.paid` | Subscription initial billing and renewals: upsert subscription, grant the period/drip's credits |
| `customer.subscription.*` | Lifecycle sync — cancel, past_due, expiry |
| `refund.paid` / disputes | Credit reversal capped at balance, `unrecovered_credits` recorded, referral share clawed back |

All handlers are idempotent on the provider's payment/invoice/subscription
ids (unique-indexed columns); failed or underpaid collections never grant.

### 5.5 Customer Portal
- Bachs hosted portal session for subscription management (cancel, payment
  method); "Manage billing" links in `/app/billing`.

### 5.6 [superseded] Earlier processors
- **Dodo** — original integration this doc was written for (checkout
  sessions, `dodo_*` columns). Removed; `metadata.dodo_product_id` values in
  seed data are inert history.
- **Polar** — merchant-of-record migration that never went live (application
  rejected). See `docs/monetization/05_PAYMENT_PROCESSOR_POLAR.md`
  (historical).
- **Creem** — served as interim default after Polar; now a rollback provider.
  Its variable-amount top-up path (`custom_price`, min $10) predates fixed
  packs.
- **Whop** — interim processor before Bachs; now a rollback provider.

---

## 6. Backend Architecture

### 6.1 Entitlement Service (`lib/billing/entitlements.ts`)
```
canPurchaseWeeklyPass(userId)    -- weekly passes: repurchasable until graduated (§2.1)
canPurchaseTrial(userId)         -- free trials: once per user, ever
canPurchaseExtraCredits(userId)  -- packs: any signed-in user
getActivePlan(userId) → plan
getUserTier(userId) → visitor | free | paid_active | paid_exhausted
hasEverPaid(userId)              -- monotonic
isMonthlySubscriber(userId)
```

### 6.2 Pricing service (`lib/pricing/`)
```
quoteForGeneration(recipe, options) → bounded quote {expected, maximum, snapshots}
```
Provider adapters (`lib/pricing/adapters/`) turn typed snapshot payloads into
USD quotes; `lib/billing/credit-cost.ts` provides display estimates for UI.
The reservation flow is §3.1.

### 6.3 Billing reconciliation (`lib/billing/fal-billing.ts`)
Cron-driven (`/api/cron/billing-reconcile`): pulls provider billing events,
reconciles open reservations at authoritative cost, and runs the 72h
`settle_unbilled_generations` fallback. See §3.1 step 4.

### 6.4 Provider Pricing Sync
- A cron (`/api/cron/pricing-sync`, #138) refreshes
  `provider_pricing_snapshots` every 6h from typed, versioned pricing
  definitions — replacing the original one-time seed of
  `provider_model_pricing`.
- Fail-closed: sync failures alert admins; endpoints without a fresh
  verified snapshot are unquotable.
- Read-only admin surface: `/admin/pricing`.

---

## 7. Frontend Changes

### 7.1 Marketing Pages
- `/pricing` shows the live plan catalog (monthly/annual toggle).
- `/pricing/weekly` is the dedicated weekly-pass surface ("Get another
  week" repurchase framing).
- No free-credit claims; credit figures render from `plans.credits_grant`.

### 7.2 Billing UI (`/app/billing`)
- Current plan card with renewal date.
- Cancel / upgrade / manage billing buttons (provider portal).
- Current balance and transaction history.
- Fixed-pack top-up cards with "≈ up to N transformations" equivalents —
  available to any signed-in user.
- Invoice history.

### 7.3 Create & Preset Pages
- Show **estimated credit cost** on preset detail and create form.
- Show **insufficient credits** state with a CTA to billing if the user cannot afford the estimate.
- Output size selector per preset.

### 7.4 Checkout UX
- `/app/checkout/success` and `/app/checkout/cancel` pages.
- On success, refresh balance and redirect to `/app/billing` or back to create flow.

---

## 8. Admin & Operations

### 8.1 Plan Management
- Plans are seed data inserted by migration.
- Provider product ids are set in `plans.metadata` per provider
  (`bachs_product_id_{sandbox,live}` current; `whop_*`, `creem_*` rollback).
- Admin editing can come in Phase 8.

### 8.2 Manual Credit Adjustment
- Use `credit_ledger` `adjustment` entries only.
- Every adjustment writes to `admin_audit_logs` with `reason`.
- Admin server action `adminAdjustCredits(userId, amount, reason)`.

### 8.3 Provider Pricing Updates
- Automated: the pricing-sync cron refreshes `provider_pricing_snapshots`
  (§6.4). Manual SQL updates are superseded.
- Subsidized credit programs (referral, retention, promo) are capped by
  `subsidy_budgets` monthly caps (`/admin/budgets`).

---

## 9. Future Phase: Premium Preset Gating

For a later release, add an `entitlement_tier` column to `products` / `product_versions`:
- `free` — available to any user with credits.
- `pro` — requires $30+ monthly plan.
- `studio` — requires $50+ plan.
- `agency` — requires $100+ plan.

The entitlement check happens at the start of `create_generation` and returns a friendly upgrade message if the user’s active plan does not meet the preset tier.

---

## 10. Migration & Deployment Steps — [superseded]

*Historical: written for the original Dodo-era rollout. The shipped sequence
was: schema migrations → annual plans + drip → provider swap
(Dodo→Polar→Creem→Whop→Bachs) → fixed-quote pricing (#89) → billing
reconciliation + settlement (#99/#100) → $0.01 re-denomination (#101) →
pricing-sync cron (#138). For current rollout work see `AGENTS.md` and the
Bachs setup in §5.*

1. **Database migration**
   - Create `plans`, `subscriptions`, `invoices`, `provider_model_pricing`, `fal_usage_logs`.
   - Alter `credit_ledger`, `generations`, `product_versions` types to `NUMERIC(12,4)`.
   - Add new columns to `generations`.

2. **Seed data**
   - Insert the 7 plans with placeholder `metadata.dodo_product_id = null`.
   - Run a seed script to populate `provider_model_pricing` from `docs/fal-ai-image-models-relevant.md`.

3. **Dodo setup** *(historical — provider is now Bachs, §5)*
   - Create products in the Dodo dashboard.
   - Update `plans.metadata.dodo_product_id` with real IDs.
   - Configure webhook endpoint.

4. **Code changes**
   - Add `dodopayments` SDK dependency.
   - Implement server actions, webhook, entitlement service, credit cost service.
   - Update UI.

5. **Verification**
   - `typecheck`, `lint`, `test`, `build`.
   - Test checkout flows in Dodo test mode.
   - Simulate generation cost calculation end-to-end.

6. **Apply migration** via Supabase CLI or MCP.

---

## 11. Financial Invariants

1. A generation cannot finalize a debit twice.
2. A reservation must be released, converted to a debit, or settled by the
   72h fallback — it cannot outlive `SETTLE_SLA_MS`.
3. Webhooks are idempotent on the provider's payment/invoice/subscription
   ids, enforced by unique columns.
4. Credit ledger must reconcile: sum of `purchase` + `allocation` − `debit` −
   `refund` = user balance.
5. Manual adjustments write an `adjustment` ledger entry and an
   `admin_audit_logs` row.
6. Credit packs can be purchased by **any signed-in user** —
   `canPurchaseExtraCredits` gates on auth only.
7. Weekly passes are repurchasable until the user graduates to a real plan —
   `canPurchaseWeeklyPass` blocks only while a subscription is active or
   after non-weekly purchase history (§2.1). Free trials are once per user,
   ever.
8. A settled generation is never debited past its reserved maximum; late
   upward provider differences are absorbed by 5Pixels.

---

## 12. Implementation Slicing — [superseded]

*Historical: this was the original PR breakdown for the Dodo-era build. All
phases shipped long ago; kept for context only.*

### PR A — Schema & Seed Data
- Migration for all billing tables.
- Update existing `credit_ledger`, `generations`, `product_versions` columns to `NUMERIC(12,4)`.
- Seed `plans` table with 7 plans.
- Seed `provider_model_pricing` from the filtered Fal catalog.

### PR B — Credit Cost Engine (no Dodo checkout)
- Implement reservation/finalize/refund credit flow.
- Compute dynamic credit cost at generation time.
- Add entitlement checks and credit cost service.
- Update `create_generation` and worker/poll finalization.
- Frontend cost estimates and output-size selector.

### PR C — Dodo Payments Integration
- Add `dodopayments` SDK and env vars.
- Checkout server actions for plans and extra credits.
- Webhook handler for Dodo events.
- Billing UI and customer-portal links.
