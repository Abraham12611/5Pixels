# 5Pixels Monetization — Overview & Tier Model

Status: **Mixed — substantially shipped, some sections historical.** This doc
was written as a proposal; the codebase has since moved on. Where the two
disagree, **the code wins** — see the "current state" callouts and
`18_BILLING_CREDITS_PLAN.md` for canonical billing policy.

Companion docs:

- `01_CREDIT_VISIBILITY.md` — when the credits chip appears
- `02_FREE_USER_FIRST_RUN.md` — first-run teaser, cost model, and the labelling decision
- `03_REFERRAL_PROGRAM.md` — referrals (shipped in-house; the GrowSurf design is superseded)
- `04_PRICING_EXPERIMENTS.md` — A/B framework, downsell ladders, annual anchoring
- `05_PAYMENT_PROCESSOR_POLAR.md` — **historical** — Polar never went live; processor is now Bachs
- `06_ANNUAL_PLANS.md` — annual pricing, margin ceilings, credit drip (shipped)
- `07_BILLING_UI_SYSTEM.md` — every billing/promo surface and its visual spec
- `08_OFFER_LADDER_AND_FUNNELS.md` — offer triggers, ladders, funnel variants (pre-auth teaser)
- `09_PROMO_ADMIN_AND_METRICS.md` — admin campaign console, event schema, guardrails
- `10_IMPLEMENTATION_AND_TESTING.md` — era snapshot (Creem/GrowSurf); mostly superseded

---

## 1. Where we are today

**Current state (Oct 2026):**

| Fact | Evidence |
|---|---|
| No unconditional signup grant — new users start at **0 credits**; referral bonuses are the funded free path | `apps/web/lib/referrals/reward-amounts.ts` |
| Referrals are **in-house** (`lib/referrals/`, `/app/referrals`, `/r/[code]`) — GrowSurf was evaluated, briefly bridged, then removed | `apps/web/lib/referrals/`; `qa/08-inhouse-referral-codes-and-onboarding.md` |
| Referral economics shipped: referrer **+25** credits at referee signup, referee **+10** + free first transformation; referrer also earns **30%** of the referee's first plan grant after a **14-day** hold; capped at **15** rewarded referees and a monthly subsidy budget | `reward-amounts.ts`, `lib/referrals/rewards.ts`, `subsidy_budgets` |
| **Payment processor is Bachs** (default). Whop/Creem are rollback paths; Dodo/Polar are historical | `lib/billing/payment-provider.ts` |
| Credits: **1 credit = $0.01 of provider-cost capacity** (internal denomination, permanent); never expire; margin set at issuance via grant size — the `markup_multiplier` consumption model is retired | `18_BILLING_CREDITS_PLAN.md` "Canonical credit policy" |
| Plans live: 2 weekly passes ($5/113cr, $10/259cr), 4 monthly ($20–$100 → 606–6,417cr/mo), 4 annual (monthly drip), 4 fixed credit packs ($10–$100 → 606–6,060cr) | `plans` seed + migrations through `20261014000001` |
| Generation pricing is **quote-based and fail-closed**; reservations hold until authoritative provider settlement or the 72h fallback | `18` §3 |
| Entitlement helpers + tier model exist | `apps/web/lib/billing/entitlements.ts` |

**Settled decisions** (owner):

1. The signup grant **did not come back** — it is unfunded at current runway.
2. **Phase 1 free tier is zero-COGS.** No generation runs for a user who has never paid. Real watermarked previews are a **Phase 2** feature, switched on once revenue covers the COGS.
3. ~~Referrals are powered by GrowSurf~~ → **superseded**: shipped in-house (`03` has the current spec).
4. Pricing experiments are **web-only**; mobile apps ship a single fixed offer.
5. Phase 1 teaser runs in **`implied` mode** — presented as the user's result (`02 §4`). Risks accepted and recorded; mitigations M1–M7 are in scope.
6. **Annual plans shipped** (`06`), with tier-specific discounts and mandatory monthly credit drip.
7. ~~Polar sandbox before KYC~~ → **superseded**: Polar was rejected; the live processor path went Creem → Whop → **Bachs** (`05` is historical).
8. The teaser fires **pre-auth** — anonymous users can upload and "generate" before hitting the blur-gate signup wall (`08 §1`). Same zero-COGS mechanics, earlier in the funnel.
9. Offers are delivered as **ordered ladders inside one takeover surface** with server-assigned variants and admin-managed campaigns (`08`, `09`).
10. Pre-auth promo inventory is **ambient-only** (ribbon/tiles/banner — never a takeover); the takeover's entry point is `signup_completed` (`08 §9`).
11. `--color-promo` magenta accent adopted for discount/offer badges; deadline display (`none`/`date`/`countdown`) is admin-configurable per discount step (`07 §3`, `08 §7`).

