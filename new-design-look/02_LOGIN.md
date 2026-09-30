# 5Pixels — Comprehensive AI Visual Prompts: Login

Generate both the dedicated Login route and the contextual gated-action Login modal.


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

## LG-01 — Dedicated Login page

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/login` on a near-black full canvas. Center a medium-width premium auth composition connected visually to the 5Pixels app but much quieter than Discover or Explore.

Place a small 5Pixels mark above a dark auth card. Inside:
heading `Welcome back`;
short sentence `Log in to keep creating.`;
clearly labelled Email field;
clearly labelled Password field with visibility icon;
`Forgot password?` aligned intelligently near the password field;
strong lime `Log in`;
subtle divider;
secondary line `New to 5Pixels? Create an account`.

Do not invent Google, Apple, or other provider buttons unless explicitly supported. Optionally include a single restrained preset thumbnail or five-pixel motif outside the card so the page does not feel generic, but the form must dominate.

Reserve space for inline field errors while showing the clean default state.

### Must preserve / emphasize

- Form is the clear focus.
- Labels are visible.
- Login action has strong hierarchy.
- Visual language matches the authenticated application.

### Avoid

- Marketing sections.
- Huge gradients.
- Unsupported provider buttons.
- Onboarding questions.


---

## LG-02 — Login — invalid credentials

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the exact same Login page after a failed sign-in attempt. Keep geometry unchanged. Show the email populated and password obscured. Add a persistent form-level or field-associated error: `Email or password is incorrect. Try again.` Use restrained red, an error icon, and accessible contrast.

Keep the Log in button available. Do not reveal whether a particular email exists and do not use a transient toast as the only feedback.

### Must preserve / emphasize

- Error is persistent and close to the form.
- Layout does not jump dramatically.
- Retry is immediate.


---

## LG-03 — Contextual Login modal from a preset

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Login as a modal over a dimmed Preset Detail page after an unauthenticated visitor selected `Try this look`.

The underlying preset remains recognizable. In the modal, show:
title `Welcome back`;
compact context row with thumbnail and `Midnight Premiere`;
line `You'll return to this look after signing in.`;
Email;
Password;
Forgot password;
lime `Log in`;
`New to 5Pixels? Sign up`;
close X.

The modal should preserve creative momentum rather than making auth feel like a route reset.

### Must preserve / emphasize

- Selected preset context remains visible.
- Underlying page is dimmed but recognizable.
- Modal is compact and focused.

### Avoid

- Losing return intent.
- Putting full signup and login forms side by side.

