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


---

# 5Pixels — Comprehensive AI Visual Prompts: Pricing

Generate the public Pricing experience as a sequence of legible desktop viewports. Never compress the full page into one illegible image.


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

## PR-01 — Pricing — Hero + plan cards

**Canvas:** 1440×1100

### AI visual-generation prompt

Generate the upper viewport of the public 5Pixels Pricing page. The page should feel commercially sophisticated but calm, in the same dark premium world as the authenticated application.

Use a slim public top navigation consistent with the app's visual system. The hero should use a large but controlled editorial heading: `Choose the plan that fits your creativity.` Beneath it, one concise sentence explaining that plans provide credits used for transformations. Add a compact Monthly / Annual billing toggle with a restrained savings badge.

Immediately below, present four plan cards in one clean horizontal row: Free, Basic, Pro, and Max as a placeholder highest tier. Make Pro the recommended plan. The recommended card should have a slightly more luminous charcoal/olive-tinted surface, a small `RECOMMENDED` or `BEST VALUE` badge, and the strongest lime CTA, but still feel tasteful.

Every card must show plan name, price, billing cadence, monthly credits, short subtitle, 3–5 decisive benefits, and one CTA. Use benefits such as core preset access, premium collections, monthly credits, high-resolution export, priority generation, or support only when they are consumer-facing. Never mention model vendors.

Let the bottom of the viewport imply more pricing content continues below. Do not squeeze the Plan Finder or detailed comparison into this frame.

### Must preserve / emphasize

- Plan cards are easy to scan side-by-side.
- Pro is emphasized without making other plans look disabled.
- Lime is used sparingly for primary commercial action.
- Pricing language is outcome/credit oriented.

### Avoid

- Model-access comparison.
- Overly glossy gradients.
- Massive neon numbers.
- Dense feature tables above the fold.


---

## PR-02 — Pricing — Plan Finder

**Canvas:** 1440×1100

### AI visual-generation prompt

Generate the next vertical viewport of the Pricing page, continuing exactly from PR-01 with identical max-width, navigation, background, type system, and card language.

Create a major section titled `Find the best plan for you`. Build an interactive two-column plan recommender inspired by Higgsfield's plan finder but translated entirely into 5Pixels outcomes.

Left side contains three numbered groups.

1. `What do you mostly create?` with selectable cards: Social images, Professional portraits, Covers & posters, Personal creative looks. Show one or two selected using dark active surfaces, lime checkmarks, and simple icons.

2. `How often do you expect to create?` with a friendly horizontal slider or stepped control measured in transformations per month. Display estimated credit use in plain language.

3. `What matters most?` with selectable chips/cards: More volume, Highest quality, More flexibility.

Right side is a large recommendation card: `We recommend Pro`. Show estimated monthly credit usage, visible headroom, three concise reasons, plan price, and lime `Choose Pro`. Add a tiny explanatory note that estimates can vary by preset cost if relevant.

The whole section should feel transparent and interactive, not like a dark pattern.

### Must preserve / emphasize

- Questions use real user goals.
- Recommendation visibly reacts to selections.
- Estimated usage is understandable.
- The recommendation panel balances the questionnaire visually.

### Avoid

- AI model questions.
- Technical compute language.
- Overly complex calculators.


---

## PR-03 — Pricing — Comparison top + sticky header

**Canvas:** 1440×1100

### AI visual-generation prompt

Generate the top viewport of the detailed comparison section.

Use heading `Compare plans` and concise subcopy. Beneath it create a comparison container with a sticky-style plan header spanning Free, Basic, Pro, Max. Each column repeats plan name, price, and compact CTA. Pro remains recommended, but do not flood the entire column with lime.

Show the first expanded category: `Credits & Transformations`. Use spacious rows with subtle horizontal separators instead of heavy cell borders. Example rows: Monthly credits, Top-up credits available, Failed-generation credit protection, Transformation history, and any other confirmed consumer-facing differences.

Under the expanded section show large collapsed accordion rows for `Preset Access`, `Output & Quality`, and `Library & History`.

The visual must communicate progressive disclosure: important information is visible immediately, deeper detail is optional.

### Must preserve / emphasize

- Plan columns align exactly with feature values.
- Sticky-header context is visually believable.
- Comparison is spacious and premium.
- Critical credit behavior is not deeply hidden.

### Avoid

- Excel-like heavy gridlines.
- Raw model names.
- Technical inference metrics.


---

## PR-04 — Pricing — Expanded comparison continuation

**Canvas:** 1440×1100

### AI visual-generation prompt

Generate the next viewport of the same comparison area, preserving PR-03's exact plan-column geometry and page width.

Show `Preset Access` expanded. Rows can include Core preset catalog, Premium collections, New preset access, Seasonal/limited collections. Add an inline `View more` control revealing a few tertiary rows if needed.

Below show collapsed category cards for `Output & Quality`, `Library & History`, and `Support & Rights`. Each category header should be a generous rounded dark row with a small icon, title, and chevron. The expanded category becomes a larger card containing its comparison rows.

This must read as a natural scrolled continuation, not a redesigned second page.

### Must preserve / emphasize

- Column alignment from PR-03 is preserved.
- Accordion expansion is visually clear.
- Secondary information is progressively disclosed.


---

## PR-05 — Pricing — FAQ + final CTA + footer

