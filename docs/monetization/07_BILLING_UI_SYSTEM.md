# Billing & Promo UI System — Surfaces, Components, Visual Spec

Status: **Proposal.** The UI layer for everything in `00`–`06`. Grounded in the `new-design-look/` bible (tokens in `09_IMPLEMENTATION_SPEC_TOKENS.md`) and the Higgsfield references in `new-design-look/reference-images/new-references/` — analyzed below — plus patterns pulled from Refero research on ~40 products' billing/pricing/promo screens.

Companion docs:

- `08_OFFER_LADDER_AND_FUNNELS.md` — *when* each surface appears, for whom, in what order
- `09_PROMO_ADMIN_AND_METRICS.md` — admin control surface + measurement

---

## 1. Reference analysis — what Higgsfield actually does

From `new-references/` (desktop pricing + mobile special-offer paywall + anon homepage + blur gate). These are the patterns to adapt, not copy:

### 1a. Mobile full-screen "Special Offer" paywall (`1000863717/748/750/752.jpg`)

Top→bottom anatomy of a single scrolling takeover:

| Zone | Pattern |
|---|---|
| Hero | Full-bleed generated artwork, dark gradient scrim, floating `21% OFF` chip + `SPECIAL OFFER` italic display headline |
| Trust | `Highest Trustpilot rating — among leading GenAI companies` one-liner |
| Plan ladder | **Stacked radio-rows, not cards** — one plan per row: name + cadence line left, price chip right; radio circle at far left |
| Default state | The *discounted* row is pre-selected (lime radio dot), carries a colored header tab (`Most Popular`, `Best Value + 21% OFF`) and a tinted row background |
| Price framing | Strikethrough anchor inline (`$29` → `$23/mo, billed annually`), price chip shows the **monthly-equivalent** with `per month` under it |
| One-time access | Bright blue banner mid-ladder: `$3 ONE-TIME ACCESS · SPECIAL` + contents + own CTA — a separate mini-offer inside the takeover |
| Fine print | Grey multi-line disclaimer under the CTAs (taxes, access scope) |
| Proof tail | `What's included` two-column comparison table (✓/✕/quantities, recommended column tinted), `See full comparison` expander, unlimited-models carousel, partner logos, `COMMUNITY OF 25 MILLION CREATORS` review cards |
| Sticky CTA | Bottom-pinned `Get Pro Plan 21% OFF` button echoing the selected row |

### 1b. Desktop pricing page (Screenshots 4.49–4.57)

| Zone | Pattern |
|---|---|
| Promo ribbon | Full-width lime bar **above** the nav: `Get an additional discount on premium plans after signing up` + inline `Get your discount` button + dismiss ✕ |
| Nav badge | `Pricing` nav item carries a pink `30% OFF` micro-badge |
| Hero banner card | Big rounded card: `SPECIAL 30% OFF` pink tag + benefit headline + `from $5` anchor — promo as artwork, not a system banner |
| Segmented tabs | `Individual plans / Business plans` |
| Cadence toggle | `Monthly / Annual` pill; the Annual half carries a `30% OFF` badge; toggle thumb is lime |
| Plan cards | 3–4 cards, **each tier with its own accent tint** (Basic = plain charcoal, Pro = olive-green wash, Max = dark pink wash + `BEST VALUE` tag) |
| Card anatomy | Plan name → tagline → `X credits/mo` headline → per-unit equivalence lines (`= 60 gens`) → price → CTA in the *tier's* accent color (white / lime / pink gradient) |
| Annual mode diff | Per-card `% OFF` badges appear, strikethrough monthly price, `Save $72 compared to monthly` line under the CTA |
| Feature tail | `UNLIMITED & FREE GENS` per-model rows with ✓/✕ and resolution badges, parallel-generation counts, checklist |

### 1c. Anonymous surfaces (Screenshots 4.39/4.40)

- **Homepage promo cards**: interleaved in the content grid (`100% CASHBACK`, `PRODUCTION SKILLS BUNDLE`) — promo inventory inside product surfaces, not just banners.
- **`SIGN UP AND GET YOUR EXTRA DISCOUNT` banner card**: dark card, benefit checklist, lime `Sign up and get your discount` CTA.
- **Blur gate**: `Create an account to see generated image` — reference image blurred to abstraction, dark overlay, headline + sub + single lime `Sign up for free` + quiet `Already have an account? Sign in`. Note our copy differs (`08 §2`): no "for free".

### 1d. Refero patterns worth adopting

