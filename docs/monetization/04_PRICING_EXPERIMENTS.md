# Pricing Experiments — Framework, Downsells, and the Annual Anchor

Status: **Proposal.** Build last (`00 §6`) — see §6. **Web only** per owner decision (`00 §1`).

---

## 1. Scope

Vary price points, packaging, discount framing, trial placement, paywall copy/layout, and referral reward size — segmented by audience (visitor, new free user, tenured user) and time-boxed, to learn before global rollout.

**Web only.** Mobile apps ship one fixed offer. Two reasons this is the right call: store review scrutinises pricing presentation closely, and Apple/Google mandate IAP for digital goods anyway, which constrains what you could vary there regardless. One caveat to manage: a user who sees $8 on web and $10 in the app will notice. Keep cross-platform deltas modest, or present the app price as the app price without implying it's the only one.

---

## 2. Architecture

**Assignment** — deterministic, sticky, server-side:

```ts
bucket = hash(experiment_key + ":" + subject_id) % 100
```

`subject_id` = `user_id` when signed in, else a first-party anon cookie id. Deterministic hashing rather than random-then-store: same answer on every render, no read-before-write race, survives caching. On signup, migrate anon assignments to the `user_id` so a visitor who converts keeps the offer they saw.

**Exposure ≠ assignment.** Log an exposure only when a variant is actually rendered. Everyone loading a page gets assigned; only people who saw the paywall were exposed. Analysing on assignment dilutes every effect toward zero — the most common way pricing tests produce false nulls.

```sql
CREATE TABLE public.experiments (
  key            TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','running','paused','concluded')),
  audience       JSONB NOT NULL DEFAULT '{}'::jsonb,
  variants       JSONB NOT NULL,   -- [{key, weight, config}] — config IS the ladder
  primary_metric TEXT NOT NULL,
  platform       TEXT NOT NULL DEFAULT 'web',
  started_at     TIMESTAMPTZ,
  concluded_at   TIMESTAMPTZ,
  winner         TEXT
);

CREATE TABLE public.experiment_assignments (
  subject_id       TEXT NOT NULL,
  experiment_key   TEXT NOT NULL REFERENCES public.experiments(key),
  variant_key      TEXT NOT NULL,
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_exposed_at TIMESTAMPTZ,
  PRIMARY KEY (subject_id, experiment_key)
);
```

Outcomes derive from `invoices` / `subscriptions` / `credit_ledger` joined on subject — no parallel events pipeline. The join key is variant attribution stamped into checkout metadata (§4).

---

## 3. Downsell ladders — correcting the earlier draft

The previous revision said "no re-rolling into a cheaper offer after they decline." **That was wrong as written**, and the pushback is correct. It conflated two different things:

| | Verdict |
|---|---|
| **Re-bucketing** a subject into a *different experiment variant* after they decline | **Still forbidden** — it destroys the inference. Their outcome can no longer be attributed to one arm, and you've made every metric uninterpretable. |
| **A downsell inside one variant** — decline → immediate discount offer | **Fine. Encouraged.** This is standard practice and a real revenue lever. |

The resolution: **a variant is an offer *ladder*, not a single price.** The sequence lives in `variants[].config`, so a user who declines and then sees 20% off has stayed in exactly one variant the whole time — inference intact, downsell shipped.

```json
{
  "key": "annual_anchor_with_downsell",
  "config": {
    "ladder": [
      { "stage": "primary",  "plans": ["annual_60", "monthly_10"] },
      { "stage": "downsell", "trigger": "dismissed_primary",
        "discount_code": "FIRST20", "plans": ["monthly_10"] }
    ]
  }
}
```

Polar has native discount support (`discounts_create`), so the downsell can be a real, server-issued discount rather than a bespoke price — which keeps the price-shown-equals-price-charged invariant intact for free (§4).

Guardrails that *do* still apply to ladders:

- **Frequency cap.** Don't show the downsell every session, or you train users to always decline first. Once per user, or once per N days.
- **Define "declined."** Modal dismissed? Navigated away? Pick one and log it — the ladder's trigger needs to be a real event, not a vibe.
- **Floor.** Set the lowest rung deliberately. A ladder with no floor becomes a race to your worst price.
- **Grandfathering.** Someone who took the downsell keeps that price on renewal, or you've built a churn trigger.

---

## 4. Guardrails

