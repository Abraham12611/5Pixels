# 5Pixels — AI Visual Generation Prompt Pack

This pack is designed for an AI agent that will generate the **actual UI visuals one by one**. It is intentionally more atomic than the earlier product-designer brief.

Use it in this order:

1. Paste the **MASTER AGENT CONTEXT** below once into the AI agent.
2. Generate the foundation/component sheets.
3. Generate the global shell and Search.
4. Generate discovery and preset evaluation.
5. Generate Create, Generation, and Result.
6. Generate Library and Favorites.
7. Generate Account, Billing, and Pricing.
8. Generate Auth, Modals, and Edge states.
9. Generate mobile/responsive variants.
10. Run the final QA boards.

When a page is too tall or dense to represent faithfully in one image, this pack deliberately breaks it into **top / middle / lower** visuals or into specific interaction states. Do not force long pricing, billing, or settings pages into a single illegible screenshot.


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


# File map

- `01_COMPONENTS_AND_FOUNDATIONS_VISUAL_PROMPTS.md`
- `02_GLOBAL_SHELL_NAV_AND_SEARCH_VISUAL_PROMPTS.md`
- `03_DISCOVERY_EXPLORE_AND_PRESET_VISUAL_PROMPTS.md`
- `04_CREATE_GENERATION_AND_RESULT_VISUAL_PROMPTS.md`
- `05_LIBRARY_AND_FAVORITES_VISUAL_PROMPTS.md`
- `06_ACCOUNT_BILLING_AND_PRICING_VISUAL_PROMPTS.md`
- `07_AUTH_MODALS_AND_EDGE_VISUAL_PROMPTS.md`
- `08_MOBILE_RESPONSIVE_AND_FINAL_QA_VISUAL_PROMPTS.md`
- `5Pixels_COMPLETE_AI_VISUAL_PROMPTS.md`

# Recommended frame naming in Figma / generated assets

Use the visual IDs exactly, e.g.:

`V001_Button_System_Desktop`
`V027_Global_Search_Zero_Query`
`V048_Create_Source_Accepted`
`V079_Billing_Credits_Usage`

This keeps generated images, revisions, and implementation references aligned.

# Approval workflow

For each visual:
1. Generate version A.
2. Compare it against the immediately previous approved 5Pixels frame.
3. Fix brand drift before moving on.
4. Only then generate the next visual.
5. Do not generate ten screens at once; consistency degrades when the agent is not forced to inherit prior decisions.

# Long-page rule

If a page requires more than one viewport:
- generate the **top viewport** first;
- generate the **continuation viewport** next with identical shell/widths;
- if needed, generate a third lower section;
- optionally stitch them later, but never sacrifice legibility just to fit a "full page" in one image.

# Core visual sequence

The prompts are numbered V001 onward. Follow them in order unless a later prompt explicitly says it depends on a future/optional feature.



# 5Pixels — Component and Foundation Visual Prompts


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


## V001 — Design token / foundation board

**Surface:** Figma-style foundation sheet  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a polished 5Pixels foundation board, not a product page. Show:
- the ink/charcoal/warm-off-white/lime palette with labeled swatches;
- UI/body type scale and editorial display samples;
- spacing rhythm examples;
- radius examples;
- border/elevation examples;
- five-pixel motif variations;
- icon style examples;
- examples of lime used as signal rather than full-surface decoration.

Keep the board elegant and production-ready, like a design-system reference page. Do not show dozens of colors. Use real 5Pixels vocabulary in sample text.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not make this look like a marketing moodboard. It is a functional UI system board.

---

## V002 — Button family

**Surface:** Component sheet  
**Canvas:** 1440×900

### Prompt to give the visual-generation agent

Generate the complete 5Pixels button system on one dark component sheet:
- Brand Primary: lime fill, dark text;
- Utility Primary: warm cream fill, dark text;
- Secondary: charcoal + subtle border;
- Tertiary: text + optional arrow;
- Destructive: red/error treatment;
- Icon button;
- Loading button;
- Disabled states.

Show default, hover, focus, pressed, and disabled variants in organized rows. Example labels: `Try this look`, `Generate`, `Save`, `View details`, `Delete`. Keep radii around 10–12px; avoid overly bubbly pills except where a pill is semantically correct.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V003 — Status badge family

**Surface:** Component sheet  
**Canvas:** 1200×760

### Prompt to give the visual-generation agent

Generate the small 5Pixels status-badge family inspired by Higgsfield's micro-labels. Include `NEW`, `TRENDING`, `PRO`, `LIMITED`, `UPDATED`, and a neutral category badge. Show badges on dark cards and on image media.

Keep badges tiny, high-contrast, typographically sharp, and sparingly colored. Lime is the main status accent; use other colors only when semantically justified. Include a subtle five-pixel corner motif option for 5Pixels-branded tags.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not create loud sticker spam or oversized promotional ribbons.

---

## V004 — Preset card family

**Surface:** Component sheet  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a component sheet for 5Pixels preset cards:
- Featured large card;
- Standard grid card;
- Horizontal rail card;
- Compact Search card.

For each, show:
- media poster;
- title;
- one-line descriptor;
- optional category;
- favorite control;
- optional `NEW`, `TRENDING`, or `PRO`;
- optional credit cost on authenticated surfaces.

Also show one hover/focus state where a dark gradient rises from the bottom and reveals `Try this look` without permanently obscuring the image. Use tasteful editorial imagery. Media should dominate the cards.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V005 — Preset card motion storyboard

**Surface:** Interaction storyboard sheet  
**Canvas:** 1440×900

### Prompt to give the visual-generation agent

Generate a 4-panel storyboard explaining the preset-card preview behavior:
1. static source poster;
2. short transformation transition;
3. transformed result hold;
4. return/loop.

Show a desktop hover/focus treatment and a small reduced-motion alternative that uses static source/result frames instead of animation. This is a visual specification board, not a page.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V006 — Category chip and filter controls

**Surface:** Component sheet  
**Canvas:** 1200×800

### Prompt to give the visual-generation agent

Generate category chips and filtering controls for Explore:
- category pill default/hover/selected;
- `Trending`, `New`, `Portrait`, `Cinematic`, `Covers`, `Retro`, `Fantasy`;
- Sort control;
- Filter trigger;
- active filter count badge;
- `Clear filters`.

Selected state should use a restrained lime signal, not a giant lime pill for every active chip. Include keyboard focus states.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V007 — Text input and form field system

**Surface:** Component sheet  
**Canvas:** 1200×900

### Prompt to give the visual-generation agent

Generate 5Pixels form controls:
- text field;
- password field with visibility icon;
- search field;
- select field;
- textarea with character count;
- field with helper text;
- inline validation warning;
- inline validation error;
- disabled field.

Use warm labels above fields, large touch-friendly heights, charcoal fills, subtle borders, and clear focus ring. Keep the sheet utilitarian and premium.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V008 — Upload dropzone state family

**Surface:** Component sheet  
**Canvas:** 1440×1000

### Prompt to give the visual-generation agent

Generate the source-image upload component in these states:
- empty;
- drag-over;
- selecting;
- uploading with progress;
- validating;
- accepted with thumbnail;
- warning;
- rejected.

Exact sample guidance:
`Drop or upload an image`
`JPG, PNG, or WebP`
Warning: `Your image is very small. Results may be softer.`
Rejected: `We couldn't read that file. Try JPG, PNG, or WebP.`

Use the five-pixel motif as a subtle upload/loading flourish. Differentiate warning vs rejection with icon + text, not color alone.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V009 — Selector card system

