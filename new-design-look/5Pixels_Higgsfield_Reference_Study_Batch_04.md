# 5Pixels Main App Design Research
## Higgsfield Reference Study — Batch 04

**Status:** Working research document. This is the fourth screenshot-study batch and should be read together with Batches 01–03.

**Batch scope:** account-settings continuation; privacy-adjacent controls; account deletion entry; Gifts; Subscription and credits; billing/invoices/payment methods; detailed usage history; promo-code redemption; and a much richer global Search / command-palette system including tabs, recent items, rich promotional cards, live typed results, category sub-navigation, counts, badges, selected keyboard row states, and external-destination indicators.

**5Pixels source-of-truth documents used when translating these observations:**

- `00_README_MASTER_INDEX(1).md`
- `01_PRODUCT_OVERVIEW_AND_PRINCIPLES(1).md`
- `02_UI_UX_BIBLE_AND_DESIGN_SYSTEM(1).md`
- `03_SITEMAP_INFORMATION_ARCHITECTURE(1).md`

**Primary product constraint retained throughout:** 5Pixels is preset-first and outcome-first. The consumer chooses a visual look, uploads a source, and configures only controlled options. Private model routing and generation instructions remain infrastructure unless the product strategy is explicitly changed later.

---

# 0. Executive synthesis

Batch 04 contains two very different but equally useful design systems:

1. **The mature account / billing / usage environment**
2. **The global search palette as a full navigation and discovery layer**

The second one is especially important. Earlier batches showed search triggers in the global nav, but Batch 04 finally exposes the search overlay itself in multiple states. It is not just a search box. It behaves like a hybrid of:

- command palette;
- search results page;
- recent-history launcher;
- featured-product browser;
- category directory;
- keyboard navigable results list;
- launch surface for external destinations.

For 5Pixels, this can become one of the strongest elements of the application if translated carefully.

The direct 5Pixels opportunity is:

> Build a **Global Preset Search / Jump Palette** that lets a user search presets, categories, collections, and their own recent work from anywhere without leaving the current page until they choose a destination.

The account screenshots also complete several important missing surfaces:

- privacy/default-publication toggle pattern;
- language selector;
- account deletion entry point;
- gift-card surface;
- subscription overview;
- credits and credit-pool display;
- upgrade CTA;
- usage analytics;
- invoice and payment-method empty states;
- promo-code redemption;
- help placement.

The strongest structural conclusions from this batch are:

### A. Account settings should be a real product area, not a pile of modals

Higgsfield’s settings pages share a stable left rail while the right content changes. This creates calmness and predictability. 5Pixels should use the same principle for `/app/account/*` and `/app/billing/*`.

### B. Billing needs three levels of information

A mature credit product should distinguish:

1. **At-a-glance balance and current plan**
2. **Current usage and spend**
3. **Historical records: invoices, credit transactions, payment methods**

This prevents the top-level billing page from becoming dense.

### C. Credit UX should distinguish “balance” from “history”

The Subscription page shows current credit capacity. The Usage page shows what was spent and when. These should remain separate concepts in 5Pixels.

### D. Empty states can occupy large premium surfaces

Higgsfield is comfortable leaving large dark cards mostly empty with one centered message. It does not desperately fill every panel. This makes the product feel calmer and more premium.

### E. Search should expose multiple information architectures without making the global navigation enormous

The top navigation can stay relatively simple because the search overlay acts as a secondary global directory.

For 5Pixels, this is extremely useful because the product already needs:

- Discover
- Explore
- Categories
- Presets
- Library
- Favorites
- Search

Search can reduce pressure on the visible navigation.

### F. Badges in Search communicate novelty and relevance, not just entitlement

Examples include:

- `NEW`
- `TRENDING`
- `EXCLUSIVE`
- `NEW EPISODE`

For 5Pixels, the equivalent badge vocabulary should remain small and product-relevant:

- `NEW`
- `TRENDING`
- `PRO`
- perhaps `LIMITED` / `SEASONAL`
- perhaps `YOUR FAVORITE` only in personalized surfaces, not as a visual sticker everywhere.

### G. Promo-code redemption is deliberately theatrical

The promo-code page uses enormous centered text and almost no chrome.

This makes a trivial form feel like a distinct moment.

5Pixels should not automatically copy the extreme scale, but the broader lesson is useful:

> Small one-purpose billing actions can have highly focused, almost ceremonial layouts rather than generic form cards.

---

# 1. Continuity with Batches 01–03

## Batch 01 established

- main dark gallery shell;
- top navigation;
- rich mega-menu anatomy;
- status badges;
- model selector interaction;
- floating generation dock;
- aspect / quality / resolution popovers;
- preset discovery and masonry systems.

## Batch 02 established

- preset-specific creation studio;
- left configuration rail + large stage;
- upload onboarding;
- compact settings cards;
- control popovers;
- credit-aware Generate action;
- plan cards;
- interactive plan finder;
- initial comparison architecture.

## Batch 03 established

- progressive pricing comparison;
- comparison accordions;
- FAQ closure;
- account/avatar menu;
- account and billing local rail;
- profile/workspace empty-state patterns;
- quick profile-edit modal;
- credit overview cards.

## Batch 04 now adds

- profile/account lower-page controls;
- default-publication toggle pattern;
- application language;
- account deletion entry;
- gift-card setting surface;
- current plan + credit management;
- unlimited/entitlement summary pattern;
- invoices;
- payment methods;
- billing information;
- usage dashboard with date filtering;
- promo-code entry and claim;
- global Search default state;
- global Search query-result state;
- category-specific Search;
- product-card Search state.

This batch therefore significantly improves the completeness of:

- `/app/account`
- `/app/account/privacy`
- `/app/billing`
- `/app/billing/credits`
- `/app/billing/history`
- global Search overlay.

---

# 2. Batch 04 screenshot inventory

| Ref | Screenshot | Main surface | Primary 5Pixels relevance |
|---|---|---|---|
| S31 | `10.18.22 AM` | Personal profile — lower settings | privacy/default visibility toggle, language, deletion entry |
| S32 | `10.18.32 AM` | Gifts | settings-rail continuity, single-purpose promo card |
| S33 | `10.18.48 AM` | Subscription — upper | current plan, upgrade, credits, allowance meter, entitlement summary |
| S34 | `10.18.59 AM` | Subscription — lower | history, invoices, payment methods, billing information |
| S35 | `10.19.09 AM` | Usage history | spend overview, metrics, date filter, refresh, empty analytics |
| S36 | `10.19.17 AM` | Promo code — empty | focused single-purpose entry state |
| S37 | `10.19.30 AM` | Promo code — filled | claim action, large input-as-content pattern |
| S38 | `10.21.38 AM` | Global Search — All/default | recents, tabs, popular rich cards, trending lists |
| S39 | `10.21.48 AM` | Global Search — typed query | grouped live results, row selection, clear input |
| S40 | `10.22.03 AM` | Global Search — Models tab | left category sub-nav, counts, content list |
| S41 | `10.22.14 AM` | Global Search — Products tab | featured cards + catalog list, badges, external arrows |

---

# 3. S31 — Personal profile lower settings

