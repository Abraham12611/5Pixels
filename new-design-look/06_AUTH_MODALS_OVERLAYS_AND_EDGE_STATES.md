# 5Pixels — Auth, Modals, Overlays, System Feedback, and Edge Pages

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



# P44 — Authentication modal

**Route / surface:** `public/app gated action`  
**Status:** V1  
**Goal:** Let users authenticate from a high-intent action without losing the preset/context they chose.

### Deliver
- login tab
- signup tab
- error state
- mobile sheet

### Designer prompt

Design a fast authentication modal triggered when an unauthenticated user chooses `Try this look`, Favorite, or another gated action.

The backdrop preserves the page/preset context. Modal supports Login and Signup without becoming a giant onboarding flow. After success, return the user to the exact intended action, ideally entering Create with the selected preset.

Keep social/provider buttons only if auth strategy actually supports them. Include Forgot password. Use clear errors and loading states. On mobile, use a full-height or large bottom sheet.

Do not lose preset selection after authentication.

### Acceptance checklist
- [ ] return-to-intent is preserved
- [ ] errors are inline
- [ ] modal closes with Escape where appropriate
- [ ] mobile state exists

---

# P45 — Login page

**Route / surface:** `/login`  
**Status:** V1  
**Goal:** Provide a dedicated auth route for direct navigation and fallback from the modal.

### Deliver
- desktop
- mobile
- loading/error

### Designer prompt

Design `/login` as a focused, premium dark authentication page. Keep brand, concise headline, email/password or supported auth methods, primary Login, Forgot password, and link to Signup. Use minimal marketing distraction. If the user arrived from a preset, preserve a compact context note or return target without exposing sensitive URL data.

Use visible labels, password visibility control, and accessible errors.

### Acceptance checklist
- [ ] visible labels
- [ ] forgot password reachable
- [ ] return target preserved when present

---

# P46 — Signup page

**Route / surface:** `/signup`  
**Status:** V1  
**Goal:** Create a friction-light signup that gets users back to the visual transformation journey.

### Deliver
- desktop
- mobile
- terms acknowledgement
- error

### Designer prompt

Design `/signup` with only required account fields. Use concise benefits, not a marketing wall. Include Terms/Privacy acknowledgement in a legible way. After account creation, route back to the user's selected preset/Create when there is a saved intent.

Avoid asking for profile biography, company size, or model preferences at signup.

### Acceptance checklist
- [ ] only required fields
- [ ] legal acknowledgement visible
- [ ] return-to-intent supported

---

# P47 — Forgot password

**Route / surface:** `/forgot-password`  
**Status:** V1  
**Goal:** Design the recovery flow with clear sent/resend states.

### Deliver
- request form
- email sent
- invalid account-neutral message
- mobile

### Designer prompt

Design `/forgot-password`. Use one clear email field and primary `Send reset link`. After submission, show a stable confirmation state with resend timing and `Back to login`. Avoid revealing whether an email address exists in the system if security policy requires neutral messaging.

### Acceptance checklist
- [ ] request/sent states exist
- [ ] security-safe messaging
- [ ] back to login visible

---

# P48 — Verify email

**Route / surface:** `/verify-email`  
**Status:** V1  
**Goal:** Design pending, success, expired, and resend verification states.

### Deliver
- pending
- success
- expired link
- resend

### Designer prompt

Design `/verify-email` as a small state-driven page. Show the email being verified only where safe, `Resend email`, and clear success routing back to the intended app destination. Expired/invalid links get a recovery action rather than dead end.

### Acceptance checklist
- [ ] all link states designed
- [ ] resend available
- [ ] success has next step

---

# P49 — Upload source chooser

**Route / surface:** `global modal/sheet`  
**Status:** V1  
**Goal:** Provide the reusable source-entry overlay referenced by the sitemap.

### Deliver
- device upload
- recent uploads placeholder/future
- mobile capture future annotation
- drag-over desktop

### Designer prompt

Design the reusable Upload Source chooser.

V1 primary source: Device. If Recent uploads or Camera/mobile capture are not implemented, do not render active fake options; annotate them as future variants only.

Desktop can show drag/drop plus `Choose file`. Mobile uses the native picker and may later include Camera. State accepted formats and useful limits in plain language.

After selection, transition to uploading/validating without closing into an ambiguous state.

### Acceptance checklist
- [ ] V1 options reflect actual capability
- [ ] format guidance visible
- [ ] upload/validation transition defined

---

# P50 — Credit-cost confirmation

