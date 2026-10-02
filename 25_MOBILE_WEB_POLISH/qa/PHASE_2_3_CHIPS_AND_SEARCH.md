# Phase 2.3 — Unified chips + search palette on all surfaces

Manual test guide for the shared `FilterChip` and the `SearchPalette` now
mounted behind every search entry point (spec `05 §2`, `06 §5–§7`).
Anonymous and authenticated shells both carry the palette — check both.

## Setup

- Any viewport ≤ 767 px for mobile checks; ≥ 768 px for desktop.
- Anonymous (signed-out) exercises the marketing header palette; signed-in
  exercises the app header palette with Library scope.
- Test URLs:
  - `/` (landing pill + header icon)
  - `/explore` (sticky-bar search trigger)
  - `/app` (authenticated palette with Library scope)

## 1. Palette entry points

1. Landing, mobile — tap the "Search looks" pill under the hero → palette
   opens as a modal dialog (not a navigation to `/explore`).
2. Marketing header (anonymous, any width) — tap the magnifier icon → palette
   opens.
3. `/explore` mobile sticky bar — the search field is now a button showing
   "Search looks…" (or `"query"` when a search is active) → opens the palette.
4. Scroll `/explore` down — the field collapses to the round magnifier; it
   also opens the palette.
5. `Cmd/Ctrl+K` opens the palette from any of these surfaces; `Escape` closes
   it and returns focus to the trigger.

## 2. Idle state (spec 6.7)

1. Open the palette empty → **Recent** group (if any recents exist) with a
   "Clear" affordance, **Trending** presets, and categories.
2. Anonymous: no Library group. Signed in: Library group appears.
3. Tap Clear next to Recent → recents empty immediately.

## 3. Anonymous behavior

1. Anonymous palette rows on mobile open the quick sheet (not a navigation).
2. The heart inside that sheet is auth-gated → sign-in prompt, not a silent
   toggle.
3. Typing a query filters presets + categories only (no private data).

## 4. Unified chips

1. Landing feed chips, `/explore` chips row, and desktop chip wall all share
   the same visual: charcoal pill, solid lime when active, 44px tap target
   (`min-h-11`) at the default size.
2. Screen reader: feed/explore chips announce `tab`/`aria-selected` inside a
   `tablist`; the chip wall's sort/category toggles announce `aria-pressed`.
3. Focus ring is visible on keyboard navigation (`focus-visible` lime ring).

## 5. Regression sweep

- `/explore` desktop — inline filters + numbered pagination unchanged.
- App header palette — Library scope, trending badges, favorites hearts all
  still work for signed-in users.
- Search result rows on desktop still navigate to `/presets/[slug]`; on
  mobile they open the quick sheet.
