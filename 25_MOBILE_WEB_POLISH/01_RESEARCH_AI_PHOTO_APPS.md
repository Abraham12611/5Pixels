# 01 — Research: AI Photo, Avatar & Image Products

Direct-category research. Each finding uses the seven-part frame from `00_INDEX_AND_METHODOLOGY.md §0.4`.
Screens are cited as `App — uuid`; view at `https://refero.design/screens/<uuid>`.

---

## 1. Lensa AI — the closest analogue to 5Pixels

Lensa is preset/pack-first (Magic Avatars, filter packs, "Select type" → "Select Styles"), which is
structurally the same proposition as 5Pixels: *the user picks a look, supplies a photo, and receives
images without writing a prompt*. It is therefore the single richest source in the corpus.

### 1.1 The step-numbered creation wizard

**Screens** — `c686c781-20d8-499e-a748-1d8b1eaed005`, `e3c03a97-a777-4ac7-8cee-fdc39790cbe8`,
`91a00ba5-8a17-4da5-8167-a1e0dc26e02b`, `7b47b07e-7ef0-481e-816a-bfb64108e386`,
`b05f8135-24d6-4aee-ba65-6fadd4c666d1` (Step 3 of 5, "Select Styles"),
`5f995868-ab5a-4a44-8684-03a207c7eebd` (Step 1 of 5, photo-suitability grid),
`a73f83ae-683c-4229-aa09-adb7a61881c1` ("Select type", two large cards).

