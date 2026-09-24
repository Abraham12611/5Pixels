# 16 — Loading, Empty, Error, Offline & Degraded States

Every surface in `05`–`14` references this document for its state matrix. The rule: **a state is a
design deliverable, not a fallback.**

---

## 1. The state taxonomy

| State | Definition | Owner |
| --- | --- | --- |
| **Skeleton** | data is coming, shape is known | route `loading.tsx` / component |
| **Pending** | the user's action is in flight | the triggering control |
| **Empty (first-run)** | nothing exists yet, and that's normal | surface |
| **Empty (filtered)** | data exists but the filter excludes it | surface |
| **Error (recoverable)** | request failed, retry is meaningful | surface |
| **Error (terminal)** | not found, not permitted, revoked | surface |
| **Offline** | no network | app shell |
| **Degraded** | the product works partially (generation paused) | app shell |
| **Blocked** | policy rejection | generation flow |

---

## 2. `StateBlock` — the shared component

```
        [ icon or five-pixel motif, 40px ]
        Title                      17px/600, max 6 words
        One or two lines of plain     14px muted, max 140 chars
        language explaining what
        happened and what to do.
        [ Primary action ]            48px, full width (mobile)
        Secondary action              ghost link
```

Props: `variant` (`empty | error | offline | notfound`), `icon`, `title`, `body`, `primary`,
`secondary`, `motif` (keeps the ghost-card treatment already used in `library-grid.tsx`).

Placement: inside the content region, keeping the header and bottom nav — never a bare full-screen
takeover, so the user can always navigate away.

---

## 3. Skeletons

- Mirror the real composition: same grid, same aspect ratios, same radii (`03 §8`).
- Show only after 200 ms; once shown, keep for ≥400 ms.
- Text lines: 3 widths max (100 %, 80 %, 60 %); never animate more than a slow shimmer.
- Under `prefers-reduced-motion`, skeletons are static blocks.
- Routes that need one and lack it today: `/explore`, `/categories`, `/presets/[slug]` (has
  `loading.tsx` — verify it matches the mobile composition), `/app/billing/*`, `/app/account/*`,
  `/app/generations`.

---

## 4. Empty states (per surface)

| Surface | Title | Body | Primary | Secondary |
| --- | --- | --- | --- | --- |
| Library · Results | Your results will appear here | Pick a look and add a photo — it takes about a minute. | Browse looks | — |
| Library · Presets | Looks you save appear here | Tap the heart on any look to keep it handy. | Browse looks | 3 suggested looks |
| Library · Runs | No transformations yet | Your history shows every run and what it cost. | Browse looks | — |
| Explore (filtered) | No looks match these filters | Try removing a filter or two. | Clear filters | 3 suggestions |
| Search | No matches for "xyz" | Try a different word, or browse by category. | Browse all looks | 3 suggested chips |
| Notifications | You're all caught up | We'll tell you when a result is ready. | Notification settings | — |
| Billing history | No activity yet | Purchases and credit use will show up here. | Add credits | — |
| Favorites (empty) | see Library · Presets | | | |

Never use an empty state that only says "Nothing here".

---

## 5. Error states

Copy formula: **what happened (plain) → what it means for the user → what to do.** Never expose a stack
trace, a provider name, a model name or an internal status string (`AGENTS.md`).

| Class | Title | Action |
| --- | --- | --- |
| Network/fetch failure | We couldn't load this | `Try again` + `Go to Library` |
| Server error (5xx) | Something went wrong on our side | `Try again` |
| Not found | This isn't available | context-appropriate escape |
| Not permitted | You don't have access to this | `Go to Library` |
| Expired share link | This link is no longer available | `Explore looks` |
| Retired preset | This look has been retired | `Find a similar look` |
| Upload rejected | That file won't work | `Choose another photo` + the rule that failed |
| Payment failed | We couldn't complete the payment | `Try another card` |
| Generation failed | We couldn't finish this one | `Try again` + credit-refund statement |
| Generation blocked | We can't transform this photo | link to guidelines + credit statement |

Every error must be announced with `role="alert"` when it appears in response to a user action.

---

## 6. Offline

- Detect with `navigator.onLine` + `online`/`offline` events (and treat repeated fetch failures as
  offline-ish).
- Present a **persistent thin banner** above the content: "You're offline — some things won't work."
  It is not dismissible while offline and disappears automatically on reconnect.
- Rules while offline:
  - Browsing cached surfaces stays available.
  - Every credit-spending or network-committing CTA is disabled with a reason line.
  - Drafts (photo + settings) are preserved locally (`anonymous-draft.ts` already does this).
  - The generation page pauses polling and says so.
- On reconnect: remove the banner, revalidate the current surface, and show a one-line toast
  "Back online" only if the user attempted an action while offline.

---

## 7. Degraded mode

`degraded-banner.tsx` and the `generationPaused` prop already exist. Standardise the presentation:
- Banner text: "Transformations are paused right now. Browsing and your Library still work."
- Every Generate/Regenerate CTA disabled with the same reason line — never a silent failure.
- The paywall must not be reachable while generation is paused (do not sell what cannot be used).
- The banner appears once per surface, at the top of the content region, not stacked with the offline
  banner (offline wins).

---

## 8. Terminal pages

| Route | Composition |
| --- | --- |
| `not-found.tsx` | `StateBlock` + `Browse looks` + search entry |
| `global-error.tsx` | minimal, no app chrome dependency, `Reload` + `Go home` |
| `maintenance` | motif, expected-return language, status link if one exists |
| `error.tsx` per route segment | `StateBlock` with a segment-appropriate escape (exists for favorites and presets; add for explore, library, billing, account) |

All must be mobile-composed (single column, 20 px gutters, action in the thumb zone) and must not
depend on data that may itself be failing.

---

## 9. Timeouts and slow networks

- Any request exceeding 10 s shows an inline "Still working…" line rather than an indefinite spinner.
- Any request exceeding 30 s offers `Cancel` where cancellation is safe.
- Image loads have an explicit failure state (`StateBlock` inside the media frame with a retry), because
  signed URLs can expire.
- Optimistic UI (favourite, save, toggles) must revert visibly on failure with an inline explanation,
  not only a toast.

---

## 10. Work items

| # | Item | Files |
| --- | --- | --- |
| 16.1 | Build `StateBlock` and adopt it everywhere ad-hoc states exist | new `components/ui/state-block.tsx` + all surfaces |
| 16.2 | Add missing `loading.tsx` skeletons matching mobile compositions | listed in §3 |
| 16.3 | Offline detection + banner + CTA disabling | app shell |
| 16.4 | Standardised degraded-mode copy and CTA behaviour | `degraded-banner.tsx`, create/result surfaces |
| 16.5 | Per-class error copy map | shared copy module |
| 16.6 | Image-load failure + signed-URL re-mint | `product-media.tsx`, `result-compare.tsx` |
| 16.7 | Slow-request "Still working…" and cancel affordances | `poll.ts`, actions |
| 16.8 | Route-level `error.tsx` for explore, library, billing, account | those segments |

Acceptance criteria: `19 §14`.
