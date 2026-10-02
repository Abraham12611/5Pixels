# 5Pixels — Comprehensive AI Visual Prompts: Verify Email

Generate pending, success, and invalid/expired email-verification states.


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

## VE-01 — Verify Email — pending

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/verify-email` immediately after account creation.

Use a sparse centered card:
small email/five-pixel motif;
heading `Verify your email`;
short line `We sent a verification link to your email.`;
safe email display if appropriate;
utility `Resend email`;
tertiary `Change email` or `Back to login` only if supported.

Add a tiny note that the user can keep this page open. Keep the screen calm, with no unnecessary onboarding.

### Must preserve / emphasize

- Verification task is unmistakable.
- Resend is available.
- No unsupported actions are invented.


---

## VE-02 — Verify Email — success

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the successful verification state.

Small success mark.
Heading `Email verified`.
Line `You're ready to create.`
large lime `Continue to 5Pixels`.

If the user arrived from a preserved preset intent, include a compact context row:
thumbnail;
`Continue with Midnight Premiere`.

Do not add extra setup steps between verification and the creative task.

### Must preserve / emphasize

- Next action is immediate.
- Preserved intent can resume.


---

## VE-03 — Verify Email — invalid/expired link

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the invalid/expired verification state.

Heading:
`This verification link isn't valid anymore.`
one short explanation;
primary `Send a new verification email`;
secondary `Back to login`.

Use restrained warning/error styling. The page must provide a direct recovery path.

### Must preserve / emphasize

- No dead end.
- Recovery is one action away.