## 3.1 Surface composition

This screenshot continues the Personal Profile / settings page and reveals a lower stack of large cards.

Visible sections:

1. a large empty-history card;
2. `Auto-publish new generations`;
3. `Application language`;
4. `Manage Account Deletion`.

The cards occupy a centered main column with substantial breathing room.

## 3.2 Large empty history card

The top card contains:

- small tray/archive-style icon;
- headline `No history yet`;
- supporting sentence;
- white utility CTA.

The message is vertically centered in a large surface.

The key design behavior is restraint:

- no illustration overload;
- no confetti;
- no decorative gradients;
- no aggressive upsell.

The empty state is treated as normal product state.

## 3.3 Privacy/default-visibility toggle row

`Auto-publish new generations`

Supporting copy explains exactly what the toggle means:

- enabled → new generations are automatically visible in Explore;
- disabled → they remain private by default.

The switch is aligned at far right.

### Strong UX lesson

The toggle label alone is not trusted to communicate consequences.

The card contains explicit behavioral explanation.

That is correct for privacy-relevant settings.

### 5Pixels direct translation

5Pixels currently should **not** have public generation publishing in V1.

However the component pattern belongs in `/app/account/privacy`.

Potential rows:

- `Keep uploaded images after processing`
- `Allow product improvement use`, only if legally/product-policy appropriate
- `Show transformation previews in shared links`
- `Default shared links to private`, if sharing exists
- `Remember recent uploads`, if feature exists

For privacy settings:

- use full sentence explanation;
- avoid relying on tooltip-only disclosure;
- make default state obvious.

## 3.4 Application language card

An entire card is dedicated to a language preference.

Left:

- title `Application language`;
- current language repeated below.

Right:

- compact dropdown control containing:
  - flag;
  - `English`;
  - chevron.

This demonstrates a useful account-settings rule:

> Even simple preferences can live as full-width setting rows if the overall settings surface values calm scanability over maximum density.

### 5Pixels translation

If localization exists:

- label `Language`;
- text `English`;
- selector right.

If only English exists in V1, do not show a dead control.

## 3.5 Manage Account Deletion

This appears as a large collapsed disclosure card:

- `Manage Account Deletion`;
- subcopy `Account deletion settings`;
- downward chevron.

This is much better than placing a bright destructive button directly beside ordinary settings.

It introduces friction and context before irreversible action.

### 5Pixels recommendation

On `/app/account/privacy`:

Use a dedicated **Danger zone** section.

Entry row:

`Delete account`

Subcopy:

`Permanently delete your account and associated data according to the retention policy.`

Click → dedicated page or destructive confirmation flow.

Do not hide deletion, but do not visually equate it with normal toggles.

## 3.6 Card spacing

Each setting block has:

- large outer radius;
- generous 30px-ish horizontal padding;
- title in bright off-white;
- secondary copy in muted grey;
- controls aligned to a consistent right edge.

5Pixels should use the same scanning geometry across account pages.

---

# 4. S32 — Gifts page

## 4.1 Local navigation continuity

The left settings rail persists exactly.

The active route changes to `Gifts`.

This reinforces that settings navigation should not reconfigure per page.

Consistency matters more than route-specific cleverness.

## 4.2 Main content is extremely sparse

At top of main content:

- small section label `Gifts`;
- one large card: `Gift cards`;
- supporting copy `Wrap up creativity and gift it to your friend`;
- bright illustrative card graphic entering from the right.

The rest of the page is open dark space.

## 4.3 Why the sparse page feels acceptable

The single feature is given visual importance rather than wrapped in a tiny form at the top-left.

This turns a minor billing feature into a distinct product capability.

## 4.4 Sidebar contextual support

The bottom sidebar card changes from Help Center to:

`Join our Discord`

This indicates Higgsfield allows the sidebar callout to be contextual or campaign-driven.

### 5Pixels caution

Do not let this area become rotating marketing clutter.

A stable `Need help?` card is more appropriate for V1.

## 4.5 5Pixels gift support

Gift cards are **not required by the current 5Pixels sitemap**.

Do not introduce them solely from this reference.

If gifting later becomes commercially useful, the page pattern is strong:

- one hero-like gift card;
- minimal settings-shell context;
- clear primary action after click.

## 4.6 Reusable pattern: SingleFeatureSettingsPage

This screenshot suggests a reusable template:

- local settings rail;
- small section eyebrow;
- one large feature card;
- optional illustration;
- no forced dashboard filler.

Could later support:

- referral program;
- promo credits;
- gift cards;
- partner benefits.

---

# 5. S33 — Subscription page, upper section

This is a very useful billing screenshot.

## 5.1 Page heading

Main heading:

`Subscription`

Supporting copy:

`Manage your plan, credits, unlimited models`

For 5Pixels, this should be translated to consumer language such as:

`Manage your plan and credits`

Do not mention models.

## 5.2 Current plan card

Top card:

small eyebrow/icon `Subscription`

Nested inner surface:

- `Free Plan`;
- supporting copy;
- bright lime `Upgrade plan`.

The plan row is extremely simple.

No giant pricing table is reproduced inside account settings.

This is correct.

### 5Pixels current-plan card

Show:

- current plan name;
- billing cadence;
- renewal date or `Free`;
- one action:
  - `Upgrade plan`
  - `Manage plan`
  - `Cancel plan` should not be primary.

## 5.3 Credits card

Next large card:

- eyebrow `Credits`;
- nested surface;
- label `Monthly credits left`;
- large numeric expression;
- `Buy credits` secondary control;
- lime horizontal meter.

### Important ambiguity

The screenshot shows `260 / 10`, which appears visually inconsistent if interpreted literally as "260 remaining out of 10." This may reflect multiple credit pools, top-ups, promotional balance, or a display quirk.

**Do not copy the exact numeric syntax without a clear data model.**

### 5Pixels recommendation

Always make the denominator meaningful:

`248 / 300 monthly credits left`

or simply:

`248 credits left`

with:

`Resets Oct 1`

If purchased and subscription credits are separate:

- show them as distinct rows only if expiry/usage order differs;
- otherwise unify the mental model.

## 5.4 Buy credits CTA

`Buy credits` is an outlined utility action, not the loudest lime button.

That hierarchy is good because the user may only be checking balance.

### 5Pixels rule

Use lime for `Upgrade plan` if upgrading is the page's primary commercial action.

Use a quieter button for `Buy credits` when it is an optional top-up.

If the user has zero credits, hierarchy can reverse.

## 5.5 Active entitlement summary

The lower card is titled `Active unlimited models`.

It shows three small metric tiles:

- current unlimited count;
- free generations in total;
- total dollars saved.

Then a large empty state:

`No unlimited models available`

with lime upsell button.

### 5Pixels translation

Do not show models.

Possible corresponding section:

`Plan benefits`

Metric tiles could show:

- Premium presets unlocked
- Monthly credits
- High-resolution exports
- Priority generations

But only if those benefits truly vary by plan.

### Better 5Pixels alternative

Avoid manufacturing metrics.

A simpler benefits list may be more appropriate:

- `All core presets`
- `300 monthly credits`
- `4K exports`
- `Priority generation`

