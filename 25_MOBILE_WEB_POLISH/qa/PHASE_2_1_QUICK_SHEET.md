# Manual Testing Guide — Phase 2.1: Preset Quick Sheet Everywhere

Scope: `feature/mobile-quick-sheet-p21`, spec `07_PRESET_DETAIL_AND_QUICK_SHEET` §2 and `18_IMPLEMENTATION_ROADMAP` item 2.1.

Phase 2.1 replaces the landing-only hand-rolled quick sheet with **one shared T2 sheet** on the common `Sheet` primitive, and puts it behind every preset surface on mobile: landing feed, Explore grid, app Discover rails, related presets on the detail page, Favorites, the preset-not-found recovery grid, and the search palette.

## What changed

| Area               | Before                                                                                                    | After                                                                                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quick sheet        | Custom overlay on the landing feed only — no shared history/scroll contract, no heart, no examples viewer | Shared `Sheet` (T2): drag handle, swipe-down, scrim, Escape, browser Back, focus trap, scroll lock + restore — everywhere                                                                                                       |
| Sheet content      | Thumb + name + chips + 3 example images + two links                                                       | 4:5 media (muted looping video when the preset has one, still under reduced-motion), **favorite heart** on the media, chips, 2-line description with **More**, example thumbs that open a **nested ImageViewer**, pinned footer |
| Card tap (mobile)  | Always navigated to `/presets/<slug>`                                                                     | Opens the quick sheet in place when a host is mounted; desktop still navigates                                                                                                                                                  |
| Card tap (desktop) | Navigated                                                                                                 | Unchanged — still navigates                                                                                                                                                                                                     |
| Search palette     | Rows navigated to detail on all widths                                                                    | On mobile, a preset row (or a recent that resolves to a known preset) closes the palette and opens the quick sheet; desktop keeps navigating                                                                                    |
| Retired preset     | Not representable in the sheet                                                                            | `available: false` → notice + **Find a similar look** deep-linking to the category                                                                                                                                              |
| Recents            | Recorded only from detail pages / palette rows                                                            | Opening the sheet from any host also records a recent (`5px:recent-presets`)                                                                                                                                                    |

## Prerequisites

1. `cp .env.example .env.local` with Supabase vars, `pnpm install && pnpm dev` → http://localhost:3000.
2. A catalog with presets that have **hero/poster images**, at least one with a `preview_video`, and some with `example_result` assets (if a preset lacks examples, that section is simply absent — not a bug).
3. Two viewports:
   - **Mobile:** DevTools device toolbar at 390×844, ideally a real phone for swipe/Back.
   - **Desktop:** ≥1024px.
4. Two auth states: a signed-in account (with some favorites) and an incognito/anonymous session.

---

## 1. Landing feed (anonymous)

1. Open `/` on mobile. Tap any card in the masonry feed or the Trending rail.
   - ✅ A **bottom sheet** slides up — not a page navigation. Drag handle on top, scrim behind.
2. Sheet contents, top to bottom:
   - ✅ 4:5 media fills the width; if the preset has a preview video it **autoplays muted and loops** with the still as poster.
   - ✅ Heart button top-right over the media (44px target area).
   - ✅ Name, then chips: `Filter`/`Poster`, category, `N credits`.
   - ✅ Description clamps to 2 lines with **More** → expands inline, button becomes **Less**.
   - ✅ Up to 3 example thumbnails in a row.
   - ✅ Footer pinned above the safe area: lime **Use this look**, ghost **View full details**, and the line _"No account needed until you generate."_
3. Tap the heart as an anonymous user.
   - ✅ The auth modal opens over the sheet — no crash, no silent failure.
4. Dismissal paths — each must close the sheet **and leave the feed scrolled where it was**:
   - ✅ Scrim tap / swipe down on the handle area / X button / browser **Back**.
5. Tap an example thumbnail.
   - ✅ The full-screen image viewer opens **above** the sheet with caption `Example N of 3`. Its close/zoom controls work; closing returns to the open sheet (Back once more closes the sheet).
6. Tap **Use this look** → `/app/create/<slug>`. Tap **View full details** → `/presets/<slug>`; browser Back returns to the feed.
7. Reduced motion: DevTools Rendering → emulate `prefers-reduced-motion: reduce` → reopen the sheet.
   - ✅ The still renders instead of the video; no motion.