| Product | Pattern | Adapt for |
|---|---|---|
| FlowMapp | Centered upgrade modal, blurred backdrop, billing toggle + full-width promo banner *inside* the modal | `PaywallSheet` v2 |
| X Premium | 3 cards + annual/monthly toggle, savings badges, top tier highlighted | Pricing grid |
| Mercury | Modal plan-chooser with close, sticky contact footer | Takeover dismiss + support link |
| Navan | Promo modal: image header + `limited time` badge + `Claim offer` CTA | `SpecialOffer` compact variant |
| Exa | Billing page: balance card + top-up + auto-recharge + invoices + plan card side column | `/app/billing` layout |
| ClassPass / Fable | Referral page: `Give X, Get Y` framing, copyable link, share buttons, status list | Referral surfaces |
| Open | "Credit Store": `Special Offers` row above plain packs | Top-up sheet ordering |
| Suno | "Listen for Credits" earn-loop | Referral earn framing, task-style reward UI |
| iOS paywalls (Ivory, DailyArt, TikTok) | Stacked plan cards, savings badge on annual, big trial CTA, restore/terms footer | Mobile sheet variant |

**What we deliberately do NOT copy:** neon-all-over saturation (our lime stays a *signal*), Trustpilot claims we can't back, "for free" copy that isn't true, model-name feature rows (we don't expose models), the fake countdown genre.

---

## 2. Surface inventory

Every billing/promo surface, classified by how it's entered. `08` owns the triggers and ordering; this doc owns what each surface *is*.

| # | Surface | Class | File (new/extends) |
|---|---|---|---|
| S1 | `PromoRibbon` — top-of-page announcement bar | ambient | new |
| S2 | Nav `Pricing` item + `X% OFF` micro-badge | ambient | `app-header*.tsx` |
| S3 | Grid promo card (interleaved in Discover/Explore) | ambient | new `promo-tile.tsx` |
| S4 | Signup-discount banner card on landing/discover | ambient | new `signup-offer-banner.tsx` |
| S5 | `/pricing` page | destination | `app/(marketing)/pricing/page.tsx` |
| S6 | `PaywallSheet` — contextual paywall (blur-gate, insufficient credits, plan-gated preset) | triggered | `paywall-sheet.tsx` (extend) |
| S7 | `SpecialOfferTakeover` — full-screen offer ladder | triggered | new `special-offer-takeover.tsx` |
| S8 | `BlurGateOverlay` — anon teaser result gate | triggered | new (result-stage overlay) |
| S9 | `TopUpSheet` — credit top-up incl. custom amount | triggered | new `top-up-sheet.tsx` |
| S10 | `LowCreditNudge` — inline warning at low balance | ambient | new (banner in studio/header) |
| S11 | Checkout return states (success/pending/cancel) | destination | checkout success page |
| S12 | `/app/billing/*` — plan, credits, history, referral | destination | existing pages + referral tab |
| S13 | Post-purchase confirmation + credit toast | triggered | toast + success page |
| S14 | `ReferralCard` — give/get block reused inside offers + billing | embed | new `referral-card.tsx` |
| S15 | Exit/decline downsell step | triggered | step inside S7, not separate |

Hard rules across all triggered surfaces (from `02 §7`, extended):

- Price, currency, and cadence adjacent to the CTA; price shown = price charged.
- Every takeover/sheet has a visible close affordance *and* Esc/backdrop dismissal. Nothing is non-dismissible.
- No fake countdowns, no fabricated ratings/social proof, no "X people are viewing this".
- One selected-by-default is allowed **only** in the ladder row format (S7) — and only the discounted/recommended option (see §4.3).
- Annual claim math must be real: `Save $X vs monthly` is computed from catalog prices, never hardcoded.
- Promo surfaces never fire over: checkout, billing settings, the success screen, or a pending generation.

---

## 3. Shared building blocks

New primitives, all in `apps/web/components/billing/` (or `components/promo/` — pick one folder, `promo` suggested):

| Component | Role |
|---|---|
| `PlanRow` | Radio-selectable plan row: name, cadence line, feature bullets (≤3), price chip, optional header tab. Selected = accent border + filled radio + tinted surface. |
| `PlanCard` | Desktop card variant of the same data (name, tagline, credits headline, equivalence line, price, CTA). |
| `PriceChip` | Right-aligned price block: optional strikethrough anchor above, big number, `per month`/`one-time` caption. Selected state inverts to accent fill. |
| `OfferBadge` | `X% OFF` / `SPECIAL` / `BEST VALUE` / `MOST POPULAR` micro-tag; two fills: `--color-promo` (discount) and `lime` (recommendation). |
| `SaveLine` | `Save $X compared to monthly` subline under annual CTAs. |
| `CadenceToggle` | `Monthly / Annual` pill with savings badge on the Annual half; **default = Annual** everywhere it appears. |
| `TrialBanner` | Blue/accent inline offer (`Weekly Starter — $5 one-time`), contents line, own CTA. The "one-time access" slot. |
| `CompareTable` | Two/three-column ✓/✕/value table with tinted recommended column + `See full comparison` expander. |
| `TrustLine` | Single honest proof line (real review quotes, real counts — see §7). |
| `ReferralCard` | Give/get explainer + copy-link + share row + pending-invite count. |
| `BlurredResultStage` | Result-stage frame: blurred media + scrim + overlay slot (used by S8). |
| `CreditToast` | `+300 credits` confirmation toast w/ five-pixel flourish. |

### New token — `--color-promo` (settled)

The bible locks `lime-500` as *the* signal color and the badge set is deliberately pruned. Offers get a second accent so that **`lime` always means "do the thing" and `promo` always means "this is a deal"**:

```css
--color-promo: #FF4D96;        /* discount badges, SPECIAL tags, offer accents */
--color-promo-soft: oklch(... / 0.15);  /* tinted surfaces for offer rows */
```

Owner-approved: magenta fits the lime/olive/cream palette and matches the reference grammar (their pink tags). Lime is never the discount badge; promo is never a button.

Per-tier card accents (desktop pricing page): keep surfaces charcoal; differentiate tiers with **tinted top-border wash + accent CTA** — `Creator`: neutral/cream CTA, `Pro`: lime, `Studio`: promo-pink gradient, `Agency`: cream-outline "Contact-style" treatment. Restrained version of the reference's per-card hues.

---

## 4. Surface specs

### S5 — `/pricing` page (desktop, 1440)

Order, top→bottom (extends the bible's `01_PRICING.md` PR-01–05, which specified a Free tier — superseded, we have no free tier):

1. `PromoRibbon` slot (S1) — only when an active campaign targets `pricing_page`.
2. Hero: `Choose the plan that fits your creativity.` + one subline on credits.
3. `CadenceToggle` — **Annual pre-selected**, `SAVE UP TO 50%` badge.
4. Plan card row (Creator / Pro / Studio / Agency), Pro = `BEST VALUE` tag + lime CTA. Each card: name → tagline → credits/mo → equivalence line (`≈ N transformations/mo` at median preset cost — compute, don't hardcode) → price block (annual mode: strikethrough monthly + monthly-equivalent + `billed annually` + `SaveLine`) → CTA.
5. `TrialBanner` strip: `Try it first` — both weekly trials as two compact offers with own CTAs.
6. `TopUpSheet` teaser row: `Just need credits? Top up any amount →`.
7. `CompareTable` (bible PR-03/04 geometry).
8. FAQ (bible PR-05) + quiet final CTA.

**Annual anchoring is the default presentation, not a variant** — the toggle defaults to Annual and the "Save" math is always visible. A/B variants may *reorder or restyle* this page, but the anchored pair (`$20` struck → `$10/mo billed annually`) is baseline per owner direction.

### S7 — `SpecialOfferTakeover` (the money surface)

Full-screen route-level overlay (`position: fixed; inset: 0`, own scroll), used for both anon-adjacent offers and the post-signup ladder. Mirrors the mobile reference structure:

```
┌─ Hero: preset artwork bg + scrim + [X% OFF] + SPECIAL OFFER headline + TrustLine
├─ Plan ladder (vertical PlanRow stack — order & steps come from the assigned variant, 08 §3)
│    row = name · cadence/billing line · ≤3 bullets · Learn-more expander · PriceChip
│    discounted/recommended row: pre-selected, header tab, tinted bg
├─ TrialBanner (one-time weekly access) — position is variant-controlled
├─ Fine print (billing terms, taxes, credits model — honest version of the reference's grey block)
├─ CompareTable (collapsed → expander) + reviews strip + partner logos IF real
└─ Sticky footer: echo CTA for selected row + "No thanks" dismiss
```

Behavior: mounts with `--ease-drawer` 250ms rise; every step change re-renders the ladder content in place (no stacked modals); scroll position resets per step; `Escape`, backdrop-adjacent ✕, and `No thanks` all = decline event → next ladder step per `08 §4`.

### S6 — `PaywallSheet` v2 (contextual)

Extend existing component with `context` prop: `"insufficient_credits" | "first_run_unlock" | "gated_preset" | "teaser_unlock"`. Changes:

- Add compact `PlanRow` ladder (2–3 rows) instead of current card list — weekly rows first when `context` calls for cheap entry.
- Optional `ReferralCard` block (variant-controlled).
- Optional `TrialBanner`.
- Header gets value line + optional `OfferBadge`.
- FlowMapp pattern: promo banner strip *inside* the sheet when an active discount applies.

### S8 — `BlurredResultStage` (anon gate)

The `Create an account to see generated image` clone, on our terms:

- Stage shows the preset's reference result processed per `02 §4` mitigations (per-user blur/crop derivation, aspect-matched to their upload).
- Overlay: headline `Create an account to see your result` → sub `Sign up to reveal it` (never "for free") → lime `Sign up` → `Already have an account? Sign in`.
- Their uploaded photo is *not* shown next to the teaser (composition-mismatch mitigation) — show a small `Your photo` thumbnail chip instead.
- Component lives on the result stage, not as a modal — the blur IS the backdrop.

### S9 — `TopUpSheet`

Open pattern (`o-p-e-n.com` credit store): `Special offers` row (a discounted pack if a campaign applies) above plain `Pay what you want` custom-amount card + quick amounts. Polar `pay-what-you-want` product already exists in sandbox (`e5538d76…`).

### S1/S3/S4 — ambient promo surfaces

- `PromoRibbon`: lime bar above nav, single line + inline CTA + dismiss. Dismissal is **campaign-scoped** (cookie + `promo_events`), not global.
- `PromoTile`: square card that sits inside Discover/Explore grids, artwork bg + `SPECIAL` tag + one-line offer + CTA. Occupies one grid cell, never more than 1 per 12 tiles.
- `SignupOfferBanner`: the `SIGN UP AND GET YOUR EXTRA DISCOUNT` card — anon-only, benefit checklist, lime CTA.

### S11/S13 — checkout return

- `/checkout/success`: success state polls credit balance; shows `+N credits` and `Your result is ready →` deep-link when the purchase was a `teaser_unlock` context (the pending generation auto-fires server-side — `02 §6`).
- Failure/cancel → returns to the context that launched checkout, preserving the ladder step.
- **Credits never grant on redirect** — webhook only (`05`). The success page must tolerate the webhook lagging a few seconds (poll, don't panic).

### S12 — `/app/billing` layout (Exa pattern)

Left settings rail (existing) + main column: `Plan card` (current plan, renews-at, upgrade/manage → Polar portal) · `Credits card` (balance, `Top up`, auto-reuse notice — no auto-recharge in v1) · `ReferralCard` · `History table` (invoice-like rows: date, plan, credits, status). Weekly trial users see `trial ends` + `upgrade to keep going` inline.

---

## 5. Motion & responsive notes

- Takeover/sheet enter: `transform: translateY(12px) scale(.98) + opacity`, 250ms `--ease-drawer`; exit ~150ms.
- Ladder step transitions: content cross-fade only (opacity ≤200ms), no sliding — a moving modal reads as instability.
- `PlanRow` selection: instant radio fill + 150ms border/surface tint; `active:scale-[0.96]` on all pressables.
- `prefers-reduced-motion`: opacity only.
- Mobile: S7 is already a full-screen scroller (its natural form); S6 becomes a bottom sheet; `PlanRow` collapses bullets to `Learn more` expander (exactly the reference pattern); comparison table falls back to recommended-column-only with a plan switcher.
- S8's blur must be heavy enough to defeat detail extraction: `blur(28px) saturate(1.2) brightness(0.8)` minimum at stage scale, plus scrim. Blur is applied to a **server-rendered derivative** (pre-blurred thumbnail), not a CSS blur over the real asset — the real asset URL must never reach the client pre-unlock.

## 6. Copy register additions

Canonical additions: `Special Offer`, `Best Value`, `Most Popular`, `per month, billed annually`, `Save $X compared to monthly`, `Try it first`, `Top up`, `Refer a friend`, `Your photo`, `See your result`.

Banned still applies (no prompt/model/provider terms) **plus**: `free` as a noun for anything that costs money, `unlimited` for anything capped, fake urgency (`ends soon` without a real deadline), `No thanks, I hate saving money`-class confirm-shaming. Dismiss copy is neutral: `Not now`, `Maybe later`.

## 7. Truth-in-advertising line

Every proof element must be literally true at render time: review quotes come from a curated `testimonials` table we populate with real user quotes, counts are queried (`COMMUNITY OF N` only above a threshold), `% OFF` is computed, `limited time` requires a real `ends_at`. This is both ethics and Polar-dispute hygiene — fake social proof in a paywall is screenshot-able and indefensible.