**Surface:** Component sheet  
**Canvas:** 1200×900

### Prompt to give the visual-generation agent

Generate compact setting/selector cards inspired by Higgsfield's anchored controls:
- collapsed Aspect Ratio card showing `4:5`;
- collapsed crop/fit card;
- collapsed output-quality card where allowed;
- selected state;
- disabled state;
- card with short helper label.

Cards should have small labels, strong selected value, right chevron, dark surface, and consistent width. Show one card in focus state.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V010 — Anchored dropdown / popover

**Surface:** Component sheet  
**Canvas:** 1200×900

### Prompt to give the visual-generation agent

Generate the anchored dropdown/popover primitive. Show:
- Aspect Ratio menu with `1:1`, `4:5`, `3:4`, `16:9`, `9:16`;
- selected checkmark;
- keyboard-focused option;
- disabled option;
- popover flipping above when space below is insufficient.

Use charcoal surface, subtle border, 15px-ish radius, warm text. Keep it compact like Higgsfield's selectors but visually 5Pixels.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V011 — Settings row and toggle family

**Surface:** Component sheet  
**Canvas:** 1200×900

### Prompt to give the visual-generation agent

Generate full-width account-setting rows:
- title + one-sentence explanation + toggle;
- title + current value + dropdown;
- title + chevron disclosure;
- destructive/danger disclosure;
- disabled toggle.

Show default, hover/focus, and on/off states. The privacy-related row must visibly include explanatory copy. Use calm settings styling with minimal lime.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V012 — Credit meter and credit summary family

**Surface:** Component sheet  
**Canvas:** 1200×900

### Prompt to give the visual-generation agent

Generate the 5Pixels credit system components:
- compact nav credit indicator;
- account-popover credit card;
- large billing credit card;
- five-square segmented meter at 80%, 20%, and 0%;
- low-credit warning state;
- exact textual balance state.

Example copy: `248 credits left`, `Resets Oct 1`, `18 credits left`, `0 credits left`. The exact number must be visible; the motif is supplementary.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V013 — Generation progress system

**Surface:** Component/storyboard sheet  
**Canvas:** 1200×900

### Prompt to give the visual-generation agent

Generate a 5Pixels staged progress system using the five-pixel motif:
- Queued;
- Preparing your image;
- Applying the look;
- Refining details;
- Finalizing your result.

Do not show fake percentages. Show a reduced-motion version with static stage highlighting. Use a premium subtle animation concept, not neon particles.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V014 — Result action bar

**Surface:** Component sheet  
**Canvas:** 1300×850

### Prompt to give the visual-generation agent

Generate a compact action bar for the Result page with:
- Download as the strongest success action;
- Save;
- Compare;
- Regenerate;
- Adjust;
- Try another preset;
- More.

Show desktop horizontal floating bar and mobile bottom action bar variants. Use icon + label where needed. Keep actions legible without covering the image.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V015 — Library result card family

**Surface:** Component sheet  
**Canvas:** 1440×1000

### Prompt to give the visual-generation agent

Generate Library result-card variants:
- default;
- hover with actions;
- Saved marker;
- Downloaded marker;
- processing/placeholder;
- failed attempt reference if surfaced;
- unavailable/deleted.

At rest, result media dominates. Hover reveals `Open`, `Download`, `Save`, `More`. Use no model/provider metadata.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V016 — Search result row family

**Surface:** Component sheet  
**Canvas:** 1300×900

### Prompt to give the visual-generation agent

Generate Global Search row variants:
- preset result;
- category result;
- Library result;
- keyboard-selected row;
- `NEW` badge;
- `PRO` badge;
- no-thumbnail fallback.

Preset rows use real visual thumbnails rather than generic AI icons. Keyboard-selected state should use slightly brighter charcoal plus a tiny five-pixel leading marker.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V017 — Modal shell family

**Surface:** Component sheet  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a modal-system board:
- small confirmation;
- medium utility modal;
- large scrollable modal with sticky header/footer;
- mobile full-screen sheet.

Show backdrop opacity, close button, title treatment, footer action hierarchy, and one destructive example. Keep shadows restrained and borders subtle.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V018 — Toast family

**Surface:** Component sheet  
**Canvas:** 1200×760

### Prompt to give the visual-generation agent

Generate 5Pixels toasts:
- Saved;
- Copied;
- Download prepared;
- Settings updated;
- non-critical warning;
- non-critical error.

Show desktop top/bottom placement option and mobile safe-area placement. Toasts are compact, dark, and legible. Do not make them the only place critical errors appear.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V019 — Empty-state family

**Surface:** Component sheet  
**Canvas:** 1440×1000

### Prompt to give the visual-generation agent

Generate empty-state components for:
- Library;
- Favorites;
- Search no results;
- Billing no invoices;
- No payment method.

Use restrained monochrome icons or five-pixel motif, short titles, one sentence, and optional utility CTA. Include a separate `ghost media grid` empty-state variant with static dark cards and no shimmer.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V020 — Pricing plan card family

**Surface:** Component sheet  
**Canvas:** 1440×1000

### Prompt to give the visual-generation agent

Generate 5Pixels pricing plan cards for Free, Basic, Pro, and a highest tier placeholder. Each card shows plan name, price, credits/month, 3–5 consumer-facing benefits, and CTA.

Show one Recommended/Best Value card with restrained lime emphasis. Do not mention AI models. Include monthly and annual badge variants.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V021 — Pricing comparison accordion

**Surface:** Component sheet  
**Canvas:** 1400×900

### Prompt to give the visual-generation agent

Generate the progressive comparison component:
- collapsed category row;
- expanded category with 3 comparison rows;
- `View more`;
- sticky plan-header fragment above it.

Use categories such as `Credits & Transformations`, `Preset Access`, `Output & Quality`. Keep the comparison table spacious with subtle separators, not heavy cell borders.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V022 — Mobile bottom sheet family

**Surface:** Component sheet  
**Canvas:** 1200×900

### Prompt to give the visual-generation agent

Generate mobile bottom-sheet patterns:
- filter sheet;
- selector sheet;
- result actions sheet;
- insufficient credits sheet.

Use a dark full-width sheet with top handle, clear title, safe-area padding, and sticky primary action where appropriate. Show one half-height and one near-full-height version.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V023 — Loading and skeleton system

**Surface:** Component sheet  
**Canvas:** 1300×900

### Prompt to give the visual-generation agent

Generate the loading-state system:
- preset-card skeleton;
- Library grid skeleton;
- Search results skeleton;
- billing metric skeleton;
- image upload placeholder.

Skeletons may use subtle tonal movement in implementation, but the visual should clearly differ from decorative ghost cards. Keep loading surfaces low contrast and restrained.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V024 — Icon/action-menu system

**Surface:** Component sheet  
**Canvas:** 1200×900

### Prompt to give the visual-generation agent

Generate a compact action-menu kit:
- three-dot overflow;
- Favorite;
- Download;
- Share;
- Delete;
- Help;
- Edit;
- Close;
- Search;
- back/chevron;
- external-link indicator.

Show icons inside 40–44px touch targets, default/hover/focus states, and a small action menu with destructive Delete separated by a divider.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---


# 5Pixels — Global Shell, Navigation, Menus, and Search Visual Prompts


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


## V025 — Authenticated desktop app shell

**Surface:** All /app routes  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the default authenticated 5Pixels desktop shell over a dark media-first app canvas.

Top sticky nav:
left — 5Pixels logo, Discover, Explore, Library, Favorites.
right — Search, compact `248 credits`, contextual `Upgrade`, avatar.