## 2. Explore grid

1. Sign in, open `/explore` on mobile, scroll deep into the grid.
2. Tap a card.
   - ✅ Quick sheet opens **in place** — URL unchanged, scroll position held.
   - ✅ The heart reflects favorited state (filled red on already-saved presets).
3. Toggle the heart on an unsaved preset → closes sheet → the card's heart shows the new state; reload `/app/favorites` → preset listed.
4. Back-button dismissal: open the sheet, press Android/Chrome **Back**.
   - ✅ Sheet closes; **no navigation happens** (the pushed history entry is consumed by the sheet).
5. Desktop check (≥1024px): click a card.
   - ✅ Navigates to `/presets/<slug>` — the sheet does **not** open on desktop.

## 3. App Discover (`/app`)

1. Sign in, open `/app` on mobile.
2. Tap a card in **Trending now**, **New looks**, or **Your saved looks**.
   - ✅ Sheet opens in place; heart and CTAs work.
   - ✅ `Use this look` goes to `/app/create/<slug>`.

## 4. Related presets (`/presets/<slug>`)

1. Open any preset detail page on mobile, scroll to **More <category> presets**.
2. Tap a related card.
   - ✅ Quick sheet opens over the detail page (no navigation).
3. Tap **View full details** in the sheet → navigates to that preset's page. Back → returns to the original detail page, related grid intact.

## 5. Favorites (`/app/favorites`)

1. Open `/app/favorites` on mobile with at least two saved presets.
2. Tap a card → sheet opens with the heart already filled.
3. Unfavorite **from the sheet's heart**, then close.
   - ✅ Toast `Removed from Favorites` with **Undo**; the card disappears from the grid.
   - ✅ Undo restores it.
4. Retired check (if a favorited preset has `version_id` null — simulates with Supabase Table Editor):
   - ✅ Available presets open the sheet; retired ones render the muted `RetiredPresetCard` — unchanged.

## 6. Search palette

1. Sign in. On mobile, open the palette via the header search button (or ⌘K on desktop).
2. Tap a preset row in **Trending now** (idle) or a search result.
   - ✅ The palette closes and the quick sheet opens — not a page navigation.
   - ✅ The heart state matches Favorites; toggling it inside the sheet persists (check `/app/favorites`).
3. Close the sheet → you're back on the underlying page (palette closed). The tapped preset now appears under **Recent** next time the palette opens.
4. Desktop (≥640px): select a preset row.
   - ✅ Navigates to `/presets/<slug>` — no sheet on desktop.

## 7. Preset-not-found recovery

1. Visit `/presets/<a-slug-that-does-not-exist>` on mobile.
2. Tap one of the suggested alternative cards.
   - ✅ Quick sheet opens over the edge page with working CTAs.

## 8. Cross-cutting

- ✅ Scroll restoration: after every dismissal path the underlying grid/feed is exactly where it was — not jumped to top.
- ✅ Focus trap: Tab cycles inside the open sheet only; on close, focus returns to the tapped card.
- ✅ Sheet never shows provider/model names or prompt text — only name, type, category, credits, description, examples.
- ✅ Nested viewer + sheet + auth modal stack correctly (viewer above sheet, auth modal above all).
- ✅ With `sheetItem` null nothing renders — no invisible scrim blocking taps.

## Regression spots

- ✅ Desktop card hover still reveals **Try this look** → `/app/create/<slug>`; the stretched link still navigates on desktop.
- ✅ Card favorite hearts still toggle independently of the sheet (outside a host, cards navigate as before).
- ✅ Landing feed category chips and the old `See all examples`→`View full details` path still reach `/presets/<slug>`.
- ✅ Search palette: categories and library rows still navigate; `See all N matching presets` still goes to `/explore?search=…`.

## Known limitations

- Search rows for presets outside the fetched featured set (e.g. a recent that isn't in the current `searchPresets` list) navigate to detail instead of opening the sheet — the sheet needs full product data that only exists for listed presets.
- Toggling a heart inside the sheet doesn't live-update the card behind it until the grid re-renders (Favorites syncs via the removal toast; Explore cards update on next load).
- The sheet is phone-first; on `sm`+ widths it renders as a centered panel when opened programmatically (e.g. from search at 640–768px), which is the shared Sheet's intended behavior.