**Route / surface:** `generation preflight`  
**Status:** V1  
**Goal:** Confirm cost only when helpful without forcing repetitive friction before every generation.

### Deliver
- first paid generation
- remembered preference
- high-cost preset

### Designer prompt

Design a lightweight credit confirmation that appears only according to product logic, for example first paid generation or unusually costly preset.

Show:
`This transformation costs 2 credits.`
Current balance.
Primary `Generate`.
Secondary `Cancel`.
Optional `Don't ask again for standard-cost transformations` only if product policy supports it.

Do not force this confirmation on every ordinary generation once the user understands pricing.

### Acceptance checklist
- [ ] cost and balance visible
- [ ] not designed as mandatory every-time modal
- [ ] Generate remains explicit

---

# P51 — Insufficient credits modal

**Route / surface:** `generation gate`  
**Status:** V1  
**Goal:** Turn a blocked generation into a clear economic recovery path without losing the creative setup.

### Deliver
- zero credits
- partial insufficient
- free-plan upgrade option

### Designer prompt

Design the Insufficient Credits modal.

Show:
- concise title;
- required credits;
- current balance;
- selected preset thumbnail/name;
- primary `Buy credits`;
- secondary `View plans` / `Upgrade`;
- Cancel.

After purchase/upgrade, return the user to the same Create configuration and allow Generate. Do not clear their source or choices.

Keep the modal small and practical; this is not a mini pricing page.

### Acceptance checklist
- [ ] setup preserved
- [ ] required/current credits visible
- [ ] two recovery actions clear

---

# P52 — Generation failure dialog

**Route / surface:** `Generation/Result`  
**Status:** V1  
**Goal:** Explain failure and credit outcome, then give the user a useful retry path.

### Deliver
- retryable failure
- source issue
- system failure
- blocked/moderation

### Designer prompt

Design generation-failure handling.

A system/technical failure should say plainly that the transformation did not complete and that reserved credits were released/refunded according to actual ledger behavior. Show:
- Retry;
- Change source/options where relevant;
- Go to Library/Explore if they abandon.

A source-specific failure should offer actionable guidance. A safety block should use appropriate policy language and Help/Report path.

Do not surface provider errors, stack traces, or vague `Something went wrong` as the only explanation.

### Acceptance checklist
- [ ] credit outcome explicit
- [ ] error class changes recovery action
- [ ] internal errors hidden
- [ ] Retry not offered when pointless

---

# P53 — Share result modal

**Route / surface:** `Result`  
**Status:** V1  
**Goal:** Create a compact result-sharing utility while respecting the current product's private-by-default posture.

### Deliver
- copy link if supported
- download
- native share mobile
- link unavailable state

### Designer prompt

Design the Share Result modal according to actual sharing capability.

Possible actions:
- Download
- Native Share on supported devices
- Copy public link only if public sharing exists

If public links do not exist in V1, do not render a fake Copy Link action. Clearly explain visibility/privacy when a shareable link is created. Use a small preview thumbnail and consumer-friendly title.

### Acceptance checklist
- [ ] sharing actions match real capability
- [ ] privacy is clear
- [ ] mobile native share supported when available

---

# P54 — Delete asset confirmation

**Route / surface:** `Library/Result`  
**Status:** V1  
**Goal:** Handle irreversible deletion explicitly.

### Deliver
- confirmation
- deleting
- success/error

### Designer prompt

Design a small destructive confirmation modal:
`Delete this result?`
One sentence explaining what will be removed and whether this action is permanent according to policy.
Buttons: `Cancel`, destructive `Delete`.

Do not use lime for Delete. If generated asset deletion does not immediately remove billing records, do not imply it does.

### Acceptance checklist
- [ ] destructive style distinct
- [ ] consequence text accurate
- [ ] Cancel is safe default

---

# P55 — Report result modal

**Route / surface:** `Result optional moderation flow`  
**Status:** V1  
**Goal:** Let users flag problematic outputs with structured reasons.

### Deliver
- reason selection
- optional detail
- submitted

### Designer prompt

Design the optional Report Result flow.

Use structured reasons such as:
- Unsafe/inappropriate
- Harassment/hate
- Sexual content
- Copyright/brand concern
- Other

Keep free text optional. Explain that reporting does not automatically refund credits unless policy says so. After submit, preserve access to the result unless moderation rules require otherwise.

### Acceptance checklist
- [ ] structured reasons
- [ ] refund implications not invented
- [ ] submission confirmation

---

# P56 — Billing upgrade modal

