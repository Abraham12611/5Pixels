# 5Pixels — Main App UI/UX Designer Prompt Pack

This pack turns the 5Pixels product definition, UI/UX bible, sitemap, and the four-batch Higgsfield reference study into an **ordered set of copy-paste prompts for product designers**.

The prompts are intentionally split into several files so a designer can work through the application in a controlled sequence rather than receiving one enormous ambiguous brief.

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


## Source-locked product rules

These are treated as constraints unless the product owner explicitly changes the canonical product documents:

1. The core V1 is responsive web.
2. The product is preset-first; users choose a known visual outcome rather than authoring prompts.
3. The consumer-facing app hides private recipe instructions and model/provider routing.
4. One source image is used per generation in V1.
5. V1 includes curated discovery, preset detail, image upload, asynchronous generation, result history, favorites, before/after presentation, credits, subscriptions, moderation, and admin tooling.
6. V1 excludes free-form prompting, public creator marketplace, public social network, video generation, user-created presets, collaborative workspaces, advanced Photoshop-like editing, unrestricted masking, and batch generation.
7. Failed system-side generation should not permanently consume the user's credits.
8. Discovery pages stay simple; complexity appears only after the user has chosen a preset.
9. Mobile photo workflows are first-class.
10. Preset/provider intelligence remains private infrastructure.

## Key product-design thesis synthesized from the screenshots

**Gallery is the world; the transformation console is the instrument.**

The app should feel like a premium visual catalogue until the user chooses a look. After choice, the interface becomes a focused transformation studio with a compact control rail and large visual stage. Account, billing, and settings intentionally become calmer and more utility-oriented.

## Recommended global navigation

Authenticated desktop:
- 5Pixels logo
- Discover
- Explore
- Library
- Favorites
- Search
- compact credits indicator
- contextual Pricing / Upgrade action
- account avatar

Do not copy Higgsfield's giant product-suite navigation. 5Pixels has a narrower V1 scope.

## Prompt files and design order

### Phase A — Foundation and global shell
`01_FOUNDATION_GLOBAL_SHELL_AND_SEARCH.md`
- P01 Desktop authenticated shell
- P02 Mobile authenticated shell
- P03 Explore mega-menu
- P04 Credits indicator + avatar account popover
- P05 Global Search — zero query
- P06 Global Search — typed query
- P07 Global Search — Presets browser
- P08 Global Search — Categories + Library + no-results states
- P09 Global overlays / popover primitive kit

### Phase B — Discovery and preset evaluation
`02_DISCOVERY_EXPLORE_AND_PRESET_DETAIL.md`
- P10 Discover home
- P11 Explore catalog
- P12 Category-filtered Explore
- P13 Authenticated preset detail
- P14 Preset card system and all card states
- P15 Optional Quick Try drawer

### Phase C — Core transformation journey
`03_CREATE_GENERATION_AND_RESULTS.md`
- P16 Create — first-use/upload
- P17 Create — source accepted/configuration
- P18 Create — source warning/rejection/validation
- P19 Live generation
- P20 Result page
- P21 Result comparison modes
- P22 Result feedback flow
- P23 Regenerate / adjust / try-another flow
- P24 Create/history continuity states

### Phase D — Personal content
`04_LIBRARY_AND_FAVORITES.md`
- P25 Library populated
- P26 Library empty
- P27 Library filtered/no-results
- P28 Library card/action menu
- P29 Favorites populated
- P30 Favorites empty

### Phase E — Account, billing, and pricing
`05_ACCOUNT_BILLING_AND_PRICING.md`
- P31 Account overview
- P32 Profile
- P33 Security
- P34 Privacy
- P35 Notifications
- P36 Billing overview
- P37 Billing — Plan
- P38 Billing — Credits / Usage
- P39 Billing — History / invoices / payment methods
- P40 Public Pricing — plan cards
- P41 Pricing — Plan Finder
- P42 Pricing — comparison + FAQ
- P43 Optional promo-code flow

### Phase F — Auth, modals, overlays, edge states
`06_AUTH_MODALS_OVERLAYS_AND_EDGE_STATES.md`
- P44 Authentication modal
- P45 Login
- P46 Signup
- P47 Forgot password
- P48 Verify email
- P49 Upload source chooser
- P50 Credit-cost confirmation
- P51 Insufficient credits
- P52 Generation failure
- P53 Share result
- P54 Delete asset
- P55 Report result
- P56 Billing upgrade modal
- P57 Quick Edit Profile modal
- P58 Toasts and lightweight system feedback
- P59 Edge/error page family
- P60 Maintenance/degraded service

### Phase G — System completion and handoff
`07_RESPONSIVE_ACCESSIBILITY_COMPONENTS_AND_QA.md`
- P61 Responsive behavior master pass
- P62 Accessibility master pass
- P63 Component library / variants
- P64 Motion and micro-interactions
- P65 Loading / empty / disabled / error state matrix
- P66 Content and UX-writing pass
- P67 Final prototype and engineering handoff

### Appendix — deliberately non-V1 experiments
`08_OPTIONAL_FUTURE_EXPERIMENTS.md`
- X01 Advanced model-choice experiment
- X02 Batch-generation future variant
- X03 Public profile/social future variant
- X04 Gifts future variant

## Figma file structure recommendation

```text
00 Cover + Principles
01 Foundations
02 Components
03 Global Shell
04 Search
05 Discover
06 Explore
07 Preset Detail
08 Create
09 Generation
10 Result
11 Library
12 Favorites
13 Account
14 Billing
15 Pricing
16 Auth
17 Modals + Overlays
18 Edge States
19 Responsive
20 Prototype Flows
21 Engineering Handoff
```

## Required prototype flows

At minimum, prototype these end-to-end flows:

1. Discover → Preset Detail → Create → Upload → Configure → Generate → Result → Download.
2. Explore → Search/filter → Preset Detail → Favorite → Favorites → Create.
3. Create → insufficient credits → Buy/Upgrade → return to Create.
4. Generate → failure → credit release/refund explanation → Retry.
5. Result → Adjust → Regenerate.
6. Result → Try another preset.
7. Global Search → Preset → Preset Detail.
8. Avatar menu → Billing → Credits → Usage history.
9. Account → Privacy → Account deletion flow.
10. New user → empty Library → Explore presets.

## Handoff philosophy

For every page, designers should hand off:
- desktop default;
- mobile default;
- important hover/focus/pressed/selected states;
- empty/loading/error states;
- any relevant modal/drawer;
- keyboard behavior;
- motion note;
- component names and variants;
- spacing/token references;
- concise annotations describing what is fixed, sticky, scrollable, or responsive.

## Important unresolved product decision: model selection

