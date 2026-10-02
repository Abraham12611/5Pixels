# 5Pixels Monetization — Overview & Tier Model

Status: **Proposal.** Companion docs:

- `01_CREDIT_VISIBILITY.md` — when the credits chip appears
- `02_FREE_USER_FIRST_RUN.md` — first-run teaser, cost model, and the labelling decision
- `03_REFERRAL_PROGRAM.md` — GrowSurf-powered referrals
- `04_PRICING_EXPERIMENTS.md` — A/B framework, downsell ladders, annual anchoring
- `05_PAYMENT_PROCESSOR_POLAR.md` — Dodo → Polar migration
- `06_ANNUAL_PLANS.md` — annual pricing, margin ceilings, credit drip
- `07_BILLING_UI_SYSTEM.md` — every billing/promo surface and its visual spec
- `08_OFFER_LADDER_AND_FUNNELS.md` — offer triggers, ladders, funnel variants (pre-auth teaser)
- `09_PROMO_ADMIN_AND_METRICS.md` — admin campaign console, event schema, guardrails

---

## 1. Where we are today

| Fact | Evidence |
|---|---|
| Signup credits were **10**, granted by `handle_new_user()` | `supabase/migrations/20260901000004_generation_vertical_slice.sql:53-83` |
| That grant is **currently gone** — overwritten by the default-avatar migration | `supabase/migrations/20260920000001_default_avatars.sql:57-73`, confirmed against live DB |
| Credits chip renders for everyone, red at zero | `apps/web/components/consumer/credit-balance-chip.tsx:19-53` |
| Paywall sheet exists | `apps/web/components/consumer/paywall-sheet.tsx` |
| Entitlement helpers exist | `apps/web/lib/billing/entitlements.ts` |
| Plans: weekly trial, monthly, extra-credit top-up. **No annual plan.** | `supabase/migrations/20260904100001_billing_credits_schema.sql:380-403` |
| **Payment processor moving Dodo → Polar** | `05` — Polar org `5pixels` exists, onboarding incomplete |

**Settled decisions** (owner, this revision):

1. The 10-credit signup grant **is not coming back** — it is unfunded at current runway.
2. **Phase 1 free tier is zero-COGS.** No generation runs for a user who has never paid. Real watermarked previews are a **Phase 2** feature, switched on once revenue covers the COGS.
3. Referrals are powered by **GrowSurf**, not built in-house.
4. Pricing experiments are **web-only**; mobile apps ship a single fixed offer.
5. Phase 1 teaser runs in **`implied` mode** — presented as the user's result (`02 §4`). Risks accepted and recorded; mitigations M1–M7 are in scope.
6. **Annual plans are being added** (`06`), with tier-specific discounts and mandatory monthly credit drip.
7. Polar sandbox is built and tested **before** KYC/go-live (`05 §6`).
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
| Provider cost per low-res generation | Phase 2 trigger threshold | `provider_pricing` + a real fal invoice |
| Credit → COGS conversion | Referral reward sizing | `plans.markup_multiplier` |
| Free→paid conversion | Experiment sizing | Not yet measurable |
| Referral acceptance rate | Whether referral-gating works | Not yet measurable |

**Phase 2 trigger:** switch on real previews when monthly gross profit exceeds (projected signups × preview cost) by a comfortable margin — i.e. when the preview budget is a rounding error rather than a bet. Write the threshold down when you have the numbers.

---

## 6. Build order

| Phase | Scope | Notes |
|---|---|---|
| **0** | Fix `handle_new_user()` regression (avatar + no grant + GrowSurf hook) | Blocks everything |
| **0** | **Polar onboarding + migration** (`05`) | **Blocks all revenue — start now** |
| **1** | `getUserTier()` + chip visibility (`01`) | Low risk |
| **2** | Teaser + unlock modal (`02`) | Zero COGS |
| **3** | GrowSurf referrals (`03`) | Funds the free tier |
| **4** | Experiment framework (`04`) | Last — needs traffic |

Polar is now on the critical path. Nothing else monetizes until checkout works.