**Canvas:** 1440×1100

### AI visual-generation prompt

Generate the lower Pricing viewport.

Transition from the wide comparison layout into a narrower reading column. Use heading `Frequently asked questions`. Create large rounded dark accordion rows with comfortable vertical padding and right chevrons.

Questions:
How do credits work?
What happens if a generation fails?
Can I buy extra credits?
Do unused credits roll over?
Can I change or cancel my plan?
How are my uploaded photos handled?
Can I use my results commercially?

Show one FAQ open with concise body text if useful. After FAQ, create a restrained final conversion closure: small line `Ready to create?` and lime `Choose your plan`.

Finish with a quiet footer: Help, Privacy, Terms, Cookies, Content policy, License, copyright. Do not turn the footer into another marketing hero.

### Must preserve / emphasize

- FAQ reading width is narrower than comparison.
- Final CTA appears before legal footer.
- Footer remains understated.

### Avoid

- A second giant pricing hero.
- Verbose FAQ walls of text.
- Unverified legal claims.



---

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



---

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



---

# 5Pixels — Comprehensive AI Visual Prompts: Forgot Password

Generate request, confirmation, and expired-link recovery states using the same calm auth visual system as Login.


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

## FP-01 — Forgot Password — request form

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/forgot-password`.

Use the quiet Login-page visual system: near-black canvas, centered medium-width card, small 5Pixels mark.

Heading `Reset your password`.
One sentence: `Enter the email you use for 5Pixels and we'll send a reset link.`

Show:
visible Email label;
large email field;
primary lime `Send reset link`;
tertiary `Back to login`.

Reserve a compact inline validation area beneath the field. No marketing imagery or extra product navigation is necessary.

### Must preserve / emphasize

- One obvious task.
- Visible field label.
- Back to Login is accessible.


---

## FP-02 — Forgot Password — email sent

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the post-submission confirmation.

Centered small email/five-pixel icon.
Heading `Check your email`.
Security-safe copy indicating that if the address can receive a reset, a link has been sent.
Optionally display a masked/safe email if policy allows.

Buttons:
`Resend email`
`Back to login`

If resend is temporarily unavailable, show a small countdown/disabled state rather than hiding the control.

### Must preserve / emphasize

- Messaging does not expose account existence.
- Resend path is visible.


---

## FP-03 — Forgot Password — expired/invalid reset link

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate a recovery state in the same auth card.

Heading:
`This reset link has expired.`
Short explanation.
Primary lime `Send a new link`
secondary `Back to login`.

Use restrained warning iconography, not a dramatic full-page error.

### Must preserve / emphasize

- Expired link has immediate recovery.
- Visual continuity with Login is preserved.



---

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



---

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



---

# 5Pixels — Comprehensive AI Visual Prompts: Explore

Explore is the full preset catalogue. It should feel dense, visual, curated, and easy to filter without becoming a technical browser.


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

## EX-01 — Explore — default catalogue top viewport

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/explore` with Explore active in the authenticated global navigation.

Header row:
large but restrained `Explore`;
short descriptor `Find a look, then make it yours.`;
horizontal category chips: Trending active, New, Portrait, Cinematic, Covers, Illustration, Professional, Retro, Fantasy, Seasonal;
right-side Search shortcut, Filter, Sort.

Below, create a sophisticated four-column visual preset catalogue inspired by Higgsfield Viral Presets but more controlled and editorial. Use high-quality placeholder imagery representing distinct outcomes. Mix portrait, square, and landscape cards without visual chaos. Keep gutters consistent and card edges aligned where possible.

At rest, cards carry almost no text over imagery. On one hovered card, reveal a soft bottom gradient, title, short descriptor, Favorite, optional credit cost, and `Try this look`. Add a few tiny NEW/TRENDING/PRO badges, never on every card.

### Must preserve / emphasize

- Imagery dominates.
- Category controls stay compact.
- Hover overlays remain restrained.
- Grid feels curated rather than random.

### Avoid

- Model/provider filters.
- Text-heavy metadata.
- Permanent dark overlays.
- Badge overload.


---

## EX-02 — Explore — filter panel open

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate EX-01 with Filter open as a wide anchored side panel or right drawer.

Filter groups:
Category;
Status: New, Trending;
Fidelity: High, Balanced, Creative;
optional credit-cost range if useful.

Each group should use clear chips, checkboxes, or compact selector rows with the same selected-state language as the rest of 5Pixels. Bottom actions: `Clear all` and stronger `Show results`.

Keep the grid visible behind/alongside the panel. Avoid reducing the media area to tiny thumbnails. The filter experience should feel secondary to visual browsing.

### Must preserve / emphasize

- Selected values are obvious.
- The panel is easy to dismiss.
- Underlying browsing context is preserved.

### Avoid

- Model names.
- Prompt-specific controls.
- Dozens of advanced filters.


---

## EX-03 — Explore — Portrait category

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Explore filtered to Portrait.

Use a restrained category introduction:
`Portrait`
`Polished looks that keep you recognizably you.`

Optionally add a small editorial mosaic of three portrait outcomes beside or beneath the heading. Portrait chip is active.

Below render a more portrait-heavy catalogue with professional headshot, magazine editorial, cinematic portrait, monochrome studio, soft beauty, playful stylized portrait, and vintage portrait looks.

Preserve the exact Explore shell, filters, and grid logic from EX-01.

### Must preserve / emphasize

- Category feels curated, not merely filtered.
- Portrait outcomes visibly differ while remaining recognizable.


---

## EX-04 — Explore — Cinematic category

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Explore filtered to Cinematic.

Category intro:
`Cinematic`
`Lighting, atmosphere, and frame-worthy drama.`

Use a small widescreen/portrait mosaic and a catalogue containing moody neon night, dramatic backlight, thriller still, romantic dusk, stage light, noir, vintage film, and high-contrast street cinema.

Preserve the same layout system as EX-03. Only content mood and category state should change.

### Must preserve / emphasize

- Product shell does not drift between categories.
- Cinematic media carries the visual atmosphere.


---

## EX-05 — Explore — no results after filters

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Explore with several active filter chips visible but no matching preset cards.

Keep all normal page structure and controls. In the catalogue region show a calm empty state:
`No presets match these filters.`
`Try removing a filter or browse all looks.`
utility primary `Clear filters`
tertiary `View all presets`.

Do not show a first-time onboarding message and do not remove the active filters, because the user needs to understand why the grid is empty.

### Must preserve / emphasize

- Filter cause remains visible.
- Clear filters is immediate.
- The page still feels complete.


---

## EX-06 — Explore — loading catalogue

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the same Explore page while the preset catalogue is genuinely loading.

Header, category chips, Filter, and Sort are already available. Replace media cards with a disciplined skeleton grid matching the real card shapes. Use low-contrast charcoal skeletons and subtle tonal movement implied by design, not bright shimmer. The skeleton must look clearly different from the static ghost cards used in empty states.

### Must preserve / emphasize

- Page controls remain usable if appropriate.
- Skeletons match eventual card geometry.
- Loading is visually distinct from empty.



---

# 5Pixels — Comprehensive AI Visual Prompts: Preset Detail

Preset Detail is a product-evaluation page for one transformation. Outcome, suitability, examples, and credit cost should be obvious before Create.


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

## PD-01 — Preset Detail — hero viewport

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/presets/midnight-premiere` using authenticated navigation.

