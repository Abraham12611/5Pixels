# Annual Plans — Pricing, Margin Limits, and Credit Drip

Status: **Proposal with a hard constraint.** Enables the annual-anchor experiment in `04 §5`.

---

## 1. Why annual can't just be "50% off" here

On zero-marginal-cost software, a 50% annual discount costs you nothing but deferred revenue. **On a credit product it is funded directly out of gross margin**, because you still owe 12 months of generation capacity.

Current plans (live, queried from `public.plans`). Credit unit: **1 credit = $0.01 of purchasing power**. `markup_multiplier` is how much provider cost each credit absorbs, so worst-case COGS if a subscriber spends every credit is `grant ÷ markup` cents:

| Plan | Price/mo | Credits/mo | Markup | Worst-case COGS/mo | Margin |
|---|---|---|---|---|---|
| Weekly Starter | $5 | 500 | 4.0× | $1.25 | 75.0% |
| Weekly Plus | $10 | 1,000 | 3.5× | $2.86 | 71.4% |
| **Creator** | $20 | 2,000 | 3.0× | $6.67 | **66.7%** |
| **Pro** | $30 | 3,000 | 2.5× | $12.00 | **60.0%** |
| **Studio** | $50 | 5,500 | 2.0× | $27.50 | **45.0%** |
| **Agency** | $100 | 12,000 | 1.7× | $70.59 | **29.4%** |

