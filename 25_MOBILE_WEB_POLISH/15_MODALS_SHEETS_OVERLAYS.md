# 15 — Modals, Sheets, Popovers, Drawers & Overlays

Surfaces: `components/ui/dialog.tsx` (`useDialogA11y`, `Dialog`), `dropdown-menu.tsx`,
`preset-quick-sheet.tsx`, `paywall-sheet.tsx`, `auth-modal.tsx`, `auth-gate-modal.tsx`,
`share-dialog.tsx`, `credit-confirm-dialog.tsx`, `insufficient-credits-dialog.tsx`,
`edit-account-dialog.tsx`, `notification-dropdown.tsx`, `user-dropdown.tsx`, `explore-menu.tsx`,
`search-palette.tsx`, `aspect-ratio-menu.tsx`, `studio-stage.tsx`'s source sheet.

---

## 1. The problem

There are at least **eleven** overlay implementations. `useDialogA11y` is a good shared primitive
(focus containment, initial focus, focus return, scroll lock) and several sheets already use it, but
each surface re-implements its own markup, animation, dismissal set, scrim opacity, radius, safe-area
handling and header layout. The result on mobile is inconsistent dismissal behaviour (some close on
scrim tap, some don't), inconsistent geometry, and no integration with browser Back — the single most
important dismissal affordance on mobile.

---

## 2. The tier model

| Tier | Name | Height | Use |
| --- | --- | --- | --- |
| **T1** | Action sheet | content, ≤50 dvh | 2–6 choices, confirms, pickers |
| **T2** | Content sheet | 60–92 dvh | quick view, paywall, auth, share, notifications, filters with few options |
| **T3** | Full-screen | 100 dvh | search palette, filter modal, image viewer |

Desktop mapping: T1 → dropdown/popover anchored to the trigger; T2 → centred dialog (`max-w-lg`);
T3 → centred dialog (`max-w-4xl`) or overlay for the viewer. **One component, two presentations**,
switched at `sm`.

---

## 3. Assignment of existing overlays

| Overlay | Tier (mobile) | Change |
| --- | --- | --- |
| `preset-quick-sheet` | T2 | add drag handle, swipe dismiss, history integration |
| `paywall-sheet` | T2 | already correct; move onto the shared `Sheet` |
| `insufficient-credits-dialog` | — | fold into the paywall sheet with a viewport switch |
| `auth-modal` / `auth-gate-modal` | T2 | merge into one |
| `share-dialog` | T2 | convert from centred dialog |
| `credit-confirm-dialog` | T1 | convert |
| `studio-stage` source sheet | T1 | already correct; move onto the shared `Sheet` |
| `aspect-ratio-menu` | T1 | convert from menu to sheet on touch |
| `notification-dropdown` | T2 | convert from dropdown |
| `user-dropdown` | T2 | convert from dropdown |
| `explore-menu` | T2 | convert |
| `edit-account-dialog` | T2 | convert |
| `search-palette` | T3 | already correct |
| Filter modal (new) | T3 | new |
| Image viewer (new) | T3 | new |

---

## 4. Anatomy

### T1 — action sheet

```
[ scrim: ink-950/80 ]
┌──────────────────────────────┐  rounded-t-2xl, bg ink-950
│ ▂▂ handle (optional)         │
│ Title (optional, 15px/600)   │
│ [ row 1 ]  56px              │
│ [ row 2 ]                    │
│ [ Destructive row ]  red     │
├──────────────────────────────┤
│ [ Cancel ]  56px             │
└── safe-area inset-bottom ────┘
```

### T2 — content sheet

Handle → optional sticky header (title + X) → scrollable body → optional pinned action area with
safe-area padding. Max height 92 dvh so the surface beneath remains visible (it signals dismissibility).

### T3 — full screen

Header row (`X` or `←` + title + optional action) → full-height body. No scrim (it covers everything).

Shared visual rules: scrim `ink-950/80`; radius `rounded-t-2xl` (T1/T2); enter 200 ms ease-out translate
+ fade, exit 150 ms; under `prefers-reduced-motion` enter/exit is an instant opacity swap.

---

## 5. Dismissal contract (all tiers)

Every overlay must close on **all** of:
1. Scrim tap (T1/T2).
2. Explicit control (`X`, `Cancel`, or `←`).
3. `Escape`.
4. **Browser Back** — the missing piece today.
5. Downward swipe past 25 % or a flick (T1/T2; T3 viewer only).

Back integration: on open, `history.pushState({ overlay: id })`; on close by any other means,
`history.back()` if the entry is still ours; on `popstate`, close without pushing. Implement once in the
shared `Sheet`; never per-surface. Guard against double-pop when two overlays stack.

Exception: overlays mid-destructive-confirmation or mid-payment may require an explicit choice — they
still close on Back but must not lose entered data.

---

## 6. Stacking

- Maximum two overlay layers. A T2 that needs another T2 **replaces** it with a labelled back
  (e.g. paywall → plan details).
- Allowed stack: T2 + T1 (e.g. share sheet → confirm disable link).
- z-index ladder: nav 30, docked bar 40, scrim/overlay 50, nested overlay 60, toasts 70.
- Only the topmost overlay traps focus; the one beneath is `aria-hidden` and inert.
- Scroll lock is applied once (reference-counted), not per overlay — nested overlays must not restore
  scrolling when the inner one closes.

---

## 7. Accessibility requirements

- `role="dialog"` + `aria-modal="true"` + an accessible name (`aria-label` or `aria-labelledby`).
- Focus moves to the first interactive element or the panel; focus returns to the trigger on close
  (already handled by `useDialogA11y` — keep it as the engine of the new `Sheet`).
- Tab is contained; Shift+Tab wraps.
- The drag handle is decorative (`aria-hidden`); swipe is never the only dismissal.
- Sheets that contain forms must scroll the focused field above the keyboard.
- Announce opening only via the dialog name — no extra live regions.

---

## 8. Mobile-specific pitfalls to handle in the shared component

1. **iOS viewport units**: use `dvh`, never `vh`, for sheet heights (already used in places).
2. **Keyboard resize**: use `visualViewport` to keep pinned action areas above the keyboard, or hide the
   pinned area while a field is focused and rely on `enterkeyhint` submission.
3. **Scroll chaining**: `overscroll-behavior: contain` on the sheet body so scrolling it doesn't scroll
   the page.
4. **Safe areas**: every pinned area pads with `env(safe-area-inset-bottom)`.
5. **Body scroll restoration**: preserve and restore `scrollY` (iOS loses position with
   `overflow: hidden` in some cases — prefer position-fixed locking with restoration).
6. **Backdrop blur cost**: limit `backdrop-filter` to small elements; a full-screen blurred scrim is a
   measurable scroll-jank source on mid-range Android.

---

## 9. Work items

| # | Item | Files |
| --- | --- | --- |
| 15.1 | Build `Sheet` (T1/T2/T3) on `useDialogA11y` with the full dismissal contract, history integration, safe areas, `overscroll-behavior` | new `components/ui/sheet.tsx` |
| 15.2 | Reference-counted scroll lock | `dialog.tsx` |
| 15.3 | Migrate the 11 overlays per §3 | listed files |
| 15.4 | z-index ladder as documented tokens/constants | `globals.css` or a constants module |
| 15.5 | Keyboard-aware pinned action areas (`visualViewport`) | `Sheet` |
| 15.6 | Remove dropdown-on-mobile usages | `notification-dropdown.tsx`, `user-dropdown.tsx`, `explore-menu.tsx`, `aspect-ratio-menu.tsx` |
| 15.7 | Overlay tests: dismissal set, focus return, stacking, Back | `components/consumer/__tests__` |

Acceptance criteria: `19 §13`.