The original product docs say model/provider selection is hidden from consumers, while an earlier product-owner note expressed interest in allowing model choice. This pack follows the **canonical V1 rule: no consumer model picker**. A carefully separated optional experiment is included in `08_OPTIONAL_FUTURE_EXPERIMENTS.md`. Do not quietly insert model choice into the main V1 files.

## Important unresolved product decision: batch generation

The canonical V1 excludes batch generation. Higgsfield's quantity/batch control remains useful interaction inspiration, but it is not part of the V1 prompts. A future experiment is included in the appendix.

## Completion definition

The design work is complete when a new user can always answer:
- What should I do next?
- What will this preset produce?
- Is my photo suitable?
- What will it cost?
- What is happening while it generates?
- Was I charged if it failed?
- Where did my result go?


# 5Pixels — Foundation, Global Shell, Navigation, and Search

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



# P01 — Authenticated desktop application shell

**Route / surface:** `/app/*`  
**Status:** V1  
**Goal:** Create the persistent desktop frame that all authenticated user routes inherit.

### Deliver
- 1440px desktop frame
- 1280px compact desktop variant
- sticky-state annotations
- nav item hover/focus/active variants

### Designer prompt

Act as a senior product designer. Design the authenticated 5Pixels application shell inspired by Higgsfield's premium dark navigation, but simplify it radically for a preset-first image product.

Use a sticky near-black top bar. Left: compact 5Pixels brand mark. Primary links: Discover, Explore, Library, Favorites. Active route should be legible without filling the whole tab lime; use warm text plus a restrained lime/5-pixel signal. Right: Search icon/button, compact credit balance, contextual Pricing or Upgrade entry, then avatar.

The shell should make imagery feel like the main content. Keep the top bar visually thin, quiet, and slightly translucent or solid enough to remain legible over gallery content. Use subtle separators and no unnecessary product-suite links.

Define states for free, paid, low-credit, zero-credit, and in-progress-generation users. The credit control should display exact balance in text; a tiny five-square motif can supplement it. On very wide screens keep content centered with broad media layouts. On narrower desktop progressively collapse labels before hiding core destinations.

Annotate sticky behavior, z-index relationships, safe areas, focus order, and how the shell behaves when a full-screen modal or Search is open.

### Acceptance checklist
- [ ] Discover/Explore/Library/Favorites are always reachable
- [ ] credits are readable text, not color-only
- [ ] active route is obvious
- [ ] no free-form prompt entry appears in shell
- [ ] keyboard focus is visible
- [ ] shell does not dominate visual content

---

# P02 — Authenticated mobile application shell

**Route / surface:** `/app/* mobile`  
**Status:** V1  
**Goal:** Translate the authenticated shell into a phone-first navigation system suitable for photo workflows.

### Deliver
- 390×844 mobile frame
- 430×932 large-phone frame
- menu/open states
- safe-area annotations

### Designer prompt

Design the mobile shell for 5Pixels. Do not squeeze the desktop nav into a hamburger without thought. The user should be able to browse presets, upload from their phone, return to active work, and access account/credits with minimal friction.

Top bar: compact logo, Search, credit indicator, avatar/menu. Use either a bottom navigation or a concise menu for Discover, Explore, Library, and Favorites; choose the option that best preserves visual browsing and explain the rationale in annotations. If bottom navigation is used, avoid more than five destinations and keep the primary content clear of the safe area.

Create the mobile account sheet and the transition into Search. The shell must work with sticky Generate CTAs and full-screen create/result experiences without stacking multiple competing sticky bars.

Use bottom sheets for compact settings and selectors. Keep touch targets at least comfortably tappable. Define portrait orientation first; note tablet behavior separately.

### Acceptance checklist
- [ ] no desktop mega-menu is forced onto mobile
- [ ] sticky CTAs do not collide with navigation
- [ ] Search is one tap away
- [ ] credits and avatar remain reachable
- [ ] safe areas handled

---

# P03 — Explore mega-menu inspired by Higgsfield's Image menu

**Route / surface:** `global nav → Explore`  
**Status:** V1  
**Goal:** Turn the user's favorite Higgsfield mega-menu pattern into a 5Pixels-native visual discovery menu.

### Deliver
- closed nav state
- Explore hover/open menu
- keyboard-focus state
- small-desktop fallback

### Designer prompt

Design a custom Explore mega-menu that feels sophisticated like Higgsfield's Image menu but is structurally original and aligned to 5Pixels.

Use two conceptual columns:
- **Browse**: Trending, New, Portrait, Cinematic, Covers, Illustration, Professional, Retro, Fantasy, Seasonal.
- **Featured looks / collections**: a curated list of 5–8 presets or collections with compact thumbnail/icon tiles, title, one-line descriptor, and micro-badges such as NEW, TRENDING, or PRO.

The menu should open directly beneath the Explore nav item, use a large charcoal surface, subtle border, strong spatial rhythm, and compact section labels. Recommended/featured items may have a richer hover surface. The menu must never show provider/model names.

Add a top or inline shortcut to `View all presets`. Use badges sparingly. Define hover, focus, selected, and item-launch behavior. On small desktop, reduce columns or turn this into a centered command-style panel; on mobile, replace it with a sheet/list rather than a hover menu.

### Acceptance checklist
- [ ] menu clearly separates browsing categories from featured content
- [ ] badges are restrained
- [ ] every item is keyboard reachable
- [ ] View all is visible
- [ ] no hidden AI infrastructure appears

---

# P04 — Credits indicator and avatar account popover

**Route / surface:** `global top-right`  
**Status:** V1  
**Goal:** Create a compact operational dashboard that answers identity, plan, and credit state before showing account links.

### Deliver
- default/free user
- paid user
- low-credit user
- zero-credit user
- popover open/closed

### Designer prompt

Design the top-right 5Pixels credit indicator and avatar menu inspired by Higgsfield's account popover.

The popover order should be:
1. avatar + display name/email;
2. current plan;
3. dedicated Credits card with exact balance, optional reset date, and a 5Pixels five-square segmented meter;
4. context-aware primary economic action: Upgrade, Buy credits, or Manage plan;
5. navigation rows: Account, Billing, Help; optional Language only when localization exists;
6. divider;
7. Sign out.

If a generation is actively running, optionally include a quiet row `1 transformation in progress` linking back to it, but do not let the menu become a notification center.

Use lime only for the strongest commercial action. Menu rows use neutral hover surfaces. Distinguish low credit with warning semantics in addition to color. Do not automatically open upsell modals merely because the user checks their balance.

### Acceptance checklist
- [ ] exact credit balance always shown
- [ ] free/paid/low/zero states designed
- [ ] Sign out separated
- [ ] popover closes with Escape/outside click
- [ ] focus returns to trigger

---

# P05 — Global Search — zero-query discovery state