## 5.6 Savings metric caution

`+$1.84 Saved in total` is psychologically effective but can become gimmicky.

5Pixels should use savings claims only if:

- mathematically defensible;
- based on actual compared price;
- not confusing;
- not likely to create distrust.

---

# 6. S34 — Subscription lower section

## 6.1 Unlimited-access history row

A card:

- title `Unlimited Access History`;
- supporting copy;
- `See Unlimited History` secondary button.

This is a **history-summary card that links to a deeper page** rather than embedding a full table.

Excellent pattern.

### 5Pixels translation

Could become:

`Credit history`

Supporting:

`See credit purchases, debits, and refunds.`

CTA:

`View credit history`

or:

`Billing history`

`See invoices and plan changes.`

`View history`

## 6.2 Pending Invoices

Section:

- label `Pending Invoices`;
- small `All invoices` button;
- large empty card:
  - icon;
  - `No pending invoices`.

This separates **current exceptions** from the complete historical archive.

Very good information architecture.

### 5Pixels billing history

Top block:

`Pending payments` only if relevant.

Then:

`Invoices`

No need to show an empty "pending" section if the payment provider does not create this state often.

## 6.3 Payment methods

Section:

- label `Payment methods`;
- large empty card;
- icon;
- `No payment methods`;
- bottom-left `+ Add new payment method`.

The action is visually embedded in the card rather than floating elsewhere.

### 5Pixels recommendation

If payment method management is supported:

Card with:

- card brand;
- last four;
- expiry;
- default badge;
- overflow menu.

Empty:

`No payment method saved`

`Add payment method`

Do not store or imply access to raw payment details.

## 6.4 Billing information

A lower card begins:

- `Billing information`;
- supporting copy;
- `Manage`.

This likely controls invoice name/address/tax data.

### 5Pixels translation

If billing provider supports customer billing info:

- Name / business
- Billing address
- Tax/VAT ID where relevant
- Invoice email

Keep this under Billing, not Account Profile.

## 6.5 Strong overall pattern

The billing page uses **section-within-page modules**, not one giant card.

Each module owns one concept:

- entitlement history;
- invoices;
- payment methods;
- billing identity.

This improves scanability and future extensibility.

---

# 7. S35 — Usage history

## 7.1 Page header

`Usage history`

Subcopy:

`View credits usage, history and statistics`

Right-side controls:

- `Refresh`
- `Last 7 days` dropdown.

This is one of the first genuinely analytic consumer account pages shown.

## 7.2 Spend overview card

A large card begins with label `Spend overview`.

Inside:

four equal metric tiles:

1. `$0` — `Total cost`
2. `0` — `Credits spent`
3. `0` — `Features used`
4. `0` — `Total generations`

Below:

a large data area / empty state:

`No spend data yet`

This gives a dashboard rhythm without excessive complexity.

## 7.3 Usage history card

Second large card:

- eyebrow `Usage history`;
- large empty state;
- `No usage history yet`;
- explanatory text.

## 7.4 5Pixels translation

The existing product already has credits and billing history.

A useful `/app/billing/credits` or `/app/billing/history` analytics header could show:

- Credits used
- Transformations completed
- Credits refunded/released
- Average credits per successful result, optional
- Top preset category, optional and only if actually useful

Do **not** show `Features used` as a metric if the product has only one core transformation workflow.

## 7.5 Do not lead with dollars unless the user is metered by dollars

5Pixels users think in credits.

Therefore primary metric should be:

`Credits used`

not:

`Total cost`

Actual cash should live in purchase/invoice history.

## 7.6 Date-range control

A 5Pixels date filter is useful for:

- billing questions;
- auditing credit usage;
- understanding plan fit.

Default:

`Last 30 days` may be more useful than 7 for monthly subscriptions.

Options:

- 7 days
- 30 days
- This billing cycle
- Previous billing cycle
- Custom

## 7.7 Refresh button

If usage data updates automatically or near-real-time, a visible Refresh button may be unnecessary.

Use it only if backend data can lag.

## 7.8 Empty analytics design

Higgsfield does not hide the entire dashboard when empty.

Metric cards still appear with zeros.

This teaches the user what information will exist later.

5Pixels should use the same principle.

---

# 8. S36 — Promo code, empty state

## 8.1 Page layout

The local settings rail persists.

Main page title:

`Promo code`

But the functional UI is visually centered far inside the open page:

`Enter promo code`

The text is enormous and muted.

There is no traditional bordered input visible.

This appears to be a highly stylized text-entry surface.

## 8.2 Why this is notable

Promo codes are usually presented as:

- small input;
- Apply button;
- generic billing card.

Higgsfield instead makes the code itself the main visual content.

This gives the interaction ceremonial focus.

## 8.3 5Pixels applicability

If 5Pixels supports promo codes:

A simpler, more polished version could be:

Centered card:

`Have a code?`

Large input:

`Enter promo code`

Button:

`Apply`

This would be easier to understand and more accessible while retaining the single-purpose focus.

## 8.4 Help card

The local rail shows:

`Need help?`

`Answers on billing, credits, and account.`

`Go to Help Center`

This is more relevant to promo-code confusion than the Discord card in Gifts.

### 5Pixels recommendation

Use a stable billing help card:

`Need help with billing?`

`View billing help`

Potential secondary:

`Contact support`

---

# 9. S37 — Promo code filled state

## 9.1 Entered code as hero text

The code becomes very large bright text:

`HdT$678`

Below:

a compact dark button with lime label:

`Claim`

The design clearly distinguishes:

- unfilled placeholder state;
- filled code state.

## 9.2 Action is subordinate to the code

The code itself is the hero.

The claim button is comparatively small.

This is appropriate because the interaction has one decision: verify the entered code.

## 9.3 5Pixels improved flow

Recommended states:

### Empty

- input placeholder;
- disabled `Apply`.

### Typing

- normal input;
- `Apply` enabled.

### Checking

- button spinner;
- label `Checking`.

### Success

- inline success card:
  - `Code applied`
  - benefit summary;
  - expiration if any.

### Invalid

- inline error:
  - `That code isn't valid. Check it and try again.`

### Already used

- specific:
  - `This code has already been redeemed.`

### Expired

- specific:
  - `This code has expired.`

Do not use a toast as the only result for a financial entitlement action.

## 9.4 Security / abuse note

Promo-code errors should not reveal internal campaign logic.

Consumer-facing states should be sufficient.

---

# 10. S38 — Global Search, default `All` state

This is one of the richest UI screenshots across all four batches.

## 10.1 Overlay geometry

The Search appears as a very large rounded floating panel over a darkened backdrop.

It is not full-screen on desktop.

The panel has:

- rounded ~30px outer corners;
- thin border;
- charcoal background;
- generous internal padding.

Top-right has a large circular close button containing `X`.

## 10.2 Search input

The search field spans nearly the full width of the panel.

It is visually merged into the shell but still clearly a dedicated input.

Contains:

- magnifying glass icon;
- large placeholder `Search`.

The close button sits outside the input but inside the modal header region.

## 10.3 Top category pills

Immediately below input:

- `All`
- `Models`
- `Products`
- `Characters`
- `Community`
- `Apps ↗`
- `Originals ↗`

The active `All` chip is filled.

Others are outlined / surface-defined.

### Important observation

Some chips include northeast arrows.

This communicates that those destinations may open a separate app/surface or external route rather than filter the current search results.

The UI tells the user about navigation semantics before click.

## 10.4 Divider

A subtle horizontal divider separates category chips from content.

This gives the overlay three visual levels:

1. query;
2. search scope;
3. results/discovery content.

## 10.5 Recents section

Heading:

`Recents`

List items:

- icon tile;
- title;
- one-line descriptor.

There are no extra buttons.

Entire row is likely clickable.

### 5Pixels direct fit

The current sitemap already calls for recent searches.

5Pixels can go one better and show:

- Recent presets
- Recent searches
- Recent results

But do not overload all three simultaneously.

Recommended default:

`Recent`

Rows:

- last 3–5 presets opened;
- maybe last transformation if helpful.

## 10.6 Popular products section

Heading left:

`Popular products`

Right:

`See all`

Below:

three rich cards.

Each card has:

- themed background artwork;
- small category pill;
- `NEW` badge;
- large title;
- descriptor.

These cards are compact but much richer than list rows.

### Search UX lesson

A zero-query search state does not need to be empty.

It can become a discovery surface.

This is ideal for 5Pixels.

## 10.7 Trending section

Below the cards:

`Trending`

Results displayed in two columns.

Each item:

- icon tile;
- title;
- descriptor;
- optional status badge.

Examples show:

- `NEW`
- `TRENDING`.

### 5Pixels translation

Zero-query Search:

- Recent
- Trending presets
- New presets
- Popular categories
- maybe Favorites shortcut

This makes Search valuable even before typing.

## 10.8 Recommended 5Pixels Search top scopes

Because 5Pixels is much simpler than Higgsfield:

- `All`
- `Presets`
- `Categories`
- `Library`
- `Favorites`

Potential future:

- `Help`

Do not add `Models`.

Do not add scopes that duplicate no meaningful data type.

## 10.9 Stronger 5Pixels option

Instead of separate `Favorites` tab, favorites can be a filter inside Presets.

A cleaner scope set may be:

- `All`
- `Presets`
- `Categories`
- `My Library`

This is likely sufficient for V1.

---

# 11. S39 — Global Search, live query state

## 11.1 Query entered

Search field contains:

`con`

Inside the field at far right:

small circular `X` clear button.

Outside the field:

larger `X` close button.

This is excellent differentiation:

- inner X = clear query;
- outer X = dismiss search.

5Pixels should copy the interaction principle, not necessarily visual proportions.

## 11.2 Scope chips disappear in this screenshot

The query state focuses on results.

The content is grouped by semantic category:

- `Image models`
- `Video models`

This shows the search system can dynamically re-group results rather than always preserve the zero-query card layout.

## 11.3 Result row anatomy

Each row:

- square icon tile;
- bold title;
- muted one-line description;
- optional badge;
- optional right-edge action/indicator.

The rows have substantial height, making them easy to scan.

## 11.4 Selected / keyboard-focused result

`Kling 3.0` is highlighted with:

- brighter card background spanning the row;
- small arrow/return-style indicator at far right.

This looks like keyboard selection / active result.

### Important micro-interaction

A search palette should support:

- Arrow Up / Arrow Down;
- Enter to open;
- Esc to close;
- Cmd/Ctrl+K shortcut if appropriate;
- type-to-search immediately.

The highlighted result must track keyboard movement.

## 11.5 Badge usage in results

`EXCLUSIVE` appears inline after a result name.

The badge is small, lime, high contrast.

### 5Pixels equivalent

Inline badges may show:

- `NEW`
- `TRENDING`
- `PRO`

Potential `PRO` badge should not make free users feel blocked before they understand the preset.

If a user selects a Pro preset:

- detail page should clearly explain access;
- Search may show a subtle entitlement badge.

## 11.6 Search result grouping for 5Pixels

Query: `cin`

Potential result groups:

### Presets
- Cinema Noir
- Cinematic Rain
- Midnight Premiere

### Categories
- Cinematic

### My Library
- result generated with Cinema Noir

This gives semantic grouping without model terminology.

## 11.7 Search matching

Use:

- title;
- category;
- descriptors;
- tags/synonyms;
- possibly internal search aliases.

Do not search private generation instructions.

---

# 12. S40 — Search `Models` scope with category sub-navigation

## 12.1 Scope state

Top chip `Models` is active.

Below, the overlay transforms into a two-column internal browser.

Left column:

`Categories`

Rows:

- Image — 33
- Video — 53
- Edit — 7
- Audio — 10

Each row has:

- icon;
- category name;
- count badge.

Active category `Image` has a filled brighter background.

Right column:

heading `Image models`

List of results.

## 12.2 Why this is powerful

The Search overlay becomes a temporary directory.

The user can browse an entire product taxonomy without leaving context.

This reduces dependence on huge navigation menus.

## 12.3 5Pixels translation

For a `Presets` scope:

Left `Categories`:

- Portrait
- Cinematic
- Covers
- Illustration
- Professional
- Retro
- Fantasy
- Seasonal

Optional count badges.

Right:

`Portrait presets`

Rows:

- preset thumbnail/icon;
- preset title;
- one-line outcome descriptor;
- badge.

This is highly aligned with the existing sitemap.

## 12.4 Count badges

Counts can be useful if the catalog is substantial.

For V1 with only 20–30 curated presets:

Counts may help:

`Portrait 6`
`Cinematic 5`

But do not make the catalog look sparse.

If categories have only 1–2 items, omit counts.

## 12.5 `Auto` result pattern

Higgsfield includes an `Auto` result:

`The best model for any prompt, chosen for you`

For 5Pixels, a conceptually similar result should **not** be `Auto model`.

Potential equivalent:

- `Recommended for you`
- personalized search shortcut
- or no equivalent at all.

Because presets themselves determine routing, model choice is already automatic.

## 12.6 Modal dimensions

The overlay is tall enough to display many list rows.

Likely behavior:

- modal body scrolls;
- header/search/scopes remain sticky.

5Pixels should implement:

- sticky search bar;
- sticky scope chips;
- scrollable results body.

---

# 13. S41 — Search `Products` scope

## 13.1 Active scope

`Products` chip is filled.

Content begins:

`New products`

Then two large horizontal promotional cards.

## 13.2 Promotional card anatomy

Each card includes:

- themed illustration;
- very large product title;
- inline `NEW` badge;
- one-line descriptor;
- small category pill;
- white `Try now` button.

These are miniature landing-page heroes inside Search.

## 13.3 All products list

Below:

`All products`

Two-column list.

Each item:

- icon tile;
- name;
- one-line descriptor;
- optional badge.

Some rows include:

- `TRENDING`
- `NEW EPISODE`
- northeast arrow.

## 13.4 5Pixels translation

A `Presets` search scope can borrow the **two-tier discovery pattern**:

### New & featured
2 rich cards:
- preset preview still/poster;
- title;
- `NEW`/`TRENDING`;
- `Try this look`.