| Guardrail | Rule |
|---|---|
| **Price shown = price charged** | Variant resolves to Polar product/price ids **server-side**; the client never sends an amount. Discounts applied as Polar discount ids, not ad-hoc math. |
| **Sticky variant** | Once exposed, the subject keeps their variant — including after the experiment concludes. No price changing under a mid-funnel user. |
| **No cross-variant re-rolling** | §3. Ladders yes, re-bucketing no. |
| **Grandfathering** | Existing subscribers keep their price. Experiments target new purchases. |
| **Attribution** | Write `experiment_key` + `variant_key` + `ladder_stage` into the Polar checkout `metadata`, so it flows through the webhook into `invoices.metadata`. **This is the join key for all revenue analysis.** |
| **Kill switch** | Any experiment forced to `control` via config, no deploy. |
| **Platform** | `platform='web'`; mobile clients never receive variant config. |
| **Out-of-scope variants** | Fake urgency, fabricated social proof, hidden close buttons, pre-selected expensive options, obscured recurring terms. They may win short-term and cost the processor relationship (`02 §4`). |
| **Protected classes** | Never segment on anything correlated with a protected characteristic. Geography is defensible for purchasing-power reasons but interacts with VAT — Polar is merchant-of-record, so confirm how presentment currency interacts before testing it. |

---

## 5. The annual-anchor test

The transcript's advice — annual above monthly, framed as ~50% off, trial only on annual — is a real and widely-used pattern, worth testing. Randomising rather than shipping it globally is the right instinct.

`exp_paywall_annual_anchor`, audience: free users at the unlock modal.

| Variant | Layout |
|---|---|
| `control` | Current sheet — weekly trial + monthly |
| `annual_anchor` | Creator Annual first (`$10/mo — save 50%, billed $120/yr`), Creator Monthly below (`$20/mo`) |
| `annual_anchor_trial` | Same, plus free trial **only** on annual |
| `annual_anchor_downsell` | `annual_anchor` + 20% monthly downsell on dismiss (§3) |

Exact pricing, per-tier discount ceilings, and the mandatory credit-drip design are in **`06_ANNUAL_PLANS.md`** — the 50% headline is only safe on Creator, and a flat 50% across all tiers is loss-making on Studio and Agency.

**Primary metric: 30-day ARPU per exposed user** — not conversion rate. The pattern deliberately trades conversion for order value; measuring conversion alone will read a winner as a loser.

**Guardrails:** refund rate, chargeback rate, 60-day retention, trial→paid, support volume.

### What the transcript's math doesn't cover for 5Pixels

1. **Annual on a credit product is a 12-month COGS liability, not just cash** — and at a flat 50% it is *negative margin* on the upper tiers. Settled in `06`: tier-specific discounts, and credits **drip monthly** (mandatory — a single upfront grant on Agency Annual hands over ~$84.7k of provider cost on day one).
2. **Refund/chargeback exposure scales with ticket size**, and the processor relationship is brand new with onboarding incomplete (`05 §1`). Watch the guardrail metrics from day one.
3. **The $100 CAC is his number, not yours.** The payback argument is only as good as the CAC, and there's no acquisition spend yet. Until then the case for annual is cash flow and commitment, not payback math.
4. **"Trial only on annual" must be unambiguous.** Legitimate tactic; the adjacent pattern (trial toggles that flip products, large "Free" over small grey recurring terms) is a known rejection/chargeback generator. State the post-trial price and date next to the button.
5. **No annual plan exists.** `plans` has `weekly_trial`, `monthly`, `extra_credit` only. This needs new rows *and* new Polar products (`05 §3`), plus the drip decision in (1). Real work, not a layout variant.

---

## 6. The traffic caveat

**At pre-launch volume most of these cannot conclude.** Detecting a realistic pricing effect needs on the order of hundreds of *conversions* per arm — not visitors. Below that the test still produces a number, and the number is mostly noise.

Early on the framework's value is **infrastructure and discipline**: clean assignment, honest exposure logging, variant attribution stamped on every invoice. Sequencing:

1. **Now** — build assignment + exposure + attribution. Run one experiment at 100% `control` to prove the plumbing end to end, including that `variant_key` reaches `invoices.metadata`.
2. **Low traffic** — use it for **sequential rollouts**, not A/B: ship a variant to 100% of a narrow segment, compare to the prior period, accept weaker inference, and label it directional.
3. **Real traffic** — proper splits, pre-registered metrics, fixed runtimes.

Calling step 2 an "A/B test" is where teams start believing their own noise.

Also: pre-register the metric and runtime before starting, run full weekly cycles (weekday/weekend purchase behaviour differs enough to flip a day-4 read), and don't peek-and-stop on a fixed-horizon test — either fix the runtime or use a sequential design built for continuous monitoring.

---

## 7. First three experiments

| Order | Key | Audience | Tests |
|---|---|---|---|
| 1 | `exp_paywall_annual_anchor` | Free users at unlock modal | §5 |
| 2 | `exp_referral_reward_size` | Free users at unlock modal | Sizes the `03` liability |
| 3 | `exp_unlock_modal_order` | Free users at unlock modal | Pricing-first vs referral-first — which path free users take |

Sequentially, not concurrently — overlapping pricing experiments on one surface interact, and at this volume you won't separate the effects.