**Route / surface:** `global Search overlay`  
**Status:** V1  
**Goal:** Make Search useful even before the user types.

### Deliver
- desktop zero-query
- recent-items state
- first-time user with no recents
- mobile note

### Designer prompt

Design a large premium global Search palette inspired by Higgsfield's search overlay. It should open instantly over the current page with a dimmed backdrop.

Header: large search input with magnifier, placeholder `Search presets, categories, and your library`, a clear-query control that appears only when text exists, and a separate Close control. Below: scope pills `All`, `Presets`, `Categories`, `Library`.

Zero-query All state:
- **Recent**: up to 4 recent presets/results as compact rows;
- **Trending looks**: exactly 3 rich media-first preset cards;
- **Popular categories**: compact category chips or mini visual tiles;
- optional **New presets** compact list if vertical space allows.

Rich cards use static poster images by default. A controlled hover/focus can preview the short transformation loop. Do not autoplay several videos at once. Keep the overlay fast enough to feel like a command palette, not a second Explore page.

For a user with no recents, replace the Recent section with a short orientation message and immediately show Trending.

### Acceptance checklist
- [ ] Search input auto-focuses
- [ ] clear and close controls are visually distinct
- [ ] All/Presets/Categories/Library scopes visible
- [ ] zero-query state is useful
- [ ] media does not create performance overload

---

# P06 — Global Search — typed query and keyboard selection

**Route / surface:** `global Search overlay`  
**Status:** V1  
**Goal:** Design the fast find/jump state when a user has typed a query.

### Deliver
- query with results
- keyboard-selected row
- query with mixed result groups
- query loading state

### Designer prompt

Design the typed-query state of Global Search.

Replace most zero-query discovery content with ranked grouped results:
- Presets
- Categories
- Library

Each result row should have a visual thumbnail or category mark, strong title, one-line descriptor/metadata, optional NEW/TRENDING/PRO badge, and a visually clear active row. Use a small five-pixel leading marker or subtly brighter charcoal for keyboard selection rather than lime-filling the whole row.

Support Arrow Up/Down, Enter to open, Escape to close, and query clear. Ensure selected rows scroll into view. The input remains sticky at top while the body scrolls.

For Library matches, show thumbnail, preset name, and human-readable date. Never expose hidden prompt/model data. For a Pro preset, use a quiet entitlement badge; clicking still opens the preset detail where access is explained.

### Acceptance checklist
- [ ] keyboard selection is obvious
- [ ] result grouping remains readable
- [ ] stale loading does not shift the whole modal
- [ ] private/internal metadata is absent
- [ ] mouse and keyboard states are compatible

---

# P07 — Global Search — Presets browser scope

**Route / surface:** `global Search → Presets`  
**Status:** V1  
**Goal:** Use Higgsfield's category rail + results list interaction to browse the curated preset catalog without leaving Search.

### Deliver
- Presets scope default
- category selected
- preset hover/focus
- long-list scroll behavior

### Designer prompt

Design the `Presets` scope as a two-column browser on desktop.

Left rail labelled `Categories`:
Portrait, Cinematic, Covers, Illustration, Professional, Retro, Fantasy, Seasonal. Add counts only if the catalog is large enough that counts help rather than make it look sparse.

Right pane: `All presets` or the selected category. Each row uses a real preset preview thumbnail, title, one-line outcome descriptor, category metadata, and optional status badge. At the top of a zero-query category, optionally include 1–2 featured visual cards, never more.

The selected category uses a dark active background plus a restrained lime/five-pixel accent. The search query persists when switching scopes. Header and scope pills remain sticky. The results body scrolls independently.

On mobile, remove the left rail: categories become a horizontally scrollable chip row or filter sheet.

### Acceptance checklist
- [ ] category selection and result selection are different visual states
- [ ] preset thumbnails are media-first
- [ ] no model/provider names
- [ ] mobile translation documented

---

# P08 — Global Search — Categories, Library, and no-results states

**Route / surface:** `global Search`  
**Status:** V1  
**Goal:** Complete the Search experience so every scope has a purposeful state.

### Deliver
- Categories scope
- Library scope populated
- Library scope empty
- no-results query
- error/offline state

### Designer prompt

Design the remaining Global Search states.

**Categories:** use a compact visual grid/list with category name, short descriptor, and representative mosaic/thumbnail. Selecting a category routes to filtered Explore, not to an entirely separate duplicate catalog.

**Library:** show personal generated assets in a single-column or two-column compact result list. Metadata: preset name, date, saved/downloaded markers where useful. Support quick filters `Recent`, `Saved`, `Downloaded` only if they remain visually quiet.

**No results:** state the query plainly: `No matching presets for “...”`. Offer `Explore all presets`, suggested categories, and optionally recent items. Do not imply the AI can generate from arbitrary search text.

**Offline/search error:** preserve the modal shell and show a retry action without losing the typed query.

Define how Search closes after navigation and how focus returns if the user cancels.

### Acceptance checklist
- [ ] no-results state has a recovery action
- [ ] Library search stays user-facing
- [ ] offline state preserves query
- [ ] Categories routes to Explore

---

# P09 — Global popover, dropdown, tooltip, and menu primitive kit

**Route / surface:** `component library`  
**Status:** V1  
**Goal:** Create reusable primitives for the anchored interaction style seen throughout Higgsfield.

### Deliver
- anchored selector
- menu list
- tooltip
- small confirmation popover
- desktop and mobile variants

### Designer prompt

Design the shared anchored-overlay primitives for 5Pixels.

Create:
- `Popover / Selector`: compact choice list for aspect ratio, quality-like preset options, date ranges;
- `Menu`: action list for asset cards/account;
- `Tooltip`: one or two lines maximum;
- `Inline explanation popover`: for credit information;
- mobile bottom-sheet equivalents.

Styling: charcoal elevated surface, subtle border, 10–20px radius, warm text, checkmark for selected option, restrained lime only for active signal. Menus must align to trigger when possible, flip when viewport space is limited, and never appear clipped behind sticky content.

Specify open/close motion, Escape, outside-click behavior, focus management, selected state, disabled item state, and destructive item state. Do not use a modal when an anchored popover is sufficient.

### Acceptance checklist
- [ ] shared primitives cover most compact choices
- [ ] mobile sheet equivalents exist
- [ ] focus/escape behavior annotated
- [ ] destructive actions have separate styling

---


# 5Pixels — Discover, Explore, Categories, and Preset Detail

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



# P10 — Authenticated Discover home

**Route / surface:** `/app`  
**Status:** V1  
**Goal:** Create the personalized visual home that gets users back into recent work or into a compelling preset quickly.

### Deliver
- desktop default
- returning user
- new-user/empty recents
- mobile

### Designer prompt