Show Discover active with warm text and a subtle lime/five-pixel indicator. Nav is visually thin and premium. Under the nav, show only a faint placeholder content region; the purpose of this visual is the shell itself.

Include no giant product-suite links. Keep the header consistent with the component sheets.

### Continuity / must preserve
- Must use exact colors, radii, button styles, and credit component from V001–V024.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V026 — Explore mega-menu open

**Surface:** Global nav → Explore  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the authenticated desktop shell with the custom **Explore mega-menu open**.

Menu anchors beneath Explore and spans a generous but controlled width. Two main columns:
**Browse**
Trending, New, Portrait, Cinematic, Covers, Illustration, Professional, Retro, Fantasy, Seasonal.

**Featured looks**
6 compact rows with small media thumbnail/icon tile, preset title, one-line descriptor, and occasional `NEW`, `TRENDING`, or `PRO` micro-badge.

Include a clear `View all presets` action. Selected/hovered row uses a subtle brighter charcoal, not full lime. The rest of the underlying page is dim but visible.

The menu should feel as bespoke as Higgsfield's Image menu while being unmistakably 5Pixels and preset-centric.

### Continuity / must preserve
- Preserve V025 nav dimensions exactly.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V027 — Avatar account popover — normal paid state

**Surface:** Global nav avatar  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the app shell with the account popover open from the top-right avatar.

Popover content:
- avatar, display name `Imisi`, small plan label `Pro`;
- Credits card: `248 credits left`, `Resets Oct 1`, five-pixel segmented meter;
- utility action `Buy credits` and secondary `Manage plan`;
- rows: Account, Billing, Help;
- optional Language row showing English only if space permits;
- divider;
- Sign out.

Use lime only on the strongest economic action. Keep the menu compact and elegant.

### Continuity / must preserve
- Preserve V025 nav. Use the credit component from V012.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V028 — Avatar account popover — low credits

**Surface:** Global nav avatar  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the same account popover as V027 but in a low-credit state:
- `18 credits left`;
- warning icon/text in addition to subtle amber accent;
- primary `Buy credits`;
- secondary `View plans`;
- all normal account rows remain available.

Do not make the warning alarming or animate it.

### Continuity / must preserve
- Same geometry as V027. Only state content changes.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V029 — Avatar account popover — zero credits

**Surface:** Global nav avatar  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the same account popover in a zero-credit state:
- `0 credits left`;
- supporting line `Add credits to generate`;
- empty five-pixel meter;
- lime `Buy credits`;
- secondary `View plans`;
- Account, Billing, Help, Sign out still accessible.

The user should not appear locked out of the whole product.

### Continuity / must preserve
- Same geometry as V027 and V028.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V030 — Global Search — zero-query All

**Surface:** Global Search overlay  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the large desktop Global Search overlay.

Header:
- large Search input placeholder `Search presets, categories, and your library`;
- separate circular Close button.
Below: scope pills `All`, `Presets`, `Categories`, `Library`; All is active.

Body:
**Recent** — 3 compact rows such as Midnight Premiere, Studio Founder, Analog Summer.
**Trending looks** — exactly 3 rich visual preset cards with one `TRENDING` and one `NEW` badge.
**Popular categories** — Portrait, Cinematic, Covers, Retro, Fantasy as compact visual chips.

Backdrop dims the app shell. Search is the dominant layer but does not touch the viewport edges.

### Continuity / must preserve
- Preserve V025 shell underneath. Use V004, V006, V016 styles.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V031 — Global Search — typed mixed results

**Surface:** Global Search overlay  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Global Search after the user typed `night`.

Input shows `night` and a small inner clear-X. Outer Close-X remains distinct.

Replace discovery body with grouped results:
**Presets**
Midnight Premiere
Neon Night
Night Editorial

**Categories**
Cinematic

**Library**
Midnight Premiere · Sep 8
Night Editorial · Aug 30

Highlight the second preset row as the current keyboard selection using brighter charcoal + five-pixel leading marker. Show one `PRO` badge. Keep title/description hierarchy crisp.

### Continuity / must preserve
- Same modal geometry as V030. Do not change the shell.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V032 — Global Search — Presets browser scope

**Surface:** Global Search → Presets  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the Presets scope.

Top Search and scopes remain. `Presets` pill is active.

Inside, use a two-column browser:
left rail `Categories` with Portrait selected, plus Cinematic, Covers, Illustration, Professional, Retro, Fantasy, Seasonal.
right pane heading `Portrait presets`, then 7 compact visual result rows with thumbnail, title, short descriptor, optional NEW/TRENDING/PRO badges.

Active category uses subtle filled charcoal and tiny lime/five-pixel signal. Right list scroll region is visibly longer than viewport.

### Continuity / must preserve
- Same Search shell as V030–V031.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V033 — Global Search — Categories scope

**Surface:** Global Search → Categories  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Categories scope.

Use a clean 2–3 column grid of category tiles:
Portrait, Cinematic, Covers, Illustration, Professional, Retro, Fantasy, Seasonal.

Each tile has a restrained representative image mosaic or media swatch, category name, one-line descriptor, and optional preset count only if visually useful. Keep scope pills and Search sticky at top.

### Continuity / must preserve
- Same Search shell as V030.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V034 — Global Search — Library scope

**Surface:** Global Search → Library  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Library scope inside Search.

Show compact rows for recent generated results:
thumbnail, preset name, date, and subtle Saved/Downloaded marker where applicable.
Add small secondary filters `Recent`, `Saved`, `Downloaded` beneath the scope row.

Keep this fast and compact. Do not turn it into the full Library page.

### Continuity / must preserve
- Same Search shell as V030.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V035 — Global Search — no results

**Surface:** Global Search overlay  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a no-results Search state for query `cyber accountant`.

Show:
`No matching presets for “cyber accountant”.`
one short line: `Try another search or browse a category.`
Actions:
`Explore all presets`
and compact suggested category chips: Portrait, Professional, Cinematic.

Optionally show two Recent rows lower down. Keep the typed query in the input.

### Continuity / must preserve
- Same Search shell and dimensions as V030–V034.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V036 — Global Search — offline/retry state

**Surface:** Global Search overlay  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the Search overlay in a recoverable loading/network error state while query `night` remains in the input.

Body:
small neutral error icon;
`Search isn't available right now.`
`Your query is still here. Try again.`
buttons `Retry` and tertiary `Explore presets`.

Do not use a scary full-page error. Preserve the query and all shell controls.

### Continuity / must preserve
- Same Search shell as V030.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---


# 5Pixels — Discover, Explore, Categories, and Preset Detail Visual Prompts


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


## V037 — Discover home — returning user

**Surface:** /app  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the authenticated Discover home.

Below the persistent nav:
- compact `Continue creating` horizontal rail with 3 recent transformations;
- large `Trending now` section of media-first preset cards;
- partial next section `Recommended for you` visible at the fold.

Use broad gallery composition, dark canvas, and varied but controlled aspect ratios. Cards use minimal permanent text; some titles appear beneath media. Show one small NEW badge and one TRENDING badge. No dashboard metrics.

### Continuity / must preserve
- Use V025 global shell and V004 preset cards.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V038 — Discover home — first-time user

**Surface:** /app new user  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the first-time Discover state.

Replace `Continue creating` with a compact editorial introduction:
`Pick the look. We'll handle the rest.`
small supporting line and `Explore presets`.

Then show `Trending now` and `New looks` visual sections. Avoid onboarding checklists, empty analytics, and giant explanatory blocks.

### Continuity / must preserve
- Same shell and grid rhythm as V037.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V039 — Explore catalog — default

