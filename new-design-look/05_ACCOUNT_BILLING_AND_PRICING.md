# 5Pixels — Account, Billing, Credits, and Pricing

## Universal context that applies to every prompt

5Pixels is a **preset-first AI image transformation product**. The consumer chooses a curated visual look, uploads one source image, optionally adjusts only the controls exposed by that preset, then generates a result. The consumer does **not** write free-form prompts in V1, does not see private generation instructions, and under the canonical product definition does not need to understand provider/model routing. The preset is the product.

The interface must feel **visual, premium, immediate, lively, curated, trustworthy, modern, and highly legible**. It must not feel like an engineering dashboard, generic SaaS template, blank prompt console, node editor, cyberpunk laboratory, or overloaded gradient system.

Visual language:
- near-black/ink page canvas;
- charcoal elevated surfaces;
- warm off-white primary text;
- muted warm-grey secondary text;
- vivid lime as a **signal**, not a blanket color;
- media supplies most of the page color;
- restrained 5-pixel square motif for active states, loading, credit meters, empty-state flourishes, and small brand moments;
- neutral grotesk UI type plus a stronger editorial display face where a large title is warranted;
- 5-based spacing rhythm;
- mostly 10–20px radii, larger only for major media/modal surfaces.

Interaction language:
- progressive disclosure over dense dashboards;
- visual outcomes before technical explanation;
- clear next action at every step;
- small, anchored popovers for compact choices;
- drawers/sheets on mobile;
- short motion, no constant particle/glow animation;
- visible keyboard focus, reduced-motion support, minimum touch targets, semantic controls;
- no critical information communicated by color alone.

Higgsfield is a **reference for interaction grammar and information hierarchy**, not a visual clone. Borrow the dark gallery, rich menu composition, status micro-badges, anchored selectors, media-first discovery, studio/stage layout, credit-aware account surfaces, progressive pricing comparison, and powerful global search. Mutate them into unmistakably 5Pixels patterns and vocabulary.

Canonical consumer vocabulary: **Preset, Look, Transformation, Original, Result, Collection, Category, Trending, Save, Try this look, Regenerate, Adjust, Download.** Avoid exposing terms such as prompt, CFG, seed, inference, checkpoint, LoRA, scheduler, or model routing.



# P31 — Account overview

**Route / surface:** `/app/account`  
**Status:** V1  
**Goal:** Create the calm private settings environment that anchors account and billing sub-pages.

### Deliver
- desktop shell
- mobile settings index
- account summary state

### Designer prompt

Design `/app/account` using a stable settings shell inspired by Higgsfield's private account area.

Desktop left rail groups:
**Account** — Profile, Security, Privacy, Notifications
**Billing** — Plan, Credits, History
Bottom — Help, Sign out

Main overview should be calm, centered, and card-based. Show a compact identity header and shortcut cards to the most important account tasks. Do not repeat Library, Favorites, Discover, or Explore in this rail.

Provide a `Need help?` card near the lower rail with direct Help Center/support action. On mobile, the left rail becomes a settings index/list rather than a persistent column.

### Acceptance checklist
- [ ] local settings nav is distinct from global nav
- [ ] active sub-route clear
- [ ] Help is contextual
- [ ] mobile settings navigation defined

---

# P32 — Profile settings

**Route / surface:** `/app/account/profile`  
**Status:** V1  
**Goal:** Let users manage only the profile information 5Pixels actually needs.

### Deliver
- view state
- edit state or modal launch
- avatar change
- validation

### Designer prompt

Design the canonical Profile settings page.

Show:
- avatar;
- display name;
- email/account identifier;
- optional locale/language only if supported;
- concise account metadata.

Provide `Edit` to launch the quick profile editor or inline edit. Do not invent social handles, biographies, follower counts, or creator-profile fields for V1.

Use large setting rows/cards rather than dense forms. Show success inline/toast after save. Email change, if supported, must follow verification/security requirements rather than behaving like a casual text field.

### Acceptance checklist
- [ ] only necessary profile fields are present
- [ ] social-profile features absent
- [ ] email security implications noted

---

# P33 — Security settings

**Route / surface:** `/app/account/security`  
**Status:** V1  
**Goal:** Give users a trustworthy place for authentication and session controls.

### Deliver
- password/auth state
- connected sign-in providers if any
- sessions
- security confirmation states

### Designer prompt

Design `/app/account/security`.

Source documents do not prescribe specific auth providers, so keep the design provider-agnostic and do not invent unsupported features. Structure the page so it can support:
- password/change password where applicable;
- sign-in method;
- active sessions/devices if implemented;
- re-authentication before sensitive changes.

Use simple setting cards with clear state and one action each. Destructive session actions are secondary/destructive, never lime. Show concise confirmation and error states. Do not expose internal security implementation details.

### Acceptance checklist
- [ ] unsupported auth features are not falsely implied
- [ ] sensitive actions require clear confirmation
- [ ] destructive styling is distinct

---

# P34 — Privacy settings + account deletion

**Route / surface:** `/app/account/privacy`  
**Status:** V1  
**Goal:** Make photo/data handling understandable and separate ordinary privacy choices from irreversible deletion.

