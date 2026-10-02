# 5Pixels Main App Design Research
## Higgsfield Reference Study — Batch 02

**Status:** Working research document. This is the second screenshot-study batch and should be read together with `5Pixels_Higgsfield_Reference_Study_Batch_01.md`.

**Scope of this batch:** continuation of Higgsfield Viral Presets discovery; a preset-specific generation/configuration studio; embedded onboarding / “How it works” media; History controls; compact parameter cards; dual-mode color controls; FPS and resolution popovers; pricing-plan cards; entitlement/gating visualization; an interactive plan recommender; plan comparison matrix; FAQ accordion.

**5Pixels source material governing this translation:**

- `00_README_MASTER_INDEX(1).md`
- `01_PRODUCT_OVERVIEW_AND_PRINCIPLES(1).md`
- `02_UI_UX_BIBLE_AND_DESIGN_SYSTEM(1).md`
- `03_SITEMAP_INFORMATION_ARCHITECTURE(1).md`

**Method:** Every screenshot is treated as a reference for interaction grammar, hierarchy, state handling, density, progressive disclosure, and conversion design. Higgsfield product concepts that conflict with 5Pixels are explicitly marked as references only, not requirements.

---

# 0. Executive synthesis

Batch 02 adds an important layer that Batch 01 did not show: **what happens after discovery when a user enters a preset/tool-specific creation experience, and how Higgsfield handles commercial complexity on its pricing surface.**

The strongest ideas in this batch are not the literal controls. They are the structural principles underneath them:

1. **Discovery can be high-density and almost captionless.** Higgsfield lets the media gallery itself act as navigation and product education. A hover/focus overlay adds the actionable layer only when the user expresses intent.
2. **A specialized creation workflow can use a two-plane layout:** configuration in a constrained rail; education, upload, result/history, and visual focus in a much larger stage.
3. **Complex settings remain understandable when each setting is represented as a self-contained card with one dominant value and a chevron.** The control does not look like an engineering form.
4. **A field can support multiple input modalities without exposing both at once.** Higgsfield’s color controls allow direct color choice or natural-language description using a tiny mode switch inside the same row.
5. **The primary Generate action continuously communicates cost.** The credit amount sits inside the CTA rather than being separated into legal/secondary text.
6. **Onboarding can live inside the productive workspace.** “How it works” is not a separate documentation center; it is adjacent to History and presented in the main stage with a mini tutorial carousel.
7. **Pricing is treated as a guided decision product, not merely a static table.** Higgsfield includes plan cards, nested entitlement callouts, a personalized recommender, a formal feature comparison, and FAQs.
8. **Commercial hierarchy is heavily visualized.** Different plan tiers, discounts, locked access, usage estimates, and recommendation states use contrasting cards, badges, crossed-out prices, progress bars, and emphasized CTAs.

For 5Pixels, the major strategic translation is:

> Use Higgsfield’s **interaction sophistication** while stripping away its model-centric complexity.

5Pixels should not copy FPS, model access, “unlimited model” language, or technical model entitlement grids. Instead, it can reuse the same component patterns for **preset compatibility, output format, fidelity mode, crop/aspect, credit cost, premium preset access, monthly transformation volume, and plan guidance.**

Batch 02 also refines one recommendation from Batch 01: 5Pixels likely benefits from **two creation surfaces rather than one universal layout**.

- A **Quick Create / contextual console** can appear from discovery and library surfaces.
- The dedicated `/app/create/[presetSlug]` route can use a **left configuration rail + large visual stage**, because this better supports upload validation, preset-specific controls, help, history, and responsive progression.

This division preserves Higgsfield’s immediacy without forcing every complex state into one floating bar.

---

# 1. Canonical 5Pixels constraints relevant to this batch

These are the rules that determine what may be translated from the reference.

## 1.1 The preset is the product

5Pixels users begin from a curated look. They are not asked to construct a generation from technical primitives.

**Implication for this batch:**

The Ink Riot tool’s left-side control rail is useful as a layout reference, but the top card in 5Pixels should communicate the selected **Preset / Look**, not an AI tool, model, or technical effect chain.

## 1.2 No generic prompt console in V1

The 5Pixels consumer should not be faced with a blank “describe what you want” box.

**Implication:**

Higgsfield’s “Write settings as prompt” interaction is not a license to expose a general prompt. However, its **dual-mode field pattern** can be reused for controlled semantic fields defined by a preset.

Example:

- direct background color picker;
- OR a controlled descriptor such as “warm ivory,” “deep midnight blue,” “soft grey.”

The user would still be editing a single preset-owned field, not writing the generation prompt.

## 1.3 Model/provider names should remain hidden from normal consumers

Higgsfield’s pricing page heavily sells access to individual models. 5Pixels currently treats models as infrastructure.

**Implication:**

Pricing should sell **outcomes and service levels**, not vendor access.

Potential consumer categories:

- monthly transformation credits;
- access to premium looks;
- output size / export quality where product-approved;
- priority generation;
- faster queue classes if applicable;
- commercial-use rights if legally/product-approved;
- storage/history limits if applicable;
- exclusive collections or early-access presets if desired.

Any of these remain product decisions; the key rule is that raw provider/model names do not become the commercial architecture by accident.

## 1.4 V1 excludes video generation and batch generation

The FPS controls in the reference do not map literally to current 5Pixels V1.

**Implication:**

Study the **control design**, not the FPS feature.

The same compact tile + popover grammar can power image-relevant settings such as:

- output aspect ratio;
- crop strategy;
- detail/fidelity tier;
- resolution if exposed;
- background treatment;
- typography variant for deterministic-composition presets;
- style intensity where a preset explicitly supports it.

## 1.5 Visual, premium, immediate, curated

This batch reinforces the current 5Pixels UI Bible. Higgsfield succeeds when it turns technical settings into visual cards instead of conventional dense forms.

**Implication:**

5Pixels should borrow this visual treatment selectively, while staying warmer, more editorial, and less tool-lab-like.

---

# 2. Batch 02 screenshot inventory

| Ref | Screenshot | Main surface observed | Primary relevance to 5Pixels |
|---|---|---|---|
| S11 | `10.10.37 AM` | Viral Presets masonry continuation | High-density discovery, card proportions, hover CTA behavior |
| S12 | `10.11.27 AM` | Ink Riot preset/tool studio — full layout | Dedicated create route, config rail, stage, onboarding, Generate cost |
| S13 | `10.11.48 AM` | Color-setting mode popover | Dual input modality, inline mode switch, descriptive settings |
| S14 | `10.11.57 AM` | FPS selector open | Generic anchored list popover, selected state, option density |
| S15 | `10.12.04 AM` | Resolution selector open | Compact output selector, minimal list popover |
| S16 | `10.14.06 AM` | Pricing plan cards / entitlements | Tier differentiation, lock/gating states, nested access cards, badges |
| S17 | `10.14.38 AM` | Pricing transition into plan finder | Long-form pricing architecture, helper links, personalized recommendation |
| S18 | `10.15.04 AM` | Interactive plan recommender | Numbered decision steps, sliders, feature chips, live recommended card |
| S19 | `10.15.25 AM` | Compare features table | Plan-column matrix, sticky-like heading, annual toggle, best-value emphasis |
| S20 | `10.15.40 AM` | Comparison tail + FAQ | Secondary CTA, accordion FAQ, long-page conversion closure |

---

# 3. Screenshot S11 — Viral Presets masonry continuation

## 3.1 What is visible

The screenshot shows the Viral Presets gallery after the introductory heading/filter section from Batch 01 has scrolled off-screen.

The top global navigation remains persistent. `Viral Presets` is still highlighted in fluorescent lime, while neighboring product destinations are visually muted.

Below the nav is a **full-width masonry gallery** with five uneven media columns. There is almost no explanatory text attached to idle cards. The grid is essentially a wall of imagery.

Visible media formats include:

- tall portrait imagery;
- landscape video/image frames;
- near-square editorial illustrations;
- cinematic stills;
- graphic treatments;
- surreal/fantasy imagery;
- street/fisheye content;
- collage/comic treatments.

The card heights vary substantially. The result resembles an editorial moodboard or visual social feed rather than a normalized e-commerce grid.

## 3.2 Grid rhythm

Important visual details:

- gutters are extremely narrow relative to card size;
- cards have subtle rounded corners rather than hard rectangles;
- the canvas itself remains black, so empty gutter space visually disappears;
- there is no white card shell around media;
- no persistent footer metadata consumes space;
- column widths appear relatively stable while row heights are content-driven;
- tall media can occupy significantly more vertical attention than landscape media;
- adjacent cards have different aspect ratios, creating a non-repeating rhythm.

The gallery’s visual density is intentionally high. The user can scan many aesthetic directions without scrolling through names, descriptions, and metadata.

## 3.3 Hover/focus overlay behavior

One card in the far-right column is in an active/hovered state.

Observed active state:

- media is dimmed with a dark translucent overlay;
- the preset name `WINDOWS` is centered and enlarged;
- a compact dark CTA appears underneath;
- CTA text/action is `Generate` with a sparkle icon and fluorescent text/accent;
- inactive cards remain pure media.

This is a strong example of **intent-revealed metadata**.

Idle state asks:

> “Do you like this visually?”

Hover state then asks:

> “Do you want to use it?”

The two questions are not shown simultaneously.

## 3.4 Why this matters for 5Pixels

The interaction aligns closely with 5Pixels’s outcome-first principle.

The most useful translation is:

- idle preset card = image/video preview only, plus very restrained badges if needed;
- hover/focus = preset title + `Try this look`;
- optional quick favorite icon appears only on hover/focus;
- credit cost may appear on authenticated surfaces, but should not dominate the visual scan;
- click on media/title can open preset detail;
- click `Try this look` can open quick create or route directly to `/app/create/[presetSlug]` depending user state.

