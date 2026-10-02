# 11 — Library, Favorites & Generation History

Surfaces: `app/(app)/app/library/page.tsx` (+ `loading.tsx`), `library-grid.tsx`,
`library-result-card.tsx`, `app/(app)/app/favorites/page.tsx` (+ `loading.tsx`, `error.tsx`),
`app/(app)/app/generations/page.tsx`.

This is the Own loop: the reason a user comes back tomorrow.

---

## 1. Current state

**Library** (`library-grid.tsx`): tabs `All / Saved / Downloaded`, a text query, a date-range dropdown,
a preset dropdown, a masonry column layout (`columns-2 md:columns-4`), and thoughtfully designed empty
panels including a ghost-card motif behind the empty message.

**Favorites**: a grid of favourited presets with its own loading and error boundaries.

**Generations**: a chronological list of runs including non-completed ones.

The empty states and the filter model are already better than most of the app. The problems are mobile
ergonomics and the split of three overlapping "my stuff" destinations.

---

## 2. Gaps

1. **Three destinations, one mental model.** Library (results), Favorites (presets) and Generations
   (runs) are three routes; on mobile only two are in the tab bar and Generations is effectively
   unreachable. Artsy's saves-with-segments pattern (`02 §4`) says: one destination, segmented.
2. **Filter row is desktop-shaped.** Query field + two dropdown menus + tabs consume ~120 px of vertical
   space above the content at 375 px.
3. **Masonry for owned content.** Owned collections scan better as a uniform grid (`03 §1.4`); masonry
   is for discovery.
4. **No per-item actions on mobile.** Download/share/delete require opening the result.
5. **In-progress and failed runs are invisible in Library**, so a user who leaves the progress page has
   no obvious place to watch for the result — despite the progress page promising "it will be waiting in
   Library".
6. **No selection mode** for bulk download/delete.
7. **Card metadata is thin** — no preset name/date on the card in a consistent position.

---

## 3. Target: one Library with segments

```
[app header: Library                        🔍 ⋯ ]
[ segmented: Results | Presets | Runs ]        44px, sticky
[ filter row: Filters (n) · Sort ]             appears on scroll-up only
──────────────────────────────────────────────
Results   → in-progress rail (when any) + uniform 2-col grid of outputs
Presets   → uniform 2-col grid of favourited presets → quick sheets
Runs      → chronological list incl. failed/blocked/cancelled
```

- `/app/favorites` and `/app/generations` remain valid URLs and deep-link into the corresponding
  segment (no broken links, no redirects needed for bookmarks).
- The tab bar's Library slot points at `/app/library`; Favorites vacates its tab slot (`04 §3`).
- Segment state is reflected in the URL (`?tab=presets`) for restoration and sharing.

---

## 4. Results segment

### 4.1 In-progress rail

Above the grid, only when runs are active: horizontally scrolling cards showing the source thumbnail, a
pulsing status pill, preset name and elapsed time; tapping opens `/app/generations/[id]`. Failed runs
appear here too with a `Retry` chip until dismissed. This closes the loop promised on the progress page.

### 4.2 Grid

- Uniform 2-col, 4:5, 10 px gutters. Metadata under the media: preset name (14 px) and relative date
  (12 px muted).
- Status pill top-left when not complete; `⋯` top-right opening a T1 sheet:
  `Download`, `Share`, `Save / Unsave`, `Make again`, `Delete`.
- Tap → `/app/results/[id]`. Long-press → selection mode.
- Infinite scroll after an explicit first `Load more` (same rule as `/explore`, `06 §5`).

### 4.3 Filters

Move query + date + preset into the shared `FilterModal` (T3, `06 §4`) triggered by `Filters (n)`, with
`Sort` (Newest / Oldest / Preset) as a T1 sheet. The tabs `All / Saved / Downloaded` become filter
options *inside* the modal rather than a competing second segmented control; the top-level segmented
control is reserved for Results/Presets/Runs.

### 4.4 Selection mode

Long-press enters selection: header swaps to `n selected` with `Cancel`, cards get checkboxes, and a
docked bar offers `Download` and `Delete`. Delete opens a T1 confirm sheet naming the count and the
permanence (`02 §3.2`). Sequential download with progress for multi-select.

---

## 5. Presets segment (favorites)

- Uniform 2-col preset cards, favourite heart on each.
- Tap → quick sheet (`04 §8`), not the detail page.
- Unfavouriting is optimistic and removes the card with an undo toast; the item returns in place if
  undone.
- Empty: "Looks you save appear here" + `Browse looks` primary, plus 3 suggested looks.

---

## 6. Runs segment (history)

Row list, 72 px rows: source thumbnail, preset name, status pill, relative time, credit cost, chevron.
Grouped by day with sticky day headers. Failed rows offer `Try again` inline. This is the accountability
surface for spent credits, so the credit column must always be present and must reconcile with
`/app/billing/history` (`13 §9`).

---

## 7. States

| Segment | Empty | Loading | Error | Offline |
| --- | --- | --- | --- | --- |
| Results | keep the ghost-card motif + "Your results will appear here" + `Browse looks` | 6 skeleton cards | `StateBlock` + retry | cached grid + banner, actions disabled |
| Presets | "Looks you save appear here" + suggestions | 6 skeletons | existing `error.tsx` upgraded to `StateBlock` | cached |
| Runs | "No transformations yet" + `Browse looks` | 5 skeleton rows | `StateBlock` | cached |
| Filtered to nothing | "No results match these filters" + `Clear filters` | — | — | — |

---

## 8. Work items

| # | Item | Files |
| --- | --- | --- |
| 11.1 | Segmented Library (Results / Presets / Runs) with URL state and deep links | `library/page.tsx`, `favorites/page.tsx`, `generations/page.tsx` |
| 11.2 | Uniform grid + card metadata + status pills | `library-grid.tsx`, `library-result-card.tsx` |
| 11.3 | In-progress rail with retry | `library/page.tsx` |
| 11.4 | Filters into `FilterModal` + `Sort` sheet | `library-grid.tsx`, shared `FilterModal` |
| 11.5 | Per-card `⋯` action sheet | `library-result-card.tsx` |
| 11.6 | Selection mode with bulk download/delete + confirm sheet | `library-grid.tsx` |
| 11.7 | Favorites as a segment, optimistic unfavourite with undo | `favorites/page.tsx`, `favorite-button.tsx` |
| 11.8 | Runs list with day grouping and credit column | `generations/page.tsx` |
| 11.9 | `StateBlock` adoption across all empty/error states | all three |

Acceptance criteria: `19 §9`.
