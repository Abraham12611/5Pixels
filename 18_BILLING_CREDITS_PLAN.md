# 5Pixels Billing & Dynamic Credits Implementation Plan

**Status:** Approved plan — implementation in progress (PR C).

This document defines the architecture for 5Pixels paid plans, credits, and dynamic per-generation pricing. It is written to protect margins across 600+ Fal AI image models while keeping the user-facing model simple: **1 credit = $0.01 USD of retail purchasing power**.

Payment processing is handled by **Dodo Payments**, which acts as the Merchant of Record (MoR) for global tax, compliance, invoicing, and local payment methods.

---

## 1. Goals & Non-Goals

### 1.1 Goals
- Replace any static “1 credit = 1 image” rule with a provider-cost-based dynamic deduction.
- Pin credit value to a fixed dollar retail value: **1 credit = $0.01 USD**.
- Protect gross margins with a 10% safety buffer and plan-based markup multipliers.
- Support weekly trials, monthly subscriptions, and one-time extra-credit top-ups.
- Make the credit ledger the single source of truth; never mutate a balance column directly.
- Support reservation/hold at generation start and final sync on completion or failure.
- Use Dodo Payments for checkout, subscriptions, webhooks, and tax/invoicing.

### 1.2 Non-Goals
- This plan does not cover profit reporting dashboards (Phase 10).
- It does not cover promotional coupons or referral credits.
- It does not cover premium-preset entitlement gating (planned for a later phase; see section 9).

---

## 2. Product Catalog

### 2.1 Weekly Trial Plans (one-time per new user)
| Plan | Price | Credits | Duration | Markup | Renewal |
| --- | --- | --- | --- | --- | --- |
| Weekly Trial — Starter | $5 | 500 | 7 days | **4.0x** | No auto-renew |
| Weekly Trial — Plus | $10 | 1,000 | 7 days | **3.5x** | No auto-renew |

Rules:
- Only users with **no prior paid invoice or active subscription** can purchase.
- After the 7-day period, unused credits **expire**. No rollover.
- One purchase per user, ever.
- Implemented as Dodo **one-time payment** products.

### 2.2 Monthly Core Plans (auto-renewing)
| Plan | Price | Credits / month | Markup | Tier role |
| --- | --- | --- | --- | --- |
| Creator | $20 | 2,000 | **3.0x** | Entry monthly |
| Pro | $30 | 3,000 | **2.5x** | Standard creator |
| Studio | $50 | 5,500 | **2.0x** | Power user |
| Agency | $100 | 12,000 | **1.7x** | High-volume |

Rules:
- Auto-renew monthly unless cancelled.
- Credits **reset at period start** (no rollover in V1; consider rollover later).
- Cancel at period end.
- Implemented as Dodo **subscription** products.

### 2.3 Extra Credits (one-time top-ups)
| Field | Value |
| --- | --- |
| Minimum purchase | $10 |
| Credit value | 1 credit = $0.01 USD (e.g. $10 = 1,000 credits) |
| Markup | **1.5x** |
| Eligibility | Only active monthly subscribers ($20+ plans) |
| Expiry | None |
| Type | Dodo **one-time payment** product, variable amount |

### 2.4 Free Credits Removal
- Remove the “Free credits when you join” and “Starter credits” copy from:
  - `components/marketing/sign-up-cta.tsx`
  - `components/marketing/pricing-teaser.tsx`
- Do not automatically insert a ledger `allocation` on signup.
- New users start with **0 credits** and must buy a plan or trial.
- **Grandfather existing free credits:** any existing `allocation` rows remain untouched.

### 2.5 Output Dimensions & Rounding Strategy
- Users select from a **curated output-size list per preset** (e.g. square, portrait, landscape, poster A4, social 1080×1350) rather than arbitrary dimensions.
- The **maximum allowed output size** is **4 megapixels** to cap worst-case Fal costs.
- The credit hold at generation start uses the **selected output size**.
- The final debit uses the **actual output dimensions** returned by Fal, capped at the selected-size estimate (no surprises for the user).
- Credit values are stored as `NUMERIC(12,4)` and displayed with **2 decimals**. Reservations are `ceil`-ed to 2 decimals so the user never sees micro-fractions.