## 3.5 Do not copy literally

Do not let every 5Pixels discovery surface become a Pinterest clone.

The canonical UI system favors broad gallery layouts and 3–4 card grids on desktop. Masonry is best reserved for a **high-energy discovery surface** such as Trending / Explore rather than every collection.

Suggested division:

- `/app` home: structured horizontal rails and curated sections;
- `/app/explore`: optional masonry/editorial mode;
- category pages: stable card grid for predictable scanning;
- favorites: stable grid;
- library: stable generation grid, optionally grouped by date;
- special seasonal/trending landing: more editorial/asymmetric composition.

## 3.6 Micro-interaction notes

Recommended adaptation:

- hover overlay fade: 120–180ms ease-out;
- card media scale: max 1.01–1.02 if used at all;
- CTA should appear through opacity/translate, not dramatic zoom;
- preview video should not restart unnecessarily when overlay appears;
- keyboard focus should produce the same title/CTA visibility as hover;
- on touch, first tap may reveal actions only if necessary, but preferably the entire card remains an obvious single target with a dedicated secondary favorite control.

## 3.7 Accessibility caution

Because Higgsfield’s idle cards are almost captionless, 5Pixels must ensure:

- each media tile has an accessible preset name;
- badges are not communicated by color alone;
- keyboard focus is visible;
- card hit areas are semantic links/buttons;
- motion previews respect reduced motion;
- hover-only actions remain discoverable on touch and keyboard.

---

# 4. Screenshot S12 — Preset-specific creation studio: overall architecture

This is the most structurally important screenshot in Batch 02.

## 4.1 Page composition

The page uses a two-column productive workspace under the global nav:

- **left rail:** narrow, fixed-width configuration panel;
- **right stage:** much larger visual area for guidance, upload, history/results, and instructional content.

The two areas are enclosed by subtle borders and dark surfaces rather than bright panel backgrounds.

The overall feeling is closer to a creative application than a conventional form page.

## 4.2 Left rail anatomy

From top to bottom:

1. preset/tool hero preview (`INK RIOT`);
2. `Change` button overlaid at the upper-right of the preview;
3. source-video upload area;
4. two compact output setting tiles: `FPS` and `Resolution`;
5. a larger grouped configuration card containing three color fields;
6. full-width lime `Generate` CTA displaying `160` credits/cost.

This rail is narrow enough that all configuration feels like **one coherent recipe**.

The large stage is not polluted by settings.

## 4.3 Preset preview and “Change” affordance

The selected preset is represented by a large visual card rather than text-only selection.

Important details:

- preview fills the card;
- preset name is burned into / composited with the preview artwork;
- `Change` is a dark floating button inside the card;
- pencil/edit icon precedes the label;
- the user can always tell what effect/tool is currently active.

### 5Pixels translation

This is highly relevant.

The dedicated create route should keep selected-look context visible continuously.

Possible 5Pixels header card:

- preset thumbnail or looping preview;
- preset name outside the artwork as accessible text even if artwork also contains typography;
- category and fidelity indicator in quiet metadata;
- `Change look` control;
- favorite button optionally nearby;
- no model/provider name.

Clicking `Change look` could open a large preset picker drawer/modal that preserves the source image and compatible user-entered fields where possible.

## 4.4 Source upload area

The screenshot shows a large drop zone directly underneath the preset preview.

Observed copy:

- `Drop or upload video`
- file-type guidance: MP4, MOV, or WebM.

The card has a gentle inset surface and a faint seam/arc between preview and upload region, visually joining them into one “input” block.

### 5Pixels translation

For V1:

- `Drop or upload a photo`
- accepted formats: JPG, PNG, WebP;
- optional `Choose photo` secondary button;
- after upload, replace drop zone with source thumbnail + file status;
- place compatibility feedback immediately under/inside this block;
- validation states from the UI Bible should be visually integrated rather than delegated to a toast.

## 4.5 Compact parameter tiles

Directly under upload are two equal-width setting tiles.

Each tile contains:

- small muted label at top (`FPS`, `Resolution`);
- strong current value below (`8 FPS`, `1K`);
- chevron at far right;
- medium charcoal background;
- rounded corners;
- no visible conventional select-box border.

The pattern makes a technical setting feel like a product card.

### 5Pixels translation

This is an excellent reusable **Setting Tile** component.

Candidate uses:

- Aspect ratio — `Portrait 4:5`;
- Crop — `Fit subject`;
- Output — `High detail`;
- Format — `JPG` / `PNG` if user-facing;
- Text layout variant — for cover/poster presets;
- Fidelity — `Preserve likeness` / `Creative` if a preset intentionally exposes it;
- number of outputs only in future scope, not V1 batch generation.

## 4.6 Grouped color controls

A larger card groups three related visual parameters:

- Background color;
- Mid layer color;
- Main object color.

Each row is presented as an independent sub-card / field.

Observed row anatomy:

- field label above or at the top;
- color swatch;
- hex value where direct color mode is active;
- a two-icon mode switch at the right;
- separate rows divided through surface contrast rather than heavy lines.

This demonstrates how a specialized preset can expose meaningful controls while keeping the experience curated.

### 5Pixels translation

5Pixels should allow **preset-defined control groups**.

Examples:

- `Text` group: title, subtitle, date;
- `Color` group: accent, background, paper tone;
- `Subject` group: crop, framing, intensity;
- `Environment` group: day/night, background softness;
- `Typography` group: layout variant, alignment, title casing;
- `Finish` group: grain, border, vignette—only if preset-approved.

The important rule is that users never see a universal “advanced AI settings” panel. They see controls that belong to the selected look.

## 4.7 Generate CTA with visible cost

The primary action is a full-width fluorescent button anchored at the bottom of the configuration rail.

Observed anatomy:

- sparkle icon;
- large `Generate` label;
- another small credit/spark icon;
- numeric cost `160` inside the same button.

The cost is not hidden in a line below the action.

### 5Pixels translation

Strong candidate:

`Generate   ◈ 2 credits`

or

`Generate · 2 credits`

depending final iconography.

Benefits:

- user understands the economic consequence before clicking;
- no detached “fine print” mental load;
- one action answers both “what happens?” and “what does it cost?”;
- insufficient-credit state can replace CTA content with `Get credits` or open the billing modal.

Do not use the same accent treatment for destructive or secondary buttons.

---

# 5. Screenshot S12 — Right stage architecture

## 5.1 Stage surface

The right side is a very large dark panel with a faint dotted-grid texture.

This background is important:

- it creates visual separation from the pure-black page shell;
- it implies a workspace without resembling graph paper too strongly;
- the dot density is subtle enough not to compete with central media;
- the stage can hold tutorial content, upload targets, or outputs without changing the page shell.

### 5Pixels translation

5Pixels can use a subtler version of the five-pixel motif instead of a generic dotted grid.

Ideas:

- sparse five-square constellations at very low opacity;
- a faint modular grid that occasionally resolves into five-pixel clusters;
- no neon cyber-grid;
- pattern should disappear perceptually behind the main image.

This could become the canonical background for `/app/create`, `/app/generations`, and perhaps result comparison surfaces.

## 5.2 Stage top controls

At the upper-left of the stage:

- `History` appears in a pill/button with a circular-arrow/clock icon;
- `How it works` appears adjacent with an info icon and lighter text.

`History` is visually more button-like; `How it works` is lower-emphasis.

This creates two secondary journeys without adding a sidebar tab system.

### 5Pixels translation

Potential top-stage controls:

- `Recent results` / `History`;
- `How this look works` / `Tips`;
- optionally `Examples`.

Do not create too many tabs. The selected preset and current source/configuration should remain the dominant task.

## 5.3 Embedded tutorial / onboarding frame

At center stage is a tall demonstration card/video frame. The current tutorial frame shows a bright lime upload box and a cursor graphic.

Below it:

- heading `UPLOAD IMAGE`;
- one-line instruction;
- miniature step thumbnails;
- selected step outlined/highlighted;
- previous and next circular arrow controls.

This is a lightweight carousel explaining the workflow **inside the actual production page**.

### Why this works

- first-time users get help where they need it;
- documentation is visual rather than textual;
- users can ignore it if they already understand the flow;
- each step demonstrates the actual interface;
- it does not block the left-side controls.

### 5Pixels translation

For first use of `/app/create/[presetSlug]`, the empty stage can teach:

1. Upload a suitable photo.
2. Check compatibility.
3. Adjust the look’s available options.
4. Generate.
5. Review and download.

But 5Pixels should personalize help to the preset when useful:

- “Best with one clearly visible face.”
- “Use a photo with space above the subject for the magazine title.”
- “Landscape photos will be cropped to 4:5.”

The tutorial should be dismissible and remember its state per user/device where privacy/product policy permits.

## 5.4 Stage as multi-state container

Although the screenshot only shows the guidance state, the architecture strongly suggests the right stage can switch among:

- tutorial / how-it-works;
- upload/source preview;
- history;
- generation progress;
- output/result;
- comparison;
- error state.

This is an important 5Pixels pattern: **keep the configuration rail stable while the stage changes state.**

The user never loses context about the look or settings.

---

# 6. Proposed 5Pixels dedicated-create layout derived from S12

Batch 01 proposed a floating Transformation Console over a gallery. Batch 02 suggests a better distinction between quick creation and full creation.

## 6.1 Quick Create

Use on:

- `/app` home;
- `/app/explore` hover/quick action;
- preset detail quick-start;
- library “try again” actions.

Pattern:

- compact modal/drawer/floating console;
- source image;
- selected preset;
- 1–2 most important controls;
- cost;
- Generate.

## 6.2 Dedicated Create page

