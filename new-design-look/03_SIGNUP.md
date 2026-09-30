# 5Pixels — Comprehensive AI Visual Prompts: Sign Up

Generate the dedicated account-creation route and the contextual signup modal.


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

## SU-01 — Dedicated Sign Up page

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/signup` as the sibling to Login.

Use the same centered premium auth-card system on a near-black canvas. Heading: `Create your 5Pixels account`. Supporting line: `Save your results, keep your favorites, and create whenever inspiration hits.`

Show only required fields:
Display name only if truly required;
Email;
Password;
optional concise password helper.

Primary lime button `Create account`.
Below it, a short readable Terms and Privacy acknowledgement.
Footer line `Already have an account? Log in`.

The whole page should make signup feel fast. Keep spacing generous and fields large.

### Must preserve / emphasize

- Account creation looks low-friction.
- Terms/Privacy acknowledgement is legible.
- Login is easy to reach.

### Avoid

- Bio fields.
- Company/job questions.
- AI/model preferences.
- Long surveys.


---

## SU-02 — Sign Up — validation state

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the same Sign Up page with realistic validation. Show an invalid-email warning tied directly to Email and a concise password requirement/helper under Password. The Create account button should reflect whether the form is valid.

Use field-level validation, not a giant red banner. Keep errors compact, accessible, and stable so the layout still resembles the default state.

### Must preserve / emphasize

- Each error is attached to its field.
- Helper text remains readable.


---

## SU-03 — Contextual Sign Up modal from a preset

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Sign Up in the same modal shell as contextual Login over a dimmed Preset Detail page.

At the top show a compact preset row:
thumbnail;
`Midnight Premiere`;
`Create an account to try this look.`

Fields: Email, Password, optional Display name only if required.
Primary `Create account`.
Terms/Privacy acknowledgement.
`Already have an account? Log in`.
Close.

The selected look remains the emotional anchor throughout the interruption.

### Must preserve / emphasize

- Preset intent survives signup.
- Modal remains concise.
- Return-to-create is implied clearly.

