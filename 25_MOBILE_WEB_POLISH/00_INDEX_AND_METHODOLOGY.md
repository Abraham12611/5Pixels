# 25 — Mobile Web Polish Program — Index & Methodology

> Scope: the **mobile web** experience of 5Pixels (viewport 320–767 px, touch-first, iOS Safari / Android Chrome).
> This document set is a **plan**, not an implementation. Nothing here changes product rules defined in
> `01_PRODUCT_OVERVIEW_AND_PRINCIPLES.md`, `02_UI_UX_BIBLE_AND_DESIGN_SYSTEM.md` or `AGENTS.md`.

## 0.1 Why this program exists

5Pixels already ships a mobile layer (`landing-mobile.tsx`, `mobile-feed.tsx`, `mobile-hero.tsx`,
`mobile-bottom-nav.tsx`, `preset-quick-sheet.tsx`, `paywall-sheet.tsx`, responsive variants of the app
shell). It is functional but uneven: some surfaces were designed mobile-first, others are desktop layouts
that merely reflow. The result is a journey where the *entry* feels like a product and the *middle*
(create → progress → result → library → billing) feels like a resized desktop app.

The goal of this program is a single, coherent, premium mobile-web product where:

- Every route has an explicit mobile composition (not a reflow).
- Every overlay follows one sheet/dialog system with consistent gestures, focus and dismissal.
- Every asynchronous moment (upload, generation, checkout) has honest progress, recovery and exit.
- Every empty, error, offline and degraded state is designed, not defaulted.
- Thumb reach, safe areas, 44 px targets, reduced motion and contrast are non-negotiable.

## 0.2 Document set

| File | Contents |
| --- | --- |
| `00_INDEX_AND_METHODOLOGY.md` | This file: scope, method, research corpus, how to read the specs |
| `01_RESEARCH_AI_PHOTO_APPS.md` | Lensa AI, Meta AI, Luma AI, Krea, Leonardo, Playground, Gizmo, Apple Image Playground, Picnic |
| `02_RESEARCH_ADJACENT_CATEGORIES.md` | Commerce, social, fintech, streaming, productivity, media SaaS |
| `03_PATTERN_LIBRARY_MOBILE_UI_ELEMENTS.md` | Element-by-element library: sheets, chips, tabbars, steppers, cards, toasts |
| `04_INFORMATION_ARCHITECTURE_AND_NAVIGATION.md` | Mobile IA, tab model, headers, back semantics, deep links |
| `05_LANDING_AND_DISCOVER.md` | `/` mobile landing and `/app` discover |
| `06_EXPLORE_SEARCH_AND_CATEGORIES.md` | `/explore`, `/categories`, search palette |
| `07_PRESET_DETAIL_AND_QUICK_SHEET.md` | `/presets/[slug]` and `preset-quick-sheet.tsx` |
| `08_CREATE_UPLOAD_AND_STUDIO.md` | `/app/create/[slug]`, upload, controls, cost confirmation |
| `09_GENERATION_PROGRESS.md` | `/app/generations/[id]` |
| `10_RESULT_COMPARE_SHARE.md` | `/app/results/[id]`, `/s/[shareId]`, download/share/feedback |
| `11_LIBRARY_FAVORITES_HISTORY.md` | `/app/library`, `/app/favorites`, `/app/generations` |
| `12_AUTH_ONBOARDING_DEFERRED_AUTH.md` | `/login`, `/signup`, verification, auth modal, first-run |
| `13_CREDITS_PAYWALL_BILLING.md` | Paywall sheet, `/pricing`, `/app/billing/*`, checkout return |
| `14_ACCOUNT_SETTINGS_NOTIFICATIONS.md` | `/app/account/*`, `/app/settings`, `/app/profile`, notifications |
| `15_MODALS_SHEETS_OVERLAYS.md` | The overlay system: tiers, gestures, focus, scroll locking |
| `16_STATES_LOADING_EMPTY_ERROR_OFFLINE.md` | Skeletons, empties, errors, offline, degraded, moderation |
| `17_ACCESSIBILITY_PERFORMANCE_MOTION.md` | A11y, media/perf budgets, motion and reduced-motion |
| `18_IMPLEMENTATION_ROADMAP.md` | Phased delivery, branch/PR plan, sequencing, risk |
| `19_ACCEPTANCE_CRITERIA_AND_QA.md` | Per-surface acceptance criteria and the QA matrix |
| `20_OPEN_QUESTIONS.md` | Decisions required from the product owner |

Read order for implementers: `04` → the surface file you are building → `15`/`16`/`17` → `19`.

## 0.3 Research method

External research was done with the **Refero MCP** tools against real product screenshots and flows —
not from memory. Four passes:

1. **Direct-competitor pass** — AI photo/avatar/image products (`refero_search_screens`, platform `ios`
   and `web`): style pickers, upload, progress, results, packs, paywalls.
2. **Adjacent-category pass** — commerce, social, fintech, streaming, productivity, media SaaS: navigation,
   quick-view sheets, filters, checkout, cancellation, settings, notifications.