Use `/app/create/[presetSlug]` for the full workflow.

Desktop composition:

### Left configuration rail

- selected preset hero + `Change look`;
- source upload / source thumbnail;
- compatibility status;
- preset control groups;
- output summary;
- credit cost;
- sticky Generate button.

### Right visual stage

- first-use tutorial before source upload;
- source preview after upload;
- crop/fit stage when required;
- generation status after Generate;
- result preview after completion;
- history drawer/panel if opened;
- help/tips overlay if opened.

This is cleaner than making the dedicated route look like a floating prompt bar.

## 6.3 Why this layout fits the sitemap

The canonical sitemap explicitly expects the Create route to contain source upload, source preview, preset controls, crop/aspect options when allowed, generation summary, credit cost, and Generate CTA.

The S12 layout maps almost directly to that information architecture while preserving a premium visual feel.

## 6.4 Desktop width behavior

Suggested proportions to test rather than copy:

- config rail: 360–440px depending viewport;
- main stage: remaining width;
- page gutters: 15–30px;
- stage and rail should visually align at top/bottom;
- Generate CTA remains sticky inside rail when configuration scrolls.

At very wide screens, do not let the config rail grow indefinitely.

## 6.5 Tablet/mobile translation

Tablet:

- rail may become 320–360px;
- stage remains primary;
- some control groups collapse into accordions.

Mobile:

- source/stage becomes primary top area;
- configuration moves into bottom sheets / stacked sections;
- sticky bottom Generate CTA;
- `Change look`, `Adjust`, and `Tips` become compact top actions;
- no horizontal desktop rail squeezed into phone width.

---

# 7. Screenshot S13 — Dual-mode field control

## 7.1 What is visible

A popover is anchored to the mode icons in the `Background color` field.

Inside the popover:

- a two-option icon toggle appears at the top;
- one icon represents color/palette mode;
- the other represents a sparkle/text/settings-description mode;
- below are two compact rectangular fields:
  - a color swatch + hex value `#F1F196`;
  - a natural-language descriptor `Soft warm color`;
- explanatory section beneath:
  - icon + heading `Write settings as prompt`;
  - copy explaining that the user can toggle between picking a color/tool and describing the look.

The popover is wide enough to educate without becoming a full modal.

## 7.2 Interaction model

The cleverness here is **mode substitution**, not mode addition.

The user chooses how to express one field:

- structured/direct input;
- natural-language semantic input.

The interface does not show two separate permanent fields.

## 7.3 5Pixels adaptation: controlled semantic input

5Pixels should not expose “prompt” as a product concept. A translated version could say:

- `Pick a color`
- `Describe a color`

or

- `Choose directly`
- `Describe the look`

The descriptive mode must remain scoped to the one field.

Examples:

### Magazine cover accent

Direct:
- swatch + hex/color picker.

Describe:
- `warm editorial red`.

### Background tone

Direct:
- preset swatches.

Describe:
- `soft cream`, `deep charcoal`, `cool studio grey`.

### Wardrobe tone

Structured:
- Black / Navy / Cream / Olive.

Semantic:
- `quiet luxury neutral` if the preset pipeline supports such controlled interpretation.

## 7.4 Guardrails

Do not allow the semantic field to become a hidden free-form escape hatch that rewrites the entire transformation.

System requirements:

- hard character limit;
- only the specific field is affected;
- placeholder gives domain examples;
- unsupported requests return field-specific guidance;
- private preset instructions remain server-side;
- user never sees the merged internal prompt.

## 7.5 UI anatomy worth reusing

Create a general `InputModePopover` component:

- anchored to a tiny segmented icon control;
- current mode visually raised/selected;
- 12–16px inner gap;
- short explanation below controls;
- closes on outside click/Escape;
- selection persists in that field;
- on mobile, render as bottom sheet.

## 7.6 When not to use it

Do not add dual-mode input to every field.

Use only where:

- both structured and semantic entry are genuinely useful;
- semantic entry is constrained enough to remain predictable;
- the preset backend explicitly supports it;
- it reduces friction rather than showcasing AI cleverness.

---

# 8. Screenshot S14 — FPS popover as generic anchored selector

## 8.1 Visible structure

The FPS setting tile opens a vertically stacked popover.

Popover content:

- title `Frames per second`;
- options:
  - 4 FPS
  - 8 FPS
  - 12 FPS
  - 16 FPS
  - 20 FPS
  - 24 FPS
  - Manual
- `8 FPS` selected;
- selected row receives a lighter charcoal background and checkmark at far right;
- `Manual` includes a secondary description `Choose frames manually`;
- other rows are single-line choices.

## 8.2 Geometry

The popover is significantly wider than the small initiating tile.

This matters: an anchored control can open into a larger decision surface without turning into a dialog.

Observed aesthetic:

- black/dark background;
- generous rounding;
- 10–15px row spacing;
- no radio circles;
- selected-state checkmark only;
- minimal title hierarchy;
- no “Apply” button—selection is immediate.

## 8.3 5Pixels translation

Use this pattern for finite options with 3–8 choices.

Examples:

### Aspect ratio

- Original
- 1:1
- 4:5
- 3:4
- 16:9
- 9:16

### Fidelity

- Preserve identity
- Balanced
- Creative

### Crop behavior

- Fit subject
- Fill frame
- Keep original crop

### Export quality

- Standard
- High
- Maximum

Only expose choices that are genuinely supported by the preset.

## 8.4 Microcopy principle

Only complex/ambiguous choices need a secondary descriptor.

Do not give every row two lines merely because space is available.

## 8.5 State rules

- selected option changes immediately;
- trigger tile reflects new value;
- option popover closes after simple selection unless multi-select/manual requires next step;
- disabled incompatible options remain visible only when explaining why helps the user;
- otherwise hide unsupported options and keep the preset simple.

---

# 9. Screenshot S15 — Resolution popover

## 9.1 What is visible

A compact popover anchored to the Resolution tile.

Content:

- heading `Resolution`;
- 1K selected in a full-width rounded row;
- 2K;
- 4K;
- selected row has checkmark on right;
- no explanations, price deltas, or technical details in the visible menu.

## 9.2 Design lesson

Higgsfield varies selector complexity according to the decision.

FPS had several choices and a manual mode, so its popover is taller and more explanatory.

Resolution has only three obvious options, so the popover is deliberately terse.

**Do not standardize every popover into the same height or information density.**

## 9.3 5Pixels application

If 5Pixels exposes resolution/output size:

- keep choices simple;
- communicate extra credit cost in-row only when it changes the transaction;
- if some presets are fixed-resolution, do not show the selector at all;
- use the preset as the default authority.

Example:

- `Standard` — 1 credit
- `High detail` — +1 credit

could be more consumer-friendly than `1K/2K` depending product positioning.

Raw pixel terminology should be used only when users actually benefit from it.

---

# 10. Creation-studio component taxonomy surfaced by S12–S15

Batch 02 adds the following reusable components to the 5Pixels system.

## 10.1 `PresetContextCard`

Contains:

- preview image/video;
- preset title;
- optional category/fidelity metadata;
- `Change look` action;
- optional favorite action.

States:

- default;
- hover/focus;
- unavailable/retired;
- loading preview.

## 10.2 `SourceDropzone`

States:

- empty;
- drag-over;
- uploading;
- validating;
- accepted;
- warning;
- rejected;
- replace source.

## 10.3 `SettingTile`

Contains:

- small label;
- dominant value;
- optional icon;
- chevron;
- optional locked/premium marker;
- optional cost delta.

## 10.4 `SettingGroup`

Container for related fields.

Examples:

- Color;
- Text;
- Composition;
- Finish.

## 10.5 `FieldInputModeToggle`

Tiny segmented icon control to switch between approved field input modalities.

## 10.6 `AnchoredChoicePopover`

Generic finite-choice popover with:

- optional title;
- selected row;
- checkmark;
- optional row description;
- keyboard navigation.

## 10.7 `GenerateCostButton`

Primary CTA containing:

- action;
- cost;
- loading state;
- insufficient-credit state;
- disabled/validation state.

## 10.8 `StudioStage`

Large stateful visual area.

States:

- tutorial;
- source preview;
- crop/fit;
- generating;
- result;
- history;
- failure.

## 10.9 `HowItWorksCarousel`

Contains:

- media frame;
- step heading;
- short instruction;
- thumbnails/step indicators;
- previous/next;
- reduced-motion fallback.

## 10.10 `HistoryStage`

Likely future surface inferred from the History action:

- recent runs for current preset;
- thumbnail + date/status;
- select result to restore view;
- regenerate / download shortcuts;
- no assumption that it replaces the full Library route.

---

# 11. Suggested 5Pixels create-page state machine

A single stable route can progress through these states without disorienting the user.

## 11.1 `EMPTY`

Left rail:

- selected preset;
- empty source dropzone;
- controls visible but disabled or partially available;
- Generate disabled.

Stage:

- tutorial/examples/compatibility guidance.

## 11.2 `UPLOADING`

Left rail:

- source progress;
- controls disabled if source dimensions affect compatibility.

Stage:

- optional blurred/placeholder preview;
- truthful upload language.

## 11.3 `VALIDATING`

Left rail:

- source thumbnail;
- visible validation state.

Stage:

- source preview;
- five-pixel loading motif.

## 11.4 `WARNING`

Example:

`This look works best with one clearly visible face.`

Actions:

- Replace photo;
- Continue anyway if product rules permit.

## 11.5 `READY`

Left rail:

- all compatible controls active;
- credit cost shown;
- Generate enabled.

Stage:

- source preview;
- framing/crop preview;
- optional example/reference context.

## 11.6 `GENERATING`

Left rail:

- controls locked or read-only;
- selected settings remain visible;
- button becomes in-progress state.