**Observed pattern.** A fixed header renders `← Step 2` on the left and `Step 3 of 5` centred; the body
opens with a large bold H1 ("Select Styles"), then a horizontally scrollable category tab row
(Fantasy / Essential / Art / Time Machine), then a 2×2 grid of style tiles each with a selection
checkbox in the corner and a label beneath, then a constraint line ("You can select up to 10 styles at
a time"), then a **disabled** full-width `Continue` button that only enables once a selection exists.

**User problem.** "How long is this, where am I, what am I allowed to choose, and can I go back?"

**Why it works.** Three separate mechanisms: (a) *back-affordance labelling* — the back control names
the destination ("Step 2"), not a generic chevron, so reversal feels safe; (b) *constraint before error*
— the selection limit is stated up front instead of being enforced by an error toast; (c) *disabled
primary as a progress signal* — the CTA doubles as the completeness indicator, so no separate validation
message is needed.

**Small-screen behaviour.** Everything is a single column; the only horizontal scroll is the category
row; the CTA is the last element and is reachable by thumb.

**Platform fit.** Both. Nothing here depends on native APIs.

**5Pixels verdict.**
- **Adopt** the labelled back affordance and the "constraint stated before it is enforced" rule in
  `/app/create/[slug]` (`create-form.tsx`) and in the upload step (see `08`).
- **Adopt** the disabled-primary-as-progress signal for the Generate button, paired with an explicit
  reason line ("Add a photo to generate") rather than a silent disabled state.
- **Reject** the literal 5-step wizard. 5Pixels' create flow is one screen with at most two modes
  (upload → adjust). A wizard would add screens to a flow whose whole selling point is brevity. Where a
  Poster requires text input, that becomes a *section* on the create screen, not a step.

### 1.2 Photo-suitability education *before* upload

**Screen** — `5f995868-ab5a-4a44-8684-03a207c7eebd` (Step 1 of 5): a 2×3 grid of example portraits under
section headers that categorise *bad* inputs (e.g. "Weird (with artefacts)"), with a checkbox
acknowledgement and the step indicator above. Reinforced by the ToS explainer
`1cd1324b-8c15-4be5-b1d8-c5c2eaa679ad`, which literally documents "upload 10 to 20 photos" and what the
model does with them.

**User problem.** Users cannot predict whether *their* photo will work, and a bad input produces a bad
output they will blame on the product (and, in our case, will have spent credits on).

**Why it works.** Showing *negative* examples is far more effective than prose rules: recognition beats
recall, and a grid of "this will fail" images sets expectations in under two seconds.

**Small-screen behaviour.** Thumbnail grid of 3 columns at 375 px is legible because the failure mode
(blur, occlusion, artefacts) is visible even at ~100 px.

**Platform fit.** Both.

**5Pixels verdict.** **Adapt.** 5Pixels charges credits per generation, so the cost of a bad input is
real money. Add a compact, collapsible "What works best" strip to the create screen's empty upload
state: 3–4 small examples (good / too dark / face cropped / heavy filter) with one-word captions. Not a
separate step, not a modal — inline, above the upload dropzone, collapsible after first use
(`localStorage`). Spec in `08 §3`.

### 1.3 Honest, personality-bearing progress copy

**Screens** — `07749692-1b21-42b5-9b09-59c324be487b` ("Wait for it... AI is warming up..."),
`39f31832-7707-4cc7-b81c-d9ce343274da` ("Just a few moments more... Our AI likes to make an entrance").
Contrast with Luma AI `b3fc2a7a-af59-474b-9c90-6637f82feb74`: a 2×2 grid of placeholder tiles each with
its own spinner, the prompt echoed underneath, and the word "Generating" as status.

**Observed pattern.** Neither product fakes a percentage. Lensa uses an indeterminate spinner plus
rotating copy; Luma uses per-output placeholders that will be replaced in place.

**User problem.** Generation takes an unpredictable 10–60 s. A fake progress bar that stalls at 90 %
destroys trust; a bare spinner makes the wait feel longer than it is.

**Why it works.** Rotating copy converts dead time into brand time and signals liveness. Per-output
placeholders (Luma) additionally communicate *how many* results are coming and preserve layout, so the
arrival is not a layout jump.

**Small-screen behaviour.** Both keep the source/preview visible above the status area, so the user
retains context on a screen too small to show everything.

**Platform fit.** Both.

**5Pixels verdict.** **Adopt with discipline.** `/app/generations/[id]` already uses named stages
(Preparing / Applying / Refining / Finalizing) via `GenerationPixelProgress` — keep that, because named
stages are *more* honest than Lensa's spinner. Add: (a) the source thumbnail pinned above the stage
indicator (Lensa's context retention); (b) an output-count placeholder grid when a preset returns
multiple outputs (Luma); (c) rotating secondary copy tied to the *current stage*, never generic.
**Reject** any percentage that is not derived from real backend state. Spec in `09`.

### 1.4 The pack/result gallery and "Save all"

**Screens** — `f9b4b3f8-c320-4989-8254-db27a5dc721b` and `08fbc9d8-9d9e-4280-8617-19e948566eb4`
("Magic Avatars" → "Pack #1 / 50 avatars" card + an expectation-setting banner: *"You will never have
the same results! Every time AI generates unique avatars."* + primary `Create new avatars`);
`4855a6f1-772d-431f-874d-cb59451f1f83` (pack detail: back labelled "Magic Avatars", title "Pack #1",
right-hand **Save all avatars** action, results grouped under style headings like "Cosmic").

**Observed pattern.** The result surface is (1) a grouped gallery, (2) a bulk export action in the
header, (3) an explicit non-determinism disclaimer, and (4) a re-run CTA that is at least as prominent
as the save action.

**User problem.** After generation the user has three jobs: judge the output, keep it, and decide
whether to try again. Most result screens optimise only for the first.

**Why it works.** The disclaimer pre-empts the "why is it different this time?" support ticket. Bulk
save removes N taps. Making "create again" primary matches the actual repeat-usage behaviour of the
category — the modal user generates several times per session.

**Small-screen behaviour.** Header-anchored bulk action keeps the grid full-bleed; grouping by style
gives scannable section headers instead of an undifferentiated wall.

**Platform fit.** Both. On mobile web, "Save all" must become a zip download or sequential downloads —
a caveat, not a blocker.

**5Pixels verdict.**
- **Adopt** the non-determinism disclaimer near Regenerate ("Each run is unique — results will differ").
- **Adopt** re-run prominence: on mobile, Regenerate must be equal-weight with Download, not buried in a
  secondary rail (`result-actions.tsx` currently orders Download → Regenerate → Adjust → … which is
  correct in order but wrong in visual weight on mobile; see `10 §4`).
- **Adapt** bulk save only if/when a preset emits multiple outputs; otherwise skip.

### 1.5 Before/After presentation

**Screens** — Lensa `2dd93459-7c7e-468b-9546-7c457e83d2fb` (store pack page: side-by-side
Before/After images with labels in dark rounded chips, description, bright CTA "Buy Now for $9.99",
"Restore Purchases" beneath); Lensa `e15b630e-02b4-4691-ba03-4a19995059ee` (a vertically split
before/after with handwritten-style labels plus a horizontally scrollable reference strip);
Hims `606d6bce-8936-48df-bfdc-ab394cc0a2d6` (carousel of split before/after testimonial cards with
"Month 0"/"Month 5" labels, verified badge, and a variability disclaimer in small grey text);
Alive `6ee1c298-a39b-4d33-8477-2efe7a5f1bdd` (two labelled BEFORE/AFTER slots side by side).

**Observed pattern.** The category's dominant comparison device on mobile is a **static split or
side-by-side with persistent labels**, not a draggable slider.

**User problem.** "What exactly did this do to my photo?"

**Why it works.** A static split is readable in a screenshot, works during scroll, requires no gesture
discovery, and never conflicts with page scrolling. Draggable sliders on touch fight vertical scroll and
break for one-handed use.

**Small-screen behaviour.** Side-by-side halves at 375 px are ~180 px wide — enough for a face crop,
which is why Hims crops tightly.

**Platform fit.** Both; the *slider* variant is the one that degrades on touch.

**5Pixels verdict.** **Adopt**, and it validates the existing design-system rule that landing previews
use short MP4/GIF rather than sliders. For `/app/results/[id]`, keep the existing toggle model
(`result-view-switch.tsx` → result / original) but add a third **Split** mode rendering a static 50/50
with `Before`/`After` chips, since the toggle alone forces the user to hold two images in memory.
Spec in `10 §3`.

### 1.6 The "empty photos" activation screen

**Screen** — Lensa `14fea5e8-4748-4fa2-b3f1-0da1c183ba0a`: an empty Photos tab with a large add-tile, an
arrow pointing at "Let's go!", the sub-line "Just add your photo here and let Lensa work its magic",
and a bright yellow `Magic Avatars` CTA above the tab bar.

**Why it works.** The empty state *is* the onboarding: one target, one sentence of promise, one CTA, and
a pointer that removes ambiguity about which element to touch.

**5Pixels verdict.** **Adopt** the structure for `/app/library` and `/app/favorites` empties: one visual
target, one promise sentence, one lime CTA to `/explore`, and a second-line secondary link. Spec in `16 §4`.

---

## 2. Meta AI / WhatsApp AI surfaces — the "editing chrome over media" model

### 2.1 Full-bleed media with floating chrome

**Screens** — WhatsApp `42bc34ba-23be-4e5c-b462-be74889d8940` (dark AI style/filter editor: black
canvas, circular back button, centred brand lockup, chip row of styles, thumbnail carousel);
Meta AI `5f86cc76-42eb-4d03-8920-2927112133ce` ("Edit image": near-black canvas, light-grey pill action
at top right, a bottom sheet titled "Suggestions" containing tappable suggestion rows);
Meta AI `d9c452e6-696c-4472-ab9a-e2e79a3020e9` (white variant with circular menu button, centred
truncated title, right-hand rounded pill cluster of edit + overflow).

**Observed pattern.** Chrome is *floating and circular* over the media rather than a solid bar: 44 px
circular buttons with soft shadows at the corners, a centred truncated title, and any secondary controls
grouped into a single rounded "pill cluster" instead of scattered icons.

**User problem.** On a small screen the media is the content; a solid toolbar steals 10 % of the canvas.

**Why it works.** Floating circular controls read as controls at any background luminance (they carry
their own contrast surface), keep the media full-bleed, and group related actions so the tap-target map
stays simple.

**Small-screen behaviour.** Excellent — it is *designed* for the 375 px case. The risk is contrast over
bright imagery, solved with a translucent scrim behind the circle.

**Platform fit.** Both.

**5Pixels verdict.** **Adopt** for `/app/results/[id]` and any full-screen image viewer: a full-bleed
result stage with a floating circular Back (top-left), a floating pill cluster (share + overflow,
top-right), and the action set in a bottom sheet/bar rather than a side rail. This is the single biggest
structural change recommended for the result surface. Spec in `10 §2`.

### 2.2 Suggestions-as-next-actions in a bottom sheet

**Screen** — `5f86cc76-42eb-4d03-8920-2927112133ce`: below the edited image, a bottom sheet headed
"Suggestions" lists concrete next edits as tappable rows.

**Why it works.** It converts a dead end ("here's your image") into a branch point, using
recognition-level prompts instead of asking the user to invent the next step. It is also the natural
mobile home for actions that would otherwise be a desktop sidebar.

**5Pixels verdict.** **Adapt.** On the result screen, the equivalent of "Suggestions" is
*"Try this look next"* — 3 related presets (we already have `related-presets.tsx`) plus "Adjust and
re-run". Present them in the result's scrollable lower region, not a separate page. Spec in `10 §6`.

### 2.3 Likeness setup with staged consent (flow 13392, 16 steps)

**Flow** — Meta AI "Your Likeness Setup": profile entry → intro + AI disclosures → face capture →
upload progress → *optional* up-to-three additional photos (skippable) → permission configuration
(radio choices for who may use your image) → back to settings → voice enrolment → mic permission →
guided reading → saved → settings shows photo, permissions and voice as manageable items.

**User problem.** Handing your face to an AI product is a trust decision, not a form.

**Why it works.** Consent and capability are interleaved: disclosure *before* capture, permissions
*immediately after* the asset exists (when the stakes are concrete), and a settings surface where every
enrolled asset is visible and revocable. "Optional, skippable" steps keep the happy path short.

**Small-screen behaviour.** One decision per screen; progress is implied by a short, obviously finite
sequence.

**Platform fit.** iOS-native for capture; the *structure* is portable.

**5Pixels verdict.** **Adapt, partially.** 5Pixels does not enrol a likeness, but it does upload a face
photo and retain outputs. Adopt two things: (a) a one-line, plain-language retention/usage statement at
the point of upload, linking to `/app/account/privacy` (not a wall of legal text); (b) making every
uploaded source and output visible and deletable from account surfaces. **Reject** multi-step consent
wizards — our upload is a single asset with a single purpose. Spec in `08 §7` and `14 §5`.

---

## 3. Krea.ai, Leonardo.Ai, Playground, fal — web-native generation UIs

### 3.1 Krea.ai mobile web

**Screens** — `4957450f-82cb-4ed5-80d5-041b6b239369`, `30e74c13-7777-40f9-9190-6a2e51869091`,
`6f628a31-6d76-4fa8-b51c-fe1807059da4` (landing/home), `a66a4058-8933-4790-a607-635f603e66cd`.

**Observed pattern.** A tool-first web product that on narrow viewports collapses its workspace into a
stack: media first, controls in a sheet/drawer, the primary action pinned. Marketing and product share
one dark visual language, so the transition from landing to app has no visual seam.

**Why it works.** Users arriving on mobile web (usually from a link, usually once) need the product to
*look like the same thing* before and after sign-in; a seam here reads as a bait-and-switch.

**5Pixels verdict.** **Adopt** the "no seam" principle: `/` (marketing) and `/app` (product) must share
type scale, card geometry, chip styling and CTA treatment on mobile. Today `landing-mobile.tsx` and the
`/app` discover page differ in card radius, section spacing and heading scale. Normalise via the shared
mobile section primitives proposed in `03 §9`.

### 3.2 Leonardo.Ai — workspace and intro guide (flows 12893, 12905)

**Flow 12893** (10 steps): configure model/style/dimensions/quantity/privacy → prompt → generate →
results feed → open a result in detail → follow-up actions (edit in canvas, remix, upscale, create
video, use as reference).
**Flow 12905** (6 steps): a first-run guided tour that highlights, in order, the prompt box, the generate
button, the model selector, references/elements, the prompt generator, and the info button that re-opens
the guide.

**User problem.** Generation tools have many controls whose consequences are invisible until after you
spend something.

**Why it works.** (a) *Settings are grouped before the action*, so the mental model is "configure, then
run". (b) The *result detail view is the launchpad for iteration*, not a terminus. (c) The tour is
re-openable from a persistent info affordance — discoverability without a one-shot modal the user
dismisses and can never find again.

**Small-screen behaviour.** The desktop sidebar of controls does **not** survive at 375 px; the mobile
equivalent must be a controls sheet or an accordion above the CTA.

**Platform fit.** Web; the tour pattern is universal.

**5Pixels verdict.**
- **Adopt** "result detail is the launchpad": the result screen must offer Regenerate / Adjust /
  Try another look as first-class actions (we already do; `10` upgrades their mobile prominence).
- **Adapt** the re-openable guide: a small `?` in the create screen header opening a 4-card
  "How 5Pixels works" sheet, dismissible and re-openable. **Reject** an intro tour that blocks first use.
- **Reject** the model/quality selector entirely — it violates the private-intelligence rule. Our
  equivalent surface is the preset itself plus schema-driven controls.

### 3.3 Playground / Gizmo / ElevenLabs — the photo-picker sheet

**Screens** — ElevenLabs `f49df7d6-3188-411e-bac1-c95dfc5b1eff` (bottom-sheet picker: circular close
left, `0/1` counter centre, circular confirm right; first row is two large tiles, "Select from gallery"
and "Take a photo"; below, a two-column thumbnail grid with ring selection indicators);
Gizmo `40f1d24f-554f-407b-a3c8-0000f1aebf9c` / `3aeadaeb-f255-4499-954f-91bd469079ce` (preview card
occupying the top ~60 %, draggable sheet with a 3-column grid below, accent FAB to confirm);
Revolut `ed62e921-a02a-42ce-b97f-68d71c8a5091` (background picker: close + title, category tabs, big
`Upload` tile, horizontal recents strip whose first item is a camera tile, then `Choose from Gallery`);
Claude `43917ad6-17b0-4231-bab7-ead2a31382eb` and Lensa `830de043-1530-4b49-b254-858059f431ec` /
`707d9347-b06e-47cd-9ea7-569ecdfa04bb` (system-style pickers: Cancel / segmented Photos|Albums / Add,
search field, 4-column grid, selection checkmarks, "Show Selected (2)" summary bar).

**Observed pattern (consistent across five products).** A source-choice surface that offers **camera**
and **gallery** as equal, large, labelled tiles; a **selection counter** in the header; a **confirm
affordance that stays put** (header-right or a FAB), and recents/previously-used assets offered as a
horizontal strip.

**User problem.** "Where does the photo come from, how many can I pick, and how do I commit?"

**Why it works.** Tiles beat a hidden OS action sheet because the choice is visible and one tap closer;
the persistent counter+confirm pair means the user always knows state and exit.

**Small-screen behaviour.** The sheet leaves the preview visible above, preserving context.

**Platform fit.** Mobile web can reach the same result with a single `<input type="file"
accept="image/*">` plus `capture` for camera; it cannot render the OS gallery inside our sheet. So we
adopt the *structure* (two labelled entry tiles + recents) and let the OS take over after the tap.

**5Pixels verdict.** **Adapt — partly already built.** `studio-stage.tsx` already detects
`(pointer: coarse)` and opens a source sheet offering "Take a photo" and "Choose from gallery", which is
exactly the researched pattern. Three gaps remain: (a) the *dropzone itself* still speaks desktop
("Drop your photo here", "browse your files") on touch; (b) there is no **recents** strip for reusing a
previously uploaded source, which Revolut and ElevenLabs both provide; (c) there is no selection
counter/confirm because we take a single file — acceptable. Spec in `08 §2`.

### 3.4 Luminar — export/save options (flow 5099, 6 steps)

Export opens a modal offering `Save to Photos` (replace original), `Share`, `Save a Copy`, plus format
and quality controls; the editor state is preserved on return.

**Why it works.** It separates three genuinely different intents (keep, send, duplicate) that products
often collapse into one ambiguous "Export".

**5Pixels verdict.** **Adapt, simplified.** Mobile web has no "replace original" concept, and format
choice is over-engineering for V1. Our three intents are **Download**, **Share link**, and **Save to
Library**, which `result-actions.tsx` already implements — the finding validates keeping all three
*distinct and labelled* rather than merging Save and Download. Spec in `10 §4`.

### 3.5 ChatGPT — selection-based edit (flow 7022, 9 steps)

Full-screen viewer → `Select` → paint a mask with a brush-size slider and undo/redo → `Next` attaches the
selection to the composer → type instruction → send → processing status → result in thread.

**Verdict for 5Pixels.** **Reject for V1** (masking + free-text instruction is precisely the prompt-first
model we avoid), but **note for V2**: the *sub-pattern* worth keeping is "the viewer is the entry point
to iteration, and the iteration request carries context forward". Recorded in `20` as an open question.

---

## 4. Apple Image Playground, Picnic, Playground — packaging and paywall proximity

- **Apple Image Playground** `f43a13fc-521c-4921-bb1e-693b1097cb78` — themed generation with a
  constrained, tile-based idea picker; reinforces that *constrained choice is a feature*, which is the
  premise of preset-first.
- **Picnic** `83e59616-bbd7-4acc-8d68-8494b10446c4` and flow 11491 "Free Trial Subscription Onboarding"
  (8 steps) — the trial is introduced inside the creation journey, with the value demonstrated *first*.
- **Playground** `2e7aca8f-4b01-48ed-95c0-7e8ebdb43059` (flow 8991, "Birthday Card — edit & save",
  61 steps) — long-tail editing sessions in mobile; the sheer step count argues for autosave and
  resumability rather than a linear wizard.

**5Pixels verdict.** **Adopt** the "value before wall" ordering: never show the paywall before the user
has seen what the preset does. Our deferred-auth copy in `preset-quick-sheet.tsx` ("No account needed to
preview — sign in only when you generate") is the correct instinct and should be applied consistently to
credits: the paywall sheet should open at the moment of generation intent with the preset's own imagery
visible in it, not as a context-free plan grid. Spec in `13 §3`.

---

## 5. Category synthesis — what the winners agree on

1. **The media is the interface.** Chrome floats, controls collapse into sheets, canvases go full-bleed.
2. **Constrain, then explain the constraint.** Limits are shown before they are enforced.
3. **Never fake progress.** Rotating copy, named stages, per-output placeholders — not a fake percentage.
4. **Results are launchpads.** Regenerate/iterate is at least as prominent as save.
5. **Pick-source is a first-class screen**, with camera and library as equals.
6. **Comparison is static and labelled** on touch, not draggable.
7. **Consent and retention statements sit at the point of upload**, in one plain sentence.
8. **The paywall follows demonstrated value** and carries the context that triggered it.

Each of these maps to a concrete change in `05`–`14`, and each is restated as an acceptance criterion
in `19`.
