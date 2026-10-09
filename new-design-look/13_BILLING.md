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

> **Credit-policy note (canonical):** credits never expire while the account is active, and balances accumulate past a single period's grant — see `18_BILLING_CREDITS_PLAN.md`, "Canonical credit policy". This file's mock copy has been updated to match: raw balances (never `X of Y left` where Y is the period grant), next-grant language (`+N credits each month`, `Next grant …`) instead of resets, and the period grant treated as meter display scale only.

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
`18 credits`
five-pixel segmented meter;
small line `Credits never expire.`;
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
`248 credits`
`+300 each month · next grant Oct 1`
five-pixel meter (grant is display scale only — the balance can exceed it).
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
- Next-grant timing is easy to find — never framed as a balance reset.


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
`248 credits`
`+300 each month · next grant Oct 1`
five-pixel segmented meter (grant is display scale only — the balance can exceed it)
utility `Buy credits`.

Below, four metric tiles:
52 Credits used
21 Transformations completed
4 Credits released
248 Credits remaining

At the bottom fold reveal the top of a transaction-history card.

Use compact icons and subdued charcoal. Credits, not dollars, are the main accounting unit.

### Must preserve / emphasize

- Balance and next-grant date are explicit — never framed as a reset.
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
`18 credits`
amber warning icon and small line `Running low — top up anytime. Your credits never expire.`
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
`0 credits`
`Add credits to keep generating.`
empty five-pixel meter.
lime `Buy credits`
secondary `View plans`.

All other billing navigation and account functionality remains usable.

### Must preserve / emphasize

- Zero credits does not imply whole-account lockout.
- Recovery actions are clear.