Stage:

- source image remains visible;
- stage copy uses canonical truthful phases:
  - Preparing your image
  - Applying the look
  - Refining details
  - Finalizing your result

No fake exact percentage unless technically supported.

## 11.7 `SUCCESS`

Stage:

- result becomes dominant;
- comparison control;
- result actions.

Left rail:

- settings remain visible;
- CTA changes to `Regenerate · 2 credits`;
- `Adjust` remains available.

## 11.8 `FAILURE`

Stage:

- human-readable failure explanation;
- explicit credit refund/release reassurance;
- retry or change source.

Do not rely on toast only.

---

# 12. Screenshot S16 — Pricing plan cards and entitlement hierarchy

## 12.1 Overall structure

The screenshot shows three pricing columns visible simultaneously: Basic, Pro, and Max.

The page remains inside the same global dark navigation shell.

Each plan card appears tall and modular rather than as one flat list.

Visible modules include:

- plan price and annual billing copy;
- large plan CTA;
- savings / no-difference note;
- an `UNLIMITED & FREE GENS` entitlement box;
- a specialized model-access box;
- a lower bullet feature list.

The plan is therefore communicated through **stacked capability zones**.

## 12.2 Plan-specific visual identity

The tiers use different emphasis:

- Basic: predominantly neutral charcoal/white CTA;
- Pro: olive/lime-tinted plan surface with fluorescent CTA;
- Max: magenta/pink-tinted plan surface and CTA;
- specialized access module: deep blue gradient card.

Higgsfield deliberately uses more than one accent color on pricing even though lime is its dominant interaction signal.

### Lesson for 5Pixels

5Pixels should be more restrained because its existing design bible says media should carry most color and lime should remain a signal.

Possible approach:

- all plan cards remain charcoal/ink;
- recommended plan gets subtle lime ambient tint or border;
- highest tier may use warm cream or pale-yellow detail rather than unrelated magenta;
- special access sections can use a secondary semantic tint only if needed.

Do not create a rainbow pricing page just because Higgsfield does.

## 12.3 Price presentation

Visible patterns:

- current price is large and bright;
- old price is struck through in vivid pink/red when discounted;
- `per month, billed annually` is quiet secondary text;
- savings are repeated directly below CTA;
- discount badges sit close to the pricing action.

This produces high commercial clarity.

### 5Pixels adaptation

Use one consistent annual-discount message.

Do not over-repeat savings in multiple colors unless testing proves useful.

Possible hierarchy:

1. plan name;
2. monthly effective price;
3. annual billing note;
4. monthly credits / transformation allowance;
5. CTA;
6. annual savings note.

## 12.4 Nested entitlement box

`UNLIMITED & FREE GENS` appears as a self-contained dark module inside each plan.

Rows show:

- check or x icon;
- model/capability name;
- small technical badge (`2K`);
- bright status badge (`7-day unlimited` / `No unlimited`).

The lower row `+ 7 unlimited & free generation models` acts as a compact expansion link.

### 5Pixels translation

Do not display model rows.

A similar nested module could show:

**PREMIUM PRESET ACCESS**

- Editorial Collection — Included
- Professional Portraits — Included
- Seasonal Drops — Early access
- Standard looks — Included

or

**MONTHLY TRANSFORMATIONS**

- 100 credits included
- Credits roll over: No/Yes if product supports it
- Extra credits: available
- Failed generations: refunded

The visual pattern is valuable; the content should be 5Pixels-native.

## 12.5 Locked entitlement representation

Basic shows a disabled/greyed module for no access to a specialized capability.

Important visual behavior:

- entire module is low contrast;
- lock icon and explanatory text state the gating rule;
- individual rows use x icons and `No access` tags;
- disabled state is still readable enough to explain upgrade value.

### 5Pixels use

Locked premium preset collections can use a similar pattern, but avoid humiliating or cluttering free users with dozens of disabled rows.

Prefer showing:

- what is available;
- one concise upgrade callout for locked premium content;
- clear preview of the value.

## 12.6 Specialized access card

Pro/Max contain a blue gradient card titled `ACCESS TO SEEDANCE MODELS`.

The card visually interrupts the neutral plan and marks a strategically important entitlement.

Rows include:

- icon;
- model name;
- resolution badge;
- `Full access` status badge.

### 5Pixels translation

Use this “spotlight entitlement card” sparingly for a genuinely differentiating benefit.

Possible future examples:

- `PREMIUM LOOKS INCLUDED`
- `PROFESSIONAL EXPORTS`
- `EARLY ACCESS COLLECTIONS`

Do not invent a special card for ordinary table stakes.

## 12.7 Lower feature list

Below modules is a simpler text checklist.

Observations:

- checkmarks for included features;
- x for unavailable;
- unavailable lines are significantly dimmed;
- certain features use link-like underlines/dotted underlines;
- bright micro-badges such as `New` and `60% CHEAPER` punctuate select rows.

This creates a clear hierarchy:

- major differentiators = visual cards;
- secondary differences = checklist.

That hierarchy is worth preserving.

---

# 13. Pricing architecture lesson from S16

A useful pricing page should not force every feature into one undifferentiated comparison list.

Suggested 5Pixels hierarchy:

## Tier 1 — Plan summary

- name;
- ideal customer phrase;
- monthly effective price;
- included credits;
- CTA.

## Tier 2 — 2–3 major differentiated capability cards

Examples only if product-approved:

- premium looks;
- export quality;
- processing priority;
- history/storage.

## Tier 3 — concise checklist

Secondary features.

## Tier 4 — full comparison table lower on page

For users who need exhaustive detail.

This is much easier to scan than trying to make plan cards exhaustive.

---

# 14. Screenshot S17 — Pricing transition and page pacing

## 14.1 End of plan-card section

After the main plan cards, the page includes:

- two inline helper links:
  - `How do Higgsfield plans work?`
  - `What are Unlimited models?`
- several lines of quiet legal/operational clarification;
- substantial whitespace before the next major section.

This is an effective pacing device.

Dense commercial content is followed by a low-density explanatory bridge.

### 5Pixels adaptation

Potential links:

- `How do credits work?`
- `What happens if a generation fails?`
- `Can I buy extra credits?`

Quiet clarification can cover:

- failed jobs do not permanently consume credits;
- prices exclude/include tax according to checkout jurisdiction;
- subscription renewal terms;
- plan changes.

Critical billing facts should also appear in FAQ / checkout—not only tiny copy.

## 14.2 “Find the best plan for you” transition

A large H1-style heading appears:

`Find the best plan for you`

Subcopy:

`Choose what you want to create and get what you need`

This changes the user’s mental mode from **comparison** to **guided selection**.

Below it begins a large two-column recommendation tool.

## 14.3 Recommendation section composition

Left side:

- questionnaire / configuration flow.

Right side:

- recommended plan card / result surface.

The design is conceptually similar to the creation studio:

> decisions on left, outcome on right.

This is a recurring Higgsfield product grammar.

### 5Pixels lesson

The same structural grammar can be reused across product areas:

- Create: controls left, visual result right;
- Pricing: needs left, plan recommendation right;
- Admin preset studio later: configuration left, preview/evaluation right.

Consistency at the **layout logic level** is more valuable than copying surface details.

---

# 15. Screenshot S18 — Interactive plan recommender

This screenshot provides enough detail to reconstruct the interaction model.

## 15.1 Left-side questionnaire hierarchy

The recommender uses numbered sections with a faint vertical guide line:

1. What are you here to make?
2. How many content items per month?
3. Features & capabilities

The numbered circles and vertical line create a lightweight stepper without forcing page-by-page wizard navigation.

All questions remain visible in one scrolling surface.

### 5Pixels translation

This is a strong model for a `Plan Finder` section.

Potential questions:

1. `What do you want to make most often?`
   - Profile & professional photos
   - Social posts
   - Covers & posters
   - Creative transformations
   - A bit of everything

2. `How often will you use 5Pixels?`
   - A few times a month
   - Weekly
   - Several times a week
   - Daily
   - Custom slider if needed

3. `Anything you care about most?`
   - Premium presets
   - Highest-detail exports
   - Faster processing
   - More monthly credits
   - Commercial usage, only if relevant/legal

The system then recommends a plan.

Do not expose AI models as user needs.

## 15.2 Step 1 — selectable use cases

The first question is multi-select.

Observed option-card anatomy:

- small icon at left;
- label;
- checkbox-style square at right;
- selected item uses lime text/icon and filled lime selection control;
- unselected options remain dark-neutral;
- options arranged in two columns.

The interface says multiple options may be selected.

### 5Pixels adaptation

Keep use-case labels outcome-oriented.

The icons should reinforce category meaning but remain visually quiet.

Mobile becomes one column.

## 15.3 Step 2 — volume / usage sliders

The screenshot shows two usage sliders for separate content types.

Each slider contains:

- a decorative histogram/tick visualization above the track;
- lime active progress segment;
- white draggable handle with chevron/drag icon;
- output estimate beneath;
- credit estimate in muted text;
- a small right-side pill for very-high-range controls.

This makes the abstract concept of credits more understandable by translating it into **estimated outputs**.

### 5Pixels translation

Very valuable.

Instead of asking:

`How many credits do you need?`

ask:

`About how many transformations do you expect each month?`

Then show:

- `~30 transformations`;
- `Estimated 60–90 credits depending on the looks you use.`

Because 5Pixels presets can have different credit costs, the estimate must clearly be approximate.

Alternative if credit costs are uniform enough:

- slider represents transformations directly;
- recommendation engine uses average weighted cost in the background.

## 15.4 Step 3 — feature chips

Selected needs appear as removable chips.

Observed:

