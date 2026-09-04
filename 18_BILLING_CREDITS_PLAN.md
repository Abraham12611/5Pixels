# 5Pixels Billing & Dynamic Credits Implementation Plan

**Status:** Proposed plan — pending approval before engineering begins.

This document defines the architecture for 5Pixels paid plans, credits, and dynamic per-generation pricing. It is written to protect margins across 600+ Fal AI image models while keeping the user-facing model simple: **1 credit = $0.01 USD of retail purchasing power**.

---

## 1. Goals & Non-Goals

### 1.1 Goals
- Replace any static “1 credit = 1 image” rule with a provider-cost-based dynamic deduction.
- Pin credit value to a fixed dollar retail value: **1 credit = $0.01 USD**.
- Protect gross margins with a 10% safety buffer and plan-based markup multipliers.
- Support weekly trials, monthly subscriptions, and one-time extra-credit top-ups.
- Make the credit ledger the single source of truth; never mutate a balance column directly.
- Support reservation/hold at generation start and final sync on completion or failure.

### 1.2 Non-Goals
- This plan does not cover profit reporting dashboards (Phase 10).
- It does not cover promotional coupons or referral credits.
- It assumes Stripe as the payment provider.

---

## 2. Product Catalog

### 2.1 Weekly Trial Plans (one-time per new user)
| Plan | Price | Credits | Duration | Markup | Renewal |
| --- | --- | --- | --- | --- | --- |
| Weekly Trial — Starter | $5 | 500 | 7 days | **4.0x** | No auto-renew |
| Weekly Trial — Plus | $10 | 1,000 | 7 days | **3.5x** | No auto-renew |

Rules:
- Only users with **no prior paid invoice or active subscription** can purchase.
- After the 7-day period, unused credits expire unless converted to a monthly plan.
- One purchase per user, ever.

### 2.2 Monthly Core Plans (auto-renewing)
| Plan | Price | Credits / month | Markup | Tier role |
| --- | --- | --- | --- | --- |
| Creator | $20 | 2,000 | **3.0x** | Entry monthly |
| Pro | $30 | 3,000 | **2.5x** | Standard creator |
| Studio | $50 | 5,500 | **2.0x** | Power user |
| Agency | $100 | 12,000 | **1.7x** | High-volume |

Rules:
- Auto-renew monthly unless cancelled.
- Credits reset at period start (no rollover in V1; consider rollover later).
- Cancel at period end.

### 2.3 Extra Credits (one-time top-ups)
| Field | Value |
| --- | --- |
| Minimum purchase | $10 |
| Credit value | 1 credit = $0.01 USD (e.g. $10 = 1,000 credits) |
| Markup | **1.5x** |
| Eligibility | Only active monthly subscribers ($20+ plans) |
| Expiry | None |

### 2.4 Free Credits Removal
- Remove the “Free credits when you join” and “Starter credits” copy from:
  - `components/marketing/sign-up-cta.tsx`
  - `components/marketing/pricing-teaser.tsx`
- Do not automatically insert a ledger `allocation` on signup.
- New users start with **0 credits** and must choose a weekly trial or monthly plan.
- If any existing rows in `credit_ledger` are tied to a signup credit grant, leave them in place (grandfather) but stop granting new ones.

---

## 3. Dynamic Credit Architecture

### 3.1 Core Formula

```
Raw Cost = unit_price × quantity

quantity =
  1                                     if unit = "image" or "generations"
  (width × height) / 1,000,000         if unit = "megapixel"
  min(actual_compute_seconds, 15)      if unit = "compute seconds" or "seconds"

Credits Deducted = ceil( (Raw Cost × 1.10) / 0.01 × markup )
```

### 3.2 Variable Breakdown

| Variable | Meaning |
| --- | --- |
| **Raw Fal AI Cost** | Provider price per unit multiplied by the quantity the request consumed. |
| **Safety Buffer (1.10)** | 10% pad for Stripe fees (~3.5%), partially-billed failed/timed-out requests, hosting, and margin leakage. |
| **Plan Markup Multiplier** | Consumption speed discount tied to the plan the user is on. Higher-tier plans burn credits slower, improving perceived value while preserving our margin. |
| **$0.01** | Fixed internal credit dollar value. |