Create an asymmetric hero. Left 60–65%: a large cinematic transformation media panel, preferably a portrait with moody night lighting. Add only a subtle Original→Result cue; do not default to a draggable slider.

Right 35–40% information stack:
small category `Cinematic`;
large title `Midnight Premiere`;
one concise outcome description;
Favorite heart;
optional tiny NEW/TRENDING badge if relevant;
`Best for` with icon and one-line source guidance;
`Fidelity` value `High`;
`Cost` `2 credits`;
strong lime `Try this look`;
secondary text action `View examples`.

Below, include compact disclosure rows:
`What changes`
`What stays`
`Tips for your photo`.

Let the top of the Examples section peek into the bottom of the viewport.

### Must preserve / emphasize

- Outcome and credit cost are obvious above the fold.
- Media is dominant.
- Primary CTA is unmistakable.
- Private recipe logic is absent.

### Avoid

- Model names.
- Prompt text.
- Long technical specifications.
- Dense tables.


---

## PD-02 — Preset Detail — examples continuation

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the next scrolled viewport of the exact same Preset Detail page.

Show heading `Examples` and a 2×3 grid of transformation examples. Use different source people, poses, and environments while maintaining a recognizably consistent `Midnight Premiere` outcome. This visual consistency should build trust in the preset.

Below or beside examples show:
`Best results with`
three concise guidance items such as clear face, decent light, minimal occlusion.

Then display `What changes` and `What stays` content in compact editorial blocks. At the bottom include another compact `Try this look · 2 credits` action or a sticky CTA treatment.

Preserve width, typography, spacing, and navigation exactly from PD-01.

### Must preserve / emphasize

- Examples demonstrate consistency.
- Guidance is practical.
- CTA remains reachable.


---

## PD-03 — Preset Detail — Pro/locked preset

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the same page for a plan-gated preset.

Keep the full media hero, examples preview, compatibility, and explanatory content visible. Add a small `PRO` badge beside the title and an access card:
`Available on Pro`
short benefit line;
lime `Upgrade to use this look`;
secondary `Compare plans`.

Do not blur all imagery or cover every example with lock icons. Let users understand the value before asking them to upgrade.

### Must preserve / emphasize

- Value remains evaluable.
- Access state is clear but not hostile.


---

## PD-04 — Preset Detail — retired/unavailable preset

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate a retired preset state.

Keep a muted hero preview and title. Add `Retired` status.
Copy:
`This look is no longer available.`
`Try one of these instead.`

Directly below, show three strong alternative preset cards with thumbnail, title, category, and `Try this look`.

Favorite and normal create CTA for the retired preset should not appear active.

### Must preserve / emphasize

- Page provides a graceful alternative path.
- Retired state is informative rather than alarming.


---

## PD-05 — Preset Detail — favorite saved state

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate PD-01 after the user saved the preset to Favorites.

Heart control is filled/active. Show a tiny non-blocking toast such as `Saved to Favorites` in the global toast style. Keep the page otherwise unchanged, proving that favorite behavior is lightweight and does not interrupt evaluation.

### Must preserve / emphasize

- Toast is secondary.
- Active Favorite state is obvious without excessive lime.



---