- `AI image generation`;
- `AI video generation`;
- `MCP & Supercomputer` with a small `Basic` badge;
- x icon to remove;
- `Add features` button with count badge.

### 5Pixels translation

Use this only if there are meaningful optional priorities.

Possible chips:

- Premium presets
- High-detail export
- Faster queue
- Extended history

But 5Pixels should avoid turning pricing into a technical configurator if only 2–3 plans exist.

The plan finder is useful only when it materially reduces uncertainty.

## 15.5 Right-side recommendation card

The right panel says `We recommend Pro plan` and includes a `See why` control.

The recommended plan card contains:

- plan name `PRO`;
- discount badge;
- one-line audience statement;
- monthly credits module;
- slider or selectable credit level;
- expected monthly usage progress bar;
- key included benefits;
- old/new price;
- large primary CTA;
- savings note.

This is a **live calculation output**, not a static plan card.

### 5Pixels adaptation

Recommended plan card should explain the logic in consumer language.

Example:

`We recommend Creator`

`Based on ~40 transformations/month and your interest in premium editorial presets.`

Plan card:

- `120 credits / month`;
- `Expected usage: ~85–105 credits`;
- `Includes premium preset collection`;
- `High-detail exports` if applicable;
- `Choose Creator`.

`See why` could open a small explanation popover, not a black-box AI statement.

## 15.6 Usage progress visualization

The right card shows `Expected monthly usage 820/900 credits` with a lime progress bar.

This is excellent because it reveals **headroom**.

5Pixels should replicate the concept if plans are credit-based:

- recommended plan includes visible credit allowance;
- estimated usage bar shows likely consumption;
- avoid recommending a plan with 99.5% expected usage unless purposefully explaining low headroom;
- optionally show `~25 credits left for extra experiments`.

## 15.7 Bottom billing controls

At the bottom edge of the screenshot are compact controls:

- `Premium quality` toggle;
- Monthly / Annual toggle;
- `30% OFF` badge.

These controls appear to affect the recommendation dynamically.

### 5Pixels adaptation

Potential controls:

- Monthly / Annual only;
- perhaps `Include high-detail exports` if that is a product tier decision.

Avoid introducing a generic “premium quality” toggle if quality should be dictated by presets.

---

# 16. Pricing recommender micro-interactions

Recommended 5Pixels behavior if implemented:

## Selection

- selected use-case card gets subtle lime outline/fill, not full neon background;
- selection updates recommendation in under 200–300ms if local calculation;
- if calculation is server-driven, use small in-card skeleton, never full-page loading.

## Slider

- keyboard accessible with arrow/PageUp/PageDown;
- display numeric value continuously;
- snap to meaningful breakpoints;
- do not make users infer value from track position;
- touch target >= 44px even if visible handle is smaller.

## Recommendation update

- plan card should not flash or fully rerender;
- update changed numbers with restrained crossfade;
- if plan tier changes, animate border/title state, not a dramatic card flip;
- announce plan changes accessibly for screen readers.

## `See why`

Popover can state:

- selected use case;
- estimated monthly volume;
- selected priorities;
- why the next cheaper plan is insufficient;
- why the next higher plan is unnecessary.

This builds trust.

---

# 17. Screenshot S19 — Compare features table

## 17.1 Section intro

Large heading:

`Compare features`

Subcopy:

`See in details what plan suits you best`

Below is a large bordered comparison container.

The design moves from high-level commercial storytelling to exhaustive verification.

## 17.2 Plan header row

Columns:

- feature-label column at far left;
- Free;
- Basic;
- Pro;
- Max.

Each plan column shows:

- plan name;
- price;
- annual billing line;
- CTA for paid plans.

Max receives a blue `BEST VALUE` badge and fluorescent CTA, while Basic/Pro CTAs are neutral dark/grey.

An annual toggle appears in the far-left header region.

### 5Pixels lesson

The recommended tier should have **one clear emphasis mechanism**.

Possible:

- lime CTA + small `Recommended` badge;
- slightly brighter column surface;
- not all of border, glow, scale, ribbon, gradient, and oversized type simultaneously.

## 17.3 Group heading

A full-width divider introduces the `Video` feature group.

The category label is bold and larger than individual feature rows.

### 5Pixels comparison categories

Potential groups:

- Credits & usage
- Presets & collections
- Output & downloads
- Processing & priority
- Account & history
- Support / commercial rights if applicable

Only include groups with real differences.

## 17.4 Feature rows

Observed anatomy:

- feature name at far left;
- optional small secondary detail beneath (example credit cost);
- plan values centered/aligned by column;
- x for unavailable;
- numbers for allowance when available;
- thin horizontal separators;
- unsupported/unavailable rows are muted.

This is the conventional comparison-table grammar, but styled to match the dark app.

## 17.5 Visibility and scanning

The plan header likely needs sticky behavior on long desktop tables, even though a static screenshot cannot prove whether Higgsfield implements it.

### 5Pixels recommendation

Implement sticky plan headers on desktop once the user scrolls into the matrix.

On mobile:

- avoid five cramped columns;
- use plan selector tabs at top + feature list;
- or horizontally scroll with sticky first column and clear affordance;
- preference: plan-selector comparison for accessibility and readability.

## 17.6 Annual toggle placement

The annual switch inside the comparison header ensures that users do not have to scroll back to the top pricing cards to change billing cadence.

This is a valuable repeat-control pattern.

5Pixels should allow Monthly/Annual changes at:

- primary plan-card section;
- plan recommender;
- compare table.

All instances should synchronize globally.

---

# 18. Screenshot S20 — Comparison tail + FAQ

## 18.1 Secondary `Compare Features` control

At the end of the visible comparison table appears a centered outlined `Compare Features` button.

This may be a show-more/show-less or navigation control depending surrounding context.

The important visual lesson is that exhaustive information is not allowed to run directly into the FAQ without a transition action/space.

## 18.2 FAQ heading

Large centered heading:

`Frequently Asked Questions`

This is followed by stacked accordion rows.

## 18.3 Accordion anatomy

Visible rows include:

- `How do credits work?`
- `Is my subscription automatically renewed?`

Each row:

- dark card/surface;
- subtle border;
- generous horizontal padding;
- bold question on left;
- downward chevron on right;
- medium corner radius;
- vertically separated from adjacent rows.

No lime is used in the closed state.

### 5Pixels translation

Excellent fit for `/pricing` and `/app/billing` help.

Core FAQ candidates should come from actual billing policy, including:

- How do credits work?
- What happens if a generation fails?
- Do unused credits roll over? — only if policy exists.
- Can I buy extra credits?
- Can I cancel anytime?
- What happens when I change plans?
- Are taxes included?
- What happens to my saved results after cancellation? — only if retention policy supports a clear answer.

## 18.4 Accordion interaction

Recommended:

- click entire row to expand;
- chevron rotates 180°;
- content expands with short height/opacity transition;
- only one open at a time on mobile may simplify scanning, but multi-open can be fine if usability-tested;
- URL hash/deep-link optional for support use;
- content remains real DOM text for accessibility/search.

---

# 19. Cross-screenshot pattern: decisions on the left, visual outcome on the right

This batch reveals a recurring Higgsfield architecture:

- tool studio: controls left, visual/tutorial stage right;
- plan finder: needs/options left, recommended plan right.

This is not coincidental. It creates a consistent mental model:

> “I adjust the inputs here; I see the consequence there.”

For 5Pixels, this can become a reusable desktop layout primitive called something like `DecisionStageLayout`.

Possible uses:

- Create/Configure;
- Crop/Adjust;
- Billing Plan Finder;
- Admin Preset Studio;
- advanced account privacy settings where live consequences are visualized, if applicable.

Do not use it everywhere. Discovery, Library, Favorites, and account overview should remain simpler.

---

# 20. Cross-screenshot pattern: nested card hierarchy

Higgsfield frequently places cards inside cards.

Examples in this batch:

- plan card → entitlement card → entitlement rows → micro-badges;
- config rail → setting group → setting row → tiny mode segmented control;
- recommendation panel → plan card → credit module → progress bar.

The nesting remains understandable because each level changes **surface tone, padding, and radius**, not because it adds heavy borders.

### 5Pixels guidance

Maximum practical nesting on consumer screens should generally be three visual levels:

1. major panel;
2. grouped module;
3. field/row.

Avoid four or five equal-strength borders.

Use:

- background tonal shifts;
- spacing;
- subtle dividers;
- typography scale;
- occasional outline.

---

# 21. Cross-screenshot pattern: micro-badges as metadata compression

Visible badges in Batch 02 include concepts like:

- New;
- 30% OFF;
- 21% OFF;
- 7-day unlimited;
- Full access;
- No unlimited;
- 2K / 4K / 1080p;
- BEST VALUE;
- 60% CHEAPER;
- numeric count on Add features.

Higgsfield uses badges aggressively to compress complex entitlement information.

### 5Pixels adaptation

Use fewer badges, but define a semantic system.

Suggested 5Pixels badge families:

**Discovery**
- New
- Trending
- Pro
- Seasonal

**Compatibility**
- Best with one face
- Landscape
- Text editable

**Commercial**
- Recommended
- Save 20%
- Included
- Upgrade

**System**
- Processing
- Ready
- Refunded

Do not mix arbitrary colors. Each family should have restrained semantic styling.

---

# 22. Cross-screenshot pattern: cost-aware actions

Batch 01 showed generation controls. Batch 02 confirms Higgsfield repeatedly binds **cost/credits directly to decisions**.

Examples:

- Generate button includes credit cost;
- pricing slider translates content usage into credit consumption;
- recommended plan shows expected usage against allowance;
- feature rows show generation cost context.

This is especially relevant to 5Pixels because billing confusion can damage trust quickly.

### 5Pixels rule proposal

Whenever an action can debit credits, the user should see the expected cost **before activation**.

