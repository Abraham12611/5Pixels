# Phase 2.2 — `/explore` sticky bar, FilterModal, progressive loading

Manual test guide for the mobile explore composition (spec `06 §2–§5`).
Desktop (`md`+) intentionally keeps the existing inline `CatalogFilters` and
numbered pagination — regressions there are bugs, so check both widths.

## Setup

- Any viewport ≤ 767 px for mobile checks (DevTools device toolbar or a real
  phone); ≥ 768 px for desktop checks.
- Anonymous (signed-out) is the primary persona; repeat the header-offset case
  signed in.
- Test URLs:
  - `/explore`
  - `/explore?search=portrait`
  - `/explore?category=cinematic`
  - `/explore?page=2&page_size=12` (deep-link restore)

## 1. Sticky control bar (spec 6.2)

1. Open `/explore` on mobile.
2. Scroll down — the bar (search · Filters · Sort) stays pinned under the app
   header. **Expected:** stuck at top, no overlap/jitter.
3. Keep scrolling down — the search field collapses to a round magnifier icon.
   Filters + Sort remain visible.
4. Scroll up — the full search field returns.
5. Type a query into the field and submit — URL gains `?search=…`, grid
   reloads, count line updates to `N looks matching "…"`.
6. Signed-out, the bar sits below the 64px marketing header (`top-16`); signed
   in, below the 56px app header (`top-14`). Check both: no gap, no overlap.

## 2. Chips row + count line

1. The `All + categories` row scrolls horizontally without a scrollbar.
2. Tap a category chip → URL gains `?category=<slug>`, grid reloads, the count
   line announces the new total (screen reader: `aria-live`).
3. Tap `All` → back to unfiltered.

## 3. FilterModal (spec 6.3)

1. Tap **Filters** → full-screen modal slides up (T3).
2. Toggle a Type segment, pick a category tile, change Sort — **nothing
   navigates** while staging (URL unchanged behind the modal).
3. Category tiles show live per-category look counts (`…` briefly while
   loading). Switching Type re-fetches counts (~250 ms debounce).
4. The docked CTA reads `Show N looks` and updates live as you stage options.
   Tap a selected category tile again — it deselects and the CTA returns to
   the unfiltered total.
5. Tap **Show N looks** → modal closes, navigates to the filtered URL, grid is
   at the top, count line announces `N looks`.
6. Reopen Filters → staged state reflects the *applied* filters.
7. **Reset** clears Type/Category/Sort to defaults but does not close, does
   not navigate.
8. Close via `X`, scrim tap (sm+), or browser Back — all close without
   applying.
9. With a category applied, the Filters trigger shows a count badge
   (`Filters (n)`) and a `Clear filters` chip appears above the grid; tapping
   it clears type+category but preserves `?search=`.

## 4. Sort sheet (T1)

1. Tap the Sort icon → bottom action sheet with all six sort options and a dot
   on the active one.
2. Tap a different sort → sheet closes, navigates to `?sort=…`.
3. Swipe-down, scrim, Escape and Back all dismiss.

## 5. Progressive loading (spec 6.4)

Needs a catalog larger than `page_size` — use `?page_size=12` if the live
catalog is small.

1. `/explore` renders page 1; `Load more looks` sits under the grid.
2. Tap it → button shows `Loading…`, two skeleton cards appear in the grid,
   then the next page appends. URL becomes `?page=2` **without** a navigation
   (no scroll jump, no full reload).
3. After that first tap, keep scrolling — the next page auto-loads via the
   sentinel. The button stays as the keyboard/fallback path.
4. On the last page the button disappears.
5. Deep link `/explore?page=2&page_size=12` → renders page 2's items, briefly
   shows "Loading earlier looks…", then the page-1 items prepend so the feed
   reads continuously.
6. Kill the network (DevTools offline) then tap Load more → error line
   `Couldn't load more — tap to try again`; restoring network and tapping
   retries.

## 6. Empty state

1. `/explore?search=zzz-nothing` → "No looks match "zzz-nothing"", a `Clear
   filters` button, and up to 3 suggested featured looks.
2. Tapping a suggestion card opens the quick sheet (same host as the grid).

## 7. Quick sheet still works

Card taps on the explore grid open the shared `PresetQuickSheet` (heart,
examples, `Use this look`, `View full details`) — regression check for 2.1.

## 8. Desktop parity

On ≥ 768 px: inline `CatalogFilters`, `CategoryChipWall`, numbered pagination,
and the old empty state render unchanged. No sticky bar / chips row / modal.

## Known limitations

- Filter modal category counts are computed client-side from one broad fetch
  (≤500 rows) — exact today, revisit if the catalog grows past a few hundred.
- The mobile search field is a plain submit input; the full `SearchPalette`
  lands with it in 2.3 (`06 §7`).
- `Clear filters` in the sticky bar clears type+category but keeps `?search=`;
  the modal's Reset also leaves the search term applied (search lives in the
  bar, not the modal).
