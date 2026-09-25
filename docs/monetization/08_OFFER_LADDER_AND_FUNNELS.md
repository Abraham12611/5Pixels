# Offer Ladder & Funnel Engine — Triggers, Ladders, Variants

Status: **Proposal.** Decides *who sees which offer surface, when, and in what order*. Surfaces are defined in `07`; measurement and admin controls in `09`. Extends `02` (teaser) and `04` (experiments) — this doc is the runtime that ties them together.

---

## 1. The extended funnel — teaser moves before signup

The user's approved change: anonymous visitors can walk the whole studio flow *up to the result*. The blur gate now fires **pre-auth**, not post-signup. This is Option B (`02 §4`) extended one step earlier — same mechanics, same mitigations, no provider call either way.

```
Visitor (T0) browses freely → preset detail → uploads photo → Generate
   │
   ├─ pending_generation created against anon session (NOT user_id — §5)
   ├─ Simulated progress stages (ambient copy only — "Working…", never "Done")
   ├─ BlurredResultStage: blurred teaser + "Create an account to see your result"
   │      ├─ Sign up  ─────────────┐
   │      └─ Sign in (existing) ───┤
   ▼                              ▼
                     ┌── has credits? ──┐
                     │ yes              │ no / new user
                     ▼                  ▼
            charge + real gen      SpecialOfferTakeover
            (result delivered)     (ladder per assigned variant, §3)
                                        │ accept → checkout → credits → real gen
                                        │ referral step → referral path → unlock
                                        └─ all declined → back to blurred stage,
                                           teaser stays locked in Library (marked)
```

Consequences to note explicitly:

- **The teaser is now the signup driver.** Nothing costs COGS until auth+credits exist, which the zero-COGS rule already required — the change is pure funnel.
- Anonymous uploads mean we hold a stranger's photo before consent-signup. Treat it as `visibility=private`, auto-delete the asset + pending row after **7 days** (or on dismiss+`never`), and state the retention plainly in the upload zone. Privacy is a stated product pillar — don't quietly weaken it.
- On signup, the anon `pending_generation` is claimed to the new account (`02 §6` schema gains `anon_session_id UUID`, `user_id` becomes nullable). On unlock the real generation replays with zero re-input — the single biggest UX win, unchanged.
- Existing user signing in with credits → the pending gen runs immediately and charges normally. That's the highest-intent moment we'll ever get; don't interrupt it with offers.

## 2. Audiences & triggers

Audiences = `getUserTier()` + anonymous (`00 §2`), plus derived flags: `has_pending_teaser`, `churned` (cancelled sub ≥7d ago), `low_credits` (balance < median preset cost).

| Trigger | Audience | Surface | Notes |
|---|---|---|---|
| `teaser_blur_shown` (implicit) | T0 | S8 blur gate | Always; not an offer step itself |
| `signup_completed_no_credits` | new T1 | S7 takeover | The canonical entry — fires once, on the return from auth |
| `generate_blocked_no_credits` | T1 | S6 paywall sheet (context `first_run_unlock`/`insufficient_credits`) | Post-takeover visits use the lighter sheet |
| `exhausted_mid_flow` | T3 | S6 (context `insufficient_credits`) + S9 top-up option | Paid-exhausted get top-up, not the full ladder |
| `pricing_page_view` | T0/T1/T3 | S5 + optional S1 ribbon | Page itself *is* the offer; no takeover on top |
| `promo_slot` (ambient) | T0/T1 | S3 tile, S4 banner, S1 ribbon | Randomized per campaign targeting — **the only promo inventory anonymous visitors get** (settled: no pre-auth takeovers, §9) |
| `scheduled_takeover` | T1 non-upgraded | S7 | The "random popup" — signed-in only, capped hard (§6) |
| `declined_step` | any | next ladder step | In-session cascade (§4) |
| `churn_winback` | churned | S7 with discount step | Future phase |
| `low_credits` | T2 | S10 nudge + S9 | Never a takeover |

**Never interrupt:** active checkout, a running/pending real generation, billing pages, delete-account flows, or anyone who hit the frequency cap.

## 3. The ladder model

An offer is presented as an ordered **ladder** of steps inside one takeover. Each step re-skins the same surface (S7/S6) rather than stacking modals.

Step types (`offer_kind`):

| Kind | Content | Backing |
|---|---|---|
| `weekly_pair` | Two `TrialBanner`s — Weekly Starter $5 / Weekly Plus $10, one-time framing | `plans` weekly_trial rows |
| `discount` | Plan ladder with a Polar %-off applied + `OfferBadge` + real `ends_at` | `promo_steps.payload.discount_id` |
| `plans` | Plan ladder, annual-forward (`07 §4` S7 format) | `plans` monthly+annual |
| `referral` | `ReferralCard` — "refer a friend, get N credits when they join" | `03` |
| `topup` | `TopUpSheet` content inline | pay-what-you-want product |
| `exit` | Soft close: `Your result will be waiting` + reminder of teaser | — |