**Surface:** /app/explore  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the full Explore catalog viewport.

Header row:
`Explore`
short one-line descriptor;
category chips: Trending active, New, Portrait, Cinematic, Covers, Illustration, Professional, Retro, Fantasy, Seasonal;
right side Search shortcut, Filter, Sort.

Below: a dense but elegant media grid inspired by Higgsfield Viral Presets, using a disciplined masonry layout with 4 columns. Cards show real imagery and minimal overlays. One hovered card reveals title, short descriptor, heart, and `Try this look`.

### Continuity / must preserve
- Use V025 shell, V004 cards, V006 filter controls.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V040 — Explore catalog — filters open

**Surface:** /app/explore  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the same Explore page with the Filter panel open as a right-side drawer or anchored panel.

Filters:
Category
Status: New / Trending
Fidelity: High / Balanced / Creative
Credit cost range only if visually useful
`Clear all`
`Show results`

Do not include model/provider filters. Keep the media grid visible behind the panel with reduced width or slight dim.

### Continuity / must preserve
- Same page as V039; preserve scroll position and grid content.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V041 — Explore — Portrait category state

**Surface:** /app/explore?category=portrait  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the Portrait-filtered Explore state.

Use a restrained category header:
`Portrait`
`Polished looks that keep you recognizably you.`
small editorial mosaic of 3 portrait examples.
Portrait chip active.

Below: large portrait-oriented preset cards, 3–4 columns. Include professional headshot, editorial, cinematic portrait, studio monochrome, and playful stylized examples. Do not show a database-like filter summary.

### Continuity / must preserve
- Same shell and filters as V039.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V042 — Explore — Cinematic category state

**Surface:** /app/explore?category=cinematic  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the Cinematic-filtered Explore state.

Header:
`Cinematic`
`Lighting, atmosphere, and frame-worthy drama.`
small wide visual mosaic.

Below: widescreen/portrait mixed preset cards with filmic lighting. Include one NEW and one TRENDING. Maintain the same structural grid as V041 but let media mood change.

### Continuity / must preserve
- Same layout as V041, only category content changes.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V043 — Preset Detail — default authenticated state

**Surface:** /app/presets/midnight-premiere  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a premium Preset Detail page for a sample preset `Midnight Premiere`.

Left ~60%: large outcome media / transformation preview with subtle `Original → Result` hint.
Right ~40%: preset name, category `Cinematic`, short description, `Best for`, fidelity `High`, credit cost `2 credits`, Favorite control, primary lime `Try this look`.

Below the fold, let the top of `Examples` be visible.

Include compact expandable rows for `What changes`, `What stays`, and `Tips`. Do not expose private instructions or model names.

### Continuity / must preserve
- Use V025 shell, V004 badge/card language, V002 buttons.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V044 — Preset Detail — examples continuation

**Surface:** /app/presets/midnight-premiere lower  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the continuation viewport of V043, as if the user scrolled down.

Top edge should retain just enough sticky context if designed, then show:
- `Examples` grid of 6 transformations;
- `Best results with` compatibility guidance;
- `What changes`;
- `What stays`;
- small final sticky or repeated `Try this look · 2 credits`.

Keep widths and right/left alignment consistent with V043. This is a continuation, not a redesigned page.

### Continuity / must preserve
- Exact same Preset Detail visual system as V043.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V045 — Preset Detail — Pro/locked preset

**Surface:** /app/presets/[pro-slug]  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a plan-gated preset detail.

The user can still see the large preview, examples, compatibility, and description. Add a subtle `PRO` badge beside the preset title and access note:
`Available on Pro`
Primary action: `Upgrade to use this look`
Secondary: `Compare plans`

Do not blur or hide all examples. The page should explain value before upsell.

### Continuity / must preserve
- Same layout as V043. Only access state changes.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V046 — Preset Detail — retired/unavailable state

**Surface:** /app/presets/[retired]  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a retired preset page.

Show a muted version of the preset hero, title, small `Retired` status, and copy:
`This look is no longer available.`
`Try one of these instead.`

Below: 3 strong alternative preset cards. Primary recovery is choosing an alternative, not a dead-end error page. Keep Favorite disabled/removed appropriately.

### Continuity / must preserve
- Same shell and preset-card system as V043.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V047 — Quick Try drawer — optional — OPTIONAL/FUTURE

**Surface:** Explore card → Quick Try  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate an optional right-side Quick Try drawer over the Explore grid.

Drawer:
preset thumbnail + `Midnight Premiere`;
one-line compatibility note;
source upload area;
`2 credits`;
button `Continue to create`.

Do not show the full preset controls or any prompt field. The underlying Explore grid remains visible and unchanged. The drawer should feel like a high-speed shortcut for repeat users.

### Continuity / must preserve
- Use V039 Explore underneath and V008 upload component.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---


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


# 5Pixels — Library and Favorites Visual Prompts


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


## V070 — Library — populated desktop

**Surface:** /app/library  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the populated Library page.

Header:
`Library`
Search
Filter
Tabs: All active, Saved, Downloaded.

Secondary compact filters: Date, Preset.

Below: 4-column result grid with mixed portrait/landscape outputs. Cards keep metadata minimal at rest. One hovered card reveals Open, Download, Save, More.

Use no preset-card badges unless they refer to the generation's source preset in metadata. Library is about user results, not discovery.

### Continuity / must preserve
- Use V025 shell and V015 Library cards.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V071 — Library — first-time empty

**Surface:** /app/library  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the first-time empty Library.

Keep header, tabs, and filters visible. In content area show 4 static dark ghost media cards. Center:
five-pixel empty-state motif;
`Your transformations will appear here.`
`Create something you want to keep.`
lime `Explore presets`.

No shimmer. This is not loading.

### Continuity / must preserve
- Same layout as V070.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V072 — Library — Saved tab empty

**Surface:** /app/library?tab=saved  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Saved tab selected with contextual empty state:
`Nothing saved yet.`
`Save results you want to come back to.`
secondary `View all results`.

Do not show first-time onboarding or large Explore CTA unless the whole Library is empty.

### Continuity / must preserve
- Same Library shell as V070/V071.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V073 — Library — Downloaded tab empty

**Surface:** /app/library?tab=downloaded  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Downloaded tab selected:
`Nothing downloaded yet.`
`Downloads you prepare will be easy to find here.`
button `View all results`.

Keep the layout calm and consistent with V072.

### Continuity / must preserve
- Same Library shell.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V074 — Library — filtered no results

**Surface:** /app/library filtered  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Library with Date and Preset filters active but no matching assets.

Show active filter chips at top.
Center:
`No results match these filters.`
primary/utility `Clear filters`
tertiary `View all`.

Do not show ghost-card onboarding if the user has an existing Library.

### Continuity / must preserve
- Same V070 shell.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V075 — Library — result card action menu open

**Surface:** /app/library  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the populated Library with one card's `More` menu open.

Menu:
Share
Try this look again
Delete

Separate Delete below divider and style destructively. Other cards remain visible. The menu anchors to the card without clipping. The card itself remains selected/hovered.

### Continuity / must preserve
- Base on V070.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V076 — Favorites — populated

**Surface:** /app/favorites  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Favorites as a visual grid of saved presets.

Header:
`Favorites`
optional sort `Recently saved`.

Grid uses shared preset cards with favorite heart filled. Each card makes `Try this look` easy to reach. Include one NEW preset and one retired/unavailable preset with a muted state and `See alternatives`.

No generated-result cards here.

### Continuity / must preserve
- Use V004 preset cards and V025 shell.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V077 — Favorites — empty