Design `/app` as a premium visual discovery home, not a dashboard.

Recommended page order:
1. compact `Continue` / recent work rail for returning users;
2. `Trending now`;
3. `Recommended for you`;
4. `New looks`;
5. small Favorites preview;
6. category shortcuts.

Use wide, image-dominant rails/grids with varied but controlled aspect ratios. Cards should use poster frames by default and short muted transformation previews on hover/focus under performance controls. Keep copy concise.

For a brand-new user, replace Continue with an editorial orientation block such as `Pick a look. We'll handle the rest.` and route directly into compelling presets. Do not fill the home with analytics, onboarding checklists, or AI terminology.

Use lime as the active/CTA signal, while media supplies the visual color.

### Acceptance checklist
- [ ] recent work is useful but not dominant
- [ ] first-time state designed
- [ ] sections do not all autoplay
- [ ] each preset card leads clearly to detail
- [ ] mobile rails are performant

---

# P11 — Full Explore catalog

**Route / surface:** `/app/explore`  
**Status:** V1  
**Goal:** Design the primary long-form preset browsing experience.

### Deliver
- desktop catalog
- filters open
- sort open
- mobile filter sheet
- loading state

### Designer prompt

Design `/app/explore` as a media-first catalog inspired by Higgsfield's Viral Presets masonry energy but with stronger 5Pixels curation and legibility.

Top: title/compact intro, Search shortcut, category chips, and a minimal Sort/Filter control. Primary categories should align with the canonical taxonomy. Use a broad grid that supports 3–4 columns desktop, 2–3 tablet, and one-column or carefully chosen 2-column mobile.

Cards should support different aspect ratios without becoming chaotic. Hover/focus can reveal title, badge, short descriptor, favorite control, and `Try this look` or `View` action. Do not permanently cover imagery with large text.

Filters should be progressive: category, status such as New/Trending, fidelity target if consumer-facing, and maybe credit range only if useful. Do not expose model filters.

Design scroll restoration when returning from Preset Detail.

### Acceptance checklist
- [ ] catalog remains visual rather than control-heavy
- [ ] filters are comprehensible
- [ ] favorite is reachable
- [ ] scroll restoration noted
- [ ] no provider/model filters

---

# P12 — Category-filtered Explore state

**Route / surface:** `/app/explore?category=[slug]`  
**Status:** V1  
**Goal:** Give categories a distinctive curated feel without creating a duplicate product architecture.

### Deliver
- Portrait example
- Cinematic example
- empty category
- mobile

### Designer prompt

Design the filtered category state of Explore.

Keep the global Explore shell and filters, but add a restrained category header with:
- category name;
- one-line promise;
- representative visual mosaic or small editorial hero only where it improves discovery;
- optional sub-filters such as Trending/New.

The category should feel curated, not like a database filter. Use the media cards from the shared preset system. For categories with fewer presets, increase card scale rather than exposing obvious empty grid space.

Design an empty/unavailable category state with recovery to `Explore all presets`. Do not invent separate navigation layers unless the category truly warrants them.

### Acceptance checklist
- [ ] category state is visibly distinct but still Explore
- [ ] small categories do not look broken
- [ ] back/clear-filter path exists

---

# P13 — Authenticated Preset Detail

**Route / surface:** `/app/presets/[slug]`  
**Status:** V1  
**Goal:** Help the user judge the outcome, compatibility, cost, and confidence before entering Create.

### Deliver
- desktop
- mobile sticky CTA
- Pro/locked preset
- unavailable/retired variant pointer

### Designer prompt

Design the authenticated preset detail page as an editorial product page for a transformation.

Required content:
- large outcome preview / short muted transformation preview;
- preset name;
- category;
- concise outcome description;
- `Best for` compatibility;
- fidelity expectation such as High / Balanced / Creative in consumer language;
- examples;
- user-adjustable controls summary, without exposing the private recipe;
- credit cost;
- Favorite;
- primary `Try this look`.

Optional sections:
- `What changes`
- `What stays`
- tips for choosing a good source.

Use progressive disclosure. The primary media and CTA should be visible without reading a wall of text. On mobile, use a sticky bottom `Try this look · X credits` CTA after the user has enough context.

For a plan-gated preset, show the access condition clearly but still let the user inspect examples before asking them to upgrade.

### Acceptance checklist
- [ ] credit cost is clear
- [ ] compatibility is understandable
- [ ] private instructions are absent
- [ ] examples dominate
- [ ] locked state does not dead-end

---

# P14 — Preset card system — all reusable card states

**Route / surface:** `component library`  
**Status:** V1  
**Goal:** Create the media-first card family shared by Discover, Explore, Search, Favorites, and recommendations.

### Deliver
- default
- hover
- keyboard focus
- favorite on/off
- NEW/TRENDING/PRO badges
- loading
- unavailable

### Designer prompt

Design the reusable 5Pixels preset card family.

Card anatomy:
- poster/preview media;
- optional category label;
- optional state badge NEW / TRENDING / PRO;
- title;
- optional one-line descriptor;
- Favorite control;
- optional credit cost on authenticated surfaces;
- optional contextual action revealed on hover/focus.

Behavior:
- static poster at rest;
- on deliberate hover/focus, play a 3–5 second muted source→transition→result preview when asset exists;
- stop/revert when focus leaves;
- viewport-controlled playback on mobile;
- reduced-motion shows static source/result presentation instead.

Create card sizes for featured, standard grid, compact search, and horizontal rail. Keep status badges small and consistent. Avoid permanent dark overlays that make every card look the same.

### Acceptance checklist
- [ ] preview behavior documented
- [ ] reduced motion state exists
- [ ] favorite does not navigate accidentally
- [ ] badges use a small canonical set

---

# P15 — Optional Quick Try drawer from discovery

**Route / surface:** `Discover/Explore → Quick Try`  
**Status:** Recommended enhancement  
**Goal:** Provide a fast path from a preset card into source upload without replacing the canonical Preset Detail/Create routes.

### Deliver
- desktop side drawer
- mobile bottom sheet
- dismiss/continue states

### Designer prompt

This is a recommended enhancement, not a source-locked route. Design a lightweight `Quick Try` drawer opened from a preset card only after the user deliberately chooses that action.

Show:
- selected preset thumbnail/name;
- short compatibility note;
- source upload/drop area;
- credit cost;
- `Continue to create` or `Use this photo`.

Do **not** replicate the full Create configuration here. Its purpose is to reduce friction for confident repeat users. If validation finds a warning, route into full Create where the user has room to understand it.

Desktop may use a right side panel; mobile uses a full-width bottom sheet. Closing returns the user to the exact grid position.

### Acceptance checklist
- [ ] drawer is optional enhancement
- [ ] full configuration remains on Create page
- [ ] scroll position restored
- [ ] validation routes to full workflow