### All presets
Compact two-column list.

This could be extremely effective for desktop.

## 13.5 Avoid turning Search into a second Explore page

Search must remain fast.

Therefore rich cards should be limited:

- 2–3 cards maximum;
- lazy media;
- no autoplay storm;
- static posters by default.

The main catalog remains `/app/explore`.

## 13.6 External arrows

If a search result navigates to a different domain or opens a new context, show it.

5Pixels will rarely need this in V1.

Could be used for:

- Help Center;
- legal docs;
- external support.

Not for normal internal preset navigation.

---

# 14. Global Search — full 5Pixels recommendation

Batch 04 provides enough evidence to specify this overlay substantially.

## 14.1 Trigger

Desktop:

- search icon in top nav;
- keyboard shortcut: `/` or `Cmd/Ctrl+K`, but choose one clear convention.

Mobile:

- search icon opens full-screen sheet.

## 14.2 Desktop shell

- width: ~880–1100px depending viewport;
- max height: 80–88vh;
- near-black backdrop;
- charcoal modal;
- 20–30px radius;
- 1px subtle border;
- sticky top search region;
- scrollable body.

## 14.3 Search header

Input:

- magnifying icon;
- placeholder `Search presets, categories, and your library`;
- clear button only when non-empty.

Right:

- close button.

## 14.4 Scopes

Recommended V1:

- All
- Presets
- Categories
- Library

Optional only if useful:

- Favorites

Do not expose Models.

## 14.5 Zero-query `All`

### Recent
3–5 rows:
- recent presets viewed;
- maybe recent result opened.

### Trending now
3 rich preset cards.

### Popular categories
compact chips or list.

### New presets
4–6 compact rows.

## 14.6 Typed query `All`

Group results:

- Presets
- Categories
- Library

Use ranked fuzzy matching.

Show max:

- 5 presets;
- 3 categories;
- 4 library assets;

then `See all results`.

## 14.7 Presets scope

Left:

categories.

Right:

preset list.

Optional featured cards above only when no query.

## 14.8 Categories scope

Grid/list of categories with:

- name;
- representative preview;
- count if useful.

## 14.9 Library scope

Search user's generated assets by:

- preset name;
- date metadata;
- saved/downloaded state.

Do not search hidden prompts or providers.

## 14.10 Result row anatomy

Preset row:

- 56–64px preview tile;
- title;
- one-line outcome description;
- category text;
- optional `NEW/TRENDING/PRO`;
- keyboard active state.

Library row:

- result thumbnail;
- preset name;
- date;
- saved state.

Category row:

- category icon/preview;
- name;
- short category description.

## 14.11 Keyboard behavior

Must support:

- typing on open;
- ↑ ↓ move active row;
- Enter opens;
- Esc closes;
- Cmd/Ctrl+K toggles if shortcut implemented;
- Tab traverses scopes/controls predictably.

## 14.12 Search analytics

Track:

- search opened;
- query entered;
- result clicked;
- no-results;
- scope switched;
- recent clicked;
- featured clicked.

Do not log private source image content.

## 14.13 No-results state

Do not show a dead panel.

Example:

`No presets found for “cyber accountant”.`

Then:

- suggested categories;
- `Explore all presets`;
- recent searches.

## 14.14 Mobile

Full-screen sheet:

Top:

- back/close;
- search.

Below:

horizontal scope chips.

Content:

single column.

Rich featured cards become horizontal carousel or one full-width card.

---

# 15. Account / Billing information architecture — refined after Batch 04

The new screenshots suggest a slight refinement to the account structure proposed in Batch 03.

## 15.1 Global account menu

Keep compact:

- identity;
- plan;
- credits;
- Upgrade / Buy credits;
- Account;
- Billing;
- Help;
- Sign out.

## 15.2 Account settings shell

Left rail:

### ACCOUNT
- Profile
- Security
- Privacy
- Notifications

### PREFERENCES
- Language, only if localization exists

### BILLING
- Plan
- Credits
- History

Bottom:

- Help
- Sign out

## 15.3 Do we need a separate `/app/billing` shell?

Yes, but it can use the same left rail.

This creates one stable Settings shell across account and billing.

## 15.4 `/app/billing/plan`

Show:

- current plan;
- renewal;
- included monthly credits;
- plan benefits;
- manage/upgrade/cancel actions.

## 15.5 `/app/billing/credits`

Show:

- current balance;
- reset date;
- top-up;
- usage chart;
- credit ledger.

## 15.6 `/app/billing/history`

Show:

- invoices;
- purchases;
- refunds;
- payment method;
- billing information.

This maps more cleanly than copying Higgsfield's page names literally.

---

# 16. 5Pixels privacy / profile implications from S31

The settings screenshot surfaces a useful distinction:

- **Profile preferences**
- **Privacy defaults**
- **Dangerous account actions**

Do not place these in one undifferentiated page.

## 16.1 Profile

- display name;
- avatar;
- email display;
- language if desired.

## 16.2 Privacy

Potential sections:

### Uploaded images
- retention explanation;
- delete source after transformation where technically supported.

### Generated results
- retention;
- sharing defaults.

### Product analytics
- relevant consent controls if required.

### Account deletion
- dedicated destructive entry.

## 16.3 Notifications

- generation completed;
- billing/low-credit;
- product updates.

Use toggle rows with explanations.

---

# 17. Credit-system UX principles extracted from S33–S35

## 17.1 Always show exact balance

Never rely on a progress bar alone.

## 17.2 Explain reset/expiry

Examples:

`248 credits left · resets Oct 1`

or:

`120 monthly + 80 purchased`

only where necessary.

## 17.3 Separate balance from transaction history

Balance answers:

`What can I do now?`

History answers:

`Where did my credits go?`

These are distinct jobs.

## 17.4 Failed-generation protection should be visible in history

A failed generation should show:

- `Released`
- `Refunded`
- or no debit.

The ledger should not force users to guess.

## 17.5 Use human event names

Good:

- `Midnight Premiere`
- `2 credits`
- `Completed`
- `Sep 10, 10:32`

Bad:

- `generation_job_8452`
- `provider debit`
- `inference failure`

## 17.6 Billing analytics should remain simple

Consumer dashboard:

- used;
- remaining;
- completed transformations;
- refunded/released credits.

Admin analytics can be much richer.

---

# 18. Promo-code flow recommendation

Promo code is not currently a central sitemap route, so treat it as optional.

If included:

## 18.1 Entry

Route:

`/app/billing/credits`

or modal from billing page.

A dedicated `/promo` route is likely unnecessary unless campaigns depend on it.

## 18.2 States

- empty;
- typing;
- validating;
- success;
- invalid;
- expired;
- already used;
- not eligible.

## 18.3 Success card

`Code applied`

`+50 credits added`

or:

`20% off your next month`

depending on campaign.

Action:

`Done`

## 18.4 Do not silently change subscription terms

If code affects recurring billing:

show:

- discount amount;
- duration;
- next charged amount;
- expiration.

---

# 19. Gifts — recommendation for 5Pixels

Current V1 does not require gifting.

Therefore:

**Do not add a Gifts route now.**

Keep the pattern in the future backlog.

