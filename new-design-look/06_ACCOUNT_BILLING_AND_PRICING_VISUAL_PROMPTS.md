# 5Pixels — Account, Billing, Credits, and Pricing Visual Prompts


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


## V078 — Account overview

**Surface:** /app/account  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the private Account overview.

Left settings rail:
ACCOUNT — Profile active, Security, Privacy, Notifications
BILLING — Plan, Credits, History
bottom `Need help?` card and Sign out.

Main:
compact identity header with avatar, `Imisi`, email, Edit.
Then 3 calm shortcut cards: Profile details, Privacy, Billing/credits summary. Keep wide negative space; this is not a dashboard.

Use neutral/cream utility actions. Minimal lime.

### Continuity / must preserve
- Use V011 settings rows, V025 shell.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V079 — Account — Profile

**Surface:** /app/account/profile  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Profile settings.

Left rail unchanged, Profile active.
Main:
avatar;
Display name;
Email;
optional Language row only if supported;
`Edit profile` utility button.

Use large settings cards, not a dense vertical form. Add small account-created or verification metadata only if useful. No social handles, biography, followers, public profile metrics.

### Continuity / must preserve
- Same settings shell as V078.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V080 — Account — Security

**Surface:** /app/account/security  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Security settings with provider-agnostic cards:
- Password / sign-in method;
- Active sessions/devices placeholder card if implemented;
- Re-authentication note for sensitive changes.

Use calm card rows with one action each. Show one secondary `Change password` and one subtle destructive `Sign out other sessions` only as a visual placeholder if the feature is supported.

Do not show unsupported SSO/provider logos.

### Continuity / must preserve
- Same settings shell as V078.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V081 — Account — Privacy upper

**Surface:** /app/account/privacy  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the upper viewport of Privacy settings.

Large full-width setting cards:
- Uploaded images — explanatory copy about handling/retention using neutral placeholder wording, not an invented legal duration;
- Generated results — explanation;
- Sharing defaults only if share links exist;
- optional privacy preference toggle.

Every toggle row includes a full-sentence consequence. Keep controls right aligned.

### Continuity / must preserve
- Same settings shell as V078.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V082 — Account — Privacy lower / danger zone

**Surface:** /app/account/privacy lower  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the continuation viewport of V081.

Show:
- any remaining privacy settings;
- `Danger zone` large disclosure card;
- `Delete account`;
- one-sentence consequence;
- chevron.

In this frame, show the disclosure expanded to reveal more explanatory text and a destructive `Continue to deletion` button. Keep final deletion for a later confirmation modal.

### Continuity / must preserve
- Exact same shell, widths, and vertical rhythm as V081.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V083 — Account — Notifications

**Surface:** /app/account/notifications  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Notifications settings.

Rows:
Generation completed — on
Billing / low-credit — on
Important account/security — mandatory or shown as managed by system
Product updates — off

Each row has label, one-sentence explanation, switch. Separate essential transactional notifications from optional marketing with a section divider.

### Continuity / must preserve
- Same settings shell as V078.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V084 — Billing overview — free user

**Surface:** /app/billing  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Billing overview for a Free user.

Left settings rail with Billing group, Plan/Credits/History; Billing overview context.
Main:
current plan card `Free`;
lime `Upgrade`;
Credits card `18 credits left`, five-pixel meter, `Buy credits`;
small usage summary with Credits used, Transformations completed, Credits remaining;
shortcut to history.

Keep page consumer-friendly and calm.

### Continuity / must preserve
- Use V012 credit meter and V078 settings shell.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V085 — Billing overview — paid user

**Surface:** /app/billing  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the paid-user version of Billing overview.

Plan `Pro`
`Renews Oct 1`
Credits `248 of 300 credits left`
`Resets Oct 1`
buttons `Buy credits` and `Manage plan`.

Usage summary:
52 credits used
21 transformations
4 credits released
248 remaining

No upsell banner. Use neutral management actions.

### Continuity / must preserve
- Same layout as V084; only state changes.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V086 — Billing — Plan page

**Surface:** /app/billing/plan  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the focused Plan page.

Top card:
Pro
Monthly or Annual
renewal date
included monthly credits
4 concise plan benefits.

Actions:
`Change plan`
`Manage subscription`
small tertiary cancellation/downgrade entry below.

Do not reproduce the public pricing table here. Keep this as account management.

### Continuity / must preserve
- Same settings shell as V084.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V087 — Billing — Credits / Usage top

**Surface:** /app/billing/credits  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the top viewport of Credits & Usage.

Header:
`Credits`
date range `This billing cycle`.

Large balance card:
`248 credits left`
`Resets Oct 1`
five-pixel meter
`Buy credits`.

Below: four metric tiles:
52 Credits used
21 Transformations completed
4 Credits released
248 Credits remaining.

Let the top of the transaction-history card appear at the fold.

### Continuity / must preserve
- Same billing shell as V084.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V088 — Billing — Credit history populated

**Surface:** /app/billing/credits lower  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the continuation of V087.

Show transaction rows:
Midnight Premiere — `-2 credits` — Completed — Sep 10
Studio Founder — `2 credits released` — Failed — Sep 9
Magazine Cover 02 — `-3 credits` — Completed — Sep 8
Credit top-up — `+100 credits` — Purchase — Sep 6

Use small status labels and clear debit/credit signs. Do not show job IDs, provider names, or internal accounting jargon.

### Continuity / must preserve
- Exact same page width/shell as V087.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V089 — Billing — Credits / Usage empty history

**Surface:** /app/billing/credits  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a new-user Credits page with zero usage.

Keep summary metric tiles visible with zeros. History card shows:
`No usage history yet`
`Credit activity will appear here after your first transformation.`