---


# 5Pixels — Create, Generation, and Result Journey

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



# P16 — Create Studio — first-use / upload state

**Route / surface:** `/app/create/[presetSlug]`  
**Status:** V1  
**Goal:** Establish the dedicated transformation workspace with a compact decision rail and large visual stage.

### Deliver
- desktop first-use
- mobile first-use
- drag-over
- file selecting/uploading

### Designer prompt

Design the core Create Studio using the strongest Higgsfield lesson: **decisions on the left, visual outcome on the right**.

Desktop:
- persistent top app shell;
- left configuration rail approximately 320–380px;
- large dark visual stage using the remaining space.

Left rail begins with selected preset card/thumbnail and `Change preset`. Then source section, compatibility hint, only the preset-specific controls allowed by this preset, generation summary, credit cost, and sticky `Generate` area. In the first-use state, controls that require a source may be disabled or deemphasized.

Stage first-use state should make upload visually obvious: large source drop zone, accepted file types, one sentence of guidance, and perhaps a small illustrated 3-step strip. Avoid a generic prompt box.

Mobile becomes a focused vertical workflow: preset summary → upload → stage preview → controls in sheets → sticky Generate.

### Acceptance checklist
- [ ] no prompt input
- [ ] preset stays visibly selected
- [ ] upload is the obvious next action
- [ ] Generate cost area has reserved place
- [ ] stage dominates desktop

---

# P17 — Create Studio — source accepted / configuration state

**Route / surface:** `/app/create/[presetSlug]`  
**Status:** V1  
**Goal:** Let the user make a small number of creative choices while keeping the visual preview central.

### Deliver
- accepted source
- one-control preset
- multi-control preset
- aspect/crop selector
- ready-to-generate

### Designer prompt

Design the source-accepted state.

Left rail:
- preset summary;
- accepted source thumbnail with Replace action;
- human-readable compatibility status;
- preset-specific controls;
- aspect/crop option only if the preset allows it;
- optional output quality control only if it is truly consumer-visible;
- credit summary;
- sticky `Generate · X credits`.

Controls should follow the Higgsfield anchored-card grammar: compact setting cards open dark selectors with visible selected state. Each control has a plain-language label, short explanation only when needed, and no technical AI parameters.

Stage:
- large source preview with crop/fit guides;
- clear aspect frame;
- optional small `Original` label;
- no fake live AI preview unless technically supported.

If the preset has no user-adjustable controls, do not invent them; use a very simple rail and let the user generate quickly.

### Acceptance checklist
- [ ] only exposed preset controls appear
- [ ] credit cost shown before generate
- [ ] crop/aspect state visible
- [ ] no fake generated preview
- [ ] zero-control preset is elegantly simple

---

# P18 — Create Studio — validation warnings and rejected source

**Route / surface:** `/app/create/[presetSlug]`  
**Status:** V1  
**Goal:** Make source suitability feedback human, actionable, and non-technical.

### Deliver
- soft warning
- hard rejection
- too-small image
- wrong file
- multiple-face compatibility warning

### Designer prompt

Design the upload validation state family.

Use three semantic levels:
- **Accepted**: quiet success indication.
- **Warning**: user may continue, but explain likely quality impact.
- **Rejected**: Generate disabled; show exact recovery action.

Example copy:
- `This look works best with one clearly visible face.`
- `Your image is very small. Results may be softer.`
- `We couldn't read that file. Try JPG, PNG, or WebP.`

Warnings should appear in the source area and/or left rail, not only as transient toast. Never expose storage, provider, moderation pipeline, or model errors. If the source is blocked for safety, use clear policy language and a route to help/report where appropriate.

Preserve the user's preset selection and any safe choices when they replace the source.

### Acceptance checklist
- [ ] warning vs rejection is clear without relying on color
- [ ] Generate disabled only when necessary
- [ ] recovery action is obvious
- [ ] private backend errors never leak

---

# P19 — Live Generation status

**Route / surface:** `/app/generations/[generationId]`  
**Status:** V1  
**Goal:** Create a focused, trustworthy asynchronous waiting experience without fake precision.

### Deliver
- queued
- preparing
- applying look
- refining
- finalizing
- longer-than-usual
- cancel only if meaningful

### Designer prompt

Design the live Generation page/state.

Show:
- source image;
- selected preset;
- selected options summary;
- generation state;
- calm brand animation using the five-pixel motif;
- truthful stage copy such as `Preparing your image`, `Applying the look`, `Refining details`, `Finalizing your result`;
- privacy reassurance only where useful.

Do not show an exact percentage unless the system genuinely measures one. Use a staged progress indicator or indeterminate motion. If the job is taking longer, explicitly say so without implying failure.

If cancellation is not technically reliable, do not show a fake Cancel. If technically meaningful, make it secondary and explain credit behavior.

When complete, transition to Result automatically while preserving browser history sensibly.

### Acceptance checklist
- [ ] no fake percentage
- [ ] state copy is human-readable
- [ ] credit/cancel behavior is not misleading
- [ ] reduced-motion variant exists
- [ ] completion transition defined

---

# P20 — Result page — primary success state

**Route / surface:** `/app/results/[generationId]`  
**Status:** V1  
**Goal:** Make the finished image feel rewarding while keeping download, save, regenerate, and next-look actions obvious.

### Deliver
- desktop result
- mobile result
- portrait output
- landscape output
- text-heavy/poster preset output

### Designer prompt

Design the main Result page.

Media is the hero. Show the result as large as the viewport permits without hiding key actions. Include:
- result image;
- Original/Result comparison entry;
- Download;
- Save;
- Favorite the preset;
- Regenerate;
- Adjust options;
- Try another preset;
- fast feedback.

Use a compact action rail or floating utility bar inspired by Higgsfield's action console, but tailored to finished-work actions rather than prompt creation. Keep primary action hierarchy contextual: for most users `Download` should be very prominent after a successful result, while `Regenerate` and `Adjust` are secondary.

Show preset name, generation date, credit cost, and result status quietly. Do not show provider/model metadata.

On mobile, result media is full width with a sticky action bar/sheet. Ensure actions remain reachable without permanently covering the image.

### Acceptance checklist
- [ ] result dominates visual hierarchy
- [ ] download/save/regenerate are easy to find
- [ ] metadata is consumer-facing
- [ ] mobile sticky actions do not obscure result

---

# P21 — Result comparison modes

**Route / surface:** `Result page sub-state`  
**Status:** V1  
**Goal:** Provide useful Original ↔ Result inspection without violating the no-slider rule on landing/discovery cards.

### Deliver
- side-by-side desktop
- slider desktop
- tap toggle mobile
- swipe mobile

### Designer prompt

Design the Original/Result comparison interaction for the Result page.

