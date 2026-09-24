# 04 — Mobile Information Architecture & Navigation

---

## 1. The mobile journey model

5Pixels' mobile journey has four loops. Every route belongs to exactly one.

1. **Discover loop** — land, browse, evaluate, shortlist. `/`, `/app`, `/explore`, `/categories`,
   `/presets/[slug]`, search, favourites.
2. **Create loop** — commit a photo, adjust, spend credits, wait, receive. `/app/create/[slug]`,
   `/app/generations/[id]`, `/app/results/[id]`.
3. **Own loop** — revisit, compare, re-run, share, manage. `/app/library`, `/app/favorites`,
   `/app/generations`, `/s/[shareId]`.
4. **Account loop** — identity, money, preferences, exit. auth routes, `/app/account/*`,
   `/app/billing/*`, `/pricing`, `/checkout/*`.

The polish thesis: the Discover loop is strong, the Create loop is adequate but generic, the Own loop is
desktop-shaped, and the Account loop is a reflowed desktop settings UI. Priority follows that order in
reverse impact: Create → Own → Account → Discover refinements (`18`).

---

## 2. Route inventory and mobile composition

`H` = header variant (`M` marketing / `A` app / `I` immersive, see `03 §2.2`).
`Nav` = bottom tab bar shown. `Dock` = docked action bar.

| Route | Loop | H | Nav | Dock | Mobile composition | Spec |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | Discover | M | ✓ | — | hero carousel → search entry → chips + masonry feed → intent tiles → how-it-works → collections → FAQ → CTA | `05` |
| `/app` | Discover | A | ✓ | — | orientation (new) or Continue rail → Trending → New → Saved → Categories | `05 §4` |
| `/explore` | Discover | M | ✓ | — | sticky search + `Filters (n)` + `Sort` → chips → masonry → quick sheet | `06` |
| `/categories` | Discover | M | ✓ | — | 2-col category tiles with counts | `06 §6` |
| `/presets/[slug]` | Discover | M/I | ✓ | ✓ `Use this look` | full-bleed preview → title/meta → examples → what it does → related | `07` |
| `/app/create/[slug]` | Create | A | ✕ | ✓ `Generate · n credits` | preset strip → source chooser/preview → controls accordion → cost | `08` |
| `/app/generations/[id]` | Create | A | ✕ | — | source thumb → pixel motif → stage checklist → leave/cancel affordances | `09` |
| `/app/results/[id]` | Create | I | ✕ | ✓ action bar | full-bleed result → compare control → actions → details → feedback → related | `10` |
| `/app/library` | Own | A | ✓ | — | in-progress rail → uniform grid → per-item sheet | `11` |
| `/app/favorites` | Own | A | ✓ | — | uniform preset grid → quick sheet | `11 §5` |
| `/app/generations` | Own | A | ✓ | — | chronological list with status | `11 §6` |
| `/s/[shareId]` | Own | I | ✕ | ✓ `Make your own` | image → preset name → CTA | `10 §7` |
| `/login`, `/signup`, `/forgot-password`, `/update-password`, `/verify-email` | Account | minimal | ✕ | — | single-column form, CTA after last field | `12` |
| `/pricing` | Account | M | ✓ | — | stacked plan cards, toggle, FAQ | `13 §5` |
| `/app/billing` | Account | A | ✓ | — | balance hero → quick actions → recent activity | `13 §8` |
| `/app/billing/plan` \| `/credits` \| `/history` | Account | A | ✓ | ✓ on credits | stacked cards / packs / row cards | `13` |
| `/app/account` | Account | A | ✓ | — | grouped disclosure index | `14 §2` |
| `/app/account/profile` \| `security` \| `privacy` \| `notifications` \| `delete` | Account | A | ✓ | — | full sub-pages, labelled back | `14` |
| `/app/profile`, `/app/settings` | Account | A | ✓ | — | see consolidation below | `14 §7` |
| `/checkout/success`, `/checkout/cancel` | Account | minimal | ✕ | ✓ | outcome + balance + next action | `13 §7` |
| `/maintenance`, `/not-found`, `global-error` | — | minimal | ✕ | — | `StateBlock` | `16 §8` |

**Consolidation issue.** `/app/settings`, `/app/profile` and `/app/account` overlap, and
`/app/settings/delete` duplicates `/app/account/delete`. Proposal: `/app/account` is the single index;
`/app/settings` and `/app/profile` redirect to it (or to `/app/account/profile`); the duplicate delete
route is removed. Requires owner sign-off → `20 Q3`.

---

## 3. The five-slot tab bar

Current: Discover (`/app`) · Explore (`/explore`) · **Create** (→ `/explore`) · Library (`/app/library`)
· Favorites (`/app/favorites`).