---

## 2. Tier model

| Tier | Definition (machine-checkable) | Credits chip | Can generate? |
|---|---|---|---|
| **T0 — Visitor** | No account | Hidden | No (auth gate) |
| **T1 — Free** | Account, never paid, no active sub | **Hidden** | **No** — teaser + paywall (Phase 1) |
| **T2 — Paid, in credit** | Active sub or positive purchased balance | Visible, neutral | Yes |
| **T3 — Paid, exhausted** | Has paid before, balance ≤ 0 | Visible, urgent | No → top-up |

Add to `lib/billing/entitlements.ts`:

```ts
export type UserTier = "visitor" | "free" | "paid_active" | "paid_exhausted";
export async function getUserTier(userId?: string): Promise<UserTier>;
export async function hasEverPaid(userId: string): Promise<boolean>;
```

`hasEverPaid` must be **monotonic** — once true, always true. Source: any `invoices.status='paid'` OR any `subscriptions` row including cancelled/expired. This mirrors the checks already in `canPurchaseTrial()` (`entitlements.ts:156-182`); extract the shared helper and use it in both.

A user holding **referral credits** is a distinct sub-state: `tier = "free"` but `balance > 0`. They can generate (the referral funded it) and their chip is visible. See `03`.

---

## 3. Principles

1. **Zero COGS for unpaid users until revenue covers it.** No provider call is made on behalf of a user who has never paid and has no referral credits. This is a hard budget constraint, not a preference.
2. **Price shown = price charged.** Variants may change what a user sees; the amount at checkout always matches the amount displayed.
3. **One *variant* per user; ladders within a variant are fine.** Re-bucketing someone into a different experiment arm breaks inference and is forbidden. A **downsell** after a decline is a designed stage *inside* one variant and is encouraged — see `04 §3`.
4. **Degrade, don't fabricate.** Watermarks, low resolution, locked downloads, and clearly-labelled examples are all fair. Presenting another image as the user's own generated result is the one thing this plan flags as carrying disproportionate risk (`02 §4`).
5. **Referral is a first-class path to value, not a footnote.** For a runway-constrained free tier, "invite a friend to unlock your first generation" converts *and* acquires. It is the primary Phase 1 mechanic.

---

## 4. Funnel (Phase 1)

```
Visitor → browses presets freely → uploads photo, presses Generate
   │      (pending_generation held against anon session — nothing generated)
   └─ Simulated progress → blurred teaser + "Create an account to see your result"
          │
Free user (T1) — no credits chip, no scarcity signalling
   │      ↓
   │   Offer-ladder takeover (variant-assigned: weekly trials / referral / plans)
   │      ├─ Pay ──────────────→ credits → real generation
   │      └─ Invite a friend ──→ referral credits → real generation
   │
Paid (T2) → chip visible, normal flow
   └─ exhausted (T3) → top-up / upgrade sheet
```

Full trigger/ladder/variant spec: `08`. Surface visuals: `07`.

Phase 2 (post-revenue) inserts a real watermarked generation before the modal. The code path is designed so this is a config flag, not a rewrite (`02 §5`).

---

## 5. Economics to settle

Placeholders — **not measurements.** Fill from real data before committing.

| Input | Needed for | Source |
|---|---|---|
| Provider cost per low-res generation | Phase 2 trigger threshold | `provider_pricing_snapshots` + a real provider invoice |
| Credit → COGS conversion | Referral reward sizing | fixed: `credits × $0.01` provider-cost capacity (`18`) |
| Free→paid conversion | Experiment sizing | Not yet measurable |
| Referral acceptance rate | Whether referral-gating works | Not yet measurable |

**Phase 2 trigger:** switch on real previews when monthly gross profit exceeds (projected signups × preview cost) by a comfortable margin — i.e. when the preview budget is a rounding error rather than a bet. Write the threshold down when you have the numbers.

---

## 6. Build order — historical

*This sequence shipped. Recorded for context: the `handle_new_user()`
regression was fixed, checkout went live (ultimately on Bachs), the tier
model + teaser + unlock modal shipped, referrals shipped in-house, and the
promo engine (`08`/`09`) is in place. `04`'s experiment framework remains the
last open piece — still gated on real traffic.*

| Phase | Scope | Status |
|---|---|---|
| **0** | Fix `handle_new_user()` regression | Done |
| **0** | Payment processor (eventually Bachs, not Polar) | Done |
| **1** | `getUserTier()` + chip visibility (`01`) | Done |
| **2** | Teaser + unlock modal (`02`) | Done |
| **3** | In-house referrals (`03`) | Done |
| **4** | Experiment framework (`04`) | Open — needs traffic |