Desktop may support:
- side-by-side;
- drag slider;
- click/toggle.

Mobile may support:
- tap `Original` / `Result`;
- swipe between two panes;
- optional slider only if touch handling is excellent.

The landing/discovery preset-card rule against draggable comparison does **not** apply here. Result is the correct place for close inspection.

Provide labels that never disappear entirely. Preserve zoom/pan if added later. Add reduced-motion and keyboard support for any slider. Make the comparison mode easy to close back to the clean result view.

### Acceptance checklist
- [ ] Original and Result are always identifiable
- [ ] keyboard/touch operation documented
- [ ] comparison does not become default clutter

---

# P22 — Result feedback interaction

**Route / surface:** `Result page`  
**Status:** V1  
**Goal:** Collect fast structured quality feedback without turning the success moment into a survey.

### Deliver
- Love it
- Not quite
- negative reasons sheet
- submitted state

### Designer prompt

Design the feedback control directly on Result.

First level:
- `Love it`
- `Not quite`

If `Not quite`, reveal a compact popover/sheet:
- Doesn't look like me
- Wrong style
- Strange details
- Bad text
- Composition issue
- Other

Free text should be optional and secondary, not forced. Submission should be lightweight and not navigate away from the result. After feedback, show a small confirmation and keep all result actions available.

For `Doesn't look like me`, consider offering `Adjust` or `Regenerate` as a recovery action after the feedback is saved.

### Acceptance checklist
- [ ] feedback takes at most one or two taps
- [ ] negative reasons are structured
- [ ] no forced text
- [ ] recovery action offered when useful

---

# P23 — Regenerate, Adjust, and Try Another flow

**Route / surface:** `Result → Create/Explore`  
**Status:** V1  
**Goal:** Design the branching actions after a result so the user understands what will be preserved.

### Deliver
- Regenerate confirmation/context
- Adjust options return
- Try another preset transition

### Designer prompt

Design the three post-result continuation paths.

**Regenerate:** keep source, preset, and current options. Show the new credit cost directly on the action. If a separate confirmation is unnecessary, launch immediately after a lightweight cost acknowledgment according to user preference.

**Adjust options:** return to Create with the same source and preset, preserving existing selections. Visually show the previous result as recent history, not as the editable source.

**Try another preset:** preserve the source where privacy/retention policy permits and route to a source-aware Explore state or allow the user to pick a new preset, then return to Create.

Annotate what data is preserved, what is revalidated, and where credit cost is shown.

### Acceptance checklist
- [ ] preservation rules are explicit
- [ ] actions do not unexpectedly lose source/options
- [ ] credit cost is visible before a new paid generation

---

# P24 — Create/history continuity and returning to active work

**Route / surface:** `Create + Generation`  
**Status:** Recommended enhancement  
**Goal:** Keep recent attempts and active work easy to return to without bloating the core studio.

### Deliver
- recent-history strip/drawer
- active generation return state
- failed previous attempt

### Designer prompt

Design a restrained History access point inside the Create/Generation environment inspired by Higgsfield's `History` affordance.

Do not duplicate the full Library. Instead, provide a compact recent-attempt drawer or strip showing the last few transformations for the current preset/source session:
- thumbnail;
- status;
- time;
- open result / retry.

When an active generation exists and the user navigates away, the global shell or account menu may show `1 transformation in progress`. Returning should restore the live status page.

Keep history secondary; the studio's primary job remains configuring and generating.

### Acceptance checklist
- [ ] History does not replace Library
- [ ] active job can be recovered
- [ ] failed attempt shows correct credit outcome

---


# 5Pixels — Library and Favorites

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



# P25 — Library — populated state

**Route / surface:** `/app/library`  
**Status:** V1  
**Goal:** Create a personal media library that is visual and easy to filter without becoming an asset-management dashboard.

### Deliver
- desktop
- mobile
- All tab
- Saved tab
- Downloaded tab
- filter controls

### Designer prompt

Design `/app/library`.

Header:
- `Library`;
- Search;
- compact filters.

Primary tabs:
- All
- Saved
- Downloaded

Secondary filters:
- Date
- Preset

Use a media-first grid with the actual generated results. Cards show minimal permanent metadata; hover/focus reveals preset name, date, Save/Download/Open, and overflow actions. Keep varying aspect ratios manageable; choose either a disciplined masonry system or fixed card shells with contained media.

Clicking the media opens the canonical Result page. Preserve filters and scroll position on return.

On mobile, tabs can horizontally scroll; filters become a sheet; action menu is touch-friendly.

### Acceptance checklist
- [ ] Library is not confused with preset Favorites
- [ ] result media remains dominant
- [ ] filters persist
- [ ] Open routes to canonical Result page

---

# P26 — Library — first-time empty state

**Route / surface:** `/app/library`  
**Status:** V1  
**Goal:** Use Higgsfield's ghost-card empty-state grammar to show the future shape of the library.

### Deliver
- desktop empty
- mobile empty

### Designer prompt

Design the first-time empty Library.

Keep the real Library header and tabs visible. In the grid area, render 3–4 static muted ghost media cards with no shimmer, then center:
`Your transformations will appear here.`
Supporting copy should be one short sentence.
Primary CTA: `Explore presets`.

Use the five-pixel motif as a tiny empty-state flourish. The ghost cards must not look like loading skeletons; no shimmer or looping animation.

### Acceptance checklist
- [ ] future layout is understandable
- [ ] CTA leads to Explore
- [ ] ghost cards are distinguishable from loading

---

# P27 — Library — filtered empty/no-results states

**Route / surface:** `/app/library`  
**Status:** V1  
**Goal:** Differentiate a new-user empty state from a user who simply filtered everything out.

### Deliver
- Saved empty
- Downloaded empty
- no preset/date matches
- search no results

### Designer prompt

Design contextual Library empty states.

Examples:
- Saved: `Nothing saved yet.`
- Downloaded: `Nothing downloaded yet.`
- Filters: `No results match these filters.`
- Search: `No transformations match “...”`

Actions should be contextual:
- `Clear filters`
- `View all`
- `Explore presets` only when discovery is relevant.

Do not repeat first-time onboarding language if the user already has assets elsewhere in Library.

### Acceptance checklist
- [ ] each empty cause has distinct copy/action
- [ ] Clear filters available
- [ ] tabs remain visible

---

# P28 — Library generation card and overflow action menu

**Route / surface:** `/app/library component`  
**Status:** V1  
**Goal:** Specify all card-level actions and destructive behaviors.

### Deliver
- default card
- hover/focus
- overflow menu
- saved/downloaded markers
- delete confirmation handoff

### Designer prompt

Design the Library result-card interaction.

At rest: result image, optional tiny saved indicator, minimal metadata.

