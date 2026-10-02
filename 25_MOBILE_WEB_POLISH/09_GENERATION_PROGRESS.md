# 09 — Generation Progress (`/app/generations/[id]`)

Surfaces: `app/(app)/app/generations/[id]/page.tsx`, `lib/generation/stages.ts`,
`lib/generation/poll.ts`, `components/consumer/five-pixel.tsx` (`GenerationPixelProgress`).

---

## 1. Current state — already close to the researched ideal

The page polls every 4 s, renders a source-photo context card (thumbnail, preset name, credit cost), the
five-pixel motif, a status title/body, a **vertical stage checklist** with check / pulsing-dashed /
muted states over four stages, a long-wait warning, terminal branches (View result / Try again / Choose
another look), a credit-refund note on failure, and the reassurance that the user may leave. Completed
runs redirect to the result after 1.2 s.

This is essentially the Coinbase/World App honest-staging pattern (`02 §3.1`) with 5Pixels' own motif,
and it respects the "never fake a percentage" rule (`01 §1.3`). The remaining work is mobile
presentation, continuity and recovery — not a redesign.

---

## 2. Gaps

1. **Layout is centred/desktop-shaped.** `items-center justify-center` with `max-w-md` and `py-12`
   yields a vertically centred card; on a 375×812 screen the content floats with large dead margins and
   the terminal CTAs land mid-screen rather than in the thumb zone.
2. **No continuity from create.** The source thumbnail is 48 px in a context card, while the create page
   just showed it full-bleed. The transition feels like a different app.
3. **Stage descriptions are unused.** `GENERATION_STAGES[].description` ("This usually takes under a
   minute") exists in code but is never rendered — exactly the per-stage explanatory line the research
   recommends.
4. **No elapsed-time signal** other than the long-wait threshold message.
5. **No cancel affordance** and no explicit "Go to Library" action; the user's only escape is browser
   Back or the bottom nav.
6. **Poll failures** surface as a small warning line; there is no retry control and no backoff/visibility
   handling (polling continues in a background tab).
7. **Completion is abrupt** — a 1.2 s redirect with no visual handoff.
8. **Multi-output presets** have no placeholder model (Luma's per-output tiles, `01 §1.3`).

---

## 3. Target mobile composition

```
[app header: ← Library                        ]
────────────────────────────────────────────────
[ source photo, full-width, 4:5, dimmed to 55% ]
   overlay: five-pixel motif, centred
   overlay chip (bottom-left): "Cyber Punk · 5 credits"
────────────────────────────────────────────────
Applying the look                       20px/600  (stage title)
This usually takes under a minute       14px muted (stage description)
Started 34s ago                         13px muted, ticking
────────────────────────────────────────────────
✓ Preparing your image
✓ In the queue
◐ Applying the look          ← current, tinted row
○ Refining details
────────────────────────────────────────────────
You can leave — we'll keep it in your Library.
[ Go to Library ]        secondary, full width
[ Cancel this run ]      ghost, only while cancellable
```

Rationale: the photo *is* the context (Lensa keeps the image above the spinner, `01 §1.3`), the stage
checklist is the honest progress model (`02 §3.1`), and the escape routes sit in the thumb zone instead
of being a sentence of prose.

---

## 4. Behaviour

### 4.1 Polling

- 4 s while visible; pause when `document.visibilityState === "hidden"`; poll immediately on
  re-visibility.
- Exponential backoff to 8 s after 60 s, 15 s after 3 min, to reduce battery/data cost on mobile.
- Three consecutive poll failures → replace the inline warning with a `StateBlock`-style panel:
  "We can't reach the status service" + `Check again` + `Go to Library`. The run is still executing; say
  so explicitly.

### 4.2 Elapsed time and long waits

- Show `Started Ns ago` / `N min ago` from `createdAt`.
- At the existing long-wait threshold, keep the current warning copy and add a secondary action
  `Notify me when it's done` when notifications are enabled (`14 §4`), otherwise `Go to Library`.

### 4.3 Completion handoff

- On `completed`: the stage list collapses into a single ✓ row, the dim lifts, and the result image
  cross-fades in over the source (200 ms, disabled under reduced motion), then redirect after ~800 ms.
- The result page must render the same image in the same position so the transition reads as one
  continuous surface (`10 §2`).

### 4.4 Failure, blocked, cancelled

Keep the current three-way branch and the credit-refund note (this is a trust-critical detail and is
already right). Mobile changes:
- Actions stack full-width in the thumb zone; `Try again` primary, `Choose another look` secondary.
- `blocked` (content moderation) gets its own copy: state what was rejected in non-accusatory language,
  confirm the credit outcome, and link to the content guidelines. Never show provider or model detail.
- Add `Report a problem` (opens feedback) for `failed` only.

### 4.5 Cancellation

If the backend supports cancelling a queued run, expose `Cancel this run` as a ghost action that opens a
T1 confirm sheet naming the consequence ("Your credits will be returned"). If it is not supported,
omit the control rather than showing a disabled one → `20 Q6`.

### 4.6 Multiple outputs

When a preset emits N outputs, render N placeholder tiles in a 2-col grid under the stage list, each
filling in as it completes (Luma, `01 §1.3`). Layout must not shift when they arrive.

---

## 5. Accessibility

- The status region keeps `aria-live="polite"` (already present) but must announce **stage changes
  only**, not every poll. Debounce announcements to one per stage transition.
- The pulsing current-stage icon must not be the sole indicator of "current": the tinted row background
  and font weight already carry it — keep both, and disable the pulse under `prefers-reduced-motion`.
- The five-pixel motif is decorative (`aria-hidden`); the textual stage list is the accessible source of
  truth.
- Elapsed time must not be announced (it would spam screen readers) — mark it `aria-hidden` and rely on
  stage announcements.

---

## 6. States

| State | Behaviour |
| --- | --- |
| Initial load | source skeleton + "Checking your transformation…" |
| Running | as §3 |
| Long wait | warning line + notify/library action |
| Poll failure | panel with `Check again` + `Go to Library` |
| Offline | banner: "You're offline — we'll keep working. Reopen to check." Polling pauses. |
| Completed | handoff per §4.3 |
| Failed / blocked / cancelled | per §4.4 |
| Not found | `StateBlock`: "This transformation isn't available" + `Go to Library` |

---

## 7. Work items

| # | Item | Files |
| --- | --- | --- |
| 9.1 | Mobile composition: full-width source stage, thumb-zone actions | `generations/[id]/page.tsx` |
| 9.2 | Render `stage.description` + elapsed time | same, `stages.ts` |
| 9.3 | Visibility-aware polling with backoff | `poll.ts`, page |
| 9.4 | Poll-failure panel with retry | page, `StateBlock` |
| 9.5 | Completion cross-fade + continuity with the result page | page, `result-view.tsx` |
| 9.6 | Blocked-state copy and guidelines link | `stages.ts` copy, page |
| 9.7 | Cancel affordance (conditional on backend support) | page + action |
| 9.8 | Multi-output placeholder grid | page |
| 9.9 | Debounced `aria-live` announcements, reduced-motion pulse | page |

Acceptance criteria: `19 §7`.
