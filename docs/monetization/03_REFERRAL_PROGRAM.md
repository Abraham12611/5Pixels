# Referral Program — GrowSurf

Status: **Proposal.** Powered by [GrowSurf](https://growsurf.com) per owner decision (`00 §1`). In Phase 1 this is not a growth add-on — it is the **primary way a free user obtains their first generation** (`02 §2`).

---

## 1. Mechanics

| Trigger | Referrer gets | Referee gets |
|---|---|---|
| Friend signs up via link | nothing yet | Their teaser unlocked → **one free full-quality generation** |
| Friend **makes first payment** | **30% of the friend's plan credit grant**, complimentary | nothing extra |

Both rewards are **funded by us**. The friend's balance is never touched. State that explicitly in the UI — the first thing a user wonders is whether referring costs their friend something:

> *Their credits are untouched — this one's on us.*

### Why the referee reward is a generation, not credits

Giving the referee "one free generation" rather than N credits keeps our exposure to exactly one provider call, at a resolution we control, and it maps cleanly onto the `pending_generations` row already captured at Generate (`02 §6`). Credits are fungible and invite arithmetic; one unlock is a single bounded cost.

### Referrer reward timing

Flat **30%** across plans to start. Per-plan percentages (30/40) are harder to state in one line, and an unclear offer converts worse than a marginally less generous clear one. If you later want to bias toward annual, add a **bonus** (`+10 if they choose annual`) rather than a second base rate.

**Reward sizes are starting points, not analysis.** Size them against real credit→COGS numbers (`plans.markup_multiplier` + verified provider pricing), and treat the amount as an experiment variable (`04 §7`).

---

## 2. What GrowSurf does and doesn't do

Worth being precise, because the decision was partly made on "fraud protection" — and that phrase means less than it sounds like.

**GrowSurf gives us:**

- Cross-device attribution and the referral link/portal UI (JS SDK, embeddable elements, hosted portal)
- iOS/Android SDKs — matters for the later mobile apps
- Participant/reward state, progress UI, reward approval workflow (manual / auto-approve / auto-approve-and-fulfil)
- `PARTICIPANT_REACHED_A_GOAL` and `NEW_PARTICIPANT_ADDED` webhooks, with durable storage and multi-day exponential-backoff retries
- A "Sign Up + Qualifying Action" trigger mode, where **our backend confirms the qualifying action** via their REST API

**GrowSurf does *not* give us:**

- **The business fraud checks.** Their docs are explicit: *"GrowSurf counts the referral from the confirmation you send; your team owns the business checks behind it."* Self-referral detection, fingerprint clustering, referral-ring detection, and disposable-email blocking remain ours (§5).
- Credit granting. Their native credit delivery runs through Stripe coupons; we're on Polar, so credits are granted by **our** webhook handler into our own ledger.
- Idempotency. Their own pre-launch checklist says: *"If the same webhook event is received more than once, your application should only issue the reward once."* That's on us (§4).

So GrowSurf replaces the attribution, link management, and reward-state UI — genuinely the annoying parts — but not the trust layer. Budget for it as a build-vs-buy on attribution, not on fraud.

---

## 3. Integration design

**Trigger mode:** `Sign Up + Qualifying Action`. The qualifying action is **first successful payment**, confirmed by our Polar webhook — never at checkout initiation.

```
Friend clicks ref link
  → GrowSurf JS SDK captures referrer, first-party cookie
  → Signup: our server calls GrowSurf REST API to add participant
            with `referredBy` (from growsurf.getReferrerId())
  → Referee teaser unlocked immediately (our side, one free generation)
  → Friend pays → Polar webhook (05) → our handler confirms the
    qualifying action to GrowSurf via REST API
  → GrowSurf evaluates goals → PARTICIPANT_REACHED_A_GOAL webhook
  → our handler grants referrer credits (idempotent)
```

Two rules that keep this safe:

1. **Signup participant creation is server-side.** Read the GrowSurf referrer id on the client, but create the participant from our server at signup so a crafted client can't mint arbitrary referrals. Fold this into the corrected `handle_new_user()` path or the signup server action — but keep *reward granting* out of the DB trigger; grants belong in the gated webhook path.
2. **Reward approval: `manually approve` or auto-approve with a delay.** Do not use auto-approve-and-fulfil at launch. Holding rewards ~24h costs nothing in perceived generosity and gives fraud detection a window before credits are spendable.

**Endpoints to add:**

| Route | Purpose |
|---|---|
| `POST /api/webhooks/growsurf` | Verify signature → grant rewards idempotently |
| `lib/referrals/growsurf-client.ts` | REST wrapper: add participant, confirm qualifying action, fetch participant |
| `lib/referrals/rewards.ts` | Ledger grants + clawback |

Secrets (`GROWSURF_API_KEY`, `GROWSURF_CAMPAIGN_ID`, `GROWSURF_WEBHOOK_SECRET`) are server-only; the public campaign id used by the JS SDK is the only client-visible value.

---

## 4. Credit grants

Reuse the existing ledger and the idempotency pattern already proven in the Dodo fulfilment path (`lib/billing/fulfillment.ts:347-402`) — that pattern exists precisely because webhooks retry, and GrowSurf retries for days.

```
entry_type: 'allocation'
idempotency_key: 'referral:reward:<growsurf_reward_id>'
                 'referral:unlock:<referee_user_id>'
metadata: { reason, growsurf_participant_id, referral_id, plan_id }
```

**Clawback policy — decide now, not during the first dispute.** If the referee's payment is refunded or charged back:

- Referrer credits **unspent** → negative ledger entry, reversed
- Referrer credits **already spent** → recorded as loss, participant flagged
- Repeat offenders → excluded from the program

Polar's refund and chargeback webhooks (`05 §4`) are the trigger for this.

---

## 5. Fraud controls (ours, not GrowSurf's)

| Vector | Control |
|---|---|
| Self-referral | Reject when referrer/referee share verified email, or fingerprint matches within a window |
| Fake signups for the free generation | Verified email required before the referee unlock fires |
| Referral rings (A→B→A) | Cycle detection over the referrer graph; flag for review, don't auto-reject |
| Disposable email domains | Blocklist at signup |
| One human, many accounts | Fingerprint clustering → `fraud_score` → manual queue above threshold |
| Unbounded payout | Hard cap: N rewarded referrals per account per month |
| Reward before money lands | Qualifying action = **confirmed payment only** |

Mirror GrowSurf's participant/reward state into our own tables so fraud review, clawbacks, and analytics don't depend on their dashboard:

```sql
CREATE TABLE public.referral_participants (
  user_id       UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  growsurf_id   TEXT NOT NULL UNIQUE,
  referral_code TEXT,
  referred_by   UUID REFERENCES public.profiles(id),
  fraud_score   NUMERIC,
  blocked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_referral CHECK (user_id <> referred_by)
);

CREATE TABLE public.referral_rewards (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  growsurf_reward_id TEXT NOT NULL UNIQUE,
  referrer_user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_user_id    UUID REFERENCES public.profiles(id),
  kind               TEXT NOT NULL CHECK (kind IN ('referee_unlock','referrer_payment_share')),
  credits            INTEGER,
  status             TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','granted','clawed_back','rejected')),
  ledger_entry_id    UUID REFERENCES public.credit_ledger(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_at         TIMESTAMPTZ
);
```

`growsurf_reward_id UNIQUE` is the DB-level idempotency guarantee — it holds even if the application logic has a bug.

---

## 6. Surfaces

| Surface | Placement |
|---|---|
| **Unlock modal** (`02 §7`) | Co-equal with pricing — *"Or invite a friend to unlock your first look free"* |
| Account → Billing | Persistent card: link, invites, credits earned (GrowSurf embeddable elements) |
| Empty Library | Natural spot for a free user with nothing yet |
| Post-generation (paid) | Occasional, low-key |

The unlock modal is the critical one: a free user who won't pay today isn't a dead end, they're a distribution channel.

---

## 7. Disclosure

Referral programs are promotions and need terms: reward amounts, qualification, the monthly cap, our right to withhold for fraud, whether credits expire, and that we may change or end the program. Link from every referral surface. Polar will ask for this if a dispute involves promotional credits.

---

## 8. Open questions

1. **GrowSurf plan cost** vs. the in-house build it replaces — get current pricing; it's a recurring cost against a pre-revenue runway.
2. **GDPR/DPA** — participant emails go to a third-party processor. Needs a DPA and a privacy-policy update.
3. **Referee reward generosity** — one free generation (recommended) vs. a credit grant.
4. **Mobile later** — their iOS/Android SDKs exist; confirm attribution survives the web→app transition before launching apps.