# 5Pixels — Comprehensive AI Visual Prompts: Create Studio

Create is the heart of 5Pixels. Use a Higgsfield-inspired decision rail plus large visual stage, but keep controls far simpler and outcome-oriented.


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

## CR-01 — Create — first-use upload state

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/create/midnight-premiere`.

Use authenticated navigation, but make the work area feel focused.

Desktop structure:
left configuration rail 340–380px wide;
subtle vertical divider;
large stage occupying all remaining width and most remaining height.

Rail top:
preset thumbnail;
`Midnight Premiere`;
small category;
button `Change preset`.

Then:
Source section empty;
compatibility guidance;
preset controls shown disabled/deemphasized if they require a source;
generation summary `2 credits`;
large Generate area disabled.

Stage:
large central upload panel using the five-pixel motif;
`Drop or upload an image`;
`JPG, PNG, or WebP`;
button `Choose image`.

Below upload panel add tiny three-step guidance: Upload · Adjust · Generate.

No prompt field. No model selector. No batch-size control.

### Must preserve / emphasize

- Stage dominates.
- Selected preset remains visible.
- Upload is the obvious first action.
- Rail feels like a focused tool.

### Avoid

- Prompt console.
- Node editor.
- Technical controls.
- Batch generation.


---

## CR-02 — Create — uploading / validating source

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the exact same studio after an image is chosen.

Stage shows a tasteful blurred/soft preview of the selected portrait with a validation overlay. Rail Source card shows thumbnail, shortened filename, state `Checking image…`, and Replace temporarily disabled.

Use a subtle five-pixel loading motif. Generate stays disabled.

If representing upload progress, reserve percentage/bar only for actual file transfer. During image validation switch to an indeterminate staged state rather than fake precision.

### Must preserve / emphasize

- Geometry remains unchanged from CR-01.
- Loading is calm and trustworthy.


---

## CR-03 — Create — source accepted, simple preset

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate ready-to-generate `Midnight Premiere`.

Rail:
preset thumbnail + Change;
source thumbnail + Replace;
compatibility row with restrained success icon and `Great fit`;
one preset-specific control `Framing`;
Aspect ratio selector showing `4:5`;
generation summary `2 credits`;
large lime `Generate · 2 credits`.

Stage:
uploaded original portrait inside a 4:5 crop frame with subtle reposition/crop affordances. Do not show a fake final transformed preview before generation.

The whole screen should feel nearly effortless: one photo, one or two decisions, one clear Generate action.

### Must preserve / emphasize

- Credit cost visible before generation.
- Source preview large.
- Control count intentionally small.
- Generate strongest action.


---

## CR-04 — Create — richer deterministic cover preset

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the same studio architecture for `Magazine Cover 02`, proving that presets can expose different controlled fields without changing the system.

Rail:
selected cover preset;
source accepted;
compatibility `Good fit`;
Cover title text field;
Subtitle text field;
Layout variant selector with three named visual options;
Framing;
Aspect `4:5`;
cost `3 credits`;
lime `Generate · 3 credits`.

Stage:
original source inside a cover frame with deterministic safe zones and text guides. Do not preview the final AI style before generation. These text/layout controls are composition inputs, not free-form prompting.

### Must preserve / emphasize

- Preset-specific controls remain within the same architecture.
- Text controls are clearly deterministic.


---

## CR-05 — Create — aspect ratio popover open

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate CR-03 with the Aspect Ratio control clicked.

Open an anchored dark popover listing:
1:1
4:5 selected with checkmark
3:4
16:9
9:16

Show one keyboard-focused row. Use a 15px-ish radius, subtle border, generous row height, warm text, and precise alignment to the trigger. The popover must not obscure the entire rail.

### Must preserve / emphasize

- Selected option clear.
- Popover visibly belongs to its trigger.


---

## CR-06 — Create — soft source warning

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the studio after uploading a two-person image to a portrait preset designed for one visible face.

In the Source area show an amber icon and persistent message:
`This look works best with one clearly visible face.`
`You can still continue.`

Stage visibly contains the two-person source. Generate remains enabled because this is a warning, not rejection.

Do not rely on a toast or color alone; use icon, title, and explanatory copy.

### Must preserve / emphasize

- Warning vs allowed-to-continue is obvious.


---

## CR-07 — Create — rejected source

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate a rejected upload state.

Source area and stage message:
`We couldn't read that file.`
`Try JPG, PNG, or WebP.`
button `Choose another image`.

Generate disabled.
Selected preset and safe preset options preserved.

Use restrained red on icon/border only. This is an inline recovery state, not a giant system error.

### Must preserve / emphasize

- Recovery action immediate.
- Preset context preserved.


---

## CR-08 — Create — low credits ready state

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate CR-03 for a user with only 1 credit while the selected transformation needs 2 credits.

The configuration is otherwise valid. In the generation summary show:
`2 credits required`
`1 credit available`
and replace active Generate with a clear blocked state plus `Buy credits`.

Do not wipe the source or force the user away immediately. The page should visibly preserve all work so purchase/upgrade can return them here.

### Must preserve / emphasize

- Creative setup remains intact.
- Reason Generate is blocked is explicit.
- Economic recovery is clear.



---

# 5Pixels — Comprehensive AI Visual Prompts: Generation / Processing

