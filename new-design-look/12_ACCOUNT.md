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