**Surface:** /app/favorites  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the empty Favorites page.

Header remains.
Use 3–4 muted ghost preset-card silhouettes or small visual mosaic.
Message:
`Save looks you want to try later.`
Primary `Explore presets`.

Keep one short helper line explaining the favorite/heart behavior.

### Continuity / must preserve
- Same Favorites layout as V076.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---


# 5Pixels — Account, Billing, Credits, and Pricing Visual Prompts


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


## V078 — Account overview

**Surface:** /app/account  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the private Account overview.

Left settings rail:
ACCOUNT — Profile active, Security, Privacy, Notifications
BILLING — Plan, Credits, History
bottom `Need help?` card and Sign out.

Main:
compact identity header with avatar, `Imisi`, email, Edit.
Then 3 calm shortcut cards: Profile details, Privacy, Billing/credits summary. Keep wide negative space; this is not a dashboard.

Use neutral/cream utility actions. Minimal lime.

### Continuity / must preserve
- Use V011 settings rows, V025 shell.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V079 — Account — Profile

**Surface:** /app/account/profile  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Profile settings.

Left rail unchanged, Profile active.
Main:
avatar;
Display name;
Email;
optional Language row only if supported;
`Edit profile` utility button.

Use large settings cards, not a dense vertical form. Add small account-created or verification metadata only if useful. No social handles, biography, followers, public profile metrics.

### Continuity / must preserve
- Same settings shell as V078.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V080 — Account — Security

**Surface:** /app/account/security  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Security settings with provider-agnostic cards:
- Password / sign-in method;
- Active sessions/devices placeholder card if implemented;
- Re-authentication note for sensitive changes.

Use calm card rows with one action each. Show one secondary `Change password` and one subtle destructive `Sign out other sessions` only as a visual placeholder if the feature is supported.

Do not show unsupported SSO/provider logos.

### Continuity / must preserve
- Same settings shell as V078.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V081 — Account — Privacy upper

**Surface:** /app/account/privacy  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the upper viewport of Privacy settings.

Large full-width setting cards:
- Uploaded images — explanatory copy about handling/retention using neutral placeholder wording, not an invented legal duration;
- Generated results — explanation;
- Sharing defaults only if share links exist;
- optional privacy preference toggle.

Every toggle row includes a full-sentence consequence. Keep controls right aligned.

### Continuity / must preserve
- Same settings shell as V078.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V082 — Account — Privacy lower / danger zone

**Surface:** /app/account/privacy lower  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the continuation viewport of V081.

Show:
- any remaining privacy settings;
- `Danger zone` large disclosure card;
- `Delete account`;
- one-sentence consequence;
- chevron.

In this frame, show the disclosure expanded to reveal more explanatory text and a destructive `Continue to deletion` button. Keep final deletion for a later confirmation modal.

### Continuity / must preserve
- Exact same shell, widths, and vertical rhythm as V081.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V083 — Account — Notifications

**Surface:** /app/account/notifications  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Notifications settings.

Rows:
Generation completed — on
Billing / low-credit — on
Important account/security — mandatory or shown as managed by system
Product updates — off

Each row has label, one-sentence explanation, switch. Separate essential transactional notifications from optional marketing with a section divider.

### Continuity / must preserve
- Same settings shell as V078.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V084 — Billing overview — free user

**Surface:** /app/billing  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Billing overview for a Free user.

Left settings rail with Billing group, Plan/Credits/History; Billing overview context.
Main:
current plan card `Free`;
lime `Upgrade`;
Credits card `18 credits left`, five-pixel meter, `Buy credits`;
small usage summary with Credits used, Transformations completed, Credits remaining;
shortcut to history.

Keep page consumer-friendly and calm.

### Continuity / must preserve
- Use V012 credit meter and V078 settings shell.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V085 — Billing overview — paid user

**Surface:** /app/billing  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the paid-user version of Billing overview.

Plan `Pro`
`Renews Oct 1`
Credits `248 of 300 credits left`
`Resets Oct 1`
buttons `Buy credits` and `Manage plan`.

Usage summary:
52 credits used
21 transformations
4 credits released
248 remaining

No upsell banner. Use neutral management actions.

### Continuity / must preserve
- Same layout as V084; only state changes.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V086 — Billing — Plan page

**Surface:** /app/billing/plan  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the focused Plan page.

Top card:
Pro
Monthly or Annual
renewal date
included monthly credits
4 concise plan benefits.

Actions:
`Change plan`
`Manage subscription`
small tertiary cancellation/downgrade entry below.

Do not reproduce the public pricing table here. Keep this as account management.

### Continuity / must preserve
- Same settings shell as V084.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V087 — Billing — Credits / Usage top

**Surface:** /app/billing/credits  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the top viewport of Credits & Usage.

Header:
`Credits`
date range `This billing cycle`.

Large balance card:
`248 credits left`
`Resets Oct 1`
five-pixel meter
`Buy credits`.

Below: four metric tiles:
52 Credits used
21 Transformations completed
4 Credits released
248 Credits remaining.

Let the top of the transaction-history card appear at the fold.

### Continuity / must preserve
- Same billing shell as V084.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V088 — Billing — Credit history populated

**Surface:** /app/billing/credits lower  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the continuation of V087.

Show transaction rows:
Midnight Premiere — `-2 credits` — Completed — Sep 10
Studio Founder — `2 credits released` — Failed — Sep 9
Magazine Cover 02 — `-3 credits` — Completed — Sep 8
Credit top-up — `+100 credits` — Purchase — Sep 6

Use small status labels and clear debit/credit signs. Do not show job IDs, provider names, or internal accounting jargon.

### Continuity / must preserve
- Exact same page width/shell as V087.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V089 — Billing — Credits / Usage empty history

**Surface:** /app/billing/credits  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a new-user Credits page with zero usage.

Keep summary metric tiles visible with zeros. History card shows:
`No usage history yet`
`Credit activity will appear here after your first transformation.`

This should feel intentional, not broken.

### Continuity / must preserve
- Same layout as V087.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V090 — Billing History — invoices upper

**Surface:** /app/billing/history  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the top viewport of Billing History.

Sections:
Invoices / purchases list with 3 rows, date, description, amount, status, `Receipt`.
Optional pending-payment section only if needed; otherwise omit.

Below, show the top of `Payment methods`.

Use modular cards and clear section titles. Keep real financial records separate from usage credits.

### Continuity / must preserve
- Same settings shell as V084.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V091 — Billing History — payment methods and billing info lower

**Surface:** /app/billing/history lower  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the continuation of V090.

Payment methods:
one saved card row with brand placeholder, last four `•••• 4242`, expiry, `Default`, More.
button `Add payment method`.

Billing information:
name/company, billing address summary, `Manage`.

Do not show full card number or sensitive payment data.

### Continuity / must preserve
- Exact continuation of V090.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V092 — Billing History — empty invoices/payment methods

**Surface:** /app/billing/history empty  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate an empty Billing History.

Invoices module:
`No invoices yet.`

Payment methods module:
`No payment method saved.`
button `Add payment method`.

Billing information module remains available. Use large calm empty-state cards with restrained icons.

### Continuity / must preserve
- Same page structure as V090/V091.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V093 — Public Pricing — hero + plan cards

**Surface:** /pricing top  
**Canvas:** 1440×1100

### Prompt to give the visual-generation agent

Generate the top viewport of the public 5Pixels Pricing page.

Sticky global public nav.
Hero:
`Choose the plan that fits your creativity.`
one-line credit explanation.
Monthly / Annual toggle with genuine-style savings badge placeholder.

