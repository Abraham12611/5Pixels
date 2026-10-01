# 5Pixels — Comprehensive AI Visual Prompts: Discover

Discover is the authenticated visual home. It should feel like a curated creative feed, never a dashboard.


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

## DS-01 — Discover — returning user top viewport

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app` for a returning authenticated user.

Use the persistent authenticated desktop navigation. Immediately below, create a shallow `Continue creating` rail with three recent transformation cards. Each recent card uses the latest result image, preset name, human date, and a compact action such as `Open`. Keep this rail useful but visually subordinate to discovery.

Below it create a broad `Trending now` section with 4–5 media-first preset cards across the width. Use varied but disciplined aspect ratios. Give one card a tiny `TRENDING` badge and another `NEW`. On one card show a deliberate hover/focus state: subtle bottom gradient, preset title, short descriptor, Favorite heart, and `Try this look`.

At the bottom fold reveal the beginning of `Recommended for you`.

Use large breathing room between sections, a near-black page canvas, warm off-white headings, charcoal controls, and image-led color. The page should immediately feel alive with possible outcomes.

### Must preserve / emphasize

- Visual presets dominate the page.
- Recent work is helpful but not oversized.
- Only a few badges appear.
- Navigation stays visually quiet.

### Avoid

- Charts and analytics.
- Onboarding checklists.
- AI model content.
- Autoplay on every card.


---

## DS-02 — Discover — continuation viewport

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the next scrolled viewport of exactly the same Discover page.

Continue with:
`Recommended for you` — 4 premium preset cards;
`New looks` — a horizontal visual rail or grid;
`Favorites` preview — up to 4 saved presets with a small `View all`;
`Browse by category` — compact visual category tiles for Portrait, Cinematic, Covers, Retro, Fantasy.

Give each section a slightly different visual rhythm so the page feels editorial rather than repetitive. For example, Recommended may use larger cards, New looks a horizontal rail, Favorites a compact row, Categories small image mosaics.

Preserve the same content width, page gutter, card system, and spacing from DS-01.

### Must preserve / emphasize

- Favorites clearly links to full Favorites.
- Category shortcuts feel visual.
- Section variation does not break consistency.


---

## DS-03 — Discover — first-time user

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the first-time Discover state for a user with no recent generations and no favorites.

Directly below global navigation, replace `Continue creating` with a restrained editorial orientation block:
`Pick the look. We'll handle the rest.`
supporting line `Choose a preset, add your photo, and create in a few taps.`
primary lime `Explore presets`.

Then immediately show `Trending now` and `New looks` with rich imagery. Do not show empty Recent or Favorites modules above the fold.

The first-time experience must still feel like a mature creative product, not an empty dashboard with a checklist.

### Must preserve / emphasize

- Orientation copy is short.
- A clear first action is visible.
- The page remains visually rich.


---

## DS-04 — Discover — card hover preview emphasis

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the same returning-user Discover page but focus on one large Trending preset card in its hover/focus state.

The card should transition from a static poster to a short preview-ready state: show a subtle Original→Result visual cue, bottom gradient, preset name, one-line outcome descriptor, Favorite heart, small credit cost, and `Try this look`.

Keep surrounding cards at rest. This frame is primarily to establish the correct hover hierarchy and prove that hover content does not obscure the entire image.

### Must preserve / emphasize

- Hovered card is obviously interactive.
- Text is readable without masking the media.
- Surrounding content remains calm.

