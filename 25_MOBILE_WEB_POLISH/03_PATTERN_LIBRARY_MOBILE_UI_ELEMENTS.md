# 03 — Mobile UI Element & Pattern Library

The canonical vocabulary for 5Pixels mobile web. Every surface spec in `05`–`14` composes elements from
this file; if a surface needs something not listed here, it is added here first.

Tokens referenced are the existing ones in `apps/web/app/globals.css` (see `00 §0.6`). Nothing here
introduces a new colour.

---

## 1. Layout primitives

### 1.1 The mobile page frame

```
┌─────────────────────────────┐
│ safe-area top               │
│ App/marketing header  56px  │  sticky, may be transparent over media
├─────────────────────────────┤
│ scroll region               │
│  · page title block         │
│  · sections (20px gutters)  │
│  · bottom spacer 96–112px   │  clears nav + docked bar
├─────────────────────────────┤
│ docked action bar (opt) 64px│  fixed, only on commitment surfaces
│ bottom tab nav          64px│  fixed
│ safe-area bottom            │
└─────────────────────────────┘
```

Rules:
- Horizontal page gutter: **20 px** (`px-5`). Full-bleed media may break the gutter; text never may.
- Vertical rhythm between sections: **30 px**; inside a section: **15 px**; inside a card: **10 px**.
- The scroll region must end with a spacer equal to `nav + docked bar + env(safe-area-inset-bottom)`.
  Today several pages use a hard-coded `pb-24`; replace with a shared `MobilePageBottomSpacer`.

### 1.2 Section header

Left: title (20 px / 600, `--color-text-primary`). Right (optional): `See all →` (13 px,
`--color-text-secondary`, 44 px hit area). No subtitle unless the section is unfamiliar.

### 1.3 Rails (horizontal scrollers)

- `overflow-x-auto`, `snap-x snap-mandatory`, items `snap-start`, 10 px gap.
- The next card must **peek ~15 %** at the right edge — the only scroll affordance we use.
- Never nest a rail inside a horizontally scrollable parent.
- Rails must expose an accessible name (`aria-label="Trending looks"`) and be keyboard scrollable.
- Max 6 items + a terminal "See all" card.

### 1.4 Grids

| Context | Grid | Aspect |
| --- | --- | --- |
| Exploration (`/explore`, landing feed) | 2-col masonry, 10 px gutter | native |
| Owned collections (`/app/library`, `/app/favorites`) | 2-col uniform | 4:5 locked |
| Preset examples | 3-col uniform | 1:1 |
| Category tiles | 2-col uniform | 3:2 |

---

## 2. Navigation elements

### 2.1 Bottom tab bar (`mobile-bottom-nav.tsx`)

Five slots, centre = Create. Height 64 px + safe area. Icons 22 px, labels 10 px/500. Active = lime icon
+ `--color-text-primary` label; inactive = `--color-text-secondary`. Centre action is a 52 px lime disc
raised −24 px with a 4 px `--color-ink-950` ring so it reads as elevated over content.

Required behaviours (several missing today):
- `aria-current="page"` on the active item.
- Active state must match **route prefixes**, not exact equality (`/app/library/x` still highlights
  Library).
- Hidden on: `/app/create/[slug]` while a docked Generate bar is present, full-screen overlays, and
  `/s/[shareId]`.
- Never animates on route change beyond a 120 ms colour transition.

### 2.2 Headers

Three header variants only:

1. **Marketing header** (`/`, `/explore`, `/pricing`, `/presets/*` when logged out): logo, search,
   avatar/sign-in, menu trigger.
2. **App header** (`/app/*`): contextual title, credit chip, notifications, avatar.
3. **Immersive header** (result viewer, full-screen overlays): no bar — floating circular controls over
   the media (Meta AI pattern, `01 §2.1`).

Back semantics: any surface entered from a list shows a **labelled** back (`← Library`), not a bare
chevron (Lensa, `01 §1.1`).

### 2.3 Chips

| State | Fill | Text | Border |
| --- | --- | --- | --- |
| Selected | `--color-lime-400` | `--color-ink-950` | none |
| Default | transparent | `--color-text-secondary` | 1 px `cream-100/10` |
| Disabled | transparent | `--color-text-muted` | 1 px `cream-100/5` |

Height 36 px, min tap area 44 px (use vertical padding on the wrapper), radius full, 13 px/500 label.
Rows scroll horizontally, never wrap, first chip is `All`, and the selected chip scrolls into view on
mount.

---

## 3. Overlay tiers

Defined in full in `15`. Summary:

| Tier | Use | Height | Dismiss |
| --- | --- | --- | --- |
| **T1 — Action sheet** | 2–6 choices, destructive confirms | content height, ≤50 dvh | tap scrim, swipe down, Cancel, Esc/Back |
| **T2 — Content sheet** | quick view, share, filters, notifications, auth | 60–92 dvh, scrollable body | handle drag, scrim, X, Esc/Back |
| **T3 — Full-screen overlay** | search palette, image viewer, filter modal | 100 dvh | X, Esc/Back, (viewer: swipe down) |

Never stack more than two tiers. A T2 that needs another T2 replaces it (with a labelled back) instead.

---

## 4. Buttons & actions