Generation should feel focused, truthful, and calm. Never fake technical precision or expose backend mechanics.


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

## GN-01 — Generation — queued

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/generations/[generationId]` in a Queued state.

Use the authenticated shell but visually reduce surrounding distractions.

Create a large centered generation surface with substantial negative space. Show:
source thumbnail;
selected preset thumbnail and `Midnight Premiere`;
compact option summary;
five-pixel progress motif;
headline `Getting things ready`;
state label `Queued`;
small ledger note `2 credits reserved`.

The page should make it obvious that one specific transformation is waiting to start. Do not show an output preview yet.

### Must preserve / emphasize

- No fake percentage.
- Source and preset context remain visible.
- Reserved-credit state is transparent.

### Avoid

- Technical queue identifiers.
- Provider names.
- Bright full-screen loaders.


---

## GN-02 — Generation — Applying the look

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the same page during active generation.

Headline: `Applying the look`
Small line: `This usually takes a moment.`

Advance the five-pixel progress motif to a later stage. Keep source, preset, selected options, and reserved-credit note in the same positions. Use only subtle local motion cues implied by the motif.

Do not add a countdown, progress percentage, or partial result image unless the product truly knows those values.

### Must preserve / emphasize

- State progression is visible without fake precision.
- Geometry stays stable from GN-01.


---

## GN-03 — Generation — Refining details

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the exact same page in a later stage:
`Refining details`

Advance the five-pixel stage indicator again. Keep all other elements identical. The result is still unavailable; do not hallucinate a halfway-transformed image.

The state should communicate that the job is nearing completion through stage semantics and subtle motif progression only.

### Must preserve / emphasize

- No fake partial result.
- Stage hierarchy is clear.


---

## GN-04 — Generation — Finalizing result

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the same page at its final pre-result stage:
`Finalizing your result`

The five-pixel motif reaches its final active state. Add one calm line such as `Almost there.` but no exact remaining seconds.

Preserve source/preset context and credit state until the transition completes.

### Must preserve / emphasize

- Final state feels close to completion without making a timing promise.


---

## GN-05 — Generation — taking longer than usual

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate a slow-job state.

Headline:
`Still working on it`
Copy:
`This transformation is taking longer than usual. You can leave this page and come back.`

Small credit note:
`Your credits are still reserved.`

If supported, show secondary actions `Go to Library` and `Keep waiting`. Do not imply failure and do not invent an ETA.

### Must preserve / emphasize

- Long wait is clearly not failure.
- User knows leaving the page is safe.
- Credit state remains transparent.


---

## GN-06 — Generation — technical/system failure

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate a system-side failure using the same generation-page shell.

Headline:
`This transformation didn't finish.`
Support:
`Your 2 reserved credits were released.`

Primary lime/utility action `Try again`
Secondary `Adjust`
Tertiary `Explore presets`

Keep source and preset visible. Use restrained error iconography. Never show backend/provider errors, stack traces, request IDs, or internal jargon.

### Must preserve / emphasize

- Credit outcome is explicit.
- Retry path is clear.
- Internal error details stay hidden.


---

## GN-07 — Generation — source-related failure

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate a source-specific failure state.

Headline:
`Try a different photo`
Copy:
`We couldn't get a reliable result from this image.`

Primary `Replace image`
Secondary `View tips`
Credit note `No credits charged` or the accurate released-credit wording.

Keep the problematic source thumbnail and selected preset visible so the user understands the failure context.

### Must preserve / emphasize

- Recovery action matches the problem.
- Credit behavior remains clear.


---

## GN-08 — Generation — successful handoff moment

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the very brief completion state immediately before navigation to Result.

Use the same shell, with the progress motif resolved into a success/five-pixel mark and headline:
`Your result is ready.`

Show a small transformed-result thumbnail fading in or appearing only now, plus primary `View result`. If the product auto-navigates, treat this as a visual transition specification rather than a long-lived page.

Do not use confetti or exaggerated celebration.

### Must preserve / emphasize

- Result preview appears only once the result actually exists.
- Transition remains premium and restrained.



---

# 5Pixels — Comprehensive AI Visual Prompts: Result

Result is the reward moment. The finished image should dominate while comparison, feedback, download, save, regenerate, and continuation actions remain compact.


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

