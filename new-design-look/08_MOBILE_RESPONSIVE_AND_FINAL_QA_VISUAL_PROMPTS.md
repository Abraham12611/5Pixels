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