This should feel intentional, not broken.

### Continuity / must preserve
- Same layout as V087.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V090 — Billing History — invoices upper

**Surface:** /app/billing/history  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the top viewport of Billing History.

Sections:
Invoices / purchases list with 3 rows, date, description, amount, status, `Receipt`.
Optional pending-payment section only if needed; otherwise omit.

Below, show the top of `Payment methods`.

Use modular cards and clear section titles. Keep real financial records separate from usage credits.

### Continuity / must preserve
- Same settings shell as V084.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V091 — Billing History — payment methods and billing info lower

**Surface:** /app/billing/history lower  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the continuation of V090.

Payment methods:
one saved card row with brand placeholder, last four `•••• 4242`, expiry, `Default`, More.
button `Add payment method`.

Billing information:
name/company, billing address summary, `Manage`.

Do not show full card number or sensitive payment data.

### Continuity / must preserve
- Exact continuation of V090.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V092 — Billing History — empty invoices/payment methods

**Surface:** /app/billing/history empty  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate an empty Billing History.

Invoices module:
`No invoices yet.`

Payment methods module:
`No payment method saved.`
button `Add payment method`.

Billing information module remains available. Use large calm empty-state cards with restrained icons.

### Continuity / must preserve
- Same page structure as V090/V091.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V093 — Public Pricing — hero + plan cards

**Surface:** /pricing top  
**Canvas:** 1440×1100

### Prompt to give the visual-generation agent

Generate the top viewport of the public 5Pixels Pricing page.

Sticky global public nav.
Hero:
`Choose the plan that fits your creativity.`
one-line credit explanation.
Monthly / Annual toggle with genuine-style savings badge placeholder.

Below: 4 plan cards — Free, Basic, Pro, Max placeholder.
Each card:
price;
credits/month;
3–5 consumer-facing benefits;
CTA.
Pro is recommended and receives restrained lime emphasis.

No model/vendor access lists. Use a sophisticated dark commercial page inspired by Higgsfield pricing.

### Continuity / must preserve
- Use the master context and all previously approved 5Pixels visuals.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V094 — Pricing — Plan Finder

**Surface:** /pricing middle  
**Canvas:** 1440×1100

### Prompt to give the visual-generation agent

Generate the next Pricing viewport containing `Find the best plan for you`.

Left interactive questionnaire:
1. What do you mostly create? selectable cards: Social images, Professional portraits, Covers & posters, Personal creative.
2. How often? friendly transformations-per-month slider with estimated credit usage.
3. What matters most? Volume, Quality, Flexibility.

Right: live recommendation card `We recommend Pro`, estimated monthly usage meter, headroom, 3 reasons, lime `Choose Pro`.

Keep the commercial interaction clear without AI terminology.

### Continuity / must preserve
- Same Pricing background, width, nav, and type system as V093.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V095 — Pricing — comparison top / sticky header

**Surface:** /pricing comparison top  
**Canvas:** 1440×1100

### Prompt to give the visual-generation agent

Generate the comparison-section viewport.

Heading:
`Compare plans`
short subcopy.

Sticky plan header row with Free, Basic, Pro, Max, prices, and CTAs.

Below:
first expanded category `Credits & Transformations` with rows for Monthly credits, Top-ups, Failed-generation protection, and any real plan differences.
Then collapsed category cards for Preset Access and Output & Quality.

Use subtle horizontal separators, not heavy spreadsheet cells.

### Continuity / must preserve
- Continue V093/V094 Pricing visual system.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V096 — Pricing — comparison accordion expanded

**Surface:** /pricing comparison middle  
**Canvas:** 1440×1100

### Prompt to give the visual-generation agent

Generate a lower comparison viewport with `Preset Access` expanded.

Rows could show:
Core preset catalog
Premium collections
New preset access
Seasonal/limited collections

Below it, collapsed:
Output & Quality
Library & History
Support & Rights

Include `View more` inside the expanded category if needed. Keep plan-column alignment exact with V095.

### Continuity / must preserve
- Same sticky plan-column geometry as V095.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V097 — Pricing — FAQ + final CTA + footer

**Surface:** /pricing lower  
**Canvas:** 1440×1100

### Prompt to give the visual-generation agent

Generate the lower Pricing viewport.

Switch to narrower reading width.
Heading `Frequently asked questions`.
Accordion rows:
How do credits work?
What happens if a generation fails?
Can I buy extra credits?
Do unused credits roll over?
Can I change or cancel my plan?
How are my photos handled?
Can I use results commercially?

Below:
small centered closure `Ready to create?`
lime `Choose your plan`.

Quiet footer:
Help, Privacy, Terms, Cookies, Content policy, License.
Do not force the comparison width onto the FAQ.

### Continuity / must preserve
- Same Pricing page visual language as V093–V096.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V098 — Promo code — optional empty — OPTIONAL/FUTURE

**Surface:** Billing optional  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate an optional Promo Code utility inside the billing settings shell.

Centered focused section:
`Have a code?`
large clearly labelled input `Enter promo code`
button `Apply`
small helper text.

Keep the page sparse and deliberate, inspired by Higgsfield's theatrical promo page but more conventional and accessible.

### Continuity / must preserve
- Same settings shell as V084.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V099 — Promo code — optional success — OPTIONAL/FUTURE

**Surface:** Billing optional  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the promo-code success state.

Input contains sample `PIXELS50`.
Success card:
`Code applied`
`+50 credits added`
small note if expiry/terms apply.
button `Done`.

Use success green sparingly plus the standard 5Pixels visual language. Do not rely on a toast alone.

### Continuity / must preserve
- Same layout as V098.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---
