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