### Deliver
- privacy rows
- retention explanation
- danger zone collapsed
- delete-account entry

### Designer prompt

Design `/app/account/privacy` with large calm setting rows. Every privacy-affecting toggle must have a plain-language explanation of its consequence.

Use sections such as:
- Uploaded images
- Generated results
- Sharing defaults, only if sharing exists
- Product/privacy preferences required by policy

Do not invent exact retention durations if product policy has not specified them; use placeholders/annotation for product/legal input.

At the bottom, create a clearly separated `Danger zone` containing `Delete account`. The destructive CTA should appear only after the user opens the disclosure and reads consequences. Final deletion is handled by a dedicated modal/page flow in the overlays pack.

Never use lime for deletion.

### Acceptance checklist
- [ ] privacy implications are written in plain language
- [ ] no unsupported retention promise
- [ ] Danger zone separated
- [ ] deletion not hidden

---

# P35 — Notification preferences

**Route / surface:** `/app/account/notifications`  
**Status:** V1  
**Goal:** Design a small, comprehensible set of notification controls.

### Deliver
- desktop
- mobile
- toggle on/off
- delivery-channel placeholder if needed

### Designer prompt

Design `/app/account/notifications`.

Prioritize only notifications tied to real user jobs:
- Generation completed
- Billing / low-credit
- Important account/security
- Product updates, optional marketing

Use full-width toggle rows with label, one-sentence explanation, and switch aligned right. If email/push channels are not both implemented, do not show channel matrices.

Group essential transactional/security notifications separately if they cannot be disabled. Keep the page short.

### Acceptance checklist
- [ ] transactional vs optional messaging is clear
- [ ] no giant notification matrix
- [ ] toggles have descriptions

---

# P36 — Billing overview

**Route / surface:** `/app/billing`  
**Status:** V1  
**Goal:** Summarize plan, credits, and recent usage without becoming a financial dashboard.

### Deliver
- free user
- paid user
- low-credit user
- mobile

### Designer prompt

Design `/app/billing` inside the shared settings shell.

Top: current plan card with plan name, cadence/renewal where applicable, and `Manage plan` or `Upgrade`.

Next: Credits card with exact balance, reset/expiry explanation, five-pixel segmented meter, and `Buy credits`.

Next: lightweight usage card showing this billing cycle at a glance. Useful metrics: Credits used, Transformations completed, Credits released/refunded, Credits remaining. Avoid `AI compute cost`, models, or provider metrics.

Then shortcut cards to Billing history / invoices and payment method, if supported.

Free users should see a compelling but restrained Upgrade action; paid users should see management, not constant upsell.

### Acceptance checklist
- [ ] balance and plan are immediately understandable
- [ ] free/paid/low-credit states designed
- [ ] usage remains consumer-oriented

---

# P37 — Billing — Plan

**Route / surface:** `/app/billing/plan`  
**Status:** V1  
**Goal:** Create the focused subscription management sub-page.

### Deliver
- free plan
- paid plan
- upgrade path
- cancel/downgrade entry

### Designer prompt

Design `/app/billing/plan`.

Show current plan, monthly/annual cadence, renewal date, included monthly credits, and real plan benefits. Use a compact plan card rather than reproducing the entire public Pricing page.

Actions:
- Free: `Upgrade plan`
- Paid: `Change plan`, `Manage subscription`
- cancellation/downgrade appears as a secondary text/action path, with consequences explained before confirmation.

If plan changes affect remaining credits, annotate that product logic must be communicated before final confirmation. Do not invent rollover rules.

### Acceptance checklist
- [ ] plan state is clear
- [ ] renewal/cadence shown when relevant
- [ ] cancel is available but not accidentally primary
- [ ] credit impact requires explicit product copy

---

# P38 — Billing — Credits and Usage

**Route / surface:** `/app/billing/credits`  
**Status:** V1  
**Goal:** Let users understand what they can generate now and where their credits went.

### Deliver
- balance state
- usage metrics
- date range
- transaction history populated
- empty history

### Designer prompt

Design `/app/billing/credits`.

Top balance module:
- exact credits left;
- reset/expiry note;
- Buy credits action;
- five-pixel meter.

Usage header:
- date selector defaulting to `This billing cycle` or `Last 30 days`;
- optional Refresh only if data actually lags.

Summary tiles:
- Credits used
- Transformations completed
- Credits released/refunded
- Credits remaining

Below: credit transaction history. Each row uses human events:
preset name, date, debit/credit amount, state such as Completed / Released / Refunded.

A failed generation must make the credit outcome obvious. Do not show job IDs or provider costs.

Empty state keeps zeroed summary tiles visible and explains that activity will appear here.

### Acceptance checklist
- [ ] failed generation credit outcome is explicit
- [ ] history uses preset names
- [ ] date range usable
- [ ] empty state designed

---

# P39 — Billing — History, invoices, payment methods

**Route / surface:** `/app/billing/history`  
**Status:** V1  
**Goal:** Separate historical financial records from current usage.

### Deliver
- invoice list
- no invoices
- payment method populated
- no payment method
- billing information

### Designer prompt

Design `/app/billing/history`.

