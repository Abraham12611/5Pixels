# 5Pixels — Comprehensive AI Visual Prompts: Library

Library is the user's generated-result archive. It should stay media-first and easy to filter without becoming a complex digital-asset-management tool.


# MASTER VISUAL CONTEXT — include before every page prompt

You are generating production-grade UI/UX visuals for **5Pixels**, a premium preset-first AI image transformation web application.

5Pixels is not a blank prompt console. The core consumer journey is:
**Discover a look → inspect the preset → upload one source image → make a few controlled choices → generate → inspect result → save/download/regenerate/adjust.**

The preset is the product. Hidden generation instructions, AI-provider routing, technical inference controls, and private recipe logic are not shown to ordinary consumers in canonical V1.

## Visual system

Use the following visual language consistently:
- near-black / ink canvas around `#080A08`–`#0D100E`;
- deep-charcoal raised surfaces such as `#141714`, `#191D19`, restrained `#242924`;
- warm off-white primary text around `#F7F2E8`;
- muted warm-grey secondary text around `#A6AAA4`;
- vivid lime around `#82EA3A` as a signal, not a blanket color;
- imagery supplies most of the page color;
- neutral grotesk UI/body typography, stronger editorial display face only for major headings;
- 5-based spacing rhythm: 5, 10, 15, 20, 30, 40, 60, 80, 120;
- compact controls about 10px radius, normal cards about 15px, major media/dialogs about 20px;
- subtle five-square/five-pixel motif for selected states, credit meters, progress, loading, and empty-state flourishes.

The interface should feel premium, editorial, visual, calm, fast, trustworthy, and modern. Never make it look like a cyberpunk AI laboratory, crypto dashboard, generic enterprise SaaS admin panel, or glossy glassmorphism concept.

## Higgsfield inspiration

Take heavy inspiration from Higgsfield AI's interaction grammar:
- elegant dark application navigation;
- bespoke dropdown and mega-menu composition;
- tiny NEW / TRENDING / PRO badges;
- media-first galleries;
- anchored setting popovers;
- control rail + large visual stage;
- rich global Search palette;
- compact credit-aware account menu;
- progressive pricing comparison;
- calm, spacious billing/settings pages.

Do not copy Higgsfield one-for-one. 5Pixels should be recognizably its own calmer, more curated, preset-first system.

## Canonical vocabulary

Prefer: **Preset, Look, Transformation, Original, Result, Collection, Category, Trending, Save, Try this look, Regenerate, Adjust, Download, Credits.**

Avoid exposing: **prompt, system prompt, seed, CFG, checkpoint, LoRA, inference, scheduler, provider, model routing, technical generation pipeline.**

## Global authenticated desktop navigation

Use a slim sticky top bar:
5Pixels logo · Discover · Explore · Library · Favorites · Search · exact compact credit balance · contextual Upgrade/Pricing · account avatar.

## Rendering rules

- Straight-on, orthographic, high-fidelity web UI screenshot.
- No browser chrome.
- No device hardware mockup unless explicitly requested.
- No perspective tilt or 3D floating-card composition.
- Use legible real UI copy.
- Maintain strict continuity with previously approved 5Pixels visuals.
- If a page is too long, generate multiple continuation viewports rather than shrinking the page.
- Desktop default: 1440×1024 unless specified otherwise.
- Mobile default: 390×844.
- Do not invent features beyond the prompt.



---

## LB-01 — Library — populated

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/library` with Library active in authenticated navigation.

Header:
`Library`;
Search;
Filter.

Primary tabs:
All active;
Saved;
Downloaded.

Secondary compact filters:
Date;
Preset.

Below render a media-first 4-column result grid with mixed portrait, square, and landscape outputs. Generated media should dominate. At rest show little permanent metadata. On one hovered card reveal:
Open;
Download;
Save;
More;
small preset/date metadata near the lower edge.

The cards should look visually different from Explore preset cards: these are finished personal results, not products to choose.

### Must preserve / emphasize

- Generated media dominates.
- Tabs and filters are easy to scan.
- Card type is distinct from preset cards.
- Open conceptually routes to the canonical Result page.

### Avoid

- Model/provider metadata.
- Dense asset-management table columns.


---

## LB-02 — Library — first-time empty

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the first-time empty Library.

Keep the real Library header, tabs, Search, and filters visible.

In the grid area show four static muted ghost media cards with no shimmer. Center:
small five-pixel motif;
`Your transformations will appear here.`
`Create something you want to keep.`
lime `Explore presets`.

The ghost cards should preview the future layout without looking like loading skeletons.

### Must preserve / emphasize

- Ghost cards look static.
- Explore is the clear recovery action.
- Page remains structurally complete.


---

## LB-03 — Library — Saved tab empty

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Saved tab selected for a user who has results but has saved none.

Message:
`Nothing saved yet.`
`Save results you want to come back to.`
utility `View all results`.

Do not show new-user onboarding or a giant Explore CTA. Keep the rest of the Library shell unchanged.

### Must preserve / emphasize

- Copy reflects the selected tab only.
- User can return to All quickly.


---

## LB-04 — Library — Downloaded tab empty

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Downloaded tab selected:
`Nothing downloaded yet.`
`Downloads you prepare will be easy to find here.`
button `View all results`.

Keep the state visually consistent with LB-03.

### Must preserve / emphasize

- Empty state is contextual and concise.


---

## LB-05 — Library — filtered no results

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Library with active filter chips such as `Last 30 days` and `Midnight Premiere` but no matching results.

Keep active filters visible. In the results region show:
`No results match these filters.`
utility primary `Clear filters`
tertiary `View all`.

Do not show ghost cards or first-time orientation when the Library contains other assets.

### Must preserve / emphasize

- User understands why results are empty.
- Clear filters is immediate.


---

## LB-06 — Library — More menu open

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate populated Library with one card's overflow menu open.

Menu:
Share
Try this look again
Delete

Use a divider before Delete and red destructive icon/text. Anchor the menu to the selected card without clipping. Keep that card visibly active while the rest of the grid remains normal.

### Must preserve / emphasize

- Delete is separated.
- Menu remains anchored and legible.


---

## LB-07 — Library — loading

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Library while results are genuinely loading.

Header, tabs, and filters are already rendered. Replace the media grid with skeleton cards matching eventual card shapes. Use low-contrast tonal loading surfaces. No static empty-state copy appears.

The skeleton system must look different from LB-02's ghost-card empty state.

### Must preserve / emphasize

- Loading vs empty is unmistakable.
- Skeleton geometry matches the real grid.