Below: 4 plan cards — Free, Basic, Pro, Max placeholder.
Each card:
price;
credits/month;
3–5 consumer-facing benefits;
CTA.
Pro is recommended and receives restrained lime emphasis.

No model/vendor access lists. Use a sophisticated dark commercial page inspired by Higgsfield pricing.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V094 — Pricing — Plan Finder

**Surface:** /pricing middle  
**Canvas:** 1440×1100

### Prompt to give the visual-generation agent

Generate the next Pricing viewport containing `Find the best plan for you`.

Left interactive questionnaire:
1. What do you mostly create? selectable cards: Social images, Professional portraits, Covers & posters, Personal creative.
2. How often? friendly transformations-per-month slider with estimated credit usage.
3. What matters most? Volume, Quality, Flexibility.

Right: live recommendation card `We recommend Pro`, estimated monthly usage meter, headroom, 3 reasons, lime `Choose Pro`.

Keep the commercial interaction clear without AI terminology.

### Continuity / must preserve
- Same Pricing background, width, nav, and type system as V093.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V095 — Pricing — comparison top / sticky header

**Surface:** /pricing comparison top  
**Canvas:** 1440×1100

### Prompt to give the visual-generation agent

Generate the comparison-section viewport.

Heading:
`Compare plans`
short subcopy.

Sticky plan header row with Free, Basic, Pro, Max, prices, and CTAs.

Below:
first expanded category `Credits & Transformations` with rows for Monthly credits, Top-ups, Failed-generation protection, and any real plan differences.
Then collapsed category cards for Preset Access and Output & Quality.

Use subtle horizontal separators, not heavy spreadsheet cells.

### Continuity / must preserve
- Continue V093/V094 Pricing visual system.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V096 — Pricing — comparison accordion expanded

**Surface:** /pricing comparison middle  
**Canvas:** 1440×1100

### Prompt to give the visual-generation agent

Generate a lower comparison viewport with `Preset Access` expanded.

Rows could show:
Core preset catalog
Premium collections
New preset access
Seasonal/limited collections

Below it, collapsed:
Output & Quality
Library & History
Support & Rights

Include `View more` inside the expanded category if needed. Keep plan-column alignment exact with V095.

### Continuity / must preserve
- Same sticky plan-column geometry as V095.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V097 — Pricing — FAQ + final CTA + footer

**Surface:** /pricing lower  
**Canvas:** 1440×1100

### Prompt to give the visual-generation agent

Generate the lower Pricing viewport.

Switch to narrower reading width.
Heading `Frequently asked questions`.
Accordion rows:
How do credits work?
What happens if a generation fails?
Can I buy extra credits?
Do unused credits roll over?
Can I change or cancel my plan?
How are my photos handled?
Can I use results commercially?

Below:
small centered closure `Ready to create?`
lime `Choose your plan`.

Quiet footer:
Help, Privacy, Terms, Cookies, Content policy, License.
Do not force the comparison width onto the FAQ.

### Continuity / must preserve
- Same Pricing page visual language as V093–V096.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V098 — Promo code — optional empty — OPTIONAL/FUTURE

**Surface:** Billing optional  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate an optional Promo Code utility inside the billing settings shell.

Centered focused section:
`Have a code?`
large clearly labelled input `Enter promo code`
button `Apply`
small helper text.

Keep the page sparse and deliberate, inspired by Higgsfield's theatrical promo page but more conventional and accessible.

### Continuity / must preserve
- Same settings shell as V084.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V099 — Promo code — optional success — OPTIONAL/FUTURE

**Surface:** Billing optional  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the promo-code success state.

Input contains sample `PIXELS50`.
Success card:
`Code applied`
`+50 credits added`
small note if expiry/terms apply.
button `Done`.

Use success green sparingly plus the standard 5Pixels visual language. Do not rely on a toast alone.

### Continuity / must preserve
- Same layout as V098.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---


# 5Pixels — Authentication, Modals, Overlays, and Edge-State Visual Prompts


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


## V100 — Authentication modal — Login

**Surface:** Gated action overlay  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a Login modal opened over a dimmed Preset Detail page.

Modal:
5Pixels logo/wordmark small;
`Welcome back`
Email
Password + visibility
`Log in`
Forgot password
divider
`New to 5Pixels? Sign up`

At top/side show a tiny context chip `Midnight Premiere` so the user understands the selected preset will be preserved.

Keep the underlying preset page recognizable but dim.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V101 — Authentication modal — Signup

**Surface:** Gated action overlay  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the same auth modal in Signup mode.

Fields only as required: Email, Password, maybe Name if product requires it.
Primary `Create account`.
Short Terms/Privacy acknowledgement.
Link `Already have an account? Log in`.
Preserve the small selected-preset context.

No onboarding questionnaire, company-size field, or AI preferences.

### Continuity / must preserve
- Same modal geometry as V100.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V102 — Login dedicated page

**Surface:** /login  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the dedicated Login page.

Centered compact auth card on near-black canvas with subtle brand motif. Minimal surrounding marketing. Include email, password, Login, Forgot password, Sign up link. If a return intent exists, show a subtle line `You'll return to Midnight Premiere after signing in.`

No giant background gradient.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V103 — Signup dedicated page

**Surface:** /signup  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the dedicated Signup page matching V102.

Headline `Create your 5Pixels account`
required fields only
primary `Create account`
Terms/Privacy acknowledgement
login link.

Use one small visual sample card or brand motif only if it improves warmth; do not make the page a marketing landing page.

### Continuity / must preserve
- Same auth page system as V102.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V104 — Forgot password — request

**Surface:** /forgot-password  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a compact password-recovery page.

Headline `Reset your password`
one sentence
Email field
primary `Send reset link`
tertiary `Back to login`.

Keep it focused and accessible.

### Continuity / must preserve
- Same auth page system as V102.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V105 — Forgot password — email sent

**Surface:** /forgot-password sent  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the sent state:
mail/check icon;
`Check your email`
neutral copy saying a reset link was sent if an account can receive it;
`Resend email` secondary;
`Back to login`.

Do not expose whether an unknown email exists if security policy uses neutral messaging.

### Continuity / must preserve
- Same auth card geometry as V104.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V106 — Verify email — pending

**Surface:** /verify-email  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate email verification pending:
`Verify your email`
one sentence
email shown only as a safe placeholder
`Resend email`
`Change email` or `Back` only if supported.

Use a restrained five-pixel motif.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V107 — Verify email — success

**Surface:** /verify-email success  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate success:
small success mark;
`Email verified`
`You're ready to create.`
lime `Continue to 5Pixels`.

Keep it simple.

### Continuity / must preserve
- Same verification layout as V106.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V108 — Upload source chooser modal

**Surface:** Global overlay  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the reusable Upload Source chooser over a dimmed app page.

Large option:
`Upload from device`
drag/drop on desktop
accepted types.

If Recent uploads and Camera are not implemented, show them only as faint future annotations outside the actual interactive panel or omit them. The live UI should not present fake options.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V109 — Credit-cost confirmation modal

**Surface:** Generation preflight  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a small credit confirmation modal over Create.

Title:
`Generate this transformation?`
`Midnight Premiere`
`This transformation costs 2 credits.`
`248 credits available.`

Buttons:
lime `Generate`
secondary `Cancel`
optional checkbox `Don't ask again for standard-cost transformations` only if supported.

Keep it much smaller than Pricing.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V110 — Insufficient credits modal

**Surface:** Generation gate  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the insufficient-credits modal over Create.