3. **Element pass** — the same UI elements queried in isolation (bottom sheets with drag handles, half
   sheets, action sheets, full-screen filter modals, tab bars with a center create action, chips rows,
   masonry, skeletons, empty/error/offline states, search-with-recents).
4. **Flow pass** — `refero_search_flows` + `refero_get_flow` for end-to-end journeys: Meta AI "Your
   Likeness Setup" (16 steps), Leonardo.Ai "AI Image Creation Workspace" (10) and "AI Creation Intro
   Guide" (6), Picnic "Free Trial Subscription Onboarding" (8), Daylish/Podimo paywall purchases,
   Luminar "Export / Save Edited Photo" (6), ChatGPT "Selection-based Image Edit and Generate" (9),
   Synthesia "Subscription Cancellation" (9), plus account-deletion and password-reset flows.

Corpus size: **~60 searches, ~240 distinct screens inspected in full detail, ~180 flows surveyed,
10 flows read step-by-step.** Products cited across the set include Lensa AI, Meta AI, WhatsApp
(Meta AI surfaces), Luma AI, Krea.ai, Leonardo.Ai, Playground, Apple Image Playground, Gizmo, Picnic,
ElevenLabs, Pinterest, Instagram, BeReal, TikTok, Perplexity, Comet, Arc Search, Asos, Target, Shopify,
On, SSENSE, Uber Eats, DoorDash, LEGO Builder, Revolut, Coinbase, PayPal, Blackbird, World App, Phantom,
Netflix, YouTube, YouTube Music, TIDAL, Medium, Artsy, Wabi, District, Stemz, pillowtalk, Foodllama,
Showcase, Synthesia, Jasper, Lovable, Linktree, Willow, Monday.com, LinkedIn, Hims, Alive.

Every screen cited carries its Refero UUID; the canonical URL is
`https://refero.design/screens/<uuid>` (web pages: `https://refero.design/pages/<uuid>`,
flows: `https://refero.design/flows/<id>`).

## 0.4 How each research finding is recorded

Findings use a fixed seven-part frame so the leap from "nice screenshot" to "our change" is auditable:

1. **Product & screen** — what it is, with UUID.
2. **Observed pattern** — what the UI actually does.
3. **User problem** — what it solves.
4. **Why it works** — the mechanism (cognitive, ergonomic, commercial).
5. **Small-screen behaviour** — how it survives 375 px and one thumb.
6. **Platform fit** — native iOS only, mobile web viable, or both.
7. **5Pixels verdict** — **Adopt** / **Adapt** / **Reject**, with the target route/component.

`Reject` entries are kept deliberately: knowing why we *don't* copy Lensa's 5-step wizard is as valuable
as knowing why we copy its step header.

## 0.5 Product constraints that bound every recommendation

From `AGENTS.md` and `01`/`02`:

- **Preset-first.** No generic prompt box in V1. Any research showing a prompt composer is adapted into
  *preset + schema controls*, never a free-text field.
- **Private intelligence.** No provider names, model names, or private instructions in the client.
  Progress copy therefore describes *stages*, never "calling <provider>".
- **Two content types.** Filter (pure style transform) and Poster (AI visual + deterministic text/layout).
  Poster surfaces need text-input affordances that Filter surfaces must not show.
- **Premium consumer UX / operational admin UX.** This program touches consumer surfaces only.
- **Landing preset previews are short muted MP4/GIF**, never draggable sliders.
- **Signed URLs** for all private assets; nothing in this plan introduces public asset URLs.

## 0.6 Design-token vocabulary used in these specs

Existing tokens in `apps/web/app/globals.css` are used verbatim; the specs do not invent colours.

- Surfaces: `--color-ink-950` (page), `--color-ink-900`, `--color-charcoal-850` (sheet/card),
  `--color-charcoal-800`, `--color-charcoal-700` (control).
- Text: `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`.
- Signal: `--color-lime-400` / `--color-lime-500` (primary CTA fill, dark text), `--color-lime-300`
  (hover/active), `--color-lime-700` (pressed/borders).
- Motion: `--ease-out`, `--ease-in-out`, `--ease-drawer`; existing `animate-overlay-in`,
  `animate-dialog-in`, `animate-sheet-in` utilities.
- Spacing stays on the 5-based scale (5/10/15/20/30/40/60/80/120); radii 10/12/15/20.

Two token *additions* are proposed (see `03` and `17`): a documented elevation ramp for stacked overlays
and a `--size-touch-min: 44px` reference used by lint-level review, not new colours.

## 0.7 Definition of done for the whole program

The program is complete when, on a 375×812 viewport with throttled 4G:

1. Every consumer route in `04`'s route table has a mobile composition spec implemented.
2. Every overlay in the app is built from the three sanctioned overlay tiers in `15`.
3. Every asynchronous surface has a designed loading, empty, error, offline and recovery state (`16`).
4. The a11y checklist in `17` passes on every route.
5. The acceptance criteria in `19` pass for every surface.
6. No consumer surface exposes provider/model names or a generic prompt input.