## RS-01 — Result — default desktop success

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/results/[generationId]`.

Use authenticated shell. Present the transformed output as the hero: large, centered-left or centered in a gallery-like black field, preserving its natural aspect ratio with generous negative space.

Create a compact metadata/action region to the right or below:
preset `Midnight Premiere`;
small metadata `Sep 10 · 2 credits`;
small feedback prompt `How did this turn out?`;
buttons `Love it` and `Not quite`.

Add a floating or anchored action bar close to the media with:
Download as the strongest post-success action;
Save;
Compare;
Regenerate;
Adjust;
Try another preset;
More only if required.

Use icon + label selectively. Keep persistent copy minimal. The interface should make the user want to look at the image first, then act.

### Must preserve / emphasize

- Result is visually dominant.
- Download is easy to locate.
- Continuation actions stay available.
- Action bar does not cover key image content.

### Avoid

- Confetti.
- Technical generation metadata.
- Six equally loud giant buttons.


---

## RS-02 — Result — portrait output robustness

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the exact Result system for a tall 4:5 portrait output.

Keep the portrait large and vertically centered with significant breathing room. Adapt metadata/action placement intelligently around the tall image without changing button styles, type scale, or global layout language.

Do not crop the result just to use horizontal space. This frame proves the page works for portrait media.

### Must preserve / emphasize

- Natural aspect ratio preserved.
- Actions remain reachable.


---

## RS-03 — Result — landscape output robustness

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the same Result system for a wide 16:9 landscape output.

Let the image become wide and cinematic. Move the metadata/action region below or beside it as required, but keep the same components and hierarchy. Ensure the global nav and floating action bar still feel balanced.

### Must preserve / emphasize

- Layout adapts without redesigning the product.
- Landscape media remains the hero.


---

## RS-04 — Result — Original / Result comparison

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Result in comparison mode.

Turn the main media into a clear Original/Result comparison slider or split view. Labels `Original` and `Result` remain visible. Use a slender handle and subtle divider. Add an `Exit compare` control.

Keep Download/Save accessible but visually quieter during comparison. This is the correct place for close inspection, so the interaction may be more detailed than discovery cards.

### Must preserve / emphasize

- Original and Result are always identifiable.
- Comparison looks usable by keyboard and touch in implementation.
- Exit path is clear.


---

## RS-05 — Result — negative feedback chooser

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the Result page with the `Not quite` feedback popover/sheet open.

Options:
Doesn't look like me
Wrong style
Strange details
Bad text
Composition issue
Other

Use generous selectable rows, subtle icons, and a compact overlay occupying only part of the screen. Preserve the result behind it. Do not turn this into a survey or block other actions.

### Must preserve / emphasize

- Feedback requires only one quick choice.
- Result remains visible.
- Overlay is easy to dismiss.


---

## RS-06 — Result — feedback submitted + recovery

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate after the user selected `Doesn't look like me`.

Show a small non-blocking confirmation:
`Thanks — that helps us improve this preset.`

Offer contextual actions:
`Adjust`
`Regenerate`

Keep Download, Save, and other normal result actions available. The confirmation should feel like a helpful branch, not a modal success ceremony.

### Must preserve / emphasize

- Recovery actions are contextual.
- Feedback does not trap the user.


---

## RS-07 — Result — Share modal

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Result with a compact Share modal open.

Show a small result thumbnail and preset title. Present only real sharing capabilities:
Download;
Native share if supported;
Copy link only if public share links exist.

If a link exists, include plain privacy text such as `Anyone with the link can view this result` or the accurate policy wording. Do not imply follower feeds or public profiles.

### Must preserve / emphasize

- Sharing visibility is explicit.
- Modal remains compact.
- Unsupported sharing is not invented.


---

## RS-08 — Result — Save success toast

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the default Result page immediately after Save.

Show the Save control active and a small global toast:
`Saved to Library`

The toast should sit away from the result action bar and not obscure the image. It is a lightweight acknowledgement only.

### Must preserve / emphasize

- Toast is non-blocking.
- Saved state is visible even after toast disappears.



---

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



---

# 5Pixels — Comprehensive AI Visual Prompts: Favorites

Favorites stores saved presets/looks for future creation; it must not be confused with the Library of generated results.


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

## FV-01 — Favorites — populated

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/favorites` with Favorites active in authenticated navigation.

Header `Favorites`.
Optional compact sort `Recently saved`.

Render a rich grid of saved preset cards using the exact Explore preset-card system. Every card shows an active/fill Favorite heart. On hover/focus, surface `Try this look`.

Include:
one saved preset with `NEW`;
one with `TRENDING`;
one retired/unavailable saved preset rendered in a muted state with `Retired` and `See alternatives`.

Do not mix generated-result cards into this page.

### Must preserve / emphasize

- Saved looks are clearly preset products.
- Unfavorite works without leaving the page.
- Unavailable preset has graceful recovery.


---

## FV-02 — Favorites — empty

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the empty Favorites page.

Keep header visible. Show a restrained arrangement of 3–4 muted ghost preset cards or a small visual mosaic.

Centered:
`Save looks you want to try later.`
one short helper sentence explaining the heart control;
lime `Explore presets`.

Avoid long onboarding instructions.

### Must preserve / emphasize

- CTA returns to discovery.
- State remains visual and aspirational.


---

## FV-03 — Favorites — remove one preset interaction

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the populated Favorites grid immediately after one preset was unfavorited.

The removed card should be gone or animate out conceptually, while a small toast reads:
`Removed from Favorites`
with optional `Undo`.

Keep the rest of the grid stable. This state is intended to define lightweight reversible feedback.

### Must preserve / emphasize

- Removal is clear but not disruptive.
- Undo is optional and compact.



---

# 5Pixels — Comprehensive AI Visual Prompts: Account and Settings

Account is a private, calm settings environment. Generate the overview and each account sub-page as its own high-fidelity screen.


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

## AC-01 — Account overview

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/account`.

Use authenticated global navigation plus a stable local left settings rail.

Rail groups:
ACCOUNT
- Profile active
- Security
- Privacy
- Notifications

BILLING
- Plan
- Credits
- History

Near the bottom include a small `Need help?` card with one-sentence support copy and a button/link. Place Sign out below or beneath a divider.

Main content:
compact identity header with circular avatar, display name `Imisi`, email, and small utility `Edit`.
Below, create broad shortcut/status cards for:
Profile details;
Privacy;
Security;
Billing / credits summary.