Show selected preset thumbnail/name.
`Not enough credits`
`This transformation needs 3 credits. You have 1.`
lime `Buy credits`
secondary `View plans`
tertiary `Cancel`.

Underlying Create source and choices remain visible/dimmed to reinforce that nothing will be lost.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V111 — Upgrade modal from locked preset

**Surface:** Locked preset  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a contextual upgrade modal over a Pro preset detail.

Show small preset preview.
`Unlock this look with Pro`
3 concise relevant benefits.
plan price placeholder.
lime `Upgrade`
secondary `Compare plans`
Close.

Do not show model access or a huge pricing table.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V112 — Share Result modal

**Surface:** Result overlay  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Share Result modal.

Small result preview thumbnail.
Actions:
Download
Native share / system share if supported
Copy link only if public share links exist.

If public link is shown, include clear visibility copy `Anyone with the link can view this result` or accurate policy. Do not invent sharing if not implemented.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V113 — Delete Result confirmation

**Surface:** Library/Result  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a small destructive confirmation:
`Delete this result?`
`This removes the image from your Library.`
Buttons `Cancel` and red `Delete`.

Keep it focused. No lime. Use a small result thumbnail if helpful.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V114 — Report Result modal — OPTIONAL/FUTURE

**Surface:** Result optional  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate optional Report Result modal.

Title `Report this result`
structured selectable reasons:
Unsafe or inappropriate
Harassment or hate
Sexual content
Copyright or brand concern
Other
buttons `Cancel`, `Submit report`.

Free text not shown until Other. Keep the result thumbnail visible.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V115 — Quick Edit Profile modal — upper

**Surface:** Account/avatar shortcut  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the quick Edit Profile modal upper viewport.

Sticky header `Edit profile` + Close.
Avatar with small overlapping change button.
Fields:
Display name
Email/identifier shown appropriately
other approved lightweight field only if needed.

Sticky footer visible with Cancel and cream `Save`.
Backdrop shows the Account page dimmed.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V116 — Quick Edit Profile modal — scrolled lower

**Surface:** Account/avatar shortcut  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the same Edit Profile modal scrolled lower, preserving sticky header and sticky footer.

Show only legitimate lightweight preferences, e.g. Language if editable here. Do not add social links or biography. Include one simple toggle only if actual product needs it.

The purpose of this visual is to demonstrate long-modal scroll behavior and sticky actions.

### Continuity / must preserve
- Exact modal shell from V115.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V117 — Toast examples on live page

**Surface:** Global feedback  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a Result page with one toast visible:
`Saved to Library`
check icon
Close.

In a small inset or second state on the same visual, show:
`Download prepared`.

Ensure toast does not cover the action bar or mobile-safe area. Keep it non-blocking.

### Continuity / must preserve
- Use V018 toast system and V062 Result page.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V118 — 404 page

**Surface:** /404  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a branded 404:
small five-pixel motif;
`That page isn't here.`
one sentence;
lime `Explore presets`
secondary `Go home`.

Keep global public/app shell minimal. No whimsical illustration that overwhelms the message.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V119 — Expired shared link

**Surface:** Edge page  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate:
`This shared link has expired.`
`The result is no longer available from this link.`
primary `Explore presets`
secondary `Go home`.

Use calm neutral style and small preview placeholder only if appropriate.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V120 — Generation not found

**Surface:** Edge page  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate:
`We couldn't find that transformation.`
one short explanation;
primary `Go to Library`
secondary `Explore presets`.

Use the authenticated shell if appropriate.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V121 — Access denied

**Surface:** Edge page  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate:
`You don't have access to this page.`
primary `Go back`
secondary `Account`.

Keep it straightforward. Do not expose permission internals.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V122 — Checkout cancelled

**Surface:** Billing edge  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a calm checkout-cancelled state inside the Billing shell:
`Checkout cancelled`
`You weren't charged.`
primary `Return to Billing`
secondary `View plans`.

No red error styling; cancellation is not a failure.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V123 — Full maintenance page

**Surface:** System edge  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a full maintenance page:
5Pixels logo;
`5Pixels is temporarily unavailable.`
one neutral sentence;
`Try again` utility button;
Help/Status link if such destination exists.

Do not show an invented ETA.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V124 — Degraded generation banner

**Surface:** App degraded mode  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the normal Explore page with a persistent, unobtrusive service banner under the global nav:
`Transformations are temporarily delayed. Browsing and your Library are still available.`

Generate actions on visible cards are disabled or route to explanation. Keep Explore usable. Use warning styling without overwhelming the page.

### Continuity / must preserve
- Base on V039 Explore.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---


# 5Pixels — Mobile, Responsive, and Final QA Visual Prompts


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


## V125 — Mobile authenticated shell

**Surface:** All /app routes  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate the 5Pixels mobile shell.

Top bar:
logo;
Search icon;
compact credit indicator;
avatar.

Use a bottom navigation with no more than four main destinations if it produces the cleanest experience: Discover, Explore, Library, Favorites. Keep the current destination clearly active using text/icon + tiny lime/five-pixel signal.

Respect iOS/Android safe areas. Do not stack bottom nav on top of sticky Generate/Result controls; those pages may temporarily replace or hide bottom nav.

### Continuity / must preserve
- Mobile translation of V025, not a redesign.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V126 — Mobile Search — zero query

**Surface:** Global Search mobile  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate Global Search as a full-screen mobile sheet.

Sticky top:
Close/back;
Search field.

Horizontal scope chips:
All, Presets, Categories, Library.

Body:
Recent 2 rows;
one large Trending preset card;
horizontal Popular categories chips;
small New presets list.

No multi-column layout. Keep keyboard/input safe-area behavior believable.

### Continuity / must preserve
- Mobile version of V030.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V127 — Mobile Search — typed results

**Surface:** Global Search mobile  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate mobile Search with query `night`.

Grouped single-column results:
Presets
Categories
Library

Show clear-query X inside input and Close/back outside. One keyboard/focus-like active state can be omitted on touch; instead show a pressed/selected visual for one row. Keep rows thumb-friendly.

### Continuity / must preserve
- Mobile version of V031.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V128 — Mobile Explore

**Surface:** /app/explore mobile  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate mobile Explore.

Top shell.
Page title `Explore`.
Horizontal category chips.
Filter + Sort compact controls.
Single-column or carefully spaced 2-column media grid; choose the layout that keeps imagery large and legible.
One card shows `Try this look` overlay after tap/focus.

Bottom nav visible.

### Continuity / must preserve
- Mobile translation of V039.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V129 — Mobile Preset Detail

**Surface:** /app/presets/[slug] mobile  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate mobile Preset Detail.

Large media first.
Title `Midnight Premiere`, Cinematic, Favorite.
Outcome description, `Best for`, fidelity, examples preview.
Sticky bottom CTA:
`Try this look · 2 credits`

Ensure CTA does not cover content and can coexist with safe area. Bottom app nav may be hidden on this focused page.

### Continuity / must preserve
- Mobile translation of V043.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V130 — Mobile Create — upload

**Surface:** /app/create/[slug] mobile  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate mobile Create first-use.

Focused top bar with back, preset name, overflow/help.
Preset summary card.
Large upload area.
Small compatibility guidance.
Controls section below, mostly disabled.
Sticky bottom `Generate` disabled.

No bottom app navigation. Use full-screen focused workflow.

### Continuity / must preserve
- Mobile translation of V048.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V131 — Mobile Create — source accepted

**Surface:** /app/create/[slug] mobile  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate mobile Create ready state.