Where to show it:

- preset detail CTA;
- Create page Generate button;
- Regenerate action;
- any premium resolution/quality option that changes cost;
- confirmation modal only when the pattern changes or cost is unusual.

Do not require a confirmation dialog for every routine generation.

---

# 23. Cross-screenshot pattern: help embedded in context

Higgsfield places `How it works` beside `History` inside the creation stage.

This is much better than sending the user away to a generic support center.

### 5Pixels contextual help layers

Layer 1 — inline hints:

- “Best with one clearly visible face.”

Layer 2 — `Tips` / `How this look works` overlay:

- short examples;
- compatibility explanation;
- what changes / what stays.

Layer 3 — full support / FAQ:

- only for account, billing, policy, technical issues.

This matches progressive disclosure.

---

# 24. Cross-screenshot pattern: commercial UI is still product UI

Higgsfield’s pricing page uses the same:

- dark shell;
- rounded surfaces;
- lime signaling;
- compact badges;
- chevrons;
- cards;
- typography;
- spacing grammar.

Pricing does not suddenly become a generic white marketing template.

### 5Pixels implication

`/pricing` and `/app/billing` should feel like the same product family as Discover/Create.

Even if the public site has more editorial breathing room, the pricing components should use the same tokens and interaction grammar.

---

# 25. Detailed 5Pixels route mapping from Batch 02

## `/app/explore`

Reference:
- S11 masonry gallery.

Recommended translation:

- media-first preset wall;
- hover/focus reveals title + `Try this look`;
- category/search filters remain accessible above;
- optional masonry layout for Trending / visual exploration;
- stable grid fallback for accessibility/performance or other categories.

## `/app/presets/[slug]`

Reference:
- preset context card in S12.

Recommended translation:

- large preset preview;
- title/category/outcome copy;
- examples;
- compatibility;
- preset-defined controls preview;
- cost;
- `Use this preset`.

Do not put the full create controls here unless quick-create is intentionally invoked.

## `/app/create/[presetSlug]`

Reference:
- S12–S15.

Recommended translation:

- dedicated split layout;
- left configuration rail;
- right stateful stage;
- embedded tips/tutorial;
- history access;
- anchored selectors;
- sticky cost-aware Generate.

## `/app/generations/[generationId]`

Reference:
- same stage architecture, inferred state transition.

Recommended translation:

- preserve left rail read-only summary;
- right stage transitions to generation status;
- honest stage-based progress;
- cancellation only if technically real;
- credit reservation/refund status visible when relevant.

## `/app/results/[generationId]`

Reference:
- stage architecture plus History affordance.

Recommended translation:

- result dominates stage;
- comparison controls;
- download/save/regenerate/adjust;
- left rail retains settings for easy iteration;
- `Try another preset` can trigger Change Look preserving source.

## `/app/library`

Reference:
- History concept + media walls.

Recommended translation:

- full media history remains a separate route;
- in-create `History` is merely contextual recent history for this preset/source;
- filters per sitemap: all, saved, downloaded, date, preset.

## `/pricing`

Reference:
- S16–S20.

Recommended translation:

1. plan cards;
2. concise billing explanations;
3. optional Plan Finder;
4. exhaustive Compare Features;
5. FAQ;
6. final CTA.

## `/app/billing`

Reference:
- same pricing components, but with current entitlement context.

Recommended translation:

- current plan summary;
- remaining credits;
- buy credits;
- upgrade/downgrade;
- billing history/invoices;
- plan finder only when changing plans, not always visible.

## `Insufficient credits modal`

Reference:
- pricing recommendation hierarchy.

Recommended translation:

- state cost shortfall clearly;
- show 1–2 actions only:
  - Buy credits;
  - Upgrade plan;
- if user chooses upgrade, deep-link into relevant plan with current required cost context;
- do not present full comparison table inside a modal.

---

# 26. Proposed 5Pixels pricing-page information architecture

This is a design recommendation derived from the screenshots and existing sitemap, not a final commercial policy.

## Section A — Pricing hero

- `Choose how much you want to create.`
- monthly/annual toggle;
- short credits explanation;
- no long AI-model story.

## Section B — Plan cards

Each card:

- plan name;
- one-line ideal-for statement;
- effective monthly price;
- annual/monthly context;
- monthly credits;
- 2–3 major benefits;
- CTA;
- discount badge if applicable.

One plan receives `Recommended` emphasis.

## Section C — Credit explainer

Short visual explanation:

- presets show cost before generation;
- failed generations are refunded/released;
- extra credits can be purchased if policy supports it.

## Section D — Find your plan

Optional guided recommender.

Questions:

- what types of transformations;
- expected monthly volume;
- premium-access priorities.

## Section E — Compare features

Full matrix grouped by meaningful capability families.

## Section F — FAQ

Billing and credit questions.

## Section G — Final CTA

- `Start creating`;
- or `Try 5Pixels`;
- if authenticated, `Choose plan`.

---

# 27. What 5Pixels should NOT copy from Higgsfield pricing

## 27.1 Do not sell raw models

The current 5Pixels thesis is that model/provider routing is private infrastructure.

Model-specific access cards would weaken product abstraction and make pricing fragile whenever routing changes.

## 27.2 Do not create too many entitlement nouns

Higgsfield has many product suites and model families. 5Pixels V1 is intentionally narrower.

A simpler product should have simpler pricing.

## 27.3 Do not overuse discount badges

One annual discount badge is enough in most places.

## 27.4 Do not introduce unrelated accent colors without a semantic reason

5Pixels’s brand system already has a clear lime signal and warm neutral typography.

## 27.5 Do not ask users to estimate technical generations per provider

Ask about user outcomes and frequency instead.

## 27.6 Do not create a plan finder if the recommendation is trivial

If nearly everyone belongs on one of two plans, a complex recommender becomes theater.

---

# 28. Proposed 5Pixels Plan Finder interaction specification

If product strategy supports it, this can become a strong differentiating pricing UX.

## 28.1 Intro

Heading:

`Find your plan`

Subcopy:

`Tell us how often you create. We’ll show you the plan with enough room.`

## 28.2 Question 1 — What do you create?

Multi-select cards:

- Social & profile photos
- Professional portraits
- Covers & posters
- Cinematic looks
- Illustration & art styles

Purpose:

- influence estimated average preset cost;
- highlight relevant premium collections if plans differ by access.

## 28.3 Question 2 — How often?

One slider:

- 5 / month
- 10 / month
- 25 / month
- 50 / month
- 100+ / month

Display:

`~25 transformations / month`

Below:

`Estimated 40–65 credits depending on the looks you use.`

## 28.4 Question 3 — What matters most?

Optional chips:

- Premium looks
- Highest-detail export
- Faster generation
- More room to experiment

Only include real entitlements.

## 28.5 Recommended plan panel

Header:

`We recommend Creator`

Reason:

`Enough credits for your expected usage, with room for retries and experimentation.`

Metrics:

- `120 credits / month`;
- expected use `~60–85`;
- headroom bar;
- 3 key included benefits;
- monthly/annual price;
- CTA.

## 28.6 “Why this plan?”

Popover:

- expected use;
- included allowance;
- cheaper plan shortfall;
- extra headroom;
- billing cadence savings.

No opaque personalization language.

---

# 29. Pricing comparison table specification for 5Pixels

## Header

- feature-name column;
- plan columns;
- synchronized monthly/annual switch;
- recommended badge;
- plan CTA.

## Feature groups

Possible groups, subject to actual product policy:

### Credits & usage

- monthly credits;
- extra credit purchase;
- failed generation refund/release;
- credit expiry/rollover if applicable.

### Presets

- standard catalog;
- premium collections;
- early-access drops if applicable.

### Output

- supported output quality/resolution;
- download format if differentiated;
- watermark rules if any.

### Processing

- queue priority;
- concurrent generations only if product actually supports differentiated concurrency and it matters.

### Account & history

- history retention;
- saved results;
- favorites.

### Support / licensing

Only if commercial policy differentiates these.

## Row behavior

- checkmark for universal yes;
- numeric allowance where quantity matters;
- `—` or x for unavailable;
- footnote icons only for genuinely nuanced policy;
- linked terms open in a side sheet/modal where possible.

---

# 30. Mobile pricing translation

## Plan cards

- horizontal swipe carousel or stacked cards;
- recommended plan first or prominently labeled;
- billing toggle sticky near section top;
- avoid making users swipe to discover Free/Basic if conversion ethics/usability require easy comparison.

## Plan finder

- one question group at a time or stacked single-column;
- recommendation card can become sticky bottom summary after enough inputs;
- sliders use large handles;
- `See why` opens bottom sheet.

## Compare table

Preferred pattern:

- select two plans to compare;
- show feature rows full width;
- or tabs for current plan target.

Avoid a four-plan horizontal spreadsheet as the default phone experience.

## FAQ

- full-width accordions;
- 15–20px padding;
- 44px+ touch target;
- expanded text at comfortable line length.

---

# 31. Modal / popover inventory added by Batch 02

The following overlays should be considered in the 5Pixels design library.

## Create-route overlays

- Change Look drawer/modal;
- Setting Choice popover;
- dual input-mode popover;
- color picker popover;
- How This Look Works overlay;
- contextual History drawer;
- insufficient-credit modal;
- source replacement confirmation only if unsaved work would be lost.

## Billing overlays

- Why this plan? popover;
- credit explanation modal;
- upgrade confirmation;
- buy credits modal;
- plan-change confirmation;
- billing-cycle switch warning if proration requires explanation.

## FAQ

No modal needed; use inline accordion.

---

# 32. Micro-interactions to preserve from this batch

## Hover/focus cards

- reveal action only after intent;
- darken media, do not bury it;
- keep action centered and obvious.