If launched later, possible product:

`Gift 5Pixels credits`

or:

`Gift a month of 5Pixels`

The experience should be:

- amount/plan;
- recipient email;
- sender name;
- message;
- delivery date;
- checkout;
- receipt.

The account-settings side rail is a reasonable location for a purchased-gifts history, but initial purchase may live on public Pricing.

---

# 20. Search badge taxonomy for 5Pixels

The Higgsfield Search shows how well small badges work when used sparingly.

Recommended 5Pixels canonical badge set:

## `NEW`

Use for:

- recently launched preset;
- time-limited newness window, e.g. first 14–30 days.

## `TRENDING`

Use algorithmically or editorially.

Do not attach permanently.

## `PRO`

Use for plan-gated preset.

Could use a premium icon instead if `PRO` feels too SaaS-like.

## `LIMITED`

Potential for seasonal/time-limited collection.

## `UPDATED`

Possible future use when a preset receives a materially improved version.

Avoid:

- `HOT`
- `WOW`
- `AI`
- excessive badges;
- provider-brand badges.

---

# 21. Search result visual hierarchy

## 21.1 Title

Bright warm off-white.

## 21.2 Descriptor

Muted, one line.

## 21.3 Thumbnail/icon

Preset search should use media thumbnail where possible rather than abstract icon.

This is important because 5Pixels is visual.

## 21.4 Category

Can appear as small metadata text or chip.

## 21.5 Badge

Inline after title.

## 21.6 Active row

Use:

- slightly lighter charcoal;
- subtle border;
- optional five-pixel motif on left edge;
- keyboard/hover state must be visually obvious.

Do not use lime fill for the whole selected row.

---

# 22. Search zero-state recommendations

The zero-query state is where 5Pixels can surpass a basic search palette.

## Option A — Discovery-first

`Recently viewed`

`Trending looks`

`New this week`

Best for casual consumers.

## Option B — Utility-first

`Recent`

`Favorites`

`Library`

`Popular categories`

Best for returning users.

## Recommended hybrid

### Recent
2–4 rows.

### Trending looks
3 visual cards.

### Categories
5–8 compact chips.

This is enough.

Do not turn Search into another infinite feed.

---

# 23. Search relationship to Explore

This needs an explicit rule to avoid duplication.

## Explore is for browsing

- visual grid;
- long session;
- discovery;
- filters;
- categories;
- previews.

## Search is for finding/jumping

- fast;
- overlay;
- keyboard-friendly;
- recent;
- targeted query;
- small discovery hints.

## Preset detail is for evaluation

- examples;
- compatibility;
- controls;
- cost;
- CTA.

## Create is for transformation

Search should never become the generation console.

---

# 24. Search relationship to Categories

The existing sitemap already has category routes.

Search categories should:

- surface matching categories;
- open `/app/explore?category=...` or category route;
- not replicate full category page detail.

Category counts in Search are optional.

---

# 25. Search relationship to Library

When user searches their Library:

allow matches by:

- preset name;
- saved flag;
- date text;
- user-facing result title if titles exist.

Potential quick filters:

- Saved
- Downloaded
- Recent

No model/provider filtering.

---

# 26. Search modal component architecture

Potential component tree:

```text
GlobalSearchDialog
├── SearchHeader
│   ├── SearchInput
│   ├── ClearQueryButton
│   └── CloseButton
├── SearchScopeTabs
├── SearchBody
│   ├── ZeroQueryAll
│   │   ├── RecentList
│   │   ├── FeaturedPresetCards
│   │   └── TrendingList
│   ├── QueryResults
│   │   ├── ResultGroup
│   │   └── SearchResultRow
│   ├── PresetsBrowser
│   │   ├── CategoryRail
│   │   └── PresetList
│   ├── CategoriesBrowser
│   └── LibraryResults
└── OptionalSearchFooter
    └── KeyboardHints
```

Keyboard footer can show:

`↑↓ Navigate   ↵ Open   Esc Close`

Higgsfield does not visibly show this in the screenshots, but adding it could improve discoverability if visually subtle.

---

# 27. Search modal motion

Open:

- backdrop fade 120–160ms;
- panel opacity + small translate/scale 140–180ms.

Typing:

- no layout jitter;
- use skeleton only if network query exceeds ~150–250ms.

Scope switch:

- crossfade or instant replace;
- preserve search query unless scope semantics require reset.

Selected row:

- no spring;
- simple background transition 80–120ms.

Close:

- reverse quickly.

Respect reduced motion.

---

# 28. Search performance requirements

Because this is a global interaction, performance matters more than decorative richness.

## Must feel immediate

- open shell instantly;
- local recent data available immediately;
- debounce server search lightly;
- cancel stale requests;
- cache popular/trending.

## Media

- rich cards use static poster first;
- no multiple autoplay videos inside the overlay;
- lazy load below fold.

## Query

Target:

- perceived response <200ms for cached/local;
- use lightweight loading state when slower.

---

# 29. Account settings component patterns extracted in Batch 04

## 29.1 SettingsFeatureCard

Use for:

- language;
- privacy default;
- billing info;
- plan summary.

Anatomy:

- title;
- description;
- right control/action.

## 29.2 SectionSummaryCard

Use for:

- history;
- invoices;
- payment method.

Anatomy:

- eyebrow;
- optional top-right action;
- content/empty area.

## 29.3 MetricTileRow

Use sparingly for:

- credit usage;
- transformation totals.

Avoid over-dashboarding.

## 29.4 DangerDisclosure

Use for:

- account deletion.

Anatomy:

- title;
- one-line explanation;
- chevron;
- expanded details;
- destructive CTA only after expansion.

## 29.5 DateRangeControl

Use for:

- credit/usage history.

## 29.6 PromoEntry

Optional focused billing utility.

---

# 30. 5Pixels billing page prompt seed

Design a premium dark-theme `/app/billing` area for 5Pixels using a stable local settings rail on desktop. The main page should feel calm, consumer-friendly, and credit-aware rather than like a financial dashboard. Show the current plan in a compact card, exact credits remaining, the next reset/renewal date where applicable, a restrained credit meter using the five-pixel motif, and clear `Buy credits` / `Manage plan` actions. Below, separate billing history, payment methods, and billing information into their own rounded modules. Use large empty states when no invoices or payment methods exist. Do not expose AI model names, inference terminology, provider costs, or internal routing.

---

# 31. 5Pixels usage page prompt seed

Design `/app/billing/credits` or a `Usage` sub-page for 5Pixels. The page header should include a date-range selector. A spend/usage overview card should summarize Credits used, Transformations completed, Credits refunded/released, and Credits remaining for the selected period. Below, show a credit-transaction history area. If the user has no usage, keep the metric cards visible with zeros and use a large calm empty state instead of hiding the dashboard. Use consumer-facing preset names and statuses, never job IDs or provider terminology.

---

# 32. 5Pixels privacy page prompt seed

Design `/app/account/privacy` as a spacious dark settings page with large row cards. Every privacy-affecting toggle must include a clear sentence explaining its consequence. Separate ordinary privacy controls from account deletion. Place account deletion inside a collapsed `Danger zone` disclosure with a dedicated destructive flow. Keep language, profile editing, billing, and security in their own routes. Use warm off-white text, subtle charcoal elevation, visible focus states, and minimal lime.

