# 5Pixels — Create, Generation, Result, and Feedback Visual Prompts


# MASTER AGENT CONTEXT — paste once before running the visual prompts

You are the UI visual-generation agent for **5Pixels**, a premium preset-first AI image transformation product.

## Product truth

5Pixels is not a free-form prompt playground. Users browse curated **Presets / Looks**, choose one, upload one source image, optionally adjust only the small set of controls that preset exposes, then generate a transformation. Private generation instructions and model/provider routing remain hidden in canonical V1.

The experience must feel like a premium visual catalogue transitioning into a focused transformation studio.

## Visual language

Use this system consistently across every image you generate:

- Canvas: near-black / ink `#080A08` or `#0D100E`.
- Elevated surfaces: charcoal `#141714`, `#191D19`, occasionally `#242924`.
- Primary text: warm off-white `#F7F2E8`.
- Secondary text: muted warm grey around `#A6AAA4`.
- Muted metadata: around `#777D77`.
- Brand/action lime: `#82EA3A`; brighter highlight may use `#96F04C`.
- Warning: warm amber; error: restrained red; success: restrained green.
- Media should supply most of the page color. Do not flood the UI with lime.
- Typography: neutral, highly legible grotesk for UI/body; stronger editorial display face only for large marketing/section headings.
- Use a 5-based spacing rhythm: 5, 10, 15, 20, 30, 40, 60, 80, 120.
- Small controls ~10px radius; normal cards 15px; major media/modals 20px-ish. Avoid making every surface excessively pill-shaped.
- Use a subtle **five-square / five-pixel motif** for selected states, generation motion, credit meters, empty-state details, and small brand flourishes. Do not turn the interface into pixel art.

## Higgsfield inspiration rules

Take heavy inspiration from Higgsfield's:
- dense but elegant dark navigation;
- custom mega menus;
- small `NEW`, `TOP`, `TRENDING`, `PRO`-style badges;
- anchored dropdowns/popovers;
- media-first grids;
- floating/anchored action consoles;
- creation rail + large visual stage;
- powerful global Search palette;
- progressive pricing comparison;
- compact credit-aware account popover;
- calm account/billing settings pages.

But **do not copy Higgsfield one-for-one**. 5Pixels should be visually distinct, calmer, more curated, and preset-first.

## Canonical 5Pixels consumer vocabulary

Use:
Preset, Look, Transformation, Original, Result, Collection, Category, Trending, Save, Try this look, Regenerate, Adjust, Download, Credits.

Avoid:
prompt, system prompt, CFG, seed, inference, checkpoint, LoRA, scheduler, model routing, provider jargon.

## Rendering rules for every generated visual

1. Generate a **straight-on, orthographic high-fidelity web-app UI screenshot**.
2. No browser chrome unless a prompt explicitly asks for it.
3. No laptop/phone hardware mockup unless explicitly requested.
4. No perspective tilt, isometric angle, floating glass cards in 3D space, or decorative device scene.
5. Keep text legible and structured. Use exact UI copy supplied in the prompt where practical.
6. Do not invent new product features, routes, AI terminology, or social-network features unless a prompt is explicitly marked FUTURE/OPTIONAL.
7. Maintain exact visual continuity with all previously approved 5Pixels frames: same nav height, type scale, colors, radii, shadows, icon style, card treatment, and grid rhythm.
8. When a prompt says a page is a continuation of a previous one, preserve the same header/sidebars and continue the vertical content rather than redesigning the page.
9. Desktop default canvas unless otherwise specified: **1440×1024**.
10. Mobile default canvas unless otherwise specified: **390×844**.
11. If the visual is a component sheet, use a neutral dark documentation canvas and clearly separate variants.
12. Do not add fake generated-image content that distracts from the UI. Use tasteful editorial placeholder photography/artwork consistent with the preset category.
13. Show hover/focus/open states only when the prompt asks. Otherwise show the resting/default state.
14. Preserve accessibility: visible focus, enough contrast, touch-friendly controls, no critical state communicated only by color.

## Continuity command

Before generating every next visual, inspect the most recently approved 5Pixels visual(s) and reuse their exact design language. Treat previously approved frames as canonical references. Do not reinterpret the brand on each prompt.

## Sample-data note

Numbers such as `248 credits`, `2 credits`, sample dates, plan names, and preset names in these prompts are **visual-design placeholders** unless the product owner has separately locked them. Use them for composition but do not treat them as final commercial policy.


## V048 — Create Studio — first-use upload state

**Surface:** /app/create/midnight-premiere  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the core 5Pixels Create Studio.

Desktop composition:
- persistent global nav;
- left configuration rail about 340px;
- large visual stage filling the rest.

Left rail:
selected preset card `Midnight Premiere` with `Change`;
source section in empty state;
future controls visible but disabled/deemphasized if they require a source;
credit summary `2 credits`;
Generate area disabled until a source is valid.