On hover/focus: reveal:
- Open
- Download
- Save/Unsave
- More

More menu may contain:
- Share
- Try this preset again
- Delete

Keep Delete separated/destructive. Do not put Report on the user's own private asset unless product policy needs it.

The entire card should not trigger accidental navigation when the user clicks Favorite/More. Define keyboard focus order and mobile long-press/tap behavior.

### Acceptance checklist
- [ ] card actions do not conflict with card navigation
- [ ] Delete is separated
- [ ] keyboard order documented

---

# P29 — Favorites — populated

**Route / surface:** `/app/favorites`  
**Status:** V1  
**Goal:** Design a saved-look collection focused on future creation, not generated assets.

### Deliver
- desktop
- mobile
- sort/filter state

### Designer prompt

Design `/app/favorites` as a gallery of saved presets.

Use the shared preset-card system rather than Library result cards. Header: `Favorites`. Optional sort: Recently saved, Newest preset, Category. Keep controls light.

Every card should make `Try this look` easy to reach. Show a filled favorite state. If a favorited preset becomes unavailable or retired, keep a graceful card state and suggest an alternative rather than silently deleting it.

On mobile, prioritize one-tap access to a saved look.

### Acceptance checklist
- [ ] preset cards are visually distinct from Library assets
- [ ] unfavorite works without navigation
- [ ] retired preset state exists

---

# P30 — Favorites — empty

**Route / surface:** `/app/favorites`  
**Status:** V1  
**Goal:** Turn an empty saved-look page back into discovery.

### Deliver
- desktop
- mobile

### Designer prompt

Design the empty Favorites state.

Keep Favorites header visible. Use a restrained ghost preset-card layout or a small visual mosaic. Message:
`Save looks you want to try later.`

Primary CTA:
`Explore presets`

Optional secondary line explains the heart/save control in one sentence. Avoid a long onboarding tutorial.

### Acceptance checklist
- [ ] CTA leads to Explore
- [ ] copy is concise
- [ ] state still feels visual

---


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


# 5Pixels — Responsive, Accessibility, Component System, Motion, and QA

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



# P61 — Responsive behavior master pass

**Route / surface:** `all user-facing routes`  
**Status:** V1  
**Goal:** Ensure the entire app is deliberately designed across desktop, tablet, and mobile rather than merely scaled.

### Deliver
- 1440 desktop
- 1024 tablet
- 768 small tablet
- 430 large phone
- 390 phone

### Designer prompt

Run a dedicated responsive design pass across every completed route.

Rules:
- broad gallery layouts become 3–4 columns desktop, 2–3 tablet, single-column emphasis or selective 2-column mobile;
- preset rails may horizontally scroll on mobile;
- large create studio becomes vertical workflow with bottom-sheet controls and sticky Generate;
- account left rail becomes settings index;
- pricing comparison does not squeeze 4 desktop columns onto a phone;
- Search becomes full-screen on mobile;
- modals wider than the phone become full-screen sheets;
- sticky actions respect bottom safe areas.

Annotate breakpoints based on component behavior, not arbitrary device labels. Identify every component that reflows, collapses, becomes a sheet, or changes interaction model.

### Acceptance checklist
- [ ] all major pages have mobile frames
- [ ] desktop-only hover behaviors have touch equivalents
- [ ] sticky layers do not collide
- [ ] breakpoint behavior annotated

---

# P62 — Accessibility master pass

**Route / surface:** `all user-facing routes`  
**Status:** V1  
**Goal:** Make the visual sophistication usable with keyboard, screen reader, reduced motion, and high-contrast needs.

### Deliver
- keyboard path annotations
- focus states
- reduced-motion frames
- contrast audit
- screen-reader notes

### Designer prompt

Audit every route and component for accessibility.

Required:
- visible focus;
- logical focus order;
- semantic buttons/links/forms;
- labels on all inputs;
- touch targets;
- alt text strategy;
- video preview naming/captions where needed;
- no information communicated by color alone;
- reduced-motion behavior;
- dialog focus containment;
- Search combobox/list semantics;
- popover selected/expanded states;
- comparison slider keyboard controls;
- charts with text summaries;
- credit meters with exact text;
- error messages programmatically associated with fields.

Create an accessibility annotation layer in Figma rather than leaving these decisions implicit.

### Acceptance checklist
- [ ] focus states designed for all interactive components
- [ ] reduced-motion behavior specified
- [ ] dialogs/search semantics annotated
- [ ] contrast reviewed

---

# P63 — Component library and variant system

**Route / surface:** `Figma components`  
**Status:** V1  
**Goal:** Turn all repeated UI into a coherent 5Pixels component system before final visual polish.

### Deliver
- core components
- variants
- properties
- tokens
- documentation page

### Designer prompt

Build the reusable component library.

At minimum:
- AppNav
- NavItem
- ExploreMegaMenu
- CreditsIndicator
- AvatarMenu
- SearchDialog
- SearchScopeChip
- SearchResultRow
- PresetCard (featured/standard/compact)
- StatusBadge
- CategoryChip
- Button roles
- IconButton
- SettingCard
- SelectorCard
- Popover
- BottomSheet
- UploadDropzone
- ValidationMessage
- GenerateCTA
- ProgressStage
- ResultActionBar
- LibraryResultCard
- SettingsRail
- MetricTile
- PricingPlanCard
- ComparisonAccordion
- Modal
- Toast
- EmptyState
- Skeleton/Loading placeholder.

Use component properties for state/size/content rather than duplicate frames. Separate semantic roles from accidental styling.

### Acceptance checklist
- [ ] components have documented variants
- [ ] tokens used consistently
- [ ] no one-off page components where reusable pattern exists

---

# P64 — Motion and micro-interaction specification

**Route / surface:** `all interactive surfaces`  
**Status:** V1  
**Goal:** Define restrained premium motion as a system.

### Deliver
- motion table
- prototype examples
- reduced-motion mapping

### Designer prompt

Create a motion specification.

Priority order:
1. user-triggered preset previews;
2. generation progress;
3. modal/popover transitions;
4. subtle section entrance;
5. hover elevation;
6. five-pixel brand flourishes.

Suggested timing:
- hover/focus surface: 80–140ms;
- popover: 120–180ms;
- modal/sheet: 160–240ms;
- accordion: 180–240ms;
- page-level transitions only when useful.

No continuous card animation, excessive parallax, glowing particles, or springy playful motion in billing/settings. Document reduced-motion alternatives.

### Acceptance checklist
- [ ] timing/easing documented
- [ ] motion differs by context
- [ ] reduced-motion alternatives listed

---

# P65 — Global state matrix: loading, empty, disabled, error, success

**Route / surface:** `all routes`  
**Status:** V1  
**Goal:** Ensure no route is designed only for ideal data.