---

# 33. 5Pixels global Search prompt seed

Design a large premium desktop search palette for 5Pixels that opens from the global navigation and supports keyboard-first navigation. The overlay should have a large search field, clear-query control, separate close control, and scope pills for All, Presets, Categories, and Library. In the zero-query state show Recent items, three rich Trending preset cards, and a compact set of popular categories. When typing, replace the discovery layout with grouped live results for Presets, Categories, and Library. Each result row should include a visual thumbnail, title, short outcome descriptor, optional NEW/TRENDING/PRO badge, and a strong active keyboard-selection state. In the Presets scope, use a left category rail with a right preset list. Keep the experience fast and visual; do not expose AI models or hidden prompts.

---

# 34. 5Pixels promo-code prompt seed

Design a focused promo-code redemption interaction inside 5Pixels Billing. Avoid a generic tiny form buried in a dashboard. Give the task a simple centered composition with a clearly labelled code input and Apply action. Define empty, typing, validating, success, invalid, expired, already-used, and ineligible states. Financial effects such as credits added, discount duration, or next billing amount must be shown inline after validation rather than only in a toast.

---

# 35. Micro-interaction ledger — Batch 04

## 35.1 Settings toggle

Hover/focus:

- control outline becomes clearer.

On toggle:

- 120–180ms track transition;
- no bounce;
- setting description remains fixed;
- if save is async, show tiny inline status or toast after success.

Privacy changes should not silently fail.

## 35.2 Language dropdown

Open:

- anchor-aligned menu;
- selected item checkmark;
- keyboard searchable only if many languages.

If only a few languages:

- simple menu.

## 35.3 Account deletion disclosure

Expand:

- chevron rotates;
- content reveals inline;
- destructive CTA does not appear before context.

Final deletion:

- modal or dedicated page;
- explicit account identifier / consequences;
- confirmation.

## 35.4 Credit progress bar

Do not continuously animate.

On balance update:

- short width transition;
- exact number updates simultaneously.

## 35.5 Billing empty cards

Hover only if clickable.

Do not make non-clickable empty cards appear interactive.

## 35.6 Usage date selector

Selecting range:

- results update;
- loading skeleton within data region, not entire page.

## 35.7 Promo code

Typing:

- code stays visually stable;
- Apply enables when non-empty.

Success:

- success icon;
- entitlement summary;
- subtle transition.

## 35.8 Search open

- focus input immediately;
- no need to click.

## 35.9 Search result keyboard selection

- up/down updates row;
- selected row scrolls into view;
- Enter activates;
- mouse hover should synchronize active state thoughtfully.

## 35.10 Search clear

- inner X clears query and returns to zero-state;
- focus remains in input.

## 35.11 Search close

- outer X or Escape;
- focus returns to search trigger.

---

# 36. Responsive behavior

## 36.1 Settings rail

Desktop:

- persistent left rail.

Tablet:

- narrower rail;
- icon + text.

Mobile:

- settings index or top select;
- avoid persistent 35% width sidebar.

## 36.2 Billing cards

Desktop:

- one or two-column cards where appropriate.

Mobile:

- single column;
- actions full-width or aligned under text.

## 36.3 Usage metrics

Desktop:

- four tiles in one row.

Tablet:

- two by two.

Mobile:

- two columns or horizontal carousel only if accessible.

## 36.4 Search desktop

Large centered overlay.

## 36.5 Search tablet

Nearly full-width panel.

## 36.6 Search mobile

Full-screen sheet.

Search field sticky at top.

Scope tabs horizontally scrollable.

Rich cards become one-column.

## 36.7 Promo code mobile

Centered input and Apply.

Do not use oversized hero typography that forces wrapping of the entered code.

---

# 37. Accessibility requirements

## Settings

- labels tied to controls;
- descriptions tied with `aria-describedby`;
- toggle state exposed;
- deletion not color-only.

## Billing

- progress meter has accessible text;
- financial values are text;
- cards have semantic headings.

## Usage analytics

- charts require textual summaries;
- date-range selector labelled;
- empty state announced.

## Search

- dialog labelled;
- input automatically focused;
- results use listbox/combobox semantics where appropriate;
- active descendant announced;
- category scope selected state exposed;
- Esc closes;
- close and clear have distinct labels;
- badges not the only sign of plan restriction.

## Promo code

- input has visible label, not placeholder-only;
- validation errors persist inline;
- success change announced.

---

# 38. Product decisions triggered by Batch 04

## Decision 1 — Should 5Pixels have a global command/search palette?

**Recommendation: Strong yes.**

It directly supports the existing Search overlay requirement and can unify preset search, categories, and recent work without bloating global navigation.

## Decision 2 — Should Search include model selection?

**Recommendation: Not under the current product definition.**

Translate the rich model-browser interaction into preset/category browsing. If future strategy explicitly exposes render modes or engines, that should be a deliberate product decision, not inherited from Higgsfield.

## Decision 3 — Should billing show a usage dashboard?

**Recommendation: Yes, but simplify it around credits and transformations.**

Do not expose technical cost accounting.

## Decision 4 — Should 5Pixels have Gifts?

**Recommendation: No V1 requirement.**

Keep as future commercial expansion.

## Decision 5 — Should 5Pixels support promo codes?

**Recommendation: Only if growth/billing strategy requires them.**

If supported, keep inside Billing rather than adding prominent navigation.

## Decision 6 — Should deletion be a visible account option?

**Recommendation: Yes.**

Visible but separated into a danger flow.

## Decision 7 — Should language be in settings?

**Recommendation: Only when more than one language is actually supported.**

## Decision 8 — Should account settings reuse one stable left rail across billing and account routes?

**Recommendation: Yes.**

This batch reinforces that choice.

---

# 39. Cross-batch application architecture after Batch 04

## Global shell

### Top navigation
- 5Pixels mark
- Discover
- Explore
- Library
- Favorites
- Search
- Credits
- Pricing/Upgrade where relevant
- Avatar

### Global overlays
- Search
- Auth
- Upload
- Credit explanation
- Insufficient credits
- Share
- Delete
- Report
- Upgrade
- Quick profile edit

## Discover / Explore
- visual preset discovery
- categories
- curated rails/grid
- status badges
- rich preview cards

## Preset Detail
- large preview
- compatibility
- outcome description
- examples
- cost
- Try this look

## Create
- left configuration rail
- large stage
- controlled fields
- upload/source
- compatibility
- output summary
- Generate with credit cost

## Generation
- focused status
- non-fake progress language
- source + preset context

## Result
- output
- original/result comparison
- save
- download
- regenerate
- adjust
- another preset
- feedback

## Library
- All / Saved / Downloaded
- Search
- Date/Preset filters
- media grid
- ghost-card empty states

## Favorites
- saved presets
- discovery-forward empty state

## Pricing
- plans
- plan finder
- sticky comparison
- accordions
- FAQ
- final CTA

## Account
- stable settings shell
- Profile
- Security
- Privacy
- Notifications
- optional Language