Stage:
large centered source-image dropzone with `Drop or upload an image`, file types, and a small three-step hint strip: Upload → Adjust → Generate.

No free-form prompt box. No model selector in canonical V1.

### Continuity / must preserve
- Use V025 shell, V008 dropzone, V009 selector cards, V002 buttons.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V049 — Create Studio — drag-over state

**Surface:** /app/create/midnight-premiere  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the same Create Studio while a file is being dragged over the large stage upload zone.

The dropzone becomes clearly active with brighter border, restrained lime/five-pixel highlight, and copy `Drop image to use it`. Left rail remains unchanged. Do not turn the entire stage lime.

### Continuity / must preserve
- Exact same layout as V048; only drag-over state changes.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V050 — Create Studio — uploading / validating source

**Surface:** /app/create/midnight-premiere  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the Create Studio after a source file was chosen.

Stage shows a tasteful blurred/placeholder preview with upload/validation state.
Left source card shows thumbnail, filename shortened, and state `Checking image…`.
Use a subtle five-pixel loading motif.
Generate remains disabled.

Do not show fake progress percentage unless upload bytes are genuinely measurable; show a modest upload progress bar only for transfer, then switch to validation.

### Continuity / must preserve
- Same as V048.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V051 — Create Studio — source accepted, simple preset

**Surface:** /app/create/midnight-premiere  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the ready-to-generate state for a preset with only one user control.

Left rail:
preset thumbnail + Change;
accepted source thumbnail + Replace;
compatibility row `Great fit`;
one control `Crop / framing`;
Aspect Ratio card showing `4:5`;
credit summary `2 credits`;
large lime `Generate · 2 credits`.

Stage:
large source portrait inside a visible 4:5 frame, with subtle crop handles/fit boundaries but no Photoshop complexity.

This should feel much simpler than Higgsfield's parameter-heavy editor.

### Continuity / must preserve
- Preserve V048 layout. Activate controls using V009/V010 style.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V052 — Create Studio — source accepted, multi-control preset

**Surface:** /app/create/[cover-preset]  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a second Create Studio example for a preset that legitimately exposes more controls.

Left rail:
preset `Magazine Cover 02`;
source accepted;
compatibility `Good fit`;
controls:
- Cover title text field;
- Subtitle text field;
- Crop / framing;
- Layout variant selector with 3 named visual options;
- Output aspect `4:5`;
credit summary `3 credits`;
`Generate · 3 credits`.

Stage shows the original source within the target cover frame, but do not preview final AI styling before generation. Exact text-layout controls are consumer-facing because this preset adds deterministic composition.

### Continuity / must preserve
- Same Create architecture as V051; use form controls from V007.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V053 — Create Studio — aspect ratio popover open

**Surface:** /app/create/...  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate V051 with the Aspect Ratio card clicked.

Anchored popover lists:
1:1
4:5 selected
3:4
16:9
9:16

Selected row has checkmark and subtle active background. Keep the menu aligned to the card and inside viewport. Stage preview behind remains visible.

### Continuity / must preserve
- Same V051 layout; use V010 exact popover style.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V054 — Create Studio — soft source warning

**Surface:** /app/create/...  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a source-accepted warning state.

Left source section:
amber warning icon;
`This look works best with one clearly visible face.`
secondary `You can still continue.`

Stage shows the source with two people, explaining why the warning exists.
Generate remains enabled, but warning stays visible near the source section. Do not use only a toast.

### Continuity / must preserve
- Same layout as V051.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V055 — Create Studio — rejected source

**Surface:** /app/create/...  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the rejected-source state.

Left source section and stage show:
`We couldn't read that file.`
`Try JPG, PNG, or WebP.`
button `Choose another image`.

Generate is disabled. Preserve selected preset and any safe preset options. Use clear error icon/text, restrained red accent, not a scary modal.

### Continuity / must preserve
- Same layout as V048/V051.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V056 — Generation — queued

**Surface:** /app/generations/[id]  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the live Generation page in `Queued` state.

Large central card/stage:
source image thumbnail left;
preset thumbnail/name `Midnight Premiere`;
five-pixel progress motif;
headline `Getting things ready`;
small state `Queued`.

Below/side: compact options summary and `2 credits reserved`. Keep wording calm. Do not show a fake percentage. No result image yet.

### Continuity / must preserve
- Inherit V025 shell and V013 progress system.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V057 — Generation — applying look

**Surface:** /app/generations/[id]  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the same Generation page during the active stage:
headline `Applying the look`
five-pixel motif advanced to a later stage;
source/preset context remains;
secondary note `This usually takes a moment.`

Do not show an exact countdown or percentage.

### Continuity / must preserve
- Exact layout as V056; only stage changes.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V058 — Generation — refining details

**Surface:** /app/generations/[id]  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the same page at stage `Refining details`. Keep all geometry identical to V056/V057. Show the five-pixel stage indicator progressing and a subtle visual shimmer only inside the motif, not the whole page.