### Deliver
- state matrix table
- component states
- page states

### Designer prompt

Create a master state matrix covering every major surface.

Include:
- preset grid loading;
- preset unavailable;
- upload empty/drag/select/upload/validate/accepted/warning/rejected;
- Generate disabled/ready/running;
- generation queued/active/slow/failure/success;
- result available/deleted/not found;
- Library empty/filtered empty/loading;
- Favorites empty;
- Search zero/query/loading/no-results/offline;
- billing balance normal/low/zero;
- invoices empty;
- payment method empty;
- auth loading/error;
- modal saving/error.

Use skeletons only for actual loading. Decorative ghost cards must look different. Critical errors persist inline or on page; do not rely solely on toasts.

### Acceptance checklist
- [ ] every core flow has non-ideal states
- [ ] loading vs empty is visually distinct
- [ ] critical errors persistent

---

# P66 — Content and UX-writing pass

**Route / surface:** `all routes`  
**Status:** V1  
**Goal:** Unify copy so the app stays visual, confident, and non-technical.

### Deliver
- copy deck
- button labels
- empty-state copy
- error copy

### Designer prompt

Audit all UI copy.

Voice:
short, confident, visual, specific.

Preferred patterns:
- `Pick the look. We'll handle the rest.`
- `Try this look`
- `Preparing your image`
- `248 credits left`
- `Your transformations will appear here.`

Avoid:
- inflated AI marketing;
- jargon;
- vague errors;
- repeated `Learn more`;
- provider/model terminology in consumer surfaces.

Ensure the same concept uses the same word everywhere: Preset/Look, Original, Result, Credits, Save, Download, Regenerate, Adjust.

Create a concise copy deck for engineering.

### Acceptance checklist
- [ ] terminology consistent
- [ ] errors actionable
- [ ] CTAs use verbs
- [ ] no AI jargon leaks

---

# P67 — Final interactive prototype + engineering handoff

**Route / surface:** `whole application`  
**Status:** V1  
**Goal:** Turn static screens into a testable, buildable system.

### Deliver
- clickable core flows
- redline/annotation pass
- component inventory
- responsive matrix
- handoff notes

### Designer prompt

Prepare the final Figma handoff.

Prototype at least the ten master flows listed in the Master Index. For every route, annotate:
- fixed/sticky/scroll areas;
- component names;
- responsive behavior;
- validation logic;
- modal ownership;
- empty/loading/error states;
- motion;
- accessibility notes;
- data/content dependencies;
- product questions still unresolved.

Create a `Decisions Needed` page separating confirmed design from assumptions. Do not hide unresolved billing, retention, model-choice, or sharing policy decisions inside visual mockups.

Engineering handoff should include route map, component map, state machine links for Create/Generation, and acceptance checklist per critical user journey.

### Acceptance checklist
- [ ] prototype covers core journeys
- [ ] assumptions are explicitly labelled
- [ ] state and responsive annotations complete
- [ ] component/route maps included

---


# 5Pixels — Optional Future Experiments (Not Canonical V1)

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


> **Important:** The prompts in this file intentionally go beyond the canonical V1 boundaries. Do not merge them into the primary designs unless the product owner explicitly changes the product specification.


# X01 — Advanced model-choice experiment

**Route / surface:** `Create — future experiment`  
**Status:** Future experiment — requires product decision  
**Goal:** Explore the product owner's earlier idea of letting advanced users choose engines without undermining the preset-first default.

### Deliver
- recommended/default state
- advanced chooser
- locked/unavailable model
- mobile

### Designer prompt

Design this only as an experiment.

Default Create remains `Recommended by 5Pixels`, where routing is automatic. Add a deliberately secondary `Advanced engine` control that can reveal model/provider choices only after explicit user opt-in.

Structure the chooser like Higgsfield's searchable model menu:
- Search;
- `Recommended for this preset` group;
- `Other compatible engines` group;
- badges such as NEW/PREMIUM only when meaningful;
- selected row highlight;
- compatibility and credit impact.

The user must always understand that changing engine may change cost, speed, or fidelity. Never let this choice appear required.

This experiment directly conflicts with the canonical rule that model/provider names are hidden, so it requires product-spec approval.

### Acceptance checklist
- [ ] default remains automatic
- [ ] cost/fidelity consequences visible
- [ ] advanced choice is optional
- [ ] conflict with canonical spec labelled

---

# X02 — Batch-generation future variant

**Route / surface:** `Create — future`  
**Status:** Future — excluded from V1  
**Goal:** Reuse the Higgsfield quantity stepper pattern only if batch generation becomes a real product capability.

### Deliver
- quantity stepper
- cost multiplication
- limit/plan state

### Designer prompt

Design a future batch-generation control only after backend/product support exists.

Use a compact `Outputs` or `Variations` stepper with minus/value/plus. The Generate CTA updates total credit cost immediately. Define plan limits, disabled states, and generation-progress representation for multiple outputs.

Do not include this control in V1 mocks; canonical scope excludes batch generation.

### Acceptance checklist
- [ ] total credit cost updates
- [ ] limits visible
- [ ] V1 separation preserved

---

# X03 — Public profile / social publishing future variant

**Route / surface:** `future`  
**Status:** Future — excluded from V1  
**Goal:** Preserve useful Higgsfield creator-profile patterns without prematurely turning 5Pixels into a social network.

### Deliver
- public profile
- published results tab
- empty state
- profile edit

### Designer prompt

Future-only concept. If 5Pixels later adds public sharing/profile pages, use a private/public separation.

Possible public profile:
- avatar/name;
- published results;
- curated collections;
- optional bio;
- no follower/like mechanics unless separately justified.

Use the Higgsfield ghost-card empty-state grammar and local tabs, but keep the transformation product primary. Public publishing should always be downstream of a successful Result, never the default state of all generations.

### Acceptance checklist
- [ ] public/private boundary clear
- [ ] publishing is opt-in
- [ ] no social metrics invented by default

---

# X04 — Gifts future variant

**Route / surface:** `future billing`  
**Status:** Future  
**Goal:** Capture the single-purpose Gifts-page pattern only if gifting becomes commercially relevant.

### Deliver
- gift landing card
- gift purchase
- delivery/receipt

### Designer prompt

Future-only. If 5Pixels adds gifting, design `Gift 5Pixels` as a focused feature:
- gift credits or plan;
- recipient email;
- sender name;
- optional message;
- delivery date;
- checkout;
- receipt/history.

The account settings shell can contain purchased-gift history, while discovery/marketing can promote gifting seasonally. Do not add the route merely because Higgsfield has one.

### Acceptance checklist
- [ ] gifting has a clear actual product offer
- [ ] purchase/delivery states exist
- [ ] not mixed into V1

---