**Finding (Pinterest `7e653b51-4709-47d6-af91-2bb63daf6ee9`, Perplexity
`fde2c36f-7236-4eb9-8b15-411f1cf6cb61`, LottieFiles `99d143b0-e1d0-4f58-a02d-e6280d0a6699`,
ElevenMusic `ff24426f-c7fe-4c88-9a20-e26d92d0ba93`).** The centre action in a 5-slot bar is a *creation
entry point* that opens a chooser, not a duplicate of an adjacent tab.

**Problems with today's bar:**
1. `Create` links to `/explore`, which is also the Explore tab — two of five slots do the same thing.
2. Favorites is a low-frequency destination occupying a top-level slot.
3. There is no top-level route to the account/profile, so account is only reachable via the header.

**Recommendation (requires owner decision → `20 Q1`):**

| Slot | Label | Target |
| --- | --- | --- |
| 1 | Discover | `/app` |
| 2 | Explore | `/explore` |
| 3 | **Create** | opens a **T2 create sheet**: "Recent looks" rail + "Browse all looks" + resume-last-upload if any |
| 4 | Library | `/app/library` (favorites becomes a segmented tab inside Library) |
| 5 | Account | `/app/account` (avatar, with a credit-low dot indicator) |

This resolves the duplication, gives Create a real job, and puts account/credits one tap away — the two
things a paying mobile user needs most. Favorites remains addressable at `/app/favorites` and as a
Library segment (Artsy pattern, `f5e82741-4cad-477f-8ec9-19e1c2508b5a`).

**Fallback if the owner prefers minimal change:** keep five current slots but point Create at the T2
create sheet, and add the avatar to the app header with a credit chip.

---

## 4. Back-navigation semantics

| Situation | Behaviour |
| --- | --- |
| Overlay open | Back closes the overlay only (history entry pushed on open) |
| Detail entered from a list | Labelled back returns to the list **at its previous scroll position** |
| Create entered from a preset | Back returns to the preset, not the feed |
| Generation running | Back goes to Library with an "it will finish in the background" toast |
| Result | Back goes to the origin (Library or generation), never to create |
| Auth completed | Return to the exact triggering action (existing `next` param behaviour) |

Scroll restoration for `/explore` and feeds must survive the quick-sheet open/close cycle and the
back-from-detail case; this is a known gap today.

---

## 5. Deep links and entry points

Every route must be independently landable, because share links, notifications and search send users
straight into the middle of the app:

- `/presets/[slug]` and `/s/[shareId]` are the two public deep-link targets → both need complete
  metadata (OG image, title, description) and a self-explanatory CTA for a user with no context.
- `/app/*` deep links while logged out must route to auth with `next=` preserved and, on mobile, present
  the auth **sheet** on the destination rather than a hard redirect where feasible (`12 §4`).
- Expired/invalid share IDs, retired presets and deleted generations need designed states, not 404s
  (`16 §8`); `retired-preset-card.tsx` and `preset-not-found.tsx` already exist and should be reused.

---

## 6. Collision rules for fixed chrome

Only one fixed bottom element at a time:

- Docked action bar present ⇒ tab bar hidden (create, result, checkout, share page).
- Tab bar present ⇒ page bottom spacer = `64 + safe-area`.
- Docked bar present ⇒ spacer = `64 + 64 + safe-area`, and toasts anchor above the docked bar.
- Overlays (T2/T3) hide both and manage their own safe-area padding.
- Sticky page sub-headers (search/filter on `/explore`) stick under the app header with a 1 px hairline
  and must not exceed 56 px.

---

## 7. Search architecture

Three entry points exist today: the landing "Search looks" pill, the header search, and
`search-palette.tsx` (cmdk, full-screen on mobile). Rules:

1. One implementation — the palette — behind all entry points.
2. Full-screen on mobile (T3), keyboard auto-focused, `Cancel` top-right.
3. Before typing: **Recents** (chips, clearable) + **Trending looks** (Phantom
   `0202396e-5091-419e-a89c-4cec70717e4f`, Monday.com `c605fc0b-fefc-4866-b3cc-b0fa045de2c9`,
   Arc Search `241884ed-0b87-428c-ac02-6af02985320c`).
4. While typing: grouped results (Presets / Categories / Your library) with thumbnails, 44 px rows.
5. No results: the query echoed, 3 suggested looks, and a link to `/explore`.
6. Selecting a preset opens the **quick sheet**, consistent with every other preset tap (`06 §3`).

---

## 8. Cross-surface consistency contract

Wherever a preset appears on mobile — landing feed, discover rails, explore grid, category page, search,
favourites, related presets — it must be:

- the same **card** (`03 §5.1`),
- opened by the same **quick sheet** (`07 §2`),
- with the same **primary action** (`Use this look` → `/app/create/[slug]`),
- and the same **favourite** control behaviour.

Wherever a generated image appears — result, library card, generation complete, share page — it must be:

- the same **card/stage** treatment,
- openable in the same **ImageViewer**,
- with the same **action set** (Download, Share, Save, Regenerate, Adjust, Try another look) presented
  in the same order.

These two contracts are the main measurable outcome of the whole program and are re-stated as acceptance
criteria in `19 §2`.