---

## 3. Dynamic Credit Architecture

### 3.1 Core Formula

```
Raw Cost = unit_price × quantity

quantity =
  1                                     if unit = "image" or "generations"
  (width × height) / 1,000,000         if unit = "megapixel"
  min(actual_compute_seconds, 15)      if unit = "compute seconds" or "seconds"

Credits Deducted = ceil( (Raw Cost × 1.10) / 0.01 × markup , 2 decimals)
```

### 3.2 Variable Breakdown

| Variable | Meaning |
| --- | --- |
| **Raw Fal AI Cost** | Provider price per unit multiplied by the quantity the request consumed. |
| **Safety Buffer (1.10)** | 10% pad for Dodo fees, partially-billed failed/timed-out requests, and hosting margin leakage. |
| **Plan Markup Multiplier** | Consumption speed tied to the active plan. Higher-tier plans burn credits slower while preserving our margin. |
| **$0.01** | Fixed internal credit dollar value. |

### 3.3 Markup Multiplier Schedule

| Plan | Markup | Rationale |
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
- Dynamic credits require fractional values, so these columns migrate to `NUMERIC(12,4)`.
- User-facing balances and costs display with 2 decimals.
- Internal calculations keep 4 decimals to avoid rounding drift.

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
-- metadata.dodo_product_id and metadata.dodo_product_slug should be set
-- after products are created in the Dodo dashboard.
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
dodo_subscription_id TEXT
dodo_customer_id TEXT
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
dodo_payment_id TEXT
dodo_checkout_session_id TEXT
dodo_subscription_id TEXT
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
- Change `credit_cost INT` to `estimated_credit_cost NUMERIC(12,4)`.
- Keep it as a **display estimate** for the UI; the authoritative cost comes from `provider_model_pricing` at generation time.

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

## 5. Dodo Payments Integration

### 5.1 Environment Variables
```
DODO_PAYMENTS_API_KEY
DODO_PAYMENTS_WEBHOOK_SECRET
NEXT_PUBLIC_SITE_URL
```

### 5.2 Product Setup (manual step before launch)
1. In the Dodo dashboard, create products for each plan:
   - 2 one-time products for weekly trials (`weekly-starter`, `weekly-plus`).
   - 4 subscription products for monthly plans (`creator`, `pro`, `studio`, `agency`).
   - 1 variable-price one-time product for extra credits (`extra-credits`).
2. Copy each Dodo `product_id` into the `plans.metadata.dodo_product_id` field (via seed or admin update).
3. Create webhook endpoint in dashboard: `https://<site>/api/webhooks/dodo`.

### 5.3 Checkout Flow
- Server action `createCheckoutSession(planId, returnPath, customerEmail)`:
  - Looks up the plan and Dodo product ID.
  - For variable extra credits, sets `product_cart` with `product_id` and a computed `product_price` in cents.
  - Calls `client.checkoutSessions.create({ product_cart: [...], customer: {...}, return_url: ..., metadata: {...} })`.
  - Returns `checkout_url`; frontend redirects.
- For monthly plans, Dodo handles recurring billing automatically.

### 5.4 Webhook Route: `/api/webhooks/dodo`
Events to handle:
- `payment.succeeded`
  - For one-time purchases (trials, extra credits): create `invoice` and add credits to ledger.
  - For subscription first payment: create `subscription` and add initial credits.
- `subscription.active`
  - Mark subscription as active; set period dates.
- `subscription.renewed`
  - Create `invoice`; add monthly credits; reset expiry.
- `subscription.cancelled` / `subscription.expired`
  - Update subscription status and `ended_at`.
- `payment.failed`
  - For subscription renewals: set `past_due`; do not add credits.

All webhook handlers must be idempotent using `dodo_payment_id`, `dodo_checkout_session_id`, or `dodo_subscription_id`.

### 5.5 Customer Portal
- Use Dodo’s hosted customer portal for subscription management (cancel, update payment method).
- Provide a “Manage billing” link in `/app/billing`.

---

## 6. Backend Architecture

### 6.1 Entitlement Service (`lib/billing/entitlements.ts`)
```
canPurchaseTrial(userId)
canPurchaseExtraCredits(userId)
getActivePlan(userId) → plan + markup
canGenerate(userId, estimatedCredits)
isMonthlySubscriber(userId)
```