## Anchored popovers

- open from trigger location;
- maintain visual relationship to field;
- selected row has clear checkmark;
- Escape closes;
- clicking new selection updates trigger immediately.

## Segmented micro-toggle

- selected segment looks physically raised or filled;
- icon tooltip appears on hover/focus;
- text explanation appears only when needed.

## Cost-aware CTA

- credit number updates immediately when options affect cost;
- animate number change subtly;
- if balance becomes insufficient, change CTA state before click.

## Plan recommender

- selections update recommendation in place;
- preserve scroll position;
- no full page refresh;
- recommendation reason remains accessible.

## FAQ accordion

- chevron rotation;
- short expansion transition;
- no dramatic bounce.

---

# 33. 5Pixels design token implications from Batch 02

These are refinements to test, not replacements for the existing design system.

## 33.1 Surface ladder

Useful additional surface hierarchy:

- `Ink 950`: page canvas;
- `Ink 900`: stage / deep panel;
- `Charcoal 850`: major panel/card;
- `Charcoal 800`: grouped module;
- `Charcoal 700`: selected row/hovered tile.

The screenshot family depends heavily on these subtle elevation steps.

## 33.2 Border strategy

Use borders primarily at major panel boundaries.

Inside panels, prefer tonal shifts and spacing.

## 33.3 Lime behavior

Lime remains strongest for:

- active navigation;
- primary Generate;
- selected control accent;
- selected plan recommendation;
- usage/progress;
- small positive badges.

Do not fill entire pricing cards lime.

## 33.4 Warm off-white

The screenshots use cool white. 5Pixels should preserve its own warmer text system to avoid direct visual mimicry and maintain brand character.

## 33.5 Pattern backgrounds

Replace generic dot grid with subtle five-pixel pattern logic where appropriate.

---

# 34. Typography observations

Higgsfield uses a neutral sans/grotesk across both product and pricing surfaces.

Hierarchy is created mostly through:

- weight;
- size;
- contrast;
- uppercase in special module headings;
- color badges.

There is little decorative type in the application chrome.

### 5Pixels translation

Keep:

- neutral quiet UI type for controls;
- stronger editorial display type only for discovery headers / marketing moments;
- uppercase sparingly for small capability modules, if used;
- avoid uppercase long labels in dense settings.

---

# 35. UX writing observations

Higgsfield’s strongest interface copy is functional and short:

- Change
- History
- How it works
- Drop or upload video
- Resolution
- Generate
- Find the best plan for you
- See why
- Compare features

This aligns with 5Pixels’s desired short, confident, visual writing style.

### 5Pixels examples

- Change look
- Recent results
- Tips
- Upload a photo
- Use this look
- Generate · 2 credits
- Find your plan
- Why this plan?
- Compare plans
- How do credits work?

Avoid marketing filler inside productive screens.

---

# 36. Accessibility review of the reference patterns

Higgsfield’s visual patterns are attractive, but 5Pixels should explicitly harden them for accessibility.

## 36.1 Popovers

- trigger has `aria-expanded` / `aria-controls`;
- initial focus moves sensibly;
- arrow-key navigation for listbox options;
- Escape closes and returns focus;
- checkmark is not the only selected-state indicator.

## 36.2 Color controls

- color swatch is accompanied by text/hex/name;
- contrast warnings where text/output requires them;
- semantic descriptor available to screen readers.

## 36.3 Masonry cards

- DOM order should remain logical;
- keyboard navigation follows visual scanning order as closely as possible;
- card titles accessible even when visually hidden at idle.

## 36.4 Sliders

- value text always visible;
- keyboard control;
- mobile touch target;
- screen reader labels include units.

## 36.5 Pricing table

- semantic table markup where true table is used;
- sticky header does not obscure focus;
- mobile alternative is not inaccessible horizontal overflow only.

## 36.6 Accordions

- button element for header;
- `aria-expanded`;
- panel relationship;
- no information hidden only through hover.

---

# 37. Responsive behavior inferred from this batch

The screenshots are desktop-centric, so the following is recommendation/inference, not observation.

## Create studio

Desktop:
- rail + stage.

Tablet:
- narrower rail + stage;
- grouped controls collapsible.

Mobile:
- stage first;
- source preview full width;
- configuration sections stacked/bottom sheets;
- sticky Generate bar;
- History/Tips in top action row.

## Masonry discover

Desktop:
- 4–6 variable columns depending width.

Tablet:
- 2–3 columns.

Mobile:
- 2-column visual grid for dense Explore or 1-column/rail depending content;
- avoid autoplaying many previews at once.

## Pricing

Desktop:
- multi-column cards + live recommendation split.

Mobile:
- stacked cards;
- one-column plan finder;
- recommendation appears after inputs;
- comparison reflows rather than shrinking.

---

# 38. Product decisions surfaced by Batch 02

These should be decided before the final Figma prompts are locked.

## D1. Does 5Pixels expose output resolution?

Current preset model can define output requirements, but consumer exposure is a product decision.

Recommendation:

- default hidden/preset-controlled;
- expose only if users understand the value and it materially changes cost/quality.

## D2. Does 5Pixels support semantic text descriptions for individual controls?

Recommendation:

- optional future capability;
- only for tightly scoped preset fields;
- never as universal prompt input.

## D3. Does the dedicated Create route use the two-column rail/stage layout?

Recommendation:

- yes on desktop;
- it maps cleanly to canonical information architecture and supports complex states elegantly.

## D4. Does 5Pixels have Quick Create in addition to dedicated Create?

Recommendation:

- yes, if it can remain simple;
- use for frictionless actions from discovery;
- route users to full Create when compatibility/configuration needs more space.

## D5. Does pricing include an interactive Plan Finder?

Recommendation:

- only if there are at least three meaningful paid choices or meaningful usage variance;
- otherwise use simple plan cards plus comparison.

## D6. What plan benefits are allowed to differ?

Must be settled from billing/product policy before visual design.

Do not let the design invent product tiers.

## D7. How is monthly usage estimated when presets have different credit costs?

Plan Finder requires a transparent approximation policy.

## D8. Are premium preset collections a plan entitlement or credit-only access?

This materially changes pricing-card design and locked-preset UX.

---

# 39. Updated component backlog after Batch 02

Combining Batch 01 and Batch 02, the consumer design system now needs at least:

1. Authenticated desktop top navigation.
2. Compact/mobile navigation.
3. Explore mega-menu.
4. Global search palette.
5. Category chip.
6. Status badge.
7. Preset card — standard.
8. Preset card — editorial/masonry.
9. Preset hover/focus action overlay.
10. Preset Context Card.
11. Change Look trigger.
12. Change Look modal/drawer.
13. Source Dropzone.
14. Source accepted/warning/error card.
15. Setting Tile.
16. Setting Group.
17. Field Input Mode toggle.
18. Anchored Choice Popover.
19. Color picker / semantic descriptor popover if approved.
20. Aspect Ratio picker.
21. Fidelity/quality picker if approved.
22. Resolution/output picker if approved.
23. Generate Cost Button.
24. Studio Stage.
25. How It Works carousel.
26. Contextual History drawer/stage.
27. Generation progress state.
28. Result stage.
29. Failure/refund state.
30. Pricing plan card.
31. Recommended plan badge/state.
32. Entitlement spotlight module.
33. Included/locked capability row.
34. Billing cadence toggle.
35. Discount badge.
36. Plan Finder option card.
37. Usage slider.
38. Feature chip.
39. Live recommendation card.
40. Expected-usage progress bar.
41. Why This Plan popover.
42. Compare Plans table.
43. Mobile comparison selector.
44. FAQ accordion.
45. Credit explanation modal.
46. Insufficient credits modal.
47. Buy credits modal.
48. Upgrade plan modal/page transition.

---

# 40. Updated app-level design grammar

After two batches, Higgsfield’s transferable design grammar can be described as follows.

## 40.1 Media is the primary navigation language

The user often chooses by seeing rather than reading.

## 40.2 Controls become cards, not form fields

Values are large enough to scan and are opened contextually.

## 40.3 Complexity is layered, not dumped

Mega-menu → picker → popover → detailed route.

## 40.4 The productive action is persistently visible

Generate remains visually dominant and cost-aware.

## 40.5 Major workflows use a stable decision area + changing consequence area

This is the rail/stage pattern.

## 40.6 Commercial state is integrated into product state

Credits, plan access, and gating appear where they matter.

## 40.7 Education appears next to action

How-it-works, selected-option descriptions, and plan rationale live near the decisions they explain.

These principles fit 5Pixels well if the actual content remains preset-first and outcome-oriented.

---

# 41. Early Figma frame list implied by Batch 02

These are not the final designer prompts yet. They are frames/states that should exist once page-by-page design starts.

## Explore

- Explore masonry idle state.
- Explore card hover/focus state.
- Explore card touch action state.

## Create

- Create — first-use empty state.
- Create — tutorial step 1.
- Create — source drag-over.
- Create — uploading.
- Create — validating.
- Create — warning.
- Create — ready.
- Create — setting popover open.
- Create — color/direct field.
- Create — semantic field mode if approved.
- Create — generation in progress.
- Create — success/result.
- Create — history open.
- Create — tips/how-it-works open.
- Create — insufficient credits.
- Create — failure/refund.

## Pricing

- Pricing — monthly.
- Pricing — annual.
- Pricing — recommended plan emphasized.
- Pricing — plan finder default.
- Pricing — plan finder partially answered.
- Pricing — plan recommendation result.
- Pricing — Why this plan popover.
- Pricing — compare table.
- Pricing — FAQ closed.
- Pricing — FAQ expanded.

## Mobile variants

- Create mobile empty/ready/generating/result.
- Plan cards mobile.
- Plan finder mobile.
- Comparison mobile.