**Route / surface:** `locked preset / insufficient credits`  
**Status:** V1  
**Goal:** Provide a lightweight contextual upgrade path without duplicating the full Pricing page.

### Deliver
- locked preset
- credit shortfall
- plan recommendation

### Designer prompt

Design a contextual Upgrade modal triggered from a locked preset or plan-gated capability.

Show:
- what the user is trying to access;
- concise plan benefit;
- recommended plan and price summary;
- `Upgrade`;
- `Compare plans`;
- Cancel.

Do not list model vendors. Keep the chosen preset/context visible. If the user selects Compare, go to Pricing while preserving a return path.

### Acceptance checklist
- [ ] context visible
- [ ] Upgrade and Compare available
- [ ] no full pricing-table duplication

---

# P57 — Quick Edit Profile modal

**Route / surface:** `Account/avatar shortcut`  
**Status:** V1  
**Goal:** Use the Higgsfield sticky-header/sticky-footer modal grammar for lightweight account edits.

### Deliver
- desktop
- scrolled body
- mobile full-screen
- saving/error

### Designer prompt

Design a medium-width `Edit profile` modal with:
- dimmed backdrop;
- sticky header with title + Close;
- scrollable body;
- sticky footer with Cancel and Save.

Include only actual V1 profile fields: avatar, display name, and other approved lightweight metadata. Do not add social links/creator bio just because the reference had them.

Use generous field heights and inline validation. Save can use a warm cream utility-primary treatment rather than lime if the design system adopts that distinction. On mobile, convert to a full-screen sheet.

### Acceptance checklist
- [ ] header/footer remain visible during long form
- [ ] fields are minimal
- [ ] mobile full-screen sheet exists

---

# P58 — Toasts and lightweight system feedback

**Route / surface:** `global`  
**Status:** V1  
**Goal:** Create consistent transient feedback for reversible/non-critical actions.

### Deliver
- success
- info
- warning
- non-critical error
- stacking/mobile

### Designer prompt

Design the global toast system.

Appropriate uses:
- Saved
- Copied
- Download prepared
- Favorite added/removed
- Settings updated

Do not use toast as the sole place for critical generation, billing, auth, or destructive errors. Toasts are compact, non-blocking, keyboard/screen-reader accessible, and dismiss automatically only after enough time.

Define desktop position, mobile position above safe-area/sticky navigation, stacking limit, and motion.

### Acceptance checklist
- [ ] critical errors remain persistent elsewhere
- [ ] mobile position avoids CTAs/nav
- [ ] screen-reader announcement documented

---

# P59 — Edge/error page family

**Route / surface:** `404 and edge routes`  
**Status:** V1  
**Goal:** Create a coherent family for all sitemap edge cases with recovery rather than dead ends.

### Deliver
- 404
- expired shared link
- unavailable preset
- retired preset
- generation not found
- access denied
- checkout cancelled

### Designer prompt

Design a reusable 5Pixels edge-page family.

Each state uses:
- small 5-pixel motif or restrained visual;
- clear title;
- one-sentence explanation;
- primary recovery action;
- optional secondary route.

Specific behaviors:
- 404 → Discover / Explore.
- Expired shared link → explain expiry; Explore presets.
- Unavailable preset → suggest alternatives.
- Retired preset → show 2–4 recommended alternatives.
- Generation not found → Library.
- Access denied → Account/appropriate sign-in.
- Checkout cancelled → return to Billing/Pricing with no alarm.

Keep edge pages on-brand but calm. Do not use whimsical copy that obscures the problem.

### Acceptance checklist
- [ ] every state has recovery
- [ ] retired/unavailable preset suggests alternatives
- [ ] checkout cancelled is non-alarming

---

# P60 — Maintenance / degraded service

**Route / surface:** `system edge`  
**Status:** V1  
**Goal:** Communicate service degradation honestly while keeping browse-only actions available where possible.

### Deliver
- full maintenance
- generation degraded but browsing available
- retry state

### Designer prompt

Design two service states.

**Full maintenance:** focused page with current status, retry, and Help/Status link if one exists.

**Generation degraded:** keep Discover/Explore/Library available but place a persistent unobtrusive banner explaining that new transformations may be delayed/unavailable. Disable Generate with explanation rather than letting repeated failures occur.

Do not invent ETAs. Use exact time only if the system has a trustworthy estimate.

### Acceptance checklist
- [ ] degraded mode preserves usable parts
- [ ] Generate disabled with explanation
- [ ] no fake ETA

---
