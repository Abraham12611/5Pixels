# 5Pixels — Authentication, Modals, Overlays, and Edge-State Visual Prompts


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


## V100 — Authentication modal — Login

**Surface:** Gated action overlay  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a Login modal opened over a dimmed Preset Detail page.

Modal:
5Pixels logo/wordmark small;
`Welcome back`
Email
Password + visibility
`Log in`
Forgot password
divider
`New to 5Pixels? Sign up`

At top/side show a tiny context chip `Midnight Premiere` so the user understands the selected preset will be preserved.

Keep the underlying preset page recognizable but dim.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V101 — Authentication modal — Signup

**Surface:** Gated action overlay  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the same auth modal in Signup mode.

Fields only as required: Email, Password, maybe Name if product requires it.
Primary `Create account`.
Short Terms/Privacy acknowledgement.
Link `Already have an account? Log in`.
Preserve the small selected-preset context.

No onboarding questionnaire, company-size field, or AI preferences.

### Continuity / must preserve
- Same modal geometry as V100.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V102 — Login dedicated page

**Surface:** /login  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the dedicated Login page.

Centered compact auth card on near-black canvas with subtle brand motif. Minimal surrounding marketing. Include email, password, Login, Forgot password, Sign up link. If a return intent exists, show a subtle line `You'll return to Midnight Premiere after signing in.`

No giant background gradient.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V103 — Signup dedicated page

**Surface:** /signup  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the dedicated Signup page matching V102.

Headline `Create your 5Pixels account`
required fields only
primary `Create account`
Terms/Privacy acknowledgement
login link.

Use one small visual sample card or brand motif only if it improves warmth; do not make the page a marketing landing page.

### Continuity / must preserve
- Same auth page system as V102.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V104 — Forgot password — request

**Surface:** /forgot-password  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a compact password-recovery page.

Headline `Reset your password`
one sentence
Email field
primary `Send reset link`
tertiary `Back to login`.

Keep it focused and accessible.

### Continuity / must preserve
- Same auth page system as V102.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V105 — Forgot password — email sent

**Surface:** /forgot-password sent  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the sent state:
mail/check icon;
`Check your email`
neutral copy saying a reset link was sent if an account can receive it;
`Resend email` secondary;
`Back to login`.

Do not expose whether an unknown email exists if security policy uses neutral messaging.

### Continuity / must preserve
- Same auth card geometry as V104.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V106 — Verify email — pending

**Surface:** /verify-email  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate email verification pending:
`Verify your email`
one sentence
email shown only as a safe placeholder
`Resend email`
`Change email` or `Back` only if supported.

Use a restrained five-pixel motif.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V107 — Verify email — success

**Surface:** /verify-email success  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate success:
small success mark;
`Email verified`
`You're ready to create.`
lime `Continue to 5Pixels`.

Keep it simple.

### Continuity / must preserve
- Same verification layout as V106.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V108 — Upload source chooser modal

**Surface:** Global overlay  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the reusable Upload Source chooser over a dimmed app page.

Large option:
`Upload from device`
drag/drop on desktop
accepted types.

If Recent uploads and Camera are not implemented, show them only as faint future annotations outside the actual interactive panel or omit them. The live UI should not present fake options.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V109 — Credit-cost confirmation modal

**Surface:** Generation preflight  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a small credit confirmation modal over Create.

Title:
`Generate this transformation?`
`Midnight Premiere`
`This transformation costs 2 credits.`
`248 credits available.`

Buttons:
lime `Generate`
secondary `Cancel`
optional checkbox `Don't ask again for standard-cost transformations` only if supported.

Keep it much smaller than Pricing.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V110 — Insufficient credits modal

**Surface:** Generation gate  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the insufficient-credits modal over Create.

Show selected preset thumbnail/name.
`Not enough credits`
`This transformation needs 3 credits. You have 1.`
lime `Buy credits`
secondary `View plans`
tertiary `Cancel`.

Underlying Create source and choices remain visible/dimmed to reinforce that nothing will be lost.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V111 — Upgrade modal from locked preset

**Surface:** Locked preset  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a contextual upgrade modal over a Pro preset detail.