### 3.3 Markup Multiplier Schedule

| Plan | Proposed Markup | Rationale |
| --- | --- | --- |
| Weekly $5 | **4.0x** | Aggressive margin on low-commitment, high-churn trial users. |
| Weekly $10 | **3.5x** | Same as above, slightly better unit economics. |
| Monthly $20 | **3.0x** | Low-tier monthly; aggressive but fair for entry users. |
| Monthly $30 | **2.5x** | Balanced volume tier. |
| Monthly $50 | **2.0x** | Power user tier. |
| Monthly $100 | **1.7x** | Whale tier; lower markup is acceptable because absolute spend is high. |
| Extra Credits | **1.5x** | Top-up utility pricing for existing subscribers. |

### 3.4 Precision
- The existing `credit_ledger.amount`, `generations.credit_cost`, and `product_versions.credit_cost` columns are `INT`.
- Dynamic credits frequently produce fractional values (e.g. `3.3` credits).
- **Decision required:** migrate these columns to `NUMERIC(12,4)` and display credits with **two decimal places**.
- UI should round user-facing balances to 2 decimals; internal calculations keep 4 decimals.

---

## 4. Data Model Changes

### 4.1 New Tables

#### `plans`
```
id UUID PRIMARY KEY
created_at TIMESTAMPTZ
slug TEXT UNIQUE NOT NULL
name TEXT NOT NULL
type TEXT NOT NULL CHECK ('weekly_trial', 'monthly', 'extra_credit')
price_cents INT NOT NULL
currency TEXT DEFAULT 'USD'
credits_grant NUMERIC(12,4) DEFAULT 0
markup_multiplier NUMERIC(6,4) NOT NULL
interval TEXT CHECK ('weekly', 'monthly', 'one_time')
is_trial BOOLEAN DEFAULT false
can_repurchase BOOLEAN DEFAULT false   -- false for weekly trial, true for monthly
sort_order INT DEFAULT 0
is_active BOOLEAN DEFAULT true
metadata JSONB DEFAULT '{}'
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
stripe_subscription_id TEXT
stripe_customer_id TEXT
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
stripe_checkout_session_id TEXT
stripe_payment_intent_id TEXT
stripe_invoice_id TEXT
credit_ledger_entry_id UUID REFERENCES credit_ledger(id)
metadata JSONB DEFAULT '{}'
```

#### `provider_model_pricing`
```
id UUID PRIMARY KEY
created_at TIMESTAMPTZ
provider TEXT NOT NULL DEFAULT 'fal'
endpoint_id TEXT NOT NULL
unit_price NUMERIC(12,8) NOT NULL
unit TEXT NOT NULL
currency TEXT DEFAULT 'USD'
effective_from TIMESTAMPTZ DEFAULT NOW()
effective_to TIMESTAMPTZ
is_active BOOLEAN DEFAULT true
metadata JSONB DEFAULT '{}'
UNIQUE(provider, endpoint_id, effective_from)
```

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

### 4.2 Modified Tables

#### `generations`
- Change `credit_cost INT` to `estimated_credit_cost NUMERIC(12,4)` and `actual_credit_cost NUMERIC(12,4)`.
- Add `markup_multiplier NUMERIC(6,4)`.
- Add `provider_cost_usd NUMERIC(12,8)`.
- Keep `provider_endpoint` (already exists).

#### `product_versions`
- Change `credit_cost INT` to `estimated_credit_cost NUMERIC(12,4)` or remove in favor of dynamic lookup.
- Add `provider_endpoint_id` reference OR use the existing `private_recipe.provider_endpoint` for cost lookup.
- Suggested: keep `estimated_credit_cost` as a **display estimate** for the UI, but the authoritative cost comes from `provider_model_pricing` at generation time.

#### `credit_ledger`
- Change `amount INT` to `amount NUMERIC(12,4)`.
- Keep `entry_type` enum including `reservation` and `debit`.