---

# 42. Designer-prompt implications

When final prompts are created for designers, the Create page prompt should explicitly say:

- take structural inspiration from Higgsfield’s left-rail + stage pattern;
- do not reproduce Ink Riot styling, dotted pattern, exact spacing, or components one-for-one;
- make selected preset visually persistent;
- replace video/FPS with 5Pixels image-specific controls;
- do not expose a generic prompt;
- do not expose provider/model names;
- use 5Pixels warm off-white and calibrated lime;
- use five-pixel motif subtly in stage texture/loading;
- surface compatibility and credit behavior clearly;
- include all upload/validation/generation/result/error states.

The Pricing page prompt should explicitly say:

- take inspiration from Higgsfield’s layered plan cards + guided plan finder + comparison + FAQ architecture;
- reduce visual accent proliferation;
- sell outcomes/credits/preset access, not models;
- synchronize monthly/annual state across sections;
- explain expected usage and headroom if plan finder exists;
- handle mobile comparison intentionally.

---

# 43. Important refinement to Batch 01: where the floating console belongs

Batch 01 identified Higgsfield’s floating generation console as a compelling 5Pixels pattern.

Batch 02 makes it clear that a **single console should not be forced to do everything**.

Updated recommendation:

## Floating / compact Transformation Console

Best for:

- quick create from discovery;
- lightweight presets with one or two controls;
- regeneration from Library/Result;
- low-friction desktop actions.

## Dedicated split Create Studio

Best for:

- initial source validation;
- complex preset-specific controlled fields;
- crop/fit decisions;
- contextual help;
- history;
- long-running generation states;
- responsive/mobile progression.

This gives 5Pixels both immediacy and depth without compromising either.

---

# 44. Suggested create-route visual hierarchy for 5Pixels

A user entering `/app/create/[presetSlug]` should visually parse the page in this order:

1. **Selected look** — “What am I making?”
2. **Source photo** — “What am I transforming?”
3. **Suitability** — “Will this photo work?”
4. **Allowed choices** — “What can I change?”
5. **Visual stage** — “What will happen / what am I looking at?”
6. **Cost** — “How many credits?”
7. **Generate** — “Do it.”

The page should never require the user to understand the AI implementation.

---

# 45. Suggested pricing-route visual hierarchy for 5Pixels

A user entering `/pricing` should parse:

1. **How plans are differentiated** — primarily credits / usage / meaningful premium benefits.
2. **What each plan costs.**
3. **Which plan is recommended.**
4. **How many transformations that roughly supports.**
5. **What happens when credits run out or a generation fails.**
6. **Exact feature differences if they care.**
7. **Renewal/cancellation FAQ.**

The page should not require the user to learn an internal model catalog before they can choose a plan.

---

# 46. Conversion and trust observations

Higgsfield uses several trust-building techniques worth translating carefully.

## Before purchase

- clear monthly price;
- billing cadence stated directly;
- savings visible;
- plan recommendation rationale;
- feature comparison;
- FAQ.

## Before generation

- generation cost visible in CTA;
- current settings visible;
- upload requirements visible.

## For 5Pixels

Add another essential trust element:

- explicit failure-credit behavior.

Example near credit explainer:

`If a generation fails, the reserved credits are released back to your balance.`

Exact wording should reflect implementation and legal policy.

---

# 47. Information-density lessons

Higgsfield alternates density intentionally.

Dense zones:

- masonry gallery;
- pricing cards;
- comparison table;
- settings rail.

Low-density zones:

- centered tutorial stage;
- whitespace between pricing sections;
- FAQ heading;
- large stage background.

The contrast prevents the entire app from feeling crowded.

### 5Pixels recommendation

Use the same rhythm:

- discovery can be dense;
- creation stage should breathe;
- account/billing forms should be calm;
- pricing comparison can be dense, separated by editorial whitespace.

---

# 48. Visual differentiation without direct copying

To ensure 5Pixels is inspired rather than cloned:

## Keep from Higgsfield

- dark gallery shell;
- contextual overlays;
- compact setting tiles;
- split workflow architecture;
- cost-aware CTA;
- interactive plan guidance;
- media-led discovery.

## Change for 5Pixels

- warmer typography color;
- five-pixel motif instead of dotted-grid identity;
- less neon/multi-color commercial treatment;
- more editorial preset naming and collection curation;
- stronger compatibility guidance;
- no generic prompt affordance;
- hidden provider/model layer;
- image-only V1 feature set;
- own card geometry/spacing/tokens;
- `Try this look` rather than universal `Generate` on discovery cards.

---

# 49. Potential risks if these patterns are copied carelessly

## Risk 1 — Create page becomes an AI control panel

Mitigation:
- preset-owned fields only;
- cap number of exposed controls;
- group meaningfully;
- hide technical nouns.

## Risk 2 — Pricing becomes incomprehensible

Mitigation:
- center credits/outcomes;
- reduce plan count;
- avoid model entitlements;
- provide simple plan recommendation.

## Risk 3 — Masonry hides important preset information

Mitigation:
- accessible titles;
- clear detail route;
- stable filters;
- alternate grid in contexts where predictability matters.

## Risk 4 — Semantic field input becomes disguised prompting

Mitigation:
- per-field scope;
- explicit examples;
- strict backend mapping;
- no blank universal prompt.

## Risk 5 — Too many nested cards make surfaces muddy

Mitigation:
- limit nesting depth;
- use spacing/typography more than borders.

## Risk 6 — Heavy animation harms performance

Mitigation:
- pause offscreen previews;
- use poster images;
- reduced motion;
- constrain stage transitions.

---

# 50. What this batch changes in the overall 5Pixels app plan

Before Batch 02, the emerging plan emphasized:

- top navigation;
- discovery mega-menu;
- media gallery;
- floating transformation console.

After Batch 02, the plan should explicitly include:

- **a dedicated split Create Studio**;
- **embedded preset-specific onboarding/help**;
- **contextual history within the create route**;
- **a generic Setting Tile + Anchored Popover system**;
- **a cost-aware Generate component**;
- **a sophisticated but outcome-first Pricing architecture**;
- **an optional Plan Finder**;
- **a full comparison matrix and FAQ system**.

These are not cosmetic additions. They define the architecture of the application’s core transformation and monetization experiences.

---

# 51. Batch 02 takeaways to carry into later screenshot batches

- Viral Presets remains strongest when imagery is primary and actions are revealed on intent.
- The dedicated creation workflow benefits from a stable config rail and large changing visual stage.
- Selected preset context should remain visible throughout generation.
- Upload, controlled options, and Generate can live in one narrow recipe rail.
- Compact setting tiles are more premium than conventional selects for major choices.
- Anchored popovers should scale their density to the complexity of the choice.
- Dual input mode is useful only when it stays field-scoped; 5Pixels should never turn it into a general prompt box.
- Credit cost belongs next to the action that spends credits.
- Help can be embedded directly inside Create rather than separated into documentation.
- Pricing should be layered: plan summary → major differentiators → guided recommendation → full comparison → FAQ.
- A Plan Finder should ask about outcomes and frequency, not AI models.
- Expected usage/headroom is a powerful way to make credit plans understandable.
- Locked entitlements should explain upgrade value without making the product feel hostile to lower tiers.
- The same design system should connect the productive app and the commercial/billing surfaces.
- 5Pixels should use fewer accent colors than the Higgsfield pricing page to preserve brand coherence.
- The final 5Pixels design should be structurally inspired but unmistakably its own product.

---

# 52. What I want to inspect in the next screenshot batch

The remaining highest-value Higgsfield references would be any screens showing:

- actual generated result page;
- before/after comparison;
- generation loading/progress;
- generation failure;
- asset/library/history pages;
- account/avatar menus;
- credit-balance menus;
- checkout / upgrade modals;
- search palette;
- mobile/responsive create screens;
- favorites/saved states;
- notifications/toasts;
- share/download actions;
- image upload validation errors;
- preset detail page before Create;
- any onboarding/auth flow;
- account/profile/billing sub-pages;
- empty states and 404/error states.

These will help close the remaining gaps before writing the final page-by-page designer prompts.

---

# 53. Source-of-truth caution

As in Batch 01, this study distinguishes between **reference behavior** and **5Pixels product requirements**.

The following Higgsfield elements in Batch 02 should be treated as inspiration only because they conflict with current 5Pixels V1 direction or are outside documented scope:

- video upload;
- FPS selection;
- video-resolution controls;
- raw model entitlements;
- named model access in pricing;
- broad prompt-based configuration;
- parallel/batch-generation selling points.

The transferable layer is the interface logic:

- specialized preset configuration;
- progressive disclosure;
- anchored selectors;
- split decision/stage layout;
- contextual education;
- cost transparency;
- guided plan selection;
- comparison architecture.

The 5Pixels documents remain the product authority until a deliberate product decision changes them.

---

# 54. Combined Batch 01 + Batch 02 design hypothesis

The strongest emerging 5Pixels application concept is:

> **A premium dark visual catalog that turns directly into a guided transformation studio without exposing AI complexity.**

The experience can flow as:

1. Browse visually.
2. Hover/focus/tap to understand a preset.
3. Open detail or Quick Create.
4. Enter a dedicated Create Studio when needed.
5. Keep the preset visible in a left recipe rail.
6. Upload and validate the source.
7. Adjust only preset-approved controls through compact tiles and contextual popovers.
8. See help, source, generation, and result in one large visual stage.
9. Know the credit cost before every generation.
10. Save/download/regenerate without losing context.
11. Upgrade through a pricing system that explains usage in terms of transformations, not model infrastructure.

If later screenshot batches support this hypothesis, it should become the backbone of the eventual page-by-page Figma prompt set.