## Billing
- Plan
- Credits
- History
- current balance
- usage
- invoices
- payment methods
- billing information
- optional promo code

---

# 40. What Batch 04 adds to the future designer-prompt sequence

When we eventually generate the full page-by-page designer prompt set, Batch 04 adds these explicit design tasks:

1. Global Search — zero query / All
2. Global Search — typed query
3. Global Search — Presets scope
4. Global Search — Categories scope
5. Global Search — Library scope
6. Global Search — no results
7. Global Search — mobile
8. Account Privacy page
9. Account language row / preferences
10. Account deletion disclosure and final confirmation
11. Billing Plan page
12. Billing Credits page
13. Billing Usage History state
14. Billing empty invoice state
15. Billing payment-method state
16. Billing information editor
17. Promo-code redemption states
18. Low-credit billing state
19. Zero-credit billing state
20. Paid-plan billing state
21. Free-plan billing state

---

# 41. What should NOT be copied from Batch 04

## 41.1 Model-centric Search

Not aligned with preset-first 5Pixels V1.

## 41.2 Unlimited model metrics

Not consumer-relevant to 5Pixels.

## 41.3 Public auto-publish generations

Not aligned with current non-social V1.

## 41.4 Discord promotion inside settings

Could be appropriate later but should not replace direct support UX.

## 41.5 Huge standalone Promo Code route by default

Only worth it if campaigns make promo redemption a frequent user job.

## 41.6 Dollar-saved vanity metric

Use only if defensible and useful.

## 41.7 Too many global Search scopes

5Pixels is intentionally simpler than Higgsfield.

---

# 42. Strong patterns worth adopting almost directly

## 42.1 Search: clear-query X vs close X

Excellent micro-clarity.

## 42.2 Search: zero-state Recents

Direct fit.

## 42.3 Search: rich featured cards + compact list

Strong discovery hierarchy.

## 42.4 Search: keyboard active row

Essential.

## 42.5 Search: category rail + result list

Very strong for Preset scope.

## 42.6 Settings: stable left rail

Strong fit.

## 42.7 Billing: plan card + credit card separation

Strong fit.

## 42.8 Usage: date-filtered summary + history

Strong fit.

## 42.9 Account deletion as a separated disclosure

Strong fit.

## 42.10 Payment/invoice empty states

Strong fit.

---

# 43. Search visual mutation to make it recognizably 5Pixels

5Pixels should not simply clone the Higgsfield search overlay.

Distinctive changes:

## 43.1 Media-first result thumbnails

Higgsfield model rows use icons.

5Pixels preset rows should use real visual thumbnails because images are evidence.

## 43.2 Five-pixel active marker

Selected keyboard row can show a tiny five-square mark on the leading edge.

## 43.3 Warm off-white

Use the existing 5Pixels warm cream text rather than neutral white.

## 43.4 Lime more selectively

Active scope may use dark filled chip + tiny lime indicator rather than a large lime fill.

## 43.5 Featured preset cards

Use before/result poster composition or short muted preview only after deliberate hover/focus.

## 43.6 Categories

Use small image swatches or mini mosaics rather than generic line icons where possible.

---

# 44. Search example content for 5Pixels

## Zero-query

### Recent
- Midnight Premiere
- Studio Founder
- Analog Summer

### Trending
- Flash Interview
- Noir Athlete
- Magazine Cover 02

### Categories
- Portrait
- Cinematic
- Covers
- Retro
- Fantasy

## Query: `night`

### Presets
- Midnight Premiere
- Neon Night
- Night Editorial

### Categories
- Cinematic

### Library
- `Midnight Premiere · Sep 8`
- `Night Editorial · Aug 30`

---

# 45. Billing example content for 5Pixels

## Free

`Free`

`18 credits left`

`Credits do not renew`

Action:

`Upgrade`

## Paid

`Plus`

`248 of 300 credits left`

`Resets Oct 1`

Actions:

`Buy credits`
`Manage plan`

## Usage

`This billing cycle`

- 52 credits used
- 21 transformations
- 4 credits released
- 248 credits remaining

## History row

`Midnight Premiere`
`2 credits`
`Completed`
`Sep 10, 10:32`

Failure:

`Studio Founder`
`2 credits released`
`Generation failed`
`Sep 9, 19:06`

---

# 46. Danger-zone flow

## Step 1

Privacy page row:

`Delete account`

Subcopy.

## Step 2

Dedicated confirmation page or modal:

`Delete your 5Pixels account?`

Explain:

- account access ends;
- billing cancellation behavior;
- generated assets deletion/retention policy;
- source image handling;
- invoices may remain where legally required.

## Step 3

Require:

- password/re-authentication where appropriate;
- typed confirmation only if risk justifies it.

## Step 4

Final destructive button.

Never use lime.

---

# 47. Empty-state consistency across account and billing

Batch 04 reinforces a single family of empty states.

Common structure:

- centered monochrome icon;
- short title;
- one sentence;
- optional utility CTA.

Examples:

### No invoices
`No invoices yet.`

### No credit activity
`Your credit activity will appear here.`

### No payment method
`No payment method saved.`

### No search results
`No matching presets yet.`

Keep illustrations minimal in utility/account surfaces.

---

# 48. Final Batch 04 conclusions

Batch 04 is particularly valuable because it reveals how a mature AI creative product handles the less glamorous but essential parts of the experience.

The clearest lessons are:

1. **The settings shell should be stable and calm.**
2. **Billing should separate current state, usage, and historical records.**
3. **Credit balance belongs in more than one place, but each placement should serve a different job.**
4. **Privacy-affecting toggles need explanatory copy.**
5. **Account deletion should be visible but deliberately separated.**
6. **Promo redemption can be highly focused without becoming complex.**
7. **Global Search can be a major secondary navigation system.**
8. **Zero-query Search should be useful, not blank.**
9. **Search results should support keyboard navigation and semantic grouping.**
10. **5Pixels should translate Higgsfield’s model browser into a visual preset/category browser rather than exposing infrastructure.**
11. **Rich Search cards should remain limited so Search stays fast.**
12. **The five-pixel motif has another strong functional role: selected Search result indicator and credit meter.**

The strongest new product recommendation from this batch is:

> Treat Search as a first-class application surface. It should open instantly from anywhere and let users jump between presets, categories, and their Library while also surfacing recents and a small amount of curated discovery.

The strongest account recommendation is:

> Use one shared Account/Billing settings shell with a stable local rail, then split Plan, Credits, Usage, History, Privacy, and Security into focused pages rather than making one giant settings dashboard.

---

# 49. Next-batch investigation checklist

Future screenshots should be checked specifically for:

- Search no-results behavior;
- Search keyboard hinting;
- Search mobile;
- actual Library/Assets page;
- asset context menus;
- download/share actions;
- notifications panel;
- billing plan-management dialog;
- buy-credits checkout;
- promo-code success/error;
- payment-method editing;
- privacy/deletion confirmations;
- security settings;
- generation-progress pages;
- result page actions;
- retries/refunds;
- failed generation presentation;
- toasts;
- global loading patterns;
- mobile nav;
- admin/preset studio.