### 4.3 New / Updated Functions
- `get_user_balance(user_id)` → total balance (excluding reservations).
- `get_available_balance(user_id)` → balance minus open reservations.
- `create_generation(...)` → compute estimated cost and reserve.
- `finalize_generation(...)` → release reservation and debit actual.
- `refund_generation(...)` → release reservation on failure.

---

## 5. Backend Architecture

### 5.1 Stripe Integration

#### Environment Variables
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

#### Server Actions
- `createCheckoutSession(planId, mode)`
  - `mode = 'subscription'` for monthly plans.
  - `mode = 'payment'` for weekly trials and extra credits.
  - Returns Stripe Checkout URL.
- `createBillingPortalSession(userId)` for managing subscriptions.

#### Webhook Route: `/api/webhooks/stripe`
Events to handle:
- `checkout.session.completed`
  - For `subscription` mode: create `subscription` and `invoice`; add first month credits.
  - For `payment` mode: create `invoice`; add credits immediately.
  - Mark user as `has_trialed = true` if plan is a weekly trial.
- `invoice.paid` (subscription renewal): add monthly credits.
- `invoice.payment_failed`: set subscription `past_due`; do not add credits.
- `customer.subscription.deleted`: set subscription `expired`.
- `customer.subscription.updated`: update period dates and `cancel_at_period_end`.

### 5.2 Entitlement Service (`lib/billing/entitlements.ts`)

```
canPurchaseTrial(userId)
canPurchaseExtraCredits(userId)
getActivePlan(userId) → plan + markup
canGenerate(userId, estimatedCredits)
isMonthlySubscriber(userId)
```

### 5.3 Credit Cost Service (`lib/billing/credit-cost.ts`)

```
estimateCreditCost(providerEndpoint, width, height, planMarkup)
finalCreditCost(providerEndpoint, width, height, computeSeconds, planMarkup)
```

Quantity calculation:
- `image` / `generations` → 1
- `megapixel` → (width × height) / 1,000,000
- `compute seconds` / `seconds` → `min(computeSeconds, 15)`

### 5.4 Reservation Flow

1. User submits create request.
2. Server derives `provider_endpoint`, estimated `width`/`height` from preset config or user options.
3. Server computes `estimated_credit_cost` using the active plan markup.
4. `create_generation` checks `available_balance >= estimated_credit_cost`.
5. If sufficient, inserts a `reservation` ledger entry for `−estimated_credit_cost`.
6. Generation is queued to Fal.
7. On webhook/poll completion:
   - Server reads actual `width`, `height`, `compute_time` from Fal payload.
   - Computes `actual_credit_cost` capped at the estimated max.
   - Reverses the reservation.
   - Inserts a `debit` entry for `−actual_credit_cost`.
   - Updates `generations.actual_credit_cost`, `provider_cost_usd`, `markup_multiplier`.
8. On failure:
   - Reverses the reservation (full release).
   - If Fal billed for partial compute, the 10% safety buffer absorbs it; no user debit.

### 5.5 Provider Cost Lookup
- At creation time, look up `provider_model_pricing` by `provider_endpoint` and active `effective_from`/`is_active`.
- If no price is found, reject generation or use a configurable fallback cost.
- Admin UI (Phase 8) can override prices; until then, seed from `docs/fal-ai-image-models-relevant.md` via a one-time script.

---

## 6. Frontend Changes

### 6.1 Marketing Pages
- Update `components/marketing/pricing-teaser.tsx` to match the actual plan catalog (trials + monthly).
- Update `components/marketing/sign-up-cta.tsx` to remove free-credit claims.
- Add a dedicated `/pricing` route if not present.

### 6.2 Billing UI (`/app/billing`)
- Current plan card with renewal date.
- Cancel / upgrade / downgrade buttons.
- Current balance and transaction history.
- “Buy extra credits” form (amount input, min $10, only for monthly subscribers).
- Invoice history.

### 6.3 Create & Preset Pages
- Show **estimated credit cost** on preset detail and create form.
- Show **insufficient credits** state with a CTA to billing if the user cannot afford the estimate.
- Show active plan markup in a subtle way (optional).