- **Primary (brand):** lime fill, ink text, 48 px tall, full-width on mobile, radius 12 px, 15 px/600.
- **Secondary:** `--color-charcoal-800` fill, primary text, 1 px `cream-100/10`.
- **Ghost:** transparent, `--color-text-secondary`.
- **Destructive:** transparent fill, red-500 text; only inside confirm sheets.
- **Icon button:** 44×44 minimum; over media, a 40 px translucent disc (`ink-950/60` + backdrop blur).
- Disabled primaries must be accompanied by a reason line beneath ("Add a photo to generate").
- Pending state: label swaps to the progressive form ("Generating…") with a 16 px spinner; width is
  reserved so the button does not resize.
- **One primary per viewport.** If a surface appears to need two, one of them is secondary.

### 4.1 Docked action bar

Used on commitment surfaces. Composition: 1 px top hairline, `ink-950/90` + backdrop blur, 15 px padding,
`env(safe-area-inset-bottom)` respected. Contains, in order: optional cost/context line (13 px,
secondary), then the primary button. Cost is always inside or directly beside the CTA
(`Generate · 5 credits`).

---

## 5. Cards

### 5.1 Preset card (media-first)

Radius 15 px, media fills the card, a bottom gradient scrim, title (14 px/600) and 1–2 meta chips
(type, credit cost) over the scrim. Favourite heart at top-right (44 px hit, stops propagation).
Autoplaying preview video is **muted, `playsinline`, `loop`, poster-first**, and only plays when
≥50 % visible and `prefers-reduced-motion` is not set (`17 §5`).

### 5.2 Result/library card

Uniform 4:5, status pill at top-left when not complete (`In progress`, `Failed`), preset name and
relative time beneath the media, overflow (`⋯`) at top-right opening a T1 action sheet.

### 5.3 Row card (billing, notifications, settings)

56 px min height, leading icon/thumbnail 32 px, title 15 px, supporting 13 px muted, trailing value or
chevron. Whole row is the tap target.

---

## 6. Inputs & forms

- One field per row; label above (13 px, secondary); 48 px field; radius 12 px; 16 px font to prevent
  iOS zoom-on-focus (non-negotiable).
- Correct `type`, `inputmode`, `autocomplete`, `enterkeyhint` on every field.
- Errors: inline below the field, 13 px red, `aria-describedby`, plus `aria-invalid`. Never only a toast.
- Schema-driven preset controls: select → bottom sheet picker (not a native `<select>` when >5 options);
  slider → 44 px thumb with a live value chip; toggle → row with label + description.
- The keyboard must never cover the field being edited: focused fields scroll into view with
  `scroll-margin-bottom` sized for the docked bar.

---

## 7. Feedback elements

- **Toast:** dark pill, 1 line, optional single action (`Undo`), anchored above the tab bar, auto-dismiss
  5 s, `role="status"`. Reversible/low-stakes only.
- **Inline banner:** for surface-level degraded or warning states (`degraded-banner.tsx`), full-width,
  amber or muted, dismissible only when non-blocking.
- **Blocking error panel:** for surface failures — icon, one-line cause in plain language, a primary
  retry, a secondary escape route. Never a bare stack trace, never only a toast.

---

## 8. Media & skeletons

- Every image slot has an intrinsic aspect ratio so the layout never jumps.
- Skeletons mirror the real composition (District `fe968101-e10b-4a09-b4d7-ce135d3e5517`,
  `aa8481f5-22a9-4cc9-85d4-dbc95d2c8f89`): same grid, same radii, shimmering `charcoal-800` blocks.
  Show skeletons only after 200 ms, and for a minimum of 400 ms once shown, to avoid flicker.
- Below-the-fold media is `loading="lazy"`; the first two cards of the first rail are eager.

---

## 9. Shared components to introduce

These do not exist yet and are referenced throughout `05`–`14`:

| Component | Purpose | Replaces / used by |
| --- | --- | --- |
| `MobileSection` | header + rail/grid wrapper with consistent rhythm | ad-hoc sections in `landing-mobile.tsx`, `/app` page |
| `MobileRail` | snap rail with peek, a11y label, See-all | hand-rolled rails |
| `Sheet` (T1/T2/T3) | one overlay implementation with focus trap, scroll lock, history integration | `preset-quick-sheet`, `paywall-sheet`, `auth-modal`, `share-dialog`, `notification-dropdown` |
| `DockedActionBar` | safe-area aware bottom commit bar | create, preset detail, paywall, checkout |
| `ImageViewer` | full-screen zoomable viewer | result, library, examples, share |
| `StateBlock` | empty / error / offline composition (icon, title, body, primary, secondary) | every ad-hoc empty state |
| `StageChecklist` | vertical named-stage progress | `/app/generations/[id]` |
| `FilterModal` | T3 filter modal with Apply/Reset/live count | `catalog-filters.tsx` mobile branch |
| `MobilePageBottomSpacer` | consistent bottom clearance | hard-coded `pb-24` |

All live in `apps/web/components/consumer/mobile/` except `Sheet`/`StateBlock`, which belong in
`components/ui/`.

---

## 10. Element-level acceptance rules (apply everywhere)

1. Minimum touch target 44×44 px, minimum 8 px between adjacent targets.
2. Primary actions sit in the bottom third of the viewport wherever a surface has a single commitment.
3. Nothing critical may live behind hover.
4. Every overlay is dismissible by scrim tap, an explicit control, `Escape`, and browser Back.
5. Focus is trapped inside overlays and returned to the trigger on close.
6. All interactive text ≥13 px; body text ≥15 px; contrast ≥4.5:1 (≥3:1 for ≥19 px bold).
7. Any surface that can be empty, loading, failed or offline has a designed state for each (`16`).
8. Motion respects `prefers-reduced-motion`; no motion is load-bearing for comprehension.