Now apply a flat 50% annual discount with the **same credit grant** (what the transcript's advice implies):

| Plan | Annual rev/mo | COGS/mo | Margin at 50% off |
|---|---|---|---|
| Creator | $10.00 | $6.67 | 33.3% ✅ |
| Pro | $15.00 | $12.00 | 20.0% ⚠️ |
| **Studio** | $25.00 | $27.50 | **−10.0% ❌** |
| **Agency** | $50.00 | $70.59 | **−41.2% ❌** |

**Studio and Agency become loss-making** — you would pay roughly $2.50 and $20.59 per subscriber per month for the privilege of having them. That is the debt scenario, arriving through the pricing page instead of through free generations.

The cause is the markup ladder: higher tiers already trade margin for volume (1.7× on Agency), so there's simply no room left to discount. The transcript's 50% assumes a product with no COGS.

---

## 2. Maximum safe discount per tier

Discount ceiling that keeps worst-case margin at or above 25%:

| Plan | Markup | Max discount @ 25% floor |
|---|---|---|
| Creator | 3.0× | **55.6%** |
| Pro | 2.5× | **46.7%** |
| Studio | 2.0× | **26.7%** |
| Agency | 1.7× | **5.9%** |

So the aggressive "save 50%" headline is available **on Creator** — and Creator is almost certainly your volume tier, which is exactly where the anchor needs to work. The upper tiers need modest discounts or none.

---

## 3. Recommended annual pricing

Each row keeps worst-case margin above 21%, and the hero row delivers the full "save 50%" headline the anchor strategy depends on:

| Plan | Annual price | Effective /mo | Discount | Credits/mo | COGS/mo | Margin |
|---|---|---|---|---|---|---|
| **Creator Annual** ⭐ | **$120** | **$10.00** | **50%** | 2,000 | $6.67 | **33.3%** |
| Pro Annual | $216 | $18.00 | 40% | 3,000 | $12.00 | 33.3% |
| Studio Annual | $450 | $37.50 | 25% | 5,500 | $27.50 | 26.7% |
| Agency Annual | $1,140 | $95.00 | 5% | 12,000 | $70.59 | 25.7% |

**Paywall presentation** (`04 §5`), anchoring on Creator exactly as the transcript prescribes:

```
┌──────────────────────────────────────────────┐
│ ⭐ Creator Annual    $10/mo   SAVE 50%       │
│    billed $120 once a year                   │
│    7-day free trial included                 │
├──────────────────────────────────────────────┤
│    Creator Monthly   $20/mo                  │
│    billed monthly · no discount              │
└──────────────────────────────────────────────┘
```

Two notes on the framing: the "save 50%" is genuine here (it really is half the monthly rate), and putting the trial only on annual is the transcript's risk-reversal lever — state the post-trial date and price next to the button so it reads as a clear offer rather than a toggle.

Alternative if you want 50% across more tiers: raise the markup on Studio/Agency annual (i.e. grant fewer credits per dollar). It protects margin but means annual subscribers get a worse credit rate than monthly ones — hard to explain and likely to generate support tickets. The table above is the cleaner trade.

---

## 4. Credit drip is mandatory, not optional

**Annual plans must release credits monthly, never as one upfront grant.**

Agency Annual at $1,140 with a single grant hands the user **144,000 credits = ~$84,700 of provider cost at 1.7×** on day one. A subscriber could exhaust it in week one and then dispute the charge. You'd be out the COGS *and* the revenue.

Monthly drip caps exposure to one month's grant in every failure mode — churn, refund, chargeback, fraud.

Implementation: on each Polar `subscription.cycled`-equivalent event, grant one month's credits with an idempotency key scoped to the period, reusing the pattern already proven in `lib/billing/fulfillment.ts:347-402`:

```
idempotency_key: 'subscription:<polar_subscription_id>:<period_start>'
```

For annual subscriptions Polar bills once a year, so the 12 monthly drips need their own scheduler rather than riding billing events. Two options:

- **Recommended:** a daily cron (Supabase scheduled function) that finds active annual subscriptions whose next drip date has passed and grants one month, idempotent on `(subscription_id, drip_index)`.
- Alternative: Polar **meters** — usage-based primitives that could model the allowance natively. Worth evaluating, but it moves balance state out of our ledger, which `05 §5` argues against.

```sql
ALTER TABLE public.plans
  ADD COLUMN billing_interval TEXT NOT NULL DEFAULT 'month'
    CHECK (billing_interval IN ('week','month','year')),
  ADD COLUMN credit_drip_months INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.subscriptions
  ADD COLUMN next_drip_at TIMESTAMPTZ,
  ADD COLUMN drips_granted INTEGER NOT NULL DEFAULT 0;
```

Unspent credits at the end of a dripped month: recommend **carry forward within the subscription term, expire at term end.** Rolling over indefinitely turns breakage into an unbounded liability; expiring monthly makes the annual plan feel worse than monthly. Whatever you pick, state it in the plan description — it's the most common billing dispute in credit products.

---

## 5. Trial interaction

`canPurchaseTrial()` (`entitlements.ts:130-185`) blocks a weekly trial if the user has any active subscription, any paid invoice, or any prior trial. Adding an annual plan with its own trial needs that logic extended so the two trial types don't stack — a user shouldn't get a weekly trial *and* an annual trial.

Also enable Polar's `prevent_trial_abuse` (currently `false`, `05 §1`) — our checks are application-level and a fresh email walks past them.

---

## 6. A caveat on the margin numbers

Every margin above is **worst case: 100% of granted credits spent.** Real-world breakage (users not spending their full allowance) makes actual margins better, often substantially.

But two reasons to design at worst case anyway: breakage is unmeasured for this product, and the whole point is not being exposed to a bad month. A plan that's only profitable if customers under-use it is a plan that punishes you for engagement — the opposite of what you want.

Once there's real usage data, revisit the discount ceilings in §2 with actual spend-rate figures. They may loosen considerably.

---

## 7. Action list

1. Add `annual` to the `plans.type` check constraint (currently `weekly_trial` / `monthly` / `extra_credit`)
2. Insert the four annual plan rows from §3
3. Add `billing_interval` + `credit_drip_months` (§4)
4. Create matching Polar products with `recurring_interval: "year"` (`05 §3`)
5. Build the drip scheduler + idempotency
6. Extend `canPurchaseTrial()` for annual trials
7. Wire the annual anchor into the paywall as `exp_paywall_annual_anchor` (`04 §5`)
