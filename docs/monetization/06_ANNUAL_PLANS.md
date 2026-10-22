# Annual Plans — Pricing, Margin Limits, and Credit Drip

Status: **Shipped.** The four `annual-*` plans exist with the drip model this
doc mandated. Figures updated to the current denomination — **1 credit =
$0.01 of provider-cost capacity** — under which `markup_multiplier` is
retired and worst-case COGS is simply `grant × $0.01` (`18` canonical
policy). The historical analysis below showed the same margins encoded via
markup; they are now encoded via grant size instead — the conclusions hold.

---

## 1. Why annual can't just be "50% off" here

On zero-marginal-cost software, a 50% annual discount costs you nothing but deferred revenue. **On a credit product it is funded directly out of gross margin**, because you still owe 12 months of generation capacity.

Current plans (live, `public.plans`). Worst-case COGS if a subscriber spends
every credit is `grant × $0.01`:

| Plan | Price/mo | Credits/mo | Worst-case COGS/mo | Margin |
|---|---|---|---|---|
| Weekly Starter | $5 | 113 | $1.13 | 77.4% |
| Weekly Plus | $10 | 259 | $2.59 | 74.1% |
| **Creator** | $20 | 606 | $6.06 | **69.7%** |
| **Pro** | $30 | 1,090 | $10.90 | **63.7%** |
| **Studio** | $50 | 2,500 | $25.00 | **50.0%** |
| **Agency** | $100 | 6,417 | $64.17 | **35.8%** |

Now apply a flat 50% annual discount with the **same credit grant**:

| Plan | Annual rev/mo | COGS/mo | Margin at 50% off |
|---|---|---|---|
| Creator | $10.00 | $6.06 | 39.4% ✅ |
| Pro | $15.00 | $10.90 | 27.3% ⚠️ |
| **Studio** | $25.00 | $25.00 | **0.0% ❌** |
| **Agency** | $50.00 | $64.17 | **−28.3% ❌** |

**Studio breaks even at best and Agency becomes loss-making** — you'd pay roughly $14 per Agency subscriber per month for the privilege of having them. That is the debt scenario, arriving through the pricing page instead of through free generations.

The cause is the margin ladder: higher tiers already trade margin for volume (Agency's grant is sized for the thinnest margin), so there's simply no room left to discount. The transcript's 50% assumes a product with no COGS.

---

## 2. Maximum safe discount per tier

Discount ceiling that keeps worst-case margin at or above 25% (i.e.
effective monthly price ≥ COGS ÷ 0.75):

| Plan | Worst-case COGS/mo | Max discount @ 25% floor | Shipped discount |
|---|---|---|---|
| Creator | $6.06 | **59.6%** | 50% ✅ |
| Pro | $10.90 | **51.5%** | 40% ✅ |
| Studio | $25.00 | **33.3%** | 25% ✅ |
| Agency | $64.17 | **14.4%** | 5% ✅ |

So the aggressive "save 50%" headline is available **on Creator** — and Creator is almost certainly your volume tier, which is exactly where the anchor needs to work. The upper tiers need modest discounts or none.

---

## 3. Shipped annual pricing

These rows went live unchanged from the recommendation — each keeps
worst-case margin above 32%, and the hero row delivers the full "save 50%"
headline the anchor strategy depends on:

| Plan | Annual price | Effective /mo | Discount | Credits/mo | COGS/mo | Margin |
|---|---|---|---|---|---|---|
| **Creator Annual** ⭐ | **$120** | **$10.00** | **50%** | 606 | $6.06 | **39.4%** |
| Pro Annual | $216 | $18.00 | 40% | 1,090 | $10.90 | 39.4% |
| Studio Annual | $450 | $37.50 | 25% | 2,500 | $25.00 | 33.3% |
| Agency Annual | $1,140 | $95.00 | 5% | 6,417 | $64.17 | 32.5% |

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

## 4. Credit drip is mandatory, not optional — shipped

**Annual plans release credits monthly, never as one upfront grant.**

Agency Annual at $1,140 with a single grant would hand the user **77,004
credits ≈ $770 of provider-cost capacity** on day one. A subscriber could
exhaust it in week one and then dispute the charge — we'd be out the COGS
*and* the revenue.

Monthly drip caps exposure to one month's grant in every failure mode — churn, refund, chargeback, fraud.

Shipped implementation (migration `20260924000001_annual_plans_and_credit_drip.sql`):

- `plans.credit_drip_months` (12 for annual, CHECK-enforced),
  `subscriptions.next_drip_at` + `drips_granted`.
- A scheduled job (`lib/billing/drip.ts` → `/api/cron/*`) grants one month's
  credits when `next_drip_at` passes, idempotent per
  `(subscription, drip_index)` — not driven by billing events, since annual
  plans bill once a year.

Unspent dripped credits **never expire** — settled by the canonical credit
policy (`18`). The earlier "carry within term, expire at term end" idea is
superseded; breakage liability is instead bounded by the drip itself.

---

## 5. Trial interaction

`canPurchaseTrial()` (`lib/billing/entitlements.ts`) blocks a free trial if
the user has any active subscription, any paid invoice, or any prior trial —
the rule is uniform across weekly and annual plans, so the two trial types
can't stack. Separately, `canPurchaseWeeklyPass()` allows **repurchase** of
paid weekly passes until the user graduates to a monthly/annual plan or
makes a non-weekly purchase (`18 §2.1`).

---

## 6. A caveat on the margin numbers

Every margin above is **worst case: 100% of granted credits spent.** Real-world breakage (users not spending their full allowance) makes actual margins better, often substantially.

But two reasons to design at worst case anyway: breakage is unmeasured for this product, and the whole point is not being exposed to a bad month. A plan that's only profitable if customers under-use it is a plan that punishes you for engagement — the opposite of what you want.

Once there's real usage data, revisit the discount ceilings in §2 with actual spend-rate figures. They may loosen considerably.

---

## 7. Action list — done

1. ✅ `annual` added to the `plans.type` check constraint
2. ✅ Four annual plan rows inserted (§3 figures, re-denominated to the
   credits shown)
3. ✅ `credit_drip_months` + `next_drip_at`/`drips_granted` shipped
4. ✅ Provider products provisioned — on Bachs (`bachs_product_id_*` in
   `plans.metadata`), not Polar (`05` is historical)
5. ✅ Drip scheduler + idempotency shipped
6. ✅ `canPurchaseTrial()` covers annual trials (§5)
7. ⏳ Wire the annual anchor into the paywall as `exp_paywall_annual_anchor` (`04 §5`) — still open, gated on experiment traffic
