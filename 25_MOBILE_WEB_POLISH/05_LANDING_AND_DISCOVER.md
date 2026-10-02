# 05 — Landing (`/`) and Discover (`/app`)

Surfaces: `apps/web/components/marketing/mobile/landing-mobile.tsx`, `mobile-hero.tsx`,
`mobile-feed.tsx`, and `apps/web/app/(app)/app/page.tsx`.

---

## 1. Current state

**Landing (`landing-mobile.tsx`)** renders, in order: hero carousel (3 featured) → "Search looks" pill →
chips + trending rail + 2-col masonry feed (18 items) → intent tiles → preset preview → how-it-works →
browse collections → FAQ → lime CTA → bottom nav.

**Discover (`/app`)** renders: new-user orientation *or* a "Continue" rail → Trending now → New looks →
Saved looks → Categories.

**Assessment.** The content model is right (this is the researched rail grammar, `02 §4`). The problems
are consistency and conversion mechanics, not structure:

1. Landing and `/app` use different card geometry, section-header type and spacing — the "seam" Krea
   avoids (`01 §3.1`).
2. The hero carousel has no visible pagination state parity with the researched pattern and no
   `aria-live`/roledescription semantics.
3. The "Search looks" pill is a link to `/explore`, not the search palette — a dead-end for users who
   want to type.
4. Sections have no `See all`, and rails have no peek/snap discipline.
5. Feed cards navigate or open a sheet inconsistently across surfaces (`04 §8`).
6. No skeletons: the feed pops in.

---

## 2. Landing — target composition

```
[header: logo · search · avatar/sign-in]
[hero carousel — 3 featured, full-bleed, 4:5, snap, dots]
[search entry — opens the search palette (T3), not a link]
[chips row — All + categories, sticky on scroll past the hero]
[trending rail — 6 cards + See all]
[masonry feed — 18 cards, infinite-ish with a "Show more" button]
[intent tiles — 4 "I want to…" entries]
[preset preview — one MP4 loop with a caption]
[how it works — 3 steps, numbered]
[browse collections — 2-col category tiles]
[FAQ — accordion]
[closing CTA — lime, full-width]
[bottom nav]
```

### 2.1 Hero carousel

- 3 items, full-bleed 4:5 media, snap-x mandatory, muted looping MP4 with a poster frame.
- Overlay: preset name (24 px display), one-line promise, `Use this look` lime button, and a
  `Preview` ghost that opens the quick sheet.
- Dots: 6 px, lime for active; `role="group" aria-roledescription="carousel"`, each slide
  `aria-roledescription="slide" aria-label="1 of 3"`.
- Autoplay of the *carousel* is off (only the video loops). Rationale: auto-advance steals control and
  fights `prefers-reduced-motion`.
- Reduced motion: video replaced by the poster image.

### 2.2 Search entry

Replace the `Link href="/explore"` pill with a button that opens the search palette (`04 §7`). Keep the
pill visual. Landing users who tap search want to type, not to browse a filtered grid.

### 2.3 Chips row

Becomes sticky beneath the header once the hero scrolls out (56 px, hairline bottom). Chip spec per
`03 §2.3`. Selecting a chip filters the masonry feed in place (current behaviour) — do **not** navigate.

### 2.4 Feed

- Masonry, 2 columns, 10 px gutters, native aspect ratios (`02 §2.1`).
- Card tap → quick sheet (already correct here).
- After 18 items, a `Show more looks` secondary button (not infinite scroll — infinite scroll on a
  marketing page hides the footer, FAQ and CTA, which carry conversion value).
- Skeleton grid on first paint (`03 §8`).

### 2.5 Conversion elements

- The closing CTA repeats the hero's primary action with the same label vocabulary.
- One — and only one — sticky element may appear on scroll: nothing, because the bottom nav already
  occupies that space on landing. A second docked CTA would collide (`04 §6`).

---

## 3. Discover (`/app`) — target composition

```
[app header: title "Discover" · credit chip · notifications · avatar]
[new user: orientation block  |  returning: Continue rail]
[Trending now — rail + See all → /explore?sort=trending]
[New looks — rail + See all → /explore?sort=new]
[Saved looks — rail + See all → /app/favorites]   (only when non-empty)
[Categories — 2-col tiles]
[bottom nav]
```

### 3.1 Orientation block (new users)

One card, not a multi-slide tour (`02 §6` rejects interstitial carousels):
- Title: "Pick a look, add a photo, done."
- Three numbered micro-steps on one line each.
- Primary: `Browse looks` → `/explore`.
- Dismissible; never returns once the user has one generation.

### 3.2 Continue rail (returning users)

Already implemented, including the `isDone ? /app/results/:id : /app/generations/:id` routing. Polish:
- In-progress items show an animated status pill and a relative age ("2 min").
- Failed items show a `Retry` affordance directly on the card.
- Cap at 6 + a `See all` to `/app/library`.

### 3.3 Credit chip

The header credit chip (`credit-balance-chip.tsx`) is the user's only persistent money signal on mobile.
Rules: always visible on `/app/*`; tapping opens `/app/billing/credits`; when balance < cheapest preset
cost, the chip turns to a warning treatment with the label "Low". Do not use red — reserve red for errors.

---

## 4. Rail grammar (applies to both surfaces)

Per `02 §4` and `03 §1.3`:
- Section header: title + `See all →`, 30 px above, 15 px below.
- Cards 156 px wide at 375 px, 4:5 media, ~15 % peek of the next card.
- `snap-x snap-mandatory`, momentum scrolling, no scrollbar.
- Rail has `aria-label`; cards are links with accessible names ("Cyber Punk, filter, 5 credits").
- Max 6 + terminal See-all card.

---

## 5. States

| State | Landing | Discover |
| --- | --- | --- |
| Loading | skeleton hero + skeleton feed | skeleton rails (3) |
| Empty catalogue | "New looks are on the way" + newsletter/FAQ | same + link to `/explore` |
| Offline | cached shell + offline banner, disabled CTAs | same |
| Degraded (generation paused) | banner: browsing works, generation paused | same, plus disabled create affordances |
| Error | `StateBlock` with retry, keeps header/nav | same |

---

## 6. Work items

| # | Item | Files |
| --- | --- | --- |
| 5.1 | Extract `MobileSection` + `MobileRail`; adopt in both surfaces | new `components/consumer/mobile/*`, `landing-mobile.tsx`, `app/(app)/app/page.tsx` |
| 5.2 | Search pill opens the palette | `landing-mobile.tsx`, `search-palette.tsx` |
| 5.3 | Carousel a11y + reduced-motion posters | `mobile-hero.tsx` |
| 5.4 | Sticky chips row, unified chip spec | `mobile-feed.tsx` |
| 5.5 | `Show more looks` instead of a fixed 18 | `mobile-feed.tsx` |
| 5.6 | Skeletons for hero, rails and feed | both + `loading.tsx` |
| 5.7 | Continue-rail retry + status pills | `app/(app)/app/page.tsx` |
| 5.8 | Credit chip low-balance state | `credit-balance-chip.tsx` |
| 5.9 | Normalise card geometry/typography across marketing and app | `product-card.tsx`, feed cards |

Acceptance criteria: `19 §3`.
