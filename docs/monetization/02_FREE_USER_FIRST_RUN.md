# Free User First Run — Zero-COGS Teaser

Status: **Proposal.** §4 decision is **settled: Option B** (owner, this revision).

---

## 1. The disagreement was narrower than it looked

The cost objection is correct and I under-weighted it initially. 100,000 free generations against a 5% conversion rate is a real, unfunded loss, and "give every signup a free generation" is advice for companies with a balance sheet. Dropping the 10-credit grant was the right call.

And the phasing the owner proposed — **zero-COGS now, real watermarked previews once profit covers it** — is exactly right. That is now decision (2) in `00 §1`.

So the plan agrees on: no free generations in Phase 1, paywall at the moment of maximum desire, blur, loading state, unlock modal, referral as the alternative path. **The only open question is one line of copy** — see §4.

Worth separating two things that got conflated:

- **"Don't spend money on free users"** → achieved by *not generating*. This is what saves the money.
- **"Make the user believe a generation already happened"** → achieved by the fake loading screen and disguised image. This saves nothing; it's a conversion tactic layered on top.

The cost constraint is fully satisfied without the second part. That's why the labelling question can be decided on its own merits rather than being forced by the budget.

---

## 2. Flow (Phase 1)

> Extended in `08 §1`: the same teaser also fires for **anonymous** visitors — the blur gate becomes the signup wall, and the `pending_generations` row is held against an anon session until claimed at signup. Mechanics, mitigations, and zero-COGS constraint are identical; only the auth timing and copy change.

```
Free user picks preset → uploads photo → presses Generate
   │
   │  NO provider call. Zero COGS.
   │
   └─ Teaser screen
        • Preset's reference artwork, blurred
        • Their uploaded photo shown alongside as "Your photo"
        • Unlock modal over it:
            – Pricing options (04)
            – "Or invite a friend to unlock your first look free" (03)
            – Dismissible
```

On unlock (payment *or* qualified referral): the real generation runs immediately with the already-uploaded source and params — a re-submit, not a re-upload. The user gets their genuine full-quality result within the normal generation time.

Keep the upload and params on the server the moment they press Generate, so unlock → result requires no further user input. That's the single biggest UX win in this flow and it works identically under either option in §4.

---

## 3. Cost model

The arithmetic that makes the case, with **placeholder inputs that must be replaced with real numbers**:

| Input | Placeholder | Source |
|---|---|---|
| Signups | 100,000 | owner's scenario |
| Preview cost (low-res, cheapest endpoint) | ~$0.03 | **unverified** — get from `provider_pricing` + a real fal invoice |
| Conversion, teaser-only | 3.5% | unknown |
| Conversion, real preview | 5.0% | unknown |
| ARPU | $10 | unknown |

- Phase 1 (teaser): COGS **$0**. Revenue ≈ 3,500 × $10 = **$35,000**.
- Phase 2 (real preview): COGS ≈ 100,000 × $0.03 = **$3,000**. Revenue ≈ 5,000 × $10 = **$50,000**.

On these placeholders the real preview looks better in aggregate — but **the $3,000 is spent before any of the $50,000 arrives.** Without capital, that sequencing *is* the problem, independent of the ratio. Which is precisely why Phase 1 is zero-COGS and Phase 2 waits for profit.

Two caveats on the numbers above: the conversion lift is assumed, not measured, and 100,000 signups presupposes acquisition spend that doesn't exist yet. Treat the whole table as a structure for plugging in real data, not as a finding.

---

## 4. Decision: teaser presentation — Option B

**Settled by the owner.** Phase 1 ships **Option B**: the blurred reference is presented as the user's generated result, with simulated progress stages. Rationale on record: the illusion that the work is already done adds motivation to unlock, and the alternative (funding real generations) is not affordable at current runway. The owner has accepted the risks below.

Both options remain implemented behind `FREE_TEASER_MODE` so the choice is reversible without a rewrite, and so it can be tested later if there's ever appetite for data on the delta.


### The two modes

| Mode | Behaviour |
|---|---|
| `implied` (**Phase 1, active**) | Blurred reference presented as the user's result, simulated progress stages |
| `labelled` | Same image and blur, carrying `Example result · not your photo` |

Identical engineering. One flag, one label.

### Risk register (for the record)

Accepted by the owner. Recorded here so the mitigations in the next section have a stated purpose, and so there's a written basis if a dispute is ever reviewed.

| Risk | Mitigated by |
|---|---|
| Users compare and notice every teaser is the same image | M1, M2 |
| Composition mismatch between upload and teaser gives it away | M2, M3 |
| Post-unlock result differs from the teaser → refund requests | M4, M5 |
| Refunds escalating into chargebacks on a new processor account | M5 |
| Written false factual claims carry more exposure than ambient implication | M6 |

### Mitigations

**M1 — Per-user variation.** Derive blur radius, zoom, and crop offset from `hash(user_id + product_id)` so no two users see an identical teaser. Cheap, and it removes the side-by-side comparison entirely.

