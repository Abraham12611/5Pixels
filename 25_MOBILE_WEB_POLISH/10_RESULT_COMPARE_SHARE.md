# 10 — Result, Compare, Download & Share

Surfaces: `app/(app)/app/results/[id]/page.tsx`, `result-view.tsx`, `result-compare.tsx`,
`result-view-switch.tsx`, `result-actions.tsx`, `result-details.tsx`, `result-feedback.tsx`,
`share-dialog.tsx`, `app/s/[shareId]/page.tsx`.

The result is the product. Everything upstream is a promise; this surface delivers it, and it is also
where retention (regenerate, try another look) and growth (share) are won.

---

## 1. Current state

`result-view.tsx` stacks `ResultCompare` above an `aside` containing `ResultActions`,
`ResultViewSwitch`, `ResultDetails` and `ResultFeedback`. On mobile that means: a `min-h-[52dvh]` stage
followed by a vertical stack of everything else.

`ResultCompare` supports three modes — `result`, `original`, `compare` — where compare is a
**pointer-draggable divider** with `Original`/`Result` labels and a keyboard-accessible
`role="slider"` handle.

`ResultActions` order: Download → Regenerate → Adjust → cost line → Try another look → Share → Save to
Library.

`ShareDialog` creates/disables a public link, uses `navigator.share` when available, copies otherwise,
and states privacy plainly.

`/s/[shareId]` renders the preset name, the image, `Try this look` and `Explore more looks`.

---

## 2. Gaps

1. **The result is not the hero on mobile.** A 52 dvh stage with a full action stack beneath means the
   image competes with six buttons. The researched pattern is image-first with floating chrome
   (Meta AI, `01 §2.1`).
2. **Draggable compare on a phone.** A divider dragged with the same finger that scrolls the page is
   fiddly; `touch-none` on the frame also disables vertical scrolling over the largest element on the
   page. `AGENTS.md` already forbids draggable sliders on landing previews — the result stage should
   converge on the same static-first philosophy on mobile (`01 §1.5`).
3. **Flat action hierarchy.** Seven actions of near-equal weight. Research (Luminar `01 §3.4`) says
   separate *keep* (download/save) from *broadcast* (share) from *iterate* (regenerate/adjust).
4. **No full-screen viewer.** The user cannot zoom into the detail they paid for.
5. **Download on mobile web is ambiguous** — an `<a download>` to a signed URL behaves differently
   across iOS Safari, Android Chrome and in-app browsers; there is no guidance or fallback.
6. **Share dialog is a centred dialog**, not a bottom sheet, at mobile widths.
7. **Feedback sits below the fold** and is rarely seen.
8. **`/s/[shareId]` is centred desktop layout** with `min-h-screen` and `max-w-3xl`, and its CTA goes to
   the preset page rather than straight into creation.

---

## 3. Target mobile composition

```
[ immersive: no header bar ]
   ◄ back (floating)                    ⋯ more (floating)
[ RESULT IMAGE — full-bleed, object-contain over a blurred copy ]
   tap → ImageViewer (zoom)
   segmented control, floating bottom-centre over media:
        [ Result | Before | Split ]
────────────────────────────────────────────────
[ DOCKED ACTION BAR ]
   [ Download ]           lime, full width
   [ ⤴ Share ]  [ ♥ Save ]   two secondary, 50/50 row
────────────────────────────────────────────────
scrolls beneath:
   Make it again                             section
   [ Regenerate · 5 credits ]  [ Adjust ]
   "Each run is unique — this costs 5 credits."
   How did it turn out?                      feedback, inline
   ★★★★★  + optional note
   Details                                   preset, size, date, credits
   Try another look                          related rail → quick sheets
```

Rules:
- The image occupies ≥70 % of the first viewport.
- Exactly one primary (Download). Share/Save are secondary; Regenerate/Adjust live in a labelled
  section below the fold where intent is deliberate rather than accidental (they cost credits).
- The bottom nav is hidden; the docked bar owns the bottom (`04 §6`).
- `⋯` opens a T1 sheet: `Open original`, `Copy link`, `Report a problem`, `Delete`.

---

## 4. Compare on mobile

Keep three modes, change the mechanics:

| Mode | Mobile behaviour |
| --- | --- |
| Result | the generated image (default) |
| Before | the source image, with an `Original` badge |
| Split | a **static 50/50 split** with a centre hairline and both labels — no dragging |

- The switcher is a floating segmented control over the media, not a card in a side rail.
- A **press-and-hold** shortcut on the image reveals the original while held (a widely used, discoverable
  gesture in photo editors) with a "Hold to see before" hint shown once.
- Keep the draggable divider for fine-pointer/desktop viewports only; `touch-none` must never be applied
  to a full-width mobile element.
