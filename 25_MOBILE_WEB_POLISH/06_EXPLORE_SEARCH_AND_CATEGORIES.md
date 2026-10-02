# 06 — Explore, Search & Categories

Surfaces: `apps/web/app/(marketing)/explore/page.tsx`, `catalog-filters.tsx`,
`category-chip-wall.tsx`, `app/(marketing)/categories/page.tsx`, `search-palette.tsx`,
`global-search.tsx`, `explore-menu.tsx`.

---

## 1. Current state and gaps

`/explore` parses `type`, `category`, `search`, `sort` and pagination from the URL, renders category
chips, `catalog-filters`, a grid, an empty state and pagination links.

Gaps on mobile:

1. **Filters are inline and apply immediately.** Every change is a navigation; there is no batching,
   no active-filter count, no Reset. At 375 px the control row wraps awkwardly.
2. **Pagination links** (page 1, 2, 3…) are a desktop idiom; mobile expects continuous loading or an
   explicit "Load more".
3. **Cards navigate to `/presets/[slug]`**, breaking the browse-evaluate loop that the quick sheet
   solves on the landing feed (`02 §1.1`).
4. **Chips are a third implementation**, visually different from the landing feed's tabs.
5. **Sticky search is absent** — after scrolling, the user must return to the top to refine.
6. **Empty state** is copy-only; no suggested looks, no reset action.
7. Search has three entry points with two implementations (`04 §7`).

---

## 2. Target composition (`/explore`)

```
[marketing header]
[sticky bar: search field · Filters (n) · Sort]     56px, sticks under header
[chips row: All + categories]                        44px, scrolls horizontally
[result count line: "128 looks"]                     13px muted
[masonry grid, 2-col]
[Load more looks]  (button; auto-load only after the first manual tap)
[bottom nav]
```

- The sticky bar collapses the search field to an icon when scrolling down and restores it on scroll up
  (keeps 2 of 3 controls always reachable without a scroll-to-top).
- Result count is the feedback channel that makes filtering legible (`02 §1.2`).

---

## 3. Preset tap behaviour — the quick sheet everywhere

Every preset card on mobile opens `PresetQuickSheet` (T2). The sheet's `View full details` links to
`/presets/[slug]` for users who want the full page. This is the single highest-value change on this
surface: it turns each evaluation from a navigation round-trip into a 2-tap peek
(Asos `e15bfbbd-6f9b-4e43-8675-368984292a92`, Target `54b5c312-29e7-458c-9420-ac59610af604`).

Requirements:
- Opening pushes a history entry; browser Back closes the sheet (`15 §5`).
- Closing restores the grid scroll position exactly.
- The sheet is shared with the landing feed, search results, favourites and related presets (`04 §8`).

---

## 4. Filter modal (T3)

Triggered by `Filters (n)`. Full-screen:

```
[X]  Filters                       [Reset]
──────────────────────────────────────────
Type          ( All | Filters | Posters )   segmented
Category      2-col checkbox tiles with counts
Sort          radio rows: Trending / Newest / Name
Credits       (optional, phase 2) range chips
──────────────────────────────────────────
[ Show 128 looks ]                          docked primary
```

- Changes are staged locally; nothing applies until `Show N looks`.
- The count updates live as options change (requires a lightweight count endpoint or client-side count
  over the loaded page — decide in `20 Q5`).
- `Reset` clears to defaults but does not close.
- On apply: update the URL (`?type=&category=&sort=`), close, scroll to the top of the grid, and
  announce "128 looks" via `aria-live`.
- The trigger shows the active count badge; when a filter is active, a dismissible `Clear filters` chip
  appears at the top of the grid.

Sort may remain a separate small T1 action sheet for one-tap sorting, with the same options mirrored in
the modal.

---

## 5. Pagination → progressive loading

Replace numbered pagination on mobile with:
1. First page server-rendered.
2. `Load more looks` button (explicit, accessible, works without JS-heavy observers).
3. After the first tap, subsequent pages may auto-load on scroll (IntersectionObserver) with a
   skeleton row; keep the button as the fallback and for keyboard users.
4. The URL keeps `?page=` in sync for shareability and restoration.

---

## 6. Categories (`/categories`)

2-column tiles, 3:2 media, category name and look count, radius 15 px. Tapping navigates to
`/explore?category=<slug>` (not a separate page) so there is one browsing surface and one filter model.
`category-chip-wall.tsx` should be reused only as the chips row, not as a second taxonomy UI.

---

## 7. Search palette (T3)

Per `04 §7`. Detailed mobile spec:

```
[ ← ]  [ search field, autofocused ]        [Cancel]
──────────────────────────────────────────
(idle)   Recents            [Clear]
         chip chip chip
         Trending looks
         row · row · row
(typing) Presets   (3 rows + See all)
         Categories (2 rows)
         Your library (2 rows, only when signed in)
(none)   "No matches for 'xyz'"
         Try: chip chip chip
         [Browse all looks]
```

- Rows: 56 px, 40 px thumbnail, name + type/credits, whole row tappable.
- Debounce 200 ms; show inline spinner in the field, never a full-surface skeleton.
- Selecting a preset closes the palette and opens the quick sheet on the underlying surface.
- `Escape`, Back and `Cancel` all close; focus returns to the trigger.
- Keyboard nav (↑/↓/Enter) retained from `cmdk` for external-keyboard users.
- Recents persist locally (`recent-preset-recorder.tsx` already records recents — reuse it).

---

## 8. States

| State | Behaviour |
| --- | --- |
| Loading (first) | skeleton chips + 6 skeleton cards |
| Loading (more) | 2 skeleton cards appended; button shows a spinner |
| No results for filters | `StateBlock`: "No looks match these filters" + `Clear filters` primary + 3 suggested looks |
| No results for search | echo the query, 3 suggestions, `Browse all looks` |
| Offline | banner + cached last page; filter modal disabled with an explanation |
| Error | `StateBlock` with `Try again`, keeps header/chips |

---

## 9. Work items

| # | Item | Files |
| --- | --- | --- |
| 6.1 | Quick sheet on every card (explore, categories, search, related) | `explore/page.tsx`, `product-card.tsx`, `related-presets.tsx`, `preset-quick-sheet.tsx` |
| 6.2 | Sticky search/filter/sort bar | `explore/page.tsx` |
| 6.3 | `FilterModal` (T3) with staged apply + live count | new `components/consumer/mobile/filter-modal.tsx`, `catalog-filters.tsx` |
| 6.4 | Progressive loading replacing numbered pagination | `explore/page.tsx` |
| 6.5 | Unified chip component | `category-chip-wall.tsx`, `mobile-feed.tsx`, `explore/page.tsx` |
| 6.6 | Palette behind all search entry points; recents + trending idle state | `search-palette.tsx`, `global-search.tsx`, `landing-mobile.tsx` |
| 6.7 | Designed empty/no-match states | `explore/page.tsx`, `StateBlock` |
| 6.8 | Scroll restoration across sheet/detail navigation | `explore/page.tsx` |

Acceptance criteria: `19 §4`.
