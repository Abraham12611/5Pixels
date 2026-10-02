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