### 6.2 Credit Cost Service (`lib/billing/credit-cost.ts`)
```
estimateCreditCost(providerEndpoint, outputSize, planMarkup)
finalCreditCost(providerEndpoint, actualWidth, actualHeight, computeSeconds, planMarkup)
```

Quantity calculation:
- `image` / `generations` → 1
- `megapixel` → (width × height) / 1,000,000
- `compute seconds` / `seconds` → `min(computeSeconds, 15)`

### 6.3 Reservation Flow

1. User submits generation.
2. Server derives `provider_endpoint` and selected output size from the preset / options.
3. Computes `estimated_credit_cost` using the active plan markup.
4. Checks `available_balance >= estimated_credit_cost`.
5. Inserts a `reservation` ledger entry for `−estimated_credit_cost`.
6. Calls Fal API (queue).
7. On completion, reads actual `width`, `height`, `compute_time`.
8. Computes `actual_credit_cost` capped at the estimate.
9. Reverses reservation and inserts a `debit` for `−actual_credit_cost`.
10. On failure, releases the reservation.

### 6.4 Provider Cost Lookup
- At creation time, look up `provider_model_pricing` by `provider_endpoint` and active `effective_from`/`is_active`.
- If no price is found, reject generation or use a configurable fallback cost.
- Seed `provider_model_pricing` from `docs/fal-ai-image-models-relevant.md` via a one-time script.

---

## 7. Frontend Changes

### 7.1 Marketing Pages
- Update `components/marketing/pricing-teaser.tsx` to match the actual plan catalog.
- Update `components/marketing/sign-up-cta.tsx` to remove free-credit claims.
- Add a dedicated `/pricing` route if not present.

### 7.2 Billing UI (`/app/billing`)
- Current plan card with renewal date.
- Cancel / upgrade / manage billing buttons (Dodo portal).
- Current balance and transaction history.
- “Buy extra credits” form (amount input, min $10, only for monthly subscribers).
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
- Dodo product IDs are set in `plans.metadata` after dashboard creation.
- Admin editing can come in Phase 8.

### 8.2 Manual Credit Adjustment
- Use `credit_ledger` `adjustment` entries only.
- Every adjustment writes to `admin_audit_logs` with `reason`.
- Create an admin server action `adminAdjustCredits(userId, amount, reason)`.

### 8.3 Model Pricing Updates
- Build a script to sync `provider_model_pricing` from `docs/fal-ai-image-models-relevant.md` or the Fal pricing API.
- Until automated, update SQL manually when Fal changes prices.

---

## 9. Future Phase: Premium Preset Gating

For a later release, add an `entitlement_tier` column to `products` / `product_versions`:
- `free` — available to any user with credits.
- `pro` — requires $30+ monthly plan.
- `studio` — requires $50+ plan.
- `agency` — requires $100+ plan.

The entitlement check happens at the start of `create_generation` and returns a friendly upgrade message if the user’s active plan does not meet the preset tier.

---

## 10. Migration & Deployment Steps

1. **Database migration**
   - Create `plans`, `subscriptions`, `invoices`, `provider_model_pricing`, `fal_usage_logs`.
   - Alter `credit_ledger`, `generations`, `product_versions` types to `NUMERIC(12,4)`.
   - Add new columns to `generations`.

2. **Seed data**
   - Insert the 7 plans with placeholder `metadata.dodo_product_id = null`.
   - Run a seed script to populate `provider_model_pricing` from `docs/fal-ai-image-models-relevant.md`.

3. **Dodo setup**
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
2. A reservation must always be released or converted to a debit.
3. A Dodo webhook must be idempotent using `dodo_payment_id`, `dodo_checkout_session_id`, or `dodo_subscription_id`.
4. Credit ledger must reconcile: sum of `purchase` + `allocation` − `debit` − `refund` = user balance.
5. Manual adjustments write an `adjustment` ledger entry and an `admin_audit_logs` row.
6. Extra credits can only be purchased by active monthly subscribers.
7. Weekly trials can only be purchased once per user.

---

## 12. Implementation Slicing

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
