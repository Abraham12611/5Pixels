# 5Pixels — Comprehensive Main-Page AI Visual Prompt Pack

This pack contains **all main 5Pixels pages except the Landing / Marketing Home**.

It is intended for an AI visual-generation agent, not just a human product designer. Each page is broken into multiple concrete visual prompts wherever a single screenshot would be too dense, too tall, or too ambiguous.

## Main pages covered

1. Pricing
2. Login
3. Sign Up
4. Forgot Password
5. Verify Email
6. Discover
7. Explore
8. Preset Detail
9. Create Studio
10. Generation / Processing
11. Result
12. Library
13. Favorites
14. Account
15. Billing

## How to use this pack

1. Give the AI agent the MASTER VISUAL CONTEXT below.
2. Generate one prompt at a time.
3. Approve or revise each image before proceeding.
4. Make the agent reuse the most recently approved 5Pixels visual as a continuity reference.
5. For continuation viewports, explicitly tell the agent not to redesign the shell.
6. Do not ask the agent to render a very long page as one tiny full-page screenshot; use the supplied top/middle/lower prompts.
7. Treat sample prices, dates, credit balances, and plan names as layout content unless commercial policy has separately locked them.

## Recommended generation order

1. `01_PRICING.md`
2. `02_LOGIN.md`
3. `03_SIGNUP.md`
4. `14_FORGOT_PASSWORD.md`
5. `15_VERIFY_EMAIL.md`
6. `04_DISCOVER.md`
7. `05_EXPLORE.md`
8. `06_PRESET_DETAIL.md`
9. `07_CREATE_STUDIO.md`
10. `08_GENERATION.md`
11. `09_RESULT.md`
12. `10_LIBRARY.md`
13. `11_FAVORITES.md`
14. `12_ACCOUNT.md`
15. `13_BILLING.md`


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


## Important product decisions preserved

- Ordinary V1 users do not type free-form prompts.
- Ordinary V1 users do not choose AI providers/models in the canonical flow.
- V1 uses one source image per generation.
- V1 does not include batch generation.
- Presets expose only controlled, product-approved inputs.
- Discovery remains visual and simple; complexity appears after preset selection.
- Failed system-side generation must communicate the credit outcome clearly.
- Account/Billing are private utility environments, not creator-social profiles.
