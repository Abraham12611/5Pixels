# 08 — Create, Upload & Studio (`/app/create/[slug]`)

Surfaces: `app/(app)/app/create/[slug]/page.tsx` + `create-form.tsx`, `studio-stage.tsx`,
`generation-controls.tsx`, `aspect-ratio-menu.tsx`, `setting-tile.tsx`, `credit-confirm-dialog.tsx`,
`insufficient-credits-dialog.tsx`, `paywall-sheet.tsx`, `auth-gate-modal.tsx`, `control-preview.tsx`,
`lib/anonymous-draft.ts`.

This is the money surface: everything before it is browsing, everything after it is consequence.

---

## 1. Current state

`create-form.tsx` renders a two-part layout: a **configuration rail** (`order-last` on mobile, so it
sits *below* the stage) containing the preset context card, a source status line, the preset controls,
the output-size tile and a sticky "generate console" (cost, balance, anonymous note, paused notice,
Generate button); and the **`StudioStage`** (drop target / preview / submitting overlay).

Already good, and validated by research:
- Coarse-pointer detection opens a **source action sheet** with "Take a photo" / "Choose from gallery"
  — the ElevenLabs/Revolut/Gizmo pattern (`01 §3.3`).
- A privacy line sits inside that sheet ("Your photo stays private — used only for this result").
- Anonymous users can prepare and are gated only at Generate, with the draft persisted
  (`anonymous-draft.ts`) — this is the "value before wall" ordering (`01 §4`).
- A 3-step strip ("Add a photo → Adjust the look → Generate") sets expectations.
- Cost and balance are shown before commitment, and a first-run cost confirmation exists.

Mobile problems:
1. **Order and reachability.** On mobile the stage is first and the console is in a rail below it that
   also *contains* the controls; the Generate button is sticky at
   `bottom-[calc(4.25rem+safe-area+0.5rem)]` — i.e. floating above the bottom nav. Two stacked fixed
   elements compete for the thumb zone (`04 §6`).
2. **Desktop language on touch.** The empty stage says "Drop your photo here / browse your files /
   one photo per transformation" and shows a 300 px dashed drop rectangle — a desktop metaphor.
3. **No recents.** Users who generate repeatedly must re-pick the same photo from the OS picker.
4. **Suitability guidance is one line** ("One clear photo works best"), not the researched visual
   guidance (`01 §1.2`).
5. **Replace/Remove controls** are absolute-positioned at `bottom-8` over the preview and are small
   text buttons (<44 px) that may overlap the docked console on short viewports.
6. **Controls are always mounted but disabled** until a photo exists; on a small screen this is a long
   dead region between the stage and the CTA.
7. **Submitting overlay** covers the stage with a 256 px card, hiding the photo — the opposite of the
   researched "keep context visible" rule (`01 §1.3`).
8. Two different insufficient-credit surfaces (`PaywallSheet` on narrow, `InsufficientCreditsDialog`
   otherwise) — correct instinct, but the breakpoint logic (`isNarrow`) must match the sheet tier rules
   in `15`.

---

## 2. Target mobile composition

```
[app header: ← Cyber Punk            ⓘ]        labelled back to origin
──────────────────────────────────────────────
[ SOURCE ZONE ]
  empty:   [ Take a photo ]  [ Choose photo ]   two 1:1 tiles, side by side
           Recent uploads  ▸ thumb thumb thumb  (when available)
           Works best with ▸ 4 example thumbs   (collapsible, first-run open)
  filled:  [ preview, aspect = selected size ]
           chips over media: Original · Replace · Remove   (44px, top-right)
──────────────────────────────────────────────
[ ADJUST — collapsed accordion, count badge ]   only when controls exist
   · plain-language control rows
   · Output size row → T1 picker sheet
[ Poster text — when type = poster ]
──────────────────────────────────────────────
[ DOCKED BAR ]
   Cost 5 credits · Balance 12            13px row
   [ Generate · 5 credits ]               lime, 48px
   "Add a photo to generate"              reason line when disabled
```

- Bottom nav is **hidden** on this route; the docked bar is the only fixed bottom element.
- The `ⓘ` in the header opens a re-openable "How it works" T2 sheet (Leonardo's re-openable guide,
  `01 §3.2`) — 3 cards, dismissible, never blocking first use.

---

## 3. Upload step details

### 3.1 Source chooser (empty state)

Two equal tiles instead of a dashed drop rectangle on touch:

| Tile | Icon | Label | Sub-label | Input |
| --- | --- | --- | --- | --- |
| Left | camera | Take a photo | Use your camera | `<input type="file" accept="image/*" capture="user">` |
| Right | images | Choose photo | JPEG, PNG, WebP · up to 20 MB | `<input type="file" accept="image/jpeg,image/png,image/webp">` |

Keep the existing source sheet for the case where a single entry point is preferable (e.g. the
`Replace` action), and keep drag-and-drop on fine-pointer devices only.

### 3.2 Recent uploads rail

When the user has prior source assets, show up to 6 as 64 px thumbnails. Tapping one reuses the asset
(the `ReusedSource` path already exists for the Adjust flow — extend it). This removes the most repeated
friction in the create loop and mirrors Revolut's recents strip (`01 §3.3`).

### 3.3 "Works best with"