Use generous negative space and calm charcoal surfaces. Administrative screens should feel quieter than Discover and Explore. Use lime only for meaningful active state or economic action, not as decoration.

### Must preserve / emphasize

- Global and local navigation are clearly different.
- Settings rail remains stable.
- Help is contextual.
- Main content is calm, not analytics-heavy.

### Avoid

- Discover/Library duplication in the settings rail.
- Public profile metrics.
- Social-network UI.


---

## AC-02 — Profile settings

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/account/profile`.

Keep the exact settings rail with Profile active.

Main content should use a compact header and large setting cards rather than a dense always-editable form.

Show:
avatar;
Display name;
Email/account identifier;
optional Language summary only if localization exists;
small account status/verification metadata if useful;
utility button `Edit profile`.

Do not add biography, social handles, follower counts, public likes/views, job title, or creator profile fields. This is an ordinary consumer account.

### Must preserve / emphasize

- Only necessary profile information appears.
- Editing feels deliberate rather than constantly active.


---

## AC-03 — Security settings

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/account/security` with Security active.

Use separate cards:
`Password / sign-in`
show status and `Change password` only if password authentication exists.

`Active sessions`
show a small device/session list if that feature is supported, with current session marked clearly.

`Sensitive actions`
brief explanation that re-authentication may be required before important account changes.

If supported, include a secondary/destructive `Sign out other sessions` action. Do not invent SSO provider logos or unsupported MFA controls just to fill the page.

### Must preserve / emphasize

- Security state is clear.
- Sensitive actions feel trustworthy.
- Destructive control is secondary.

### Avoid

- Fake security features.
- Technical implementation details.


---

## AC-04 — Privacy — upper viewport

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/account/privacy` upper viewport with Privacy active.

Use large full-width setting cards and plain-language explanatory copy.

Possible sections:
`Uploaded images`
explain handling/retention using neutral wording without inventing a fixed legal duration.

`Generated results`
explain default private storage/visibility behavior.

`Sharing defaults`
only if result-sharing links are a real feature.

Any toggle must have:
clear title;
one full sentence explaining consequence;
right-aligned switch.

Keep the page spacious. Privacy decisions should not be hidden behind tooltips.

### Must preserve / emphasize

- Consequences are explained in plain language.
- No unsupported legal/retention promise is invented.
- Controls are accessible without color-only states.


---

## AC-05 — Privacy — lower viewport / Danger zone

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the continuation viewport of AC-04, preserving exact rail, width, card language, and vertical rhythm.

Show any remaining privacy rows followed by a clearly separated `Danger zone`.

Large disclosure card:
`Delete account`
support line `Permanently delete your account and associated data according to the retention policy.`
chevron.

Show the disclosure expanded in this frame. Reveal concise consequence bullets and a red destructive `Continue to deletion` action. This is not the final confirmation modal yet.

### Must preserve / emphasize

- Danger zone is visually separated.
- Delete uses destructive styling, never lime.
- Final confirmation is still a separate later step.


---

## AC-06 — Notifications settings

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/account/notifications`.

Use full-width setting rows:
Generation completed — on
Billing / low-credit — on
Important account/security — system-managed or non-disableable if appropriate
Product updates — off

Each row has label, concise explanatory sentence, and switch aligned right. Use section labels to separate essential transactional notifications from optional product updates.

Keep the page short and easy to scan; do not create a giant matrix of email/push/SMS channels unless those channels truly exist.

### Must preserve / emphasize

- Mandatory vs optional communication is clear.
- Toggle rows are touch-friendly and calm.


---

## AC-07 — Quick Edit Profile modal from Account

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the Account page dimmed behind a medium-width `Edit profile` modal.

Modal:
sticky header `Edit profile` and Close;
avatar with small overlapping change-photo button;
Display name field;
only other lightweight profile fields actually required;
sticky footer with `Cancel` and warm-cream/utility-primary `Save`.

Show enough vertical content to demonstrate generous field spacing. Do not add social links or biography. This modal is a shortcut; the Profile page remains canonical.

### Must preserve / emphasize

- Modal uses sticky header/footer.
- Fields are minimal.
- Background Account page remains recognizable.



---

# 5Pixels — Comprehensive AI Visual Prompts: Billing, Credits, Usage, and History

Billing shares the stable settings shell with Account but focuses on plan, credit state, usage, and financial records.


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

## BL-01 — Billing overview — Free user

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/billing` for a Free user.

Use authenticated global navigation plus the same settings rail, now clearly showing Billing context.

Main content:
current plan card:
`Free`
short line `Upgrade for more credits and premium looks.`
lime `Upgrade`.

Credits card:
`18 credits left`
five-pixel segmented meter;
small reset/expiry explanation using placeholder policy language if not finalized;
utility `Buy credits`.

Usage summary:
Credits used;
Transformations completed;
Credits remaining.

Below, create compact navigation/status cards to Plan, Credit history, and Billing history.

The user should understand current capacity within seconds. Keep the page consumer-friendly and calm.

### Must preserve / emphasize

- Plan and credits are immediately understandable.
- Upgrade is visible but not oppressive.
- Exact balance appears as text.

### Avoid

- Model access.
- Compute/inference metrics.
- Financial-dashboard clutter.


---

## BL-02 — Billing overview — paid user

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the paid-user variant of the same page.

Current plan:
`Pro`
`Renews Oct 1`
utility `Manage plan`.

Credits:
`248 of 300 credits left`
`Resets Oct 1`
five-pixel meter.
Actions:
`Buy credits`
`View usage`.

Usage summary:
52 Credits used
21 Transformations
4 Credits released
248 Credits remaining

Do not show a giant Upgrade banner. The user is already paying; emphasize management and clarity.

### Must preserve / emphasize

- Paid state changes hierarchy from upsell to management.
- Credit reset information is easy to find.


---

## BL-03 — Plan sub-page

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/billing/plan`.

