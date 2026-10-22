# Referral Program — In-House

Status: **Shipped (in-house).** The GrowSurf design in this doc's history is
**superseded** — a GrowSurf bridge existed briefly (`10` records that era)
but the live program is first-party: `apps/web/lib/referrals/`,
`/app/referrals`, `/r/[code]`. No third-party attribution vendor is involved.

In Phase 1 referrals are not a growth add-on — they are the **primary way a
free user obtains their first generation** (`02 §2`).

---

## 1. Mechanics (shipped)

Canonical amounts live in `apps/web/lib/referrals/reward-amounts.ts` — a
client-safe constants module shared by marketing surfaces and grant logic.

| Trigger | Referrer gets | Referee gets |
|---|---|---|
| Friend signs up via code/link | **25 credits** | **10 credits + first transformation free** (pending-generation unlock, `02 §6`) |
| Friend **makes first payment** | **30% of the friend's plan credit grant** | nothing extra |

Both rewards are **funded by us**. The friend's balance is never touched.
State that explicitly in the UI — the first thing a user wonders is whether
referring costs their friend something:

> *Their credits are untouched — this one's on us.*

### Reward gating and caps (shipped)

- **30% payment share is held for `REFERRAL_PAYMENT_SHARE_HOLD_DAYS`**
  (default **14**, env range 1–90, `0` disables) — credits mint only after
  the refund window closes, via `releaseDueReferralHolds()` on cron. A refund
  inside the window cancels the hold before any credits exist to claw back.
- **Referrer reward cap:** a referrer is paid on their first **15** referees
  (`REFERRER_REWARD_CAP`). Referrals beyond the cap still attribute — the
  referee keeps their bonuses — but earn the referrer nothing.
- **Subsidy budget:** all referral/retention/promo grants go through
  `grant_subsidy_credits`, which atomically enforces the program's
  `subsidy_budgets.monthly_cap_credits` — the program can't overspend even if
  app logic is wrong.
- **Clawback on refund/chargeback** (`reverseReferrerShareForRefund`):
  held share is cancelled; granted share reverses capped at available
  balance with `unrecovered_credits` recorded for the spent remainder.

### Why the referee also gets a free transformation, not just credits

The referee's *first* transformation is funded as a single bounded provider
call at a cost tier we control — credits alone could be spent on the most
expensive route. The bounded unlock plus a small credit grant maps cleanly
onto the `pending_generations` row already captured at Generate (`02 §6`).

---

## 2. Attribution & surfaces (shipped)

- Each user gets a referral **code** (`lib/referrals/codes.ts`); the share
  link lands on `/r/[code]`, which shows the referee offer (`10 credits +
  first transformation free`) and attributes the signup.
- `/app/referrals` (settings) is the referrer dashboard: code, share
  controls, invite/reward status.
- Referral surfaces also appear in `/app/billing`, the account page, the
  onboarding flow, and offer-ladder steps (`08`).
- Reward events are recorded in `referral_rewards` with DB-level idempotency
  keys (`referral:*`) — the same discipline as payment fulfillment, because
  retries happen in every webhook/queue path.

---

## 3. Fraud controls (ours — there is no vendor layer)

| Vector | Control |
|---|---|
| Reward before money lands | Payment share is a **confirmed-payment** trigger plus a 14-day hold |
| Self-referral | Referrer/referee identity checks in the claim path; `no_self_referral` DB constraint |
| Unbounded payout | `REFERRER_REWARD_CAP` (15) + monthly `subsidy_budgets` cap |
| Refund farming | Hold window covers the refund window; clawback caps at balance |
| Code abuse | Referral codes are generated per-user from a constrained alphabet; malformed-code handling is covered by DB constraints and tests |

---

## 4. Disclosure

Referral programs are promotions and need terms: reward amounts,
qualification, the caps, our right to withhold for fraud, that credits never
expire, and that we may change or end the program. Link from every referral
surface. The processor may ask for this if a dispute involves promotional
credits.

---

## 5. [superseded] The GrowSurf design

Earlier revisions of this doc specified GrowSurf for attribution/link
management/reward-state UI plus our own fraud and grant layer on top. A
bridge was built and then removed: participant state, referral codes, reward
lifecycle, and dashboards are now all first-party. Kept here only as design
ancestry — do not implement against it.