Show small preset preview.
`Unlock this look with Pro`
3 concise relevant benefits.
plan price placeholder.
lime `Upgrade`
secondary `Compare plans`
Close.

Do not show model access or a huge pricing table.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V112 — Share Result modal

**Surface:** Result overlay  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Share Result modal.

Small result preview thumbnail.
Actions:
Download
Native share / system share if supported
Copy link only if public share links exist.

If public link is shown, include clear visibility copy `Anyone with the link can view this result` or accurate policy. Do not invent sharing if not implemented.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V113 — Delete Result confirmation

**Surface:** Library/Result  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a small destructive confirmation:
`Delete this result?`
`This removes the image from your Library.`
Buttons `Cancel` and red `Delete`.

Keep it focused. No lime. Use a small result thumbnail if helpful.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V114 — Report Result modal — OPTIONAL/FUTURE

**Surface:** Result optional  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate optional Report Result modal.

Title `Report this result`
structured selectable reasons:
Unsafe or inappropriate
Harassment or hate
Sexual content
Copyright or brand concern
Other
buttons `Cancel`, `Submit report`.

Free text not shown until Other. Keep the result thumbnail visible.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V115 — Quick Edit Profile modal — upper

**Surface:** Account/avatar shortcut  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the quick Edit Profile modal upper viewport.

Sticky header `Edit profile` + Close.
Avatar with small overlapping change button.
Fields:
Display name
Email/identifier shown appropriately
other approved lightweight field only if needed.

Sticky footer visible with Cancel and cream `Save`.
Backdrop shows the Account page dimmed.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V116 — Quick Edit Profile modal — scrolled lower

**Surface:** Account/avatar shortcut  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the same Edit Profile modal scrolled lower, preserving sticky header and sticky footer.

Show only legitimate lightweight preferences, e.g. Language if editable here. Do not add social links or biography. Include one simple toggle only if actual product needs it.

The purpose of this visual is to demonstrate long-modal scroll behavior and sticky actions.

### Continuity / must preserve
- Exact modal shell from V115.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V117 — Toast examples on live page

**Surface:** Global feedback  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a Result page with one toast visible:
`Saved to Library`
check icon
Close.

In a small inset or second state on the same visual, show:
`Download prepared`.

Ensure toast does not cover the action bar or mobile-safe area. Keep it non-blocking.

### Continuity / must preserve
- Use V018 toast system and V062 Result page.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V118 — 404 page

**Surface:** /404  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a branded 404:
small five-pixel motif;
`That page isn't here.`
one sentence;
lime `Explore presets`
secondary `Go home`.

Keep global public/app shell minimal. No whimsical illustration that overwhelms the message.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V119 — Expired shared link

**Surface:** Edge page  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate:
`This shared link has expired.`
`The result is no longer available from this link.`
primary `Explore presets`
secondary `Go home`.

Use calm neutral style and small preview placeholder only if appropriate.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V120 — Generation not found

**Surface:** Edge page  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate:
`We couldn't find that transformation.`
one short explanation;
primary `Go to Library`
secondary `Explore presets`.

Use the authenticated shell if appropriate.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V121 — Access denied

**Surface:** Edge page  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate:
`You don't have access to this page.`
primary `Go back`
secondary `Account`.

Keep it straightforward. Do not expose permission internals.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V122 — Checkout cancelled

**Surface:** Billing edge  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a calm checkout-cancelled state inside the Billing shell:
`Checkout cancelled`
`You weren't charged.`
primary `Return to Billing`
secondary `View plans`.

No red error styling; cancellation is not a failure.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V123 — Full maintenance page

**Surface:** System edge  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a full maintenance page:
5Pixels logo;
`5Pixels is temporarily unavailable.`
one neutral sentence;
`Try again` utility button;
Help/Status link if such destination exists.

Do not show an invented ETA.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V124 — Degraded generation banner

**Surface:** App degraded mode  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the normal Explore page with a persistent, unobtrusive service banner under the global nav:
`Transformations are temporarily delayed. Browsing and your Library are still available.`

Generate actions on visible cards are disabled or route to explanation. Keep Explore usable. Use warning styling without overwhelming the page.

### Continuity / must preserve
- Base on V039 Explore.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---