4 thumbnails with one-word captions: `Clear`, `Too dark`, `Cropped face`, `Heavy filter` — one positive,
three negatives (Lensa's negative-example grid, `01 §1.2`). Collapsible; auto-collapsed after the user's
first successful generation (`localStorage`).

### 3.4 Validation and warnings

`ALLOWED_TYPES` and `MAX_SIZE` (20 MB) already exist. The mobile presentation must distinguish:

| Class | Example | Presentation |
| --- | --- | --- |
| Rejected | wrong type, >20 MB | inline error under the source zone, red, with a `Choose another photo` action |
| Warning | very small resolution, extreme aspect | amber inline note, generation still allowed, one line |
| Accepted | ok | no message; the preview is the confirmation |

Never use a toast for a rejected upload (`03 §7`).

### 3.5 Upload progress

The existing three progress strings map to a 3-segment inline bar under the preview, not a modal
overlay. The photo stays visible. If the upload fails: inline error + `Retry upload` that reuses the same
file object, without re-picking.

---

## 4. Controls ("Adjust")

- Rendered as a **collapsed accordion** headed `Adjust the look (3)`; expanded automatically when the
  preset has ≤2 controls.
- Each control is a row: plain-language label, current value on the right, tap → T1 sheet for choices,
  or an inline 44 px-thumb slider for ranges.
- Control names must never leak schema keys or model parameters.
- `control-preview.tsx` thumbnails should be shown inside choice sheets where available — showing the
  effect beats naming it.
- Output size is a row in the same accordion (`Square 1:1 ▸`), opening `AspectRatioMenu` as a T1 sheet.
- Posters get a dedicated "Your text" section with the field(s), a live character count, and a note that
  text is rendered exactly as typed.

---

## 5. The docked generate bar

- Contents: cost/balance line, then the primary.
- Label always carries the cost: `Generate · 5 credits`.
- Disabled states always carry a reason: no photo → "Add a photo to generate"; paused → "Generation is
  paused — try again shortly"; uploading → "Finishing upload…".
- Pending: `Generating…` with a spinner; the bar remains visible and the page is not overlaid.
- Anonymous: label stays `Generate · 5 credits`; tapping opens the auth sheet with the draft preserved
  (existing `AuthGateModal` + `saveStudioDraft` behaviour, which is correct).
- Insufficient credits: opens `PaywallSheet` (T2) carrying the preset name and the shortfall
  ("You need 5 credits — you have 2").

---

## 6. Submission experience

Replace the full-stage blocking overlay with:
1. The preview stays visible and dims to 60 %.
2. A 3-step inline indicator under the preview using the existing step strings.
3. The docked bar shows `Starting…` and is disabled.
4. On success, the existing server-side redirect to `/app/generations/[id]` takes over; the transition
   should feel continuous — the generation page opens with the same source thumbnail in the same
   position (`09 §2`).
5. On error, the page stays, the error is inline above the docked bar, and the source/controls are
   preserved so a retry costs nothing.

---

## 7. Privacy and retention at the point of upload

One line, always visible in the source zone (not only inside the picker sheet):

> Your photo is private, used only for this result, and you can delete it any time in
> [Privacy](/app/account/privacy).

This is the adaptation of Meta AI's staged-consent principle (`01 §2.3`) to a single-asset flow: the
statement sits where the asset is created and links to where it can be revoked.

---

## 8. States

| State | Behaviour |
| --- | --- |
| Anonymous | full preparation allowed; auth sheet at Generate; draft restored after auth |
| No credits | paywall sheet at Generate; preserved state on return |
| Paused | prepare allowed, Generate disabled with the existing explanation |
| Upload failed | inline error + retry with the same file |
| Offline | docked bar disabled, banner "You're offline — we'll keep your photo and settings" |
| Preset retired mid-session | notice + `Find a similar look` |
| Returning with a draft | "We kept your photo and settings" one-line confirmation |

---

## 9. Work items

| # | Item | Files |
| --- | --- | --- |
| 8.1 | Mobile composition: hide bottom nav, single docked bar, reordered sections | `create-form.tsx`, `mobile-bottom-nav.tsx`, `DockedActionBar` |
| 8.2 | Touch-first source chooser (two tiles), keep drop zone on fine pointers | `studio-stage.tsx` |
| 8.3 | Recent uploads rail + reuse | `studio-stage.tsx`, `create-form.tsx`, source asset query |
| 8.4 | "Works best with" module, collapsible | new component |
| 8.5 | 44 px Replace/Remove chips repositioned clear of the docked bar | `studio-stage.tsx` |
| 8.6 | Controls accordion with plain-language rows + T1 choice sheets | `generation-controls.tsx`, `aspect-ratio-menu.tsx`, `setting-tile.tsx` |
| 8.7 | Non-blocking submission indicator | `studio-stage.tsx`, `create-form.tsx` |
| 8.8 | Cost-in-CTA label, reason lines for every disabled state | `create-form.tsx` |
| 8.9 | Upload error classes (reject/warn/accept) inline | `create-form.tsx`, `lib/generation/validation` |
| 8.10 | Privacy line in the source zone | `studio-stage.tsx` |
| 8.11 | Re-openable "How it works" sheet from the header `ⓘ` | new component |

Acceptance criteria: `19 §6`.