Keep the same settings rail and activate Plan.

Top/current-plan card:
Pro;
billing cadence;
renewal date;
included monthly credits;
4 concise benefits that are real consumer-facing plan differences.

Actions:
utility primary `Change plan`;
secondary `Manage subscription`.

Lower area:
small cancellation/downgrade entry with concise consequence copy. Cancellation should be available but not visually equal to the main management action.

Do not reproduce the full public Pricing table here.

### Must preserve / emphasize

- Current plan status is clear.
- Renewal/cadence visible.
- Cancellation remains discoverable but secondary.


---

## BL-04 — Credits / Usage — top viewport

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/billing/credits`.

Header:
`Credits`
right-side date-range control `This billing cycle`.

Large balance card:
`248 credits left`
`Resets Oct 1`
five-pixel segmented meter
utility `Buy credits`.

Below, four metric tiles:
52 Credits used
21 Transformations completed
4 Credits released
248 Credits remaining

At the bottom fold reveal the top of a transaction-history card.

Use compact icons and subdued charcoal. Credits, not dollars, are the main accounting unit.

### Must preserve / emphasize

- Balance and reset date are explicit.
- Summary can be understood without charts.
- Released credits have their own metric.


---

## BL-05 — Credits / Usage — transaction history continuation

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the lower continuation of BL-04 with identical width and settings rail.

Show a spacious credit ledger:
`Midnight Premiere` — `-2 credits` — Completed — Sep 10
`Studio Founder` — `2 credits released` — Failed — Sep 9
`Magazine Cover 02` — `-3 credits` — Completed — Sep 8
`Credit top-up` — `+100 credits` — Purchase — Sep 6

Use human-readable preset names, aligned amount/status/date, and small status chips. The failed entry should make the released-credit outcome immediately obvious.

Do not show internal generation IDs, provider costs, or technical billing language.

### Must preserve / emphasize

- Debits and credits are unambiguous.
- Failure/refund outcome is explicit.


---

## BL-06 — Credits / Usage — empty history

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/billing/credits` for a user with no usage.

Keep balance card and the four summary metric tiles visible with zero values. In the history area show:
neutral icon;
`No usage history yet`
`Credit activity will appear here after your first transformation.`

Do not hide the dashboard structure; the user should learn what information will appear later.

### Must preserve / emphasize

- Empty state still teaches the page structure.
- No fake chart data appears.


---

## BL-07 — Billing history — invoices upper viewport

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/billing/history`.

Activate History in the settings rail.

Main section `Invoices & purchases` in a modular list/card. Show sample rows containing:
date;
description;
amount;
status;
`Receipt` action.

If pending payment is not a real state, omit it instead of inventing it.

At the bottom fold reveal the heading `Payment methods`.

### Must preserve / emphasize

- Financial records are clearly distinct from credit usage.
- Receipt actions are easy to locate.


---

## BL-08 — Billing history — payment methods + billing information

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the lower continuation of BL-07.

Payment methods card:
one saved method represented safely as `•••• 4242`;
expiry;
`Default` badge;
overflow menu;
button `Add payment method`.

Billing information card:
name or business;
billing address summary;
optional tax/VAT ID only if relevant;
`Manage`.

Never display a full payment-card number or sensitive billing data.

### Must preserve / emphasize

- Sensitive payment details are protected.
- Payment method and billing identity are separate concepts.


---

## BL-09 — Billing history — empty state

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the empty version of `/app/billing/history`.

Invoices module:
`No invoices yet.`

Payment methods module:
`No payment method saved.`
utility `Add payment method`.

Billing information remains available below.

Use large calm empty-state cards inspired by Higgsfield's settings pages, translated to 5Pixels with restrained icons and no wasted decorative noise.

### Must preserve / emphasize

- Empty state looks intentional and complete.


---

## BL-10 — Low-credit billing state

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the paid Billing overview with low credits.

Credit card:
`18 credits left`
amber warning icon and small line `You may run out before your next reset.`
five-pixel meter mostly empty.
stronger `Buy credits` action.

Plan remains `Pro`; do not aggressively push Upgrade if a top-up is the more relevant recovery.

### Must preserve / emphasize

- Low-credit warning is contextual and not alarming.
- Top-up is prioritized appropriately.


---

## BL-11 — Zero-credit billing state

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Billing overview at zero credits.

Credit card:
`0 credits left`
`Add credits to keep generating.`
empty five-pixel meter.
lime `Buy credits`
secondary `View plans`.

All other billing navigation and account functionality remains usable.

### Must preserve / emphasize

- Zero credits does not imply whole-account lockout.
- Recovery actions are clear.