Source preview occupies most of upper screen.
Below:
preset summary;
accepted source;
Aspect Ratio selector;
one preset-specific control;
credit summary.
Sticky lime `Generate · 2 credits`.

Show a bottom-sheet handle/indicator on the controls region if using sheet architecture.

### Continuity / must preserve
- Mobile translation of V051.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V132 — Mobile Create selector sheet

**Surface:** Create selector  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate the Aspect Ratio bottom sheet open over mobile Create.

Sheet:
title `Aspect ratio`
1:1
4:5 selected
3:4
16:9
9:16
Close/Done if needed.

Underlying Create preview remains visible/dimmed above. Use large touch targets.

### Continuity / must preserve
- Use V022 bottom-sheet system and V131 underneath.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V133 — Mobile Generation

**Surface:** /app/generations/[id] mobile  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate mobile Generation in `Applying the look`.

Large source/preset context card, five-pixel progress motif, headline, one-line status. Provide enough blank space for calm waiting. No fake percentage. A small `You can leave this page` note may appear if jobs persist in background.

### Continuity / must preserve
- Mobile translation of V057.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V134 — Mobile Result

**Surface:** /app/results/[id] mobile  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate mobile Result.

Full-width result image.
Compact preset metadata.
Feedback row.
Sticky bottom action bar with primary Download plus Save and More; tapping More would reveal Regenerate, Adjust, Compare, Try another preset.

Do not fit six labels permanently across the bottom. Use progressive disclosure.

### Continuity / must preserve
- Mobile translation of V062 using V014 mobile bar.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V135 — Mobile Result — action sheet open

**Surface:** Result mobile  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate mobile Result with the action bottom sheet open:
Download
Save
Compare
Regenerate
Adjust
Try another preset
Share if available

Use icons, clear row labels, safe-area padding, and restrained separators. Result remains visible behind.

### Continuity / must preserve
- Same V134 result page.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V136 — Mobile Library

**Surface:** /app/library mobile  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate populated mobile Library.

Header `Library`, Search icon, Filter.
Horizontal tabs All, Saved, Downloaded.
Single-column large cards or 2-column thumbnails depending readability; use a layout that preserves photo value.
Bottom nav visible.

Long-press/tap More action affordance should be obvious enough without permanent clutter.

### Continuity / must preserve
- Mobile translation of V070.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V137 — Mobile Account settings index

**Surface:** /app/account mobile  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate mobile Account settings.

No desktop sidebar. Use a vertical settings index:
Profile
Security
Privacy
Notifications
divider
Plan
Credits
History
Help
Sign out

Top shows avatar/name and compact credit balance. Each row is touch-friendly with icon + chevron. Keep bottom app nav hidden or simplified while inside Settings.

### Continuity / must preserve
- Mobile translation of V078.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V138 — Mobile Billing Credits

**Surface:** /app/billing/credits mobile  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate mobile Credits page.

Balance card at top with `248 credits left`, reset date, five-pixel meter, Buy credits.
Below 2×2 metric tiles.
Date-range dropdown.
Credit-history rows stacked vertically.

Use one-column cards, large tap areas, no dense desktop table.

### Continuity / must preserve
- Mobile translation of V087/V088.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V139 — Mobile Pricing — plan cards

**Surface:** /pricing mobile top  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate mobile Pricing top.

Headline, Monthly/Annual control.
Plan cards stacked vertically or horizontally swipeable; choose whichever preserves legibility and comparison.
Recommended plan receives restrained lime emphasis.
Show Free and Pro fully, with part of adjacent card if swipeable.

Do not squeeze four columns.

### Continuity / must preserve
- Mobile translation of V093.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V140 — Mobile Pricing — comparison

**Surface:** /pricing mobile comparison  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate mobile pricing comparison without a four-column table.

Use a selected-plan comparison pattern:
top segmented plan selector Free / Basic / Pro / Max;
active `Pro`;
accordions: Credits & Transformations, Preset Access, Output & Quality;
expanded rows show the active plan's value and optionally a compare-to-current small note.

Keep the experience readable with one plan at a time.

### Continuity / must preserve
- Mobile translation of V095/V096.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V141 — Mobile auth modal/sheet

**Surface:** Gated auth mobile  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate the auth flow as a near-full-screen mobile sheet over a dimmed Preset Detail.

Header Close.
`Welcome back`
Email, Password, Log in.
selected preset context chip.
Signup link.

Use sticky keyboard-safe action area if necessary.

### Continuity / must preserve
- Mobile translation of V100.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V142 — Mobile insufficient credits sheet

**Surface:** Create gate mobile  
**Canvas:** 390×844

### Prompt to give the visual-generation agent

Generate insufficient credits as a bottom sheet over mobile Create.

`Not enough credits`
needs 3 / has 1
selected preset thumbnail
lime Buy credits
secondary View plans
Cancel.

Keep the user's source preview visible behind.

### Continuity / must preserve
- Mobile translation of V110 and V022.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V143 — Responsive comparison board

**Surface:** Design QA board  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a design-QA board showing the same core shell at:
1440 desktop
1024 tablet
768 small tablet
430 large phone
390 phone.

Use miniature but legible frames side by side. Highlight with annotation arrows where navigation, grids, sidebars, and sheets transform. This is a design documentation visual, not a product page.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V144 — Core user-flow storyboard board

**Surface:** Design QA board  
**Canvas:** 1600×1100

### Prompt to give the visual-generation agent

Generate a clean storyboard board containing 8 miniature approved frames connected left-to-right:
Discover → Preset Detail → Create Upload → Create Ready → Generation → Result → Download/Save → Library.

Use small labels and arrows. Keep the actual UI frames consistent with prior visuals rather than reinterpreting them.

### Continuity / must preserve
- Reuse approved V037, V043, V048, V051, V057, V062, V070.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V145 — Modal and overlay inventory board

**Surface:** Design QA board  
**Canvas:** 1600×1100

### Prompt to give the visual-generation agent

Generate a documentation board showing miniatures of:
Search
Account popover
Auth
Upload chooser
Credit confirmation
Insufficient credits
Upgrade
Share
Delete
Report
Edit profile
mobile bottom sheet.

Group by `Popover`, `Modal`, `Sheet`, and annotate relative size/behavior. Do not redesign components.

### Continuity / must preserve
- Reuse approved modal styles from earlier visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V146 — Empty/error/loading inventory board

**Surface:** Design QA board  
**Canvas:** 1600×1100

### Prompt to give the visual-generation agent

Generate a final state-inventory board showing:
Library empty
Favorites empty
Search no results
Billing no invoices
No payment method
Upload warning
Upload rejection
Generation failure
404
Degraded banner
Skeleton loading.

Group by Empty / Warning / Error / Loading. Use consistent iconography and tone.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V147 — Final desktop application montage

**Surface:** Final consistency board  
**Canvas:** 1800×1200

### Prompt to give the visual-generation agent

Generate a final consistency montage of 12 approved desktop frames from across the product: shell, Search, Discover, Explore, Preset Detail, Create, Generation, Result, Library, Account, Billing, Pricing.

Do not invent new layouts. The goal is to visually verify that navigation, surfaces, typography, spacing, lime usage, and five-pixel motif all feel like one product.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V148 — Final mobile application montage

**Surface:** Final consistency board  
**Canvas:** 1600×1200

### Prompt to give the visual-generation agent

Generate a final consistency montage of 10 approved mobile frames: shell, Search, Explore, Preset Detail, Create, selector sheet, Generation, Result, Library, Billing.

Do not create new styles. This is the final brand-drift check.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---