- Under `prefers-reduced-motion`, mode changes cross-fade at 0 ms (instant swap).

---

## 5. Download & save semantics

Three distinct outcomes must stay distinct (Luminar, `01 §3.4`):

| Action | Meaning | Implementation notes |
| --- | --- | --- |
| **Download** | file onto the device | `<a download>` to the signed URL; on iOS Safari the file opens in a new tab — show a one-time hint sheet: "Tap ⤴ then *Save Image*" |
| **Save to Library** | keep it in the 5Pixels account | current toggle; optimistic with undo |
| **Share** | create or reuse a public link or invoke native share | T2 sheet, §6 |

Additional rules:
- Download must mark the generation downloaded (existing `markGenerationDownloaded`) and show a
  confirmation toast with the filename.
- If the signed URL has expired, re-mint it silently and retry once before showing an error.
- For multi-output results, add `Download all` which downloads sequentially with progress (Lensa's
  "Save all", `01 §1.4`).

---

## 6. Share sheet (T2)

```
──── ▂▂ ────
Share your result
[ image thumbnail, 3:4, 96px ]  Cyber Punk
──────────────────────────────
[ Share… ]                     native share, when available
[ Copy link ]                  always
──────────────────────────────
Public link                     [ toggle ]
Anyone with this link can view this image.
Turning it off breaks existing links.
──────────────────────────────
Download instead                ghost link
```

- Creating a link is explicit and reversible (already true) — keep the plain-language privacy statement
  and make the consequence of disabling explicit.
- `navigator.share` should pass `title`, `text` and `url`; attempt `files` when the image blob is
  available and `navigator.canShare({files})` is true, falling back to URL sharing.
- Copy feedback is inline (the button becomes `Copied`), plus a toast — never only a toast.
- Convert the dialog to the shared `Sheet` at mobile widths (`15 §3`).

---

## 7. Public share page (`/s/[shareId]`)

This is an acquisition surface reached by strangers on phones (`02 §7.4`). Target:

```
[ image, full-bleed, capped at 80 dvh, object-contain ]
[ preset name, 22px ]   "Made with 5Pixels"
[ Make your own · free to try ]        docked lime CTA → /app/create/[slug]
[ Explore more looks ]                 ghost
```

- CTA goes **into creation** (`/app/create/[slug]`), not to the preset marketing page — the visitor has
  already seen the evidence.
- Full OG/Twitter metadata: the output image, the preset name, a neutral description. Required for the
  link to be worth sharing at all.
- Revoked/expired/invalid share IDs get a designed state ("This link is no longer available" + `Explore
  looks`), not a bare 404 (`16 §8`).
- No owner-only controls, no account chrome, no bottom nav.

---

## 8. Feedback

Keep `ResultFeedback` but move it inline under "Make it again", with a compact prompt
("How did it turn out?"), 5 tap targets ≥44 px, and an optional note that appears only after a rating is
given. Submission is silent (toast), never blocking, and never gates any other action.

---

## 9. States

| State | Behaviour |
| --- | --- |
| Loading | blurred source as the stage placeholder + skeleton action bar |
| Image failed to load | `StateBlock` in the stage: "We couldn't load this image" + `Try again` |
| Expired signed URL | silent re-mint, then error only if it fails twice |
| Not found / not owned | `StateBlock` + `Go to Library` |
| Offline | image from cache if present; Download/Share disabled with a reason |
| Multi-output | 2-col grid of outputs, tap to promote one to the stage |

---

## 10. Work items

| # | Item | Files |
| --- | --- | --- |
| 10.1 | Immersive mobile layout, image-first, floating chrome | `result-view.tsx`, `results/[id]/page.tsx` |
| 10.2 | Static Split mode + hold-to-compare; drag only on fine pointers | `result-compare.tsx`, `result-view-switch.tsx` |
| 10.3 | Docked action bar with Download primary; Regenerate/Adjust demoted to a section | `result-actions.tsx` |
| 10.4 | `ImageViewer` with pinch-zoom, counter, swipe-to-dismiss | new shared component |
| 10.5 | iOS download hint + expired-URL re-mint + `Download all` | `result-actions.tsx` |
| 10.6 | Share dialog → T2 sheet; native share with files; inline copy feedback | `share-dialog.tsx` |
| 10.7 | `⋯` overflow T1 sheet (open original, copy link, report, delete) | `result-actions.tsx` |
| 10.8 | Inline feedback placement | `result-feedback.tsx`, `result-view.tsx` |
| 10.9 | `/s/[shareId]` mobile-first redesign + OG metadata + revoked state | `app/s/[shareId]/page.tsx` |
| 10.10 | Related "Try another look" rail with quick sheets | `related-presets.tsx` |

Acceptance criteria: `19 §8`.