A **campaign** is a named ladder definition: ordered steps + audience + caps. A **variant** is a different ordering/emphasis of the same offer inventory for A/B.

### Variant matrix (starting set)

| Variant | Step order | Hypothesis |
|---|---|---|
| `A_default` | weekly_pair → referral → plans | Cheap entry first converts budget-anxious new users |
| `B_referral_first` | referral → weekly_pair → plans | Free-path-first builds goodwill; tests referral as opener |
| `C_money_only` | weekly_pair → plans → *(decline)* → referral | Referral as pure downsell keeps money offers clean |
| `D_plans_first` | plans(annual-anchored) → weekly_pair → referral | Anchoring high first lifts ARPU even on downgrade |
| `control` | plans only | Baseline for lift measurement |

Rules from `04` still bind: a user is assigned **one campaign + one variant**, sticky server-side; declines move *within* the ladder, never re-bucket into another variant; price shown = price charged.

## 4. Decline cascade & session rules

```
Step n shown ── accept → checkout/flow
             ── decline (✕ / "Not now") → step n+1 renders in place (cross-fade)
             ── dismiss at last step → takeover closes → cooldown starts
```

- Max **3 steps** per takeover session. If all declined, close to context — no infinite downsell.
- After **2 full declined takeovers** (any campaign) → global cooldown `72h`; after 3 → `14d` + suppress `scheduled_takeover` entirely (they've told us).
- A user who clicks `Never show again`-equivalent (add to dismiss menu as `Don't show offers`) → `offers_opted_out=true`; only `insufficient_credits` sheets survive (functional, not promotional).
- Accept at any step ends the ladder; partial success (e.g. weekly trial bought) still counts as conversion for the campaign.
- Decline is **not** recorded as rejection of the *product* — the teaser stays parked in Library marked `Locked`, which is itself a re-entry point.

## 5. Anonymous → known identity

- `anon_session_id`: first-party cookie set at first upload (not before — casual browsing stays cookieless beyond essentials).
- `promo_assignments` and `promo_events` accept either `anon_id` or `user_id`; a `claim` step on signup rewrites anon rows to the user, preserving the pre-auth impression chain for measurement.
- Assignment for anonymous users: random-at-first-trigger, persisted by cookie → merged on claim. Deliberately not fingerprinted — attribution accuracy isn't worth fingerprinting strangers.

## 6. Frequency caps (defaults; admin-editable in `09`)

| Cap | Value |
|---|---|
| Takeover per user per day | 1 |
| Takeover per anon session | 1 |
| Same campaign re-show after full decline | ≥72h |
| `scheduled_takeover` lifetime max | 3 |
| Ambient promo tiles | ≤1 per 12 grid tiles, never consecutive |
| PromoRibbon | 1 campaign at a time, dismissal scoped to campaign |
| Discount offers | expire via real `ends_at`; no per-user fake deadlines |

## 7. Discount mechanics (Polar)

- Discounts are Polar `discounts` resources created per campaign (`percent`/`fixed`, optional `max_redemptions`, `ends_at`). Step payload references `discount_id`; checkout applies it and stamps `checkout.metadata.campaign_id/variant/step` alongside the experiment metadata from `04`.
- Guardrail: discount floor — no step may price a plan below **50% of catalog** or below per-plan COGS floor (`06` margin math); enforced when saving a step in admin.
- Never leak the discount in URLs (`?discount=` params) — application is server-side via the assigned step, so prices can't be shared/cached wrong.
- **Deadline display is admin-configurable** (settled, §9): each discount step carries `deadline_display: 'none' | 'date' | 'countdown'`. `date` renders `Offer ends Friday, Oct 3`; `countdown` renders a real ticking timer bound to `ends_at` — no fake or resetting clocks, ever. Editable per step in the admin editor (`09`).

## 8. Failure & edge behavior

- Offer fetch fails → render nothing (fail silent), log. A broken promo must never break the app.
- Checkout cancel → return to the same ladder step (state survives; it's the assigned variant).
- Webhook lag after success → success page polls (§11 in `07`); never tell the user to "wait for webhook".
- `offers_opted_out`, frequency-capped, or paid-active users hitting a trigger → route to the functional surface (S6/S9) or nothing — never the takeover.

## 9. Resolved decisions

1. **Pre-auth inventory is ambient-only** (owner-approved): anonymous visitors see S1 ribbon, S3 tiles, S4 banner — never the S7 takeover. The takeover's canonical entry is `signup_completed_no_credits`; a popup demanding signup *and* payment at once converts worse than letting signup be the gate and the offer be the reward for clearing it.
2. **Deadline display is admin-controlled**: `deadline_display: 'none' | 'date' | 'countdown'` per discount step (§7). All modes require a real `ends_at`.
3. Churn win-back discount sizing — deferred to first real churn cohort.