### 6.4 Checkout UX
- `/app/checkout/success` and `/app/checkout/cancel` pages.
- On success, refresh balance and redirect to `/app/billing` or back to create flow.

---

## 7. Admin & Operations

### 7.1 Plan Management
- In V1, plans are seed data inserted by migration. Admin editing can come in Phase 8.
- Migrations should insert the 6 catalog plans and the extra-credit pseudo-plan.

### 7.2 Manual Credit Adjustment
- Use `credit_ledger` `adjustment` entries only.
- Every adjustment writes to `admin_audit_logs` with `reason`.
- Create an admin server action `adminAdjustCredits(userId, amount, reason)`.

### 7.3 Model Pricing Updates
- Build a script to sync `provider_model_pricing` from `docs/fal-ai-image-models-relevant.md` or the Fal pricing API.
- Until automated, update SQL manually when Fal changes prices.

---

## 8. Migration & Deployment Steps

1. **Database migration**
   - Create `plans`, `subscriptions`, `invoices`, `provider_model_pricing`, `fal_usage_logs`.
   - Alter `credit_ledger.amount`, `generations.credit_cost`, `product_versions.credit_cost` to `NUMERIC(12,4)`.
   - Add new columns to `generations`.
   - Update `create_generation`, `get_user_balance`, `finalize_generation` logic.

2. **Seed data**
   - Insert 6 plans + extra-credit plan.
   - Seed `provider_model_pricing` from the filtered Fal catalog.

3. **Stripe setup**
   - Create Stripe Products & Prices for each plan.
   - Store Stripe price IDs in `plans.metadata` or `plans` table.

4. **Code changes**
   - Add `stripe` dependency.
   - Implement server actions, webhook, entitlement service, credit cost service.
   - Update UI.

5. **Verification**
   - `typecheck`, `lint`, `test`, `build`.
   - Test checkout flows in Stripe test mode.
   - Simulate generation cost calculation end-to-end.

6. **Apply migration via MCP / Supabase CLI** (user approval needed).

---

## 9. Financial Invariants

1. A generation cannot finalize a debit twice.
2. A reservation must always be released or converted to a debit.
3. A Stripe webhook must be idempotent using `stripe_checkout_session_id` / `stripe_invoice_id`.
4. Credit ledger must reconcile: sum of `purchase` + `allocation` − `debit` − `refund` = user balance.
5. Manual adjustments write an `adjustment` ledger entry and an `admin_audit_logs` row.
6. Extra credits can only be purchased by active monthly subscribers.
7. Weekly trials can only be purchased once per user.

---

## 10. Open Questions / Decisions Required

1. **Markup values:** Are the proposed multipliers acceptable, or do you want different ones?
2. **Plan credit grants:** Are 2,000 / 3,000 / 5,500 / 12,000 credits per month correct, or do you want different allocations?
3. **Credit expiry:** Do weekly trial credits expire after 7 days? Do monthly credits rollover or reset each period?
4. **Preset gating:** Should some premium presets require a minimum plan (e.g. $30+)?
5. **Output defaults:** What are the default / maximum output dimensions for filters and posters? (Needed for worst-case holds.)
6. **Rounding:** Should credits be rounded to 2 decimals, or rounded up to the next whole credit?
7. **Stripe products:** Do you already have Stripe Products/Prices created, or should the app create them automatically?
8. **Existing users:** How should users with existing free credits be handled?

---

## 11. Suggested First Engineering Slice

Because this is a large change, I recommend splitting implementation into **three PRs**:

### PR A — Schema & Seed Data
- Migration for all billing tables.
- Seed `plans` and `provider_model_pricing`.
- Update `credit_ledger`, `generations`, `product_versions` types.

### PR B — Credit Cost Engine (no Stripe)
- Implement reservation/finalize/refund credit flow.
- Compute dynamic credit cost at generation time.
- Add entitlement checks and credit cost service.
- Update `create_generation` and worker/poll finalization.
- Frontend cost estimates.

### PR C — Stripe Integration
- Stripe checkout for trials, monthly plans, and extra credits.
- Webhook handler.
- Billing UI and checkout success/cancel pages.

This keeps each PR reviewable and deployable independently.