Sections:
1. Invoices / purchases, with date, description, amount, status, receipt/download action.
2. Payment methods, if the billing provider supports saved methods.
3. Billing information, with `Manage`.

Use modular cards. If there are no invoices or payment methods, use calm large empty states with one obvious action. Never imply that 5Pixels stores full card numbers.

If pending payments can exist, show them as a separate exception section above the full invoice history. Otherwise omit that section entirely.

### Acceptance checklist
- [ ] financial sections are modular
- [ ] empty states exist
- [ ] payment data is privacy-safe
- [ ] receipts/invoices are accessible

---

# P40 — Public Pricing — plan cards and hero

**Route / surface:** `/pricing`  
**Status:** V1  
**Goal:** Translate Higgsfield's high-conversion plan hierarchy into outcome-oriented 5Pixels pricing.

### Deliver
- desktop cards
- monthly/annual state
- recommended plan
- mobile cards

### Designer prompt

Design the top half of `/pricing`.

Use concise headline, one-sentence explanation, and Monthly/Annual control. Present a small number of plans with clear hierarchy. Each plan card shows:
- plan name;
- price;
- credits/month;
- a plain-language approximation of transformation volume only if pricing variability can be explained safely;
- 3–5 decisive benefits;
- CTA.

One plan may be `Recommended`/`Best value`, but avoid manipulative decoration. Lime can emphasize the recommended CTA; other plan CTAs remain neutral.

Do not list model access or AI vendors. Compare outcomes and usage: credits, preset access, output quality, priority, history/support where real.

Include annual savings only if mathematically and legally accurate.

### Acceptance checklist
- [ ] plan differences are consumer-facing
- [ ] monthly/annual state clear
- [ ] recommended plan not deceptive
- [ ] model/vendor names absent

---

# P41 — Pricing — interactive Plan Finder

**Route / surface:** `/pricing#plan-finder`  
**Status:** V1  
**Goal:** Help users choose based on what they create and how often, not on AI infrastructure.

### Deliver
- step 1 use case
- step 2 frequency
- step 3 preference
- live recommendation
- mobile

### Designer prompt

Design the 5Pixels Plan Finder inspired by Higgsfield's interactive recommender.

Left side on desktop:
1. `What do you mostly create?` — multiple-select jobs such as social images, professional portraits, covers/posters, personal creative transformations.
2. `How often do you expect to create?` — friendly slider/stepper in transformations per month, with estimated credit use.
3. `What matters most?` — volume, highest output quality, or flexibility, only if these correspond to real plan differences.

Right side:
- live recommended plan card;
- expected monthly credit usage;
- visible headroom;
- 2–3 reasons for recommendation;
- CTA.

Never ask which AI model they need. Be transparent that estimates vary by preset cost if that is true.

### Acceptance checklist
- [ ] questions are user-job oriented
- [ ] estimated usage is transparent
- [ ] recommendation updates live
- [ ] no model jargon

---

# P42 — Pricing — progressive comparison, FAQ, final CTA

**Route / surface:** `/pricing#compare`  
**Status:** V1  
**Goal:** Make detailed comparison readable through progressive disclosure.

### Deliver
- sticky desktop header
- collapsed categories
- expanded category
- FAQ
- mobile comparison

### Designer prompt

Design the lower Pricing page.

Desktop comparison:
- sticky plan header with names, prices, and plan CTAs;
- show only decisive rows first;
- group secondary detail into large accordions:
  - Credits & Transformations
  - Preset Access
  - Output & Quality
  - Library & History
  - Support & Rights
- expanded category reveals aligned rows;
- optional `View more` for tertiary rows.

Do not hide critical charges, renewal information, or failed-generation credit rules behind several layers.

Below comparison, switch to a narrower reading width for FAQ. Prioritize credits, failed generations, rollover/expiry if applicable, top-ups, cancellation, privacy, storage, commercial use, and plan changes.

Finish with a small centered conversion prompt + `Choose your plan`, then quiet legal/help footer.

Mobile should not cram four tiny columns; design a selected-plan comparison or horizontally coordinated alternative.

### Acceptance checklist
- [ ] sticky column context preserved
- [ ] critical cost rules easy to find
- [ ] FAQ reading width comfortable
- [ ] mobile comparison usable

---

# P43 — Optional promo-code redemption

**Route / surface:** `Billing optional`  
**Status:** Optional  
**Goal:** Design a focused financial entitlement flow only if promo codes are part of the growth strategy.

### Deliver
- empty
- typing
- validating
- success
- invalid
- expired
- already used

### Designer prompt

This feature is optional. Design promo-code redemption inside Billing rather than making it a prominent main-nav route.

Use a focused centered card or section with a clearly labelled input and `Apply`. Define states:
- empty;
- typing;
- checking;
- applied;
- invalid;
- expired;
- already redeemed;
- not eligible.

Success must show the concrete benefit inline: credits added, discount duration, or next billing impact. If a code changes recurring billing, show the terms clearly. Do not rely on a toast as the only financial confirmation.

### Acceptance checklist
- [ ] visible label on input
- [ ] all financial states designed
- [ ] success explains exact effect

---