### Continuity / must preserve
- Exact same generation page.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V059 — Generation — taking longer than usual

**Surface:** /app/generations/[id]  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the same page in a slow-job state:
headline `Still working on it`
copy `This transformation is taking longer than usual. You can leave this page and come back.`
button `Go to Library` or `Keep waiting` as secondary options if navigation logic supports it.
State note `Your credits are still reserved.`

Do not imply failure. Do not invent an ETA.

### Continuity / must preserve
- Same generation layout as V056.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V060 — Generation failure — system failure

**Surface:** /app/generations/[id]  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a system-side failure state.

Headline:
`This transformation didn't finish.`
Supporting:
`Your 2 reserved credits were released.`
Actions:
lime/primary `Try again`
secondary `Adjust`
tertiary `Explore presets`

Show source + preset context. Use an error icon but keep page calm. No provider errors, stack traces, or technical codes.

### Continuity / must preserve
- Same generation page shell as V056.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V061 — Generation failure — source issue

**Surface:** /app/generations/[id]  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a source-specific failure state.

Headline:
`Try a different photo`
Copy:
`We couldn't get a reliable result from this image.`
Action:
`Replace image`
secondary `View tips`

Show `No credits charged` or accurate release wording. Use source thumbnail and keep selected preset visible.

### Continuity / must preserve
- Same generation failure family as V060.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V062 — Result page — desktop success

**Surface:** /app/results/[id]  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the primary desktop Result page.

Large transformed image dominates the left/center. Right or lower utility column contains:
preset name `Midnight Premiere`;
small metadata `2 credits · Sep 10`;
feedback `Love it / Not quite`;
compact actions.

A floating/anchored Result action bar includes:
Download prominent;
Save;
Compare;
Regenerate;
Adjust;
Try another preset.

Use clean success composition with lots of black space around the media. No celebratory confetti.

### Continuity / must preserve
- Use V014 action bar and V025 shell.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V063 — Result page — portrait output variant

**Surface:** /app/results/[id]  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the same Result page for a tall 4:5 portrait output. Keep the image vertically large with adequate breathing room. Action bar and metadata remain in the same system, adapting around the portrait rather than stretching it.

This visual verifies layout robustness across output aspect ratios.

### Continuity / must preserve
- Same Result system as V062.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V064 — Result comparison — slider desktop

**Surface:** Result sub-state  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Result in comparison mode with a clear Original/Result slider over the main image.

Labels `Original` and `Result` remain visible. Slider handle is elegant, keyboard-capable in implementation, and not oversized. A close/back-to-result control exits comparison. Keep the Result action bar reduced but still accessible.

### Continuity / must preserve
- Same Result page as V062. Only comparison mode changes.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V065 — Result feedback — Not quite sheet

**Surface:** Result sub-state  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the Result page with the `Not quite` feedback popover/sheet open.

Options:
Doesn't look like me
Wrong style
Strange details
Bad text
Composition issue
Other

Use compact selectable rows. Optional text field appears only if Other is chosen, but do not show it in this visual. The result image remains visible behind the overlay.

### Continuity / must preserve
- Same Result page as V062.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V066 — Result feedback — submitted/recovery

**Surface:** Result sub-state  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the Result page after feedback `Doesn't look like me` was submitted.

Show a small non-blocking confirmation:
`Thanks — that helps us improve this preset.`
Then contextual recovery:
`Adjust` and `Regenerate`.

Do not hide Download/Save. The user remains in control of the result.

### Continuity / must preserve
- Same V062 result layout.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V067 — Adjust from Result — Create restored

**Surface:** Result → Create  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Create after the user clicked `Adjust`.

Reuse the exact Create Studio. Source and preset are preserved; previous selections remain. Add a small `Previous result` thumbnail/history chip near the stage or rail so the user understands they are adjusting an existing attempt, not editing the result itself.

Generate shows the new credit cost.

### Continuity / must preserve
- Exact Create architecture from V051/V052.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V068 — Try another preset — source-aware Explore

**Surface:** Result → Explore  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a source-aware Explore state after `Try another preset`.

Keep the standard Explore grid, but add a compact sticky/banner context near the top:
small source thumbnail;
`Choose another look for this photo`;
`Change photo` tertiary action.

Preset cards show compatibility where helpful. Selecting one routes back to Create with the same source. Keep the banner subtle so Explore still feels like discovery.

### Continuity / must preserve
- Base on V039 Explore grid.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V069 — Create recent-history drawer — optional — OPTIONAL/FUTURE

**Surface:** Create history  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the Create Studio with a compact `History` drawer open.

Drawer shows the last 4 attempts for the current source/preset:
thumbnail;
status;
time;
Open result / Retry where relevant.

Keep it secondary and visually smaller than Library. Include one failed attempt showing `2 credits released` in muted metadata.

### Continuity / must preserve
- Same Create Studio as V051.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---