**M2 — Match the upload's aspect ratio.** Crop the reference to the uploaded photo's aspect before blurring. Aspect mismatch is the single most obvious tell, and we already have the source dimensions (`lib/generation/output-size.ts` reads them for `match_source`).

**M3 — Composition gate.** Some references are structurally unlike a portrait upload — a full-body figure with large typography, for instance. Add a per-preset `teaser_eligible` flag and fall back to a generic branded placeholder where the reference would read wrong. Admin-controlled, defaults to on.

**M4 — Instant unlock delivery.** The `pending_generations` row (§6) means unlock → real result needs no further input. Shortening the gap between payment and the genuine image is the strongest single defence against "this isn't what you showed me."

**M5 — Generous, fast refunds.** A refund costs the transaction; a chargeback costs the transaction, a fee, and your dispute ratio. One-click refund on request for first-time unlocks, no questions asked. This is the highest-leverage item on the list — it converts the main residual risk into a small, bounded, known cost.

**M6 — Copy discipline.** Progress stages should describe activity ambiently (`Working…`, `Almost there…`) rather than asserting specific falsehoods (`Your image has been generated`, `Rendering complete`). Avoid claims in the unlock modal about what has already happened. Explicit written false statements are both the easiest thing to screenshot and the weakest position to defend; ambient implication is materially less exposed.

**M7 — Log everything.** Retain teaser impressions, unlock events, and delivered outputs per user. If a dispute arrives, being able to show the genuine result was delivered promptly after payment is most of the defence.

### Reversibility

`FREE_TEASER_MODE` stays a server-side flag, so switching to `labelled` is a config change rather than a rewrite — useful when Phase 2 lands (§5) and real previews make the question moot.

---

## 5. Phase 2 — real previews (post-revenue)

When the trigger in `00 §5` is met, flip `FREE_PREVIEW_ENABLED` and the same flow gains a genuine generation:

| Dimension | Preview | Paid |
|---|---|---|
| Resolution | ~512px long edge | Full selected size |
| Watermark | Burned in, diagonal wordmark | None |
| Download / Save / Regenerate | Locked | Enabled |

Enforcement is **server-side at signed-URL issue time**: a `preview` generation never yields a URL to a full-resolution asset. The watermark is burned into the stored bytes — a CSS overlay is removable in devtools and would be theatre.

---

## 6. Schema

```sql
ALTER TABLE public.profiles
  ADD COLUMN free_teaser_seen_at  TIMESTAMPTZ,
  ADD COLUMN free_unlock_source   TEXT  -- 'payment' | 'referral' | NULL
    CHECK (free_unlock_source IN ('payment','referral'));

-- Pending intent captured at Generate, replayed on unlock.
CREATE TABLE public.pending_generations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_version_id UUID NOT NULL REFERENCES public.product_versions(id),
  source_asset_id    UUID NOT NULL REFERENCES public.assets(id),
  params             JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_size        JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at        TIMESTAMPTZ,
  expires_at         TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);
CREATE INDEX idx_pending_generations_user ON public.pending_generations(user_id)
  WHERE consumed_at IS NULL;

-- Phase 2 only
ALTER TABLE public.generations
  ADD COLUMN delivery_tier TEXT NOT NULL DEFAULT 'full'
    CHECK (delivery_tier IN ('full','preview')),
  ADD COLUMN unlocked_at TIMESTAMPTZ;
```

`pending_generations` is what makes unlock feel instant, and it's needed under both options.

---

## 7. The unlock modal

Reuse `paywall-sheet.tsx` (it already has plan grouping and `useDialogA11y`). Add `context: "insufficient_credits" | "first_run_unlock"` so copy and the referral block vary without a second component.

Contents: value line → pricing (per `04` variant) → referral alternative → visible dismiss.

Constraints on what may appear here, including as experiment variants:

- Price prominent, with currency and billing frequency; never small grey text under a large "Free"
- No pre-selected most-expensive option
- Obvious close button; never non-dismissible
- No fake countdowns, no fabricated social proof
- Trial terms state the end date and the post-trial price adjacent to the button

These are also what Polar will expect if a dispute is ever reviewed.

---

## 8. Abuse control

One teaser per person. Cheap layers, since Phase 1 has no COGS to protect — the thing being protected is the *referral reward* and, in Phase 2, the generation budget.

| Layer | Mechanism |
|---|---|
| Account | `free_teaser_seen_at` |
| Email | Verified email required before unlock via referral |
| Fingerprint | IP + UA hash, **rate-limit only** — office/campus NAT makes hard blocks produce false positives |
| Phase 2 cost cap | Lowest resolution, cheapest endpoint |
| Kill switch | `FREE_PREVIEW_ENABLED=false` |

---

## 9. Open questions

1. **Real provider cost per low-res generation** — needed for the Phase 2 threshold. Unverified today.
3. **Does the teaser appear in Library?** Recommend yes, marked, as a standing reminder of an unfinished unlock.
4. **Referral-gated unlock generosity** — one free generation per qualified referral, or a credit grant? See `03 §1`.
