# 5Pixels Main App Design Research
## Higgsfield Reference Study — Batch 03

**Status:** Working research document. This is the third screenshot-study batch and should be read together with `5Pixels_Higgsfield_Reference_Study_Batch_01.md` and `5Pixels_Higgsfield_Reference_Study_Batch_02.md`.

**Scope of this batch:** deeper pricing comparison architecture; progressive feature disclosure; category accordions inside comparison tables; FAQ closure and footer; avatar/account popover; account and credit surfaces; a public/profile-style workspace; empty-state cards; edit-profile modal; account/settings navigation; usage and credit dashboards.

**5Pixels source material governing this translation:**

- `00_README_MASTER_INDEX(1).md`
- `01_PRODUCT_OVERVIEW_AND_PRINCIPLES(1).md`
- `02_UI_UX_BIBLE_AND_DESIGN_SYSTEM(1).md`
- `03_SITEMAP_INFORMATION_ARCHITECTURE(1).md`

**Method:** Every screenshot is analyzed as evidence of hierarchy, interaction grammar, conversion mechanics, state design, density, progressive disclosure, navigation, and component behavior. Patterns are translated into 5Pixels only when they support the product’s preset-first, outcome-first model. Higgsfield concepts that conflict with 5Pixels V1 are explicitly marked as reference-only.

---

# 0. Executive synthesis

Batch 03 reveals two areas that matter a great deal for 5Pixels but were only partially visible in the previous batches:

1. **How a dense pricing system stays navigable after the “hero” pricing cards are gone.**
2. **How the product transitions from creation/discovery into identity, credits, billing, account management, and personal workspace states.**

The strongest lessons are structural rather than cosmetic.

### A. Higgsfield treats comparison complexity as a progressive-disclosure problem

The comparison section is not one enormous spreadsheet. It is layered:

- a persistent plan header;
- billing-period control;
- category headings;
- a few important rows shown immediately;
- `View More` affordances;
- large category accordions;
- per-category expansion;
- then FAQ;
- then one final conversion CTA.

This is a much better model for 5Pixels than a traditional 40-row SaaS comparison table.

### B. The account avatar is not merely navigation

The account popover is a compact dashboard. Before showing navigation links, it answers:

- Who am I?
- What plan am I on?
- How many credits do I have left?
- What is the obvious upgrade/top-up action?

That is excellent product economics UX.

For 5Pixels, the account dropdown should likely become a **credit-aware utility hub**, not a plain list of account links.

### C. Higgsfield separates a public/creative identity surface from a private account-management surface

The screenshots expose two clearly different concepts:

- a profile/work page focused on projects, posts, generations, publishing, and public metrics;
- a private account/settings area focused on credits, subscription, usage, promo codes, help, and account data.

5Pixels should preserve the **separation principle**, but not the literal social-profile feature set.

The current 5Pixels V1 explicitly does not need a public social network, creator marketplace, follower graph, public blogs, or creator storefront. Therefore:

- the **private account/settings architecture is directly useful**;
- the **public creator-profile architecture is mostly reference-only**;
- its grid, tab, search, and empty-state patterns can still be repurposed for the private Library.

### D. The profile editor demonstrates a strong modal pattern

The `Edit profile` modal shows:

- dimmed context, not a full navigation departure;
- fixed title/close header;
- scrollable form body;
- sticky action footer;
- generous field height;
- large biography field with live count;
- platform-prefixed social fields;
- a small settings toggle section.

This is a strong pattern for **small-to-medium account edits**, while more consequential settings should remain dedicated pages.

### E. The private account page exposes a useful local-navigation model

Higgsfield introduces a left-side settings rail containing grouped account destinations and a bottom help card. This is a good fit for 5Pixels’ existing account/billing sub-routes.

The most promising 5Pixels translation is:

- **Profile**
- **Security**
- **Privacy**
- **Notifications**
- divider
- **Plan**
- **Credits**
- **Billing history**
- optional **Promo / gift code**
- bottom **Help**
- bottom **Sign out**

### F. Empty states are designed as part of the page, not as error messages

The profile/workspace screenshots use large “ghost” cards behind centered empty-state messaging. The absence of content still preserves the intended future layout.

This is very applicable to:

- `/app/library`
- `/app/favorites`
- a new-user `/app`
- result-history sections
- saved/downloaded filters with no results.

### G. Batch 03 suggests a useful 5Pixels design-system refinement

Higgsfield frequently uses **lime for transformational/commercial actions** but uses **white or neutral buttons for utility actions** such as `Save`, `Account settings`, and `Top-up` in some contexts.

5Pixels currently defines lime as the primary action signal. A useful refinement to consider is:

- **Brand Primary:** lime — Generate, Try this look, Upgrade, Choose plan.
- **Utility Primary:** warm cream / off-white — Save account changes, Confirm neutral edits, Top up, Continue.
- **Secondary:** dark surface + subtle border.
- **Destructive:** error styling.

This is not a required change, but it could prevent lime from becoming visually exhausted across administrative surfaces.

---

# 1. Continuity with Batch 01 and Batch 02

Batch 01 established:

- the dark-gallery shell;
- the top navigation;
- model/preset selector anatomy;
- status badges;
- searchable menus;
- floating generation-console concepts;
- aspect, quality, resolution, and quantity controls;
- masonry preset discovery;
- hover-generated CTAs.

Batch 02 established:

- Viral Presets continuation;
- the two-plane create layout;
- preset/tool rail + visual stage;
- upload onboarding;
- compact parameter cards;
- nested control popovers;
- cost-aware Generate button;
- guided pricing cards;
- interactive plan recommendation;
- initial comparison table;
- FAQ beginning.

Batch 03 now extends that into:

- comparison-table information architecture;
- collapsed/expanded feature categories;
- comparison depth without overwhelming the page;
- FAQ completion;
- global page closure;
- account-menu economics;
- profile/workspace shell;
- edit-profile modal;
- private account settings;
- credit and usage dashboard.

Together, the three batches now cover a meaningful portion of the 5Pixels product shell:

`Discover → Preset → Create → Generate → Result/History → Pricing → Account/Billing`

The largest gaps still remaining are likely:

- full result-detail behavior;
- generation-in-progress states;
- asset/library actions;
- search palette behavior;
- notifications;
- billing checkout;
- account security/privacy details;
- mobile behavior;
- admin tooling;
- failure/error modals.

---

# 2. Batch 03 screenshot inventory

| Ref | Screenshot | Main surface | Primary relevance to 5Pixels |
|---|---|---|---|
| S21 | `10.15.54 AM` | Pricing comparison — Image category | Hierarchical comparison rows, plan header persistence, `View More` |
| S22 | `10.16.03 AM` | Comparison categories collapsed | Large category accordions, progressive disclosure, close control |
| S23 | `10.16.10 AM` | Lipsync category expanded | Accordion expansion behavior, nested table, per-category details |
| S24 | `10.16.20 AM` | FAQ tail + final CTA + footer | Long-page closure, conversion CTA, legal/help footer |
| S25 | `10.16.36 AM` | Avatar/account menu over pricing | Credit-aware account popover, upgrade path, utility navigation |
| S26 | `10.17.25 AM` | Public/profile workspace top | Local profile rail, content tabs, search, create/publish, empty states |
| S27 | `10.17.28 AM` | Public/profile workspace continuation | Empty-state grammar for Blogs/Generations |
| S28 | `10.17.51 AM` | Edit profile modal — upper section | Modal shell, profile picture editing, form hierarchy |
| S29 | `10.17.58 AM` | Edit profile modal — lower section | Long-form modal scrolling, socials, toggle, sticky actions |
| S30 | `10.18.14 AM` | Manage account / Personal profile | Local settings nav, credit card, usage chart, help card, empty history |

---

# 3. S21 — Pricing comparison: Image category

## 3.1 Surface anatomy

The screenshot shows the pricing comparison in a scrolled state.

A plan header remains visible across the top:

- **Free**
- **Basic**
- **Pro**
- **Max**

Each plan column contains:

- plan name;
- plan price;
- annual billing qualifier;
- a `Get Plan` CTA where relevant.

`Max` receives additional emphasis through:

- a `BEST VALUE` badge;
- the only bright lime CTA in the visible header row.

A billing toggle appears at the far left:

- `Annual`
- `30% OFF`
- switch control.

Immediately below the plan header, the page transitions into a category titled **Image**.

## 3.2 Important hierarchy detail

The plan header and feature content are visually distinct.

The plan header behaves almost like the header row of a comparison table, but the entire page does not look like a conventional spreadsheet.

There is:

- no heavy cell boxing;
- no vertical rules between every column;
- only subtle separators;
- substantial horizontal whitespace.

This keeps the comparison readable without making it feel enterprise-software-heavy.

## 3.3 Image category structure

The category begins with:

- section heading: `Image`;
- `Concurrent Jobs` row;
- then individual capability/model rows.

Each row uses:

1. left feature/model label;
2. small secondary cost metadata below;
3. four plan-value columns;
4. subtle bottom divider.

Values include:

- checkmark;
- X;
- numeric generation allotment.

This is a useful semantic pattern because the row supports both boolean and quantitative entitlements.

## 3.4 `View More` as anti-fatigue control

Only a subset of rows is initially visible.

A low-emphasis `View More` row follows.

This suggests Higgsfield intentionally limits initial comparison density even after the user has already chosen to compare plans.

That is important.

Most pricing pages make the user pay a readability penalty for wanting detail.

Higgsfield instead offers detail in layers.

## 3.5 Plan emphasis is selective

The page does not flood every premium column with branded color.

The stronger plan is highlighted by:

- badge;
- button treatment;
- pricing/card treatment elsewhere.

The comparison rows themselves remain mostly neutral.

This is a good discipline for 5Pixels.

## 3.6 Likely sticky behavior

Because the plan header remains visible while the screenshot is deep within the feature matrix, it appears designed to remain contextually available during scrolling, whether literally sticky or positioned in a way that preserves plan-column context.

**5Pixels should strongly consider a sticky comparison header on desktop.**

Without it, users lose track of which column is which on long comparisons.

## 3.7 5Pixels translation

Do **not** copy the model rows.

Instead, a 5Pixels comparison category could be:

### `Transformations`

Rows:

- Monthly included credits
- Typical transformations per month
- Top-up credits
- Failed-generation credit protection
- Concurrent generations, only if product policy supports it

### `Output & Quality`

Rows:

- Standard export size
- High-resolution export
- Exact-text composition presets
- Watermark status, if relevant
- Priority rendering, if relevant

### `Presets & Access`

Rows:

- Core preset catalog
- Premium collections
- New preset access
- Limited seasonal collections
- Favorite/saved preset capacity only if constrained

### `Library & History`

Rows:

- Generation history
- Saved results
- Download history
- Retention window, if product policy has one

### `Support & Rights`

Rows:

- Standard support
- Priority support
- Commercial-use eligibility, only if legally defined

## 3.8 What not to import

Do not import:

- raw vendor/model names;
- "X images from model Y";
- technical inference costs;
- concurrency language unless users truly need it;
- resolution tiers simply because Higgsfield has them.

Every row must describe a consumer-visible product difference.

---

# 4. S22 — Collapsed comparison categories

## 4.1 What changes from S21

Below the initial comparison rows, Higgsfield moves into large category blocks:

- `Lipsync Studio`
- `Character`
- `Credits & Usage`
- `Access & Features`

Each appears as a full-width rounded accordion row with:

- category icon;
- category name;
- chevron at far right.

The comparison is therefore not one endless set of exposed rows.

## 4.2 Card-like accordion treatment

The accordion rows are visually substantial:

- approximately card height rather than text-link height;
- dark raised surface;
- thin low-contrast border;
- large left padding;
- icon separated from heading;
- chevron aligned to the far right.

This makes the categories scannable even in a very long pricing page.

## 4.3 Interaction hierarchy

The sequence is roughly:

1. inspect headline pricing;
2. inspect prominent core features;
3. inspect a few important comparison rows;
4. expand specific categories only if relevant;
5. close feature section when done;
6. proceed to FAQ.

That is excellent progressive disclosure.

## 4.4 `Close Features`

At the bottom is a secondary `Close Features` button.

This likely lets the user collapse or exit the expanded feature-comparison region.

The wording is not especially elegant, but the concept is useful: **large optional detail areas should provide an explicit way to return to summary mode.**

## 4.5 5Pixels translation

Potential 5Pixels pricing accordions:

- `Credits & transformations`
- `Preset access`
- `Output quality`
- `Library & history`
- `Speed & priority`
- `Billing & top-ups`
- `Support & usage rights`

For a smaller V1, five categories is likely enough.

## 4.6 Better 5Pixels label than `Close Features`

Possible alternatives:

- `Hide comparison`
- `Show fewer details`
- `Back to plan summary`

`Show fewer details` is likely the clearest.

---

# 5. S23 — Expanded comparison accordion

## 5.1 Expansion behavior

The `Lipsync Studio` category has been expanded.

The accordion row does not spawn a floating element.

Instead, the card itself grows vertically and reveals:

- a repeated comparison row header structure;
- feature rows;
- quantitative plan values;
- `View More`.

The chevron flips upward.

This is a stable, spatially predictable interaction.

## 5.2 Why this is better than nested modals

Pricing comparison is context-heavy.

Opening a modal would remove the user from the plan columns.

Inline expansion keeps:

- plan context;
- category context;
- scroll position;
- comparison continuity.

5Pixels should use inline expansion for comparison depth.

## 5.3 Inside-card spacing

The category header remains visually separate from the table beneath it.

The interior uses:

- generous top padding;
- label row;
- thin separators;
- left feature labels;
- plan values aligned in consistent columns.

The card itself becomes the containment boundary.

This is especially useful when multiple categories have different row counts.

## 5.4 Multiple levels of progressive disclosure

There are at least two levels:

- category collapsed vs expanded;
- `View More` within the expanded category.

This gives three possible information densities:

1. category title only;
2. category + important rows;
3. category + complete rows.

That is a sophisticated pattern worth carrying into 5Pixels.

## 5.5 5Pixels recommendation

Use two levels only where genuinely needed.

Example:

### `Credits & transformations`
Initially show:

- Monthly credits
- Credit top-ups
- Failed-generation protection

`View more` could reveal:

- rollover policy
- expiration policy
- plan-specific credit pool rules
- overage/top-up pricing behavior

Avoid hiding critical cost information.

Anything affecting actual charges should be visible or one click away with clear labeling.

---

# 6. S24 — FAQ tail, final CTA, footer

## 6.1 FAQ reading width

The FAQ column is much narrower than the full pricing comparison.

This is a good typography decision.

Comparison needs width.

FAQ content needs comfortable reading measure.

Higgsfield changes page width according to content type instead of forcing one max-width across everything.

5Pixels should do the same.

## 6.2 FAQ card pattern

Each FAQ question appears as a dark rounded row with:

- bold question text;
- right-aligned chevron;
- generous vertical padding;
- subtle border.

Questions visible include topics around:

- automatic renewal;
- generation quantities;
- extra credit purchasing;
- unlimited behavior;
- promotion terms;
- subscription changes;
- product-specific cost.

The implication is that FAQ questions are selected to remove **purchase anxiety**, not simply to fill space.

## 6.3 Final conversion closure

After the FAQ:

`Are you ready?` + bright `Choose your plan` button.

This is a small but effective conversion closure.

The user does not reach the bottom of a long pricing page and encounter only legal links.

## 6.4 Footer

Footer is visually quiet.

Left:

- copyright.

Right:

- language selector;
- Help center;
- Cookie Notice;
- Cookie Settings;
- Terms;
- Privacy.

The footer uses no large marketing block.

The final CTA immediately above it carries the conversion job.

## 6.5 5Pixels pricing FAQ priorities

The most useful 5Pixels FAQ topics are likely:

- How do credits work?
- What happens if a generation fails?
- Do unused credits roll over?
- Can I buy additional credits?
- Can I change or cancel my plan?
- When does my subscription renew?
- Are my uploaded photos private?
- How long are my images stored?
- What counts as one transformation?
- Can I use results commercially?
- Are premium presets included in every plan?
- How are refunds or released credits handled after a failed job?

## 6.6 Required billing clarity

Because 5Pixels has a credit system, failure behavior should not be buried only in FAQ.

The interface should clearly communicate that unsuccessful system-side generations are not treated as successful billable outcomes according to the product policy.

The FAQ should reinforce, not introduce, that principle.

---

# 7. S25 — Avatar/account popover

This is one of the most valuable screenshots in the batch.

## 7.1 Trigger placement

The menu opens from the circular avatar at the extreme top-right of the global navigation.

The popover is:

- right-aligned to the trigger;
- substantial in width;
- rounded;
- dark elevated surface;
- visually separated from the page by contrast rather than an exaggerated shadow.

## 7.2 Header identity block

Top section shows:

- avatar;
- username;
- current plan label.

This immediately anchors account context.

## 7.3 Credits are elevated above navigation links

The next block is a dedicated **Credits** card.

It includes:

- `Credits` label;
- info icon;
- remaining balance aligned right;
- chevron;
- segmented/dotted visual meter.

This is not hidden under Billing.

Credits are treated as a first-class operating resource.

That is highly relevant to 5Pixels.

## 7.4 Upgrade row inside the credit area

Below the credit meter is a row with:

- crown icon;
- `Go Premium`;
- lime `Upgrade` CTA.

This places monetization exactly where the user is thinking about usage capacity.

It is contextual rather than intrusive.

## 7.5 Navigation list

Below the economic summary:

- View profile
- Manage Account
- Affiliate program
- Join Community
- Language

Then divider.

Then:

- Sign Out

Icons are muted and consistent.

`Affiliate program` has a small `New` badge.

`Language` shows current value and a chevron.

## 7.6 Why the menu works

The menu answers three different user intents in a deliberate order:

1. **Account state** — who am I / what plan?
2. **Consumption state** — how many credits?
3. **Navigation** — where do I go?

Most apps begin at step 3.

Higgsfield’s ordering is stronger for a credit-based product.

## 7.7 5Pixels account-popover proposal

### Header

- 5Pixels avatar or initial
- Display name / email
- Plan badge: `Free`, `Plus`, etc.

### Credit block

- `Credits`
- exact balance
- small info icon explaining credits
- compact visual meter

### Primary economic action

If low balance:

- `Buy credits`

If free/lower plan:

- `Upgrade`

If paid and healthy:

- `Manage plan`

### Navigation

- Account
- Billing
- Library
- Favorites, only if not already immediately accessible in nav
- Help
- Language, if localization is available

Divider:

- Sign out

## 7.8 5Pixels-specific visual mutation

Do not copy Higgsfield’s long row of circular lime dots one-for-one.

Use the **five-pixel brand motif**.

Possible implementation:

- five tiny square clusters representing credit-pool bands;
- each cluster fills progressively;
- exact credit count remains textual;
- the visual meter is supplementary, never the only source of information.

This makes the component recognizably 5Pixels.

## 7.9 Low-credit state

When credits fall below a meaningful threshold:

- meter shifts to warning treatment;
- exact balance remains;
- `Top up` / `Buy credits` becomes primary within the menu;
- do not create alarmist motion;
- do not show a modal merely because the menu opened.

## 7.10 Zero-credit state

At zero:

- `0 credits left`
- short line: `Add credits to generate`
- primary `Buy credits`
- secondary `View plans`

The user should still be allowed to browse, favorite, review library items, and inspect presets.

---

# 8. S26 — Profile/workspace shell

## 8.1 Two-column shell

The page uses:

- a fixed-width left identity rail;
- a large content workspace.

The global top navigation remains above.

This creates three hierarchy layers:

1. global product nav;
2. local identity rail;
3. local content tabs.

## 8.2 Left profile rail

Contains:

- avatar;
- display name;
- handle;
- view count;
- like count;
- `Preview` button;
- follower/following counters near bottom;
- large `Account settings` button.

This rail is optimized for a public creator identity.

## 8.3 Main content tabs

Top local tabs:

- All works
- Projects
- Blogs
- Generations

Active tab:

- bright text;
- underline.

The tab style is simple and compact.

## 8.4 Right-side workspace actions

Top-right:

- Search
- Publish
- bright `Create` button with dropdown chevron.

This creates a familiar creator-tool triad:

- find;
- publish;
- create.

## 8.5 Empty Projects section

The section still renders four dark placeholder cards.

The center area overlays:

- `Ready to show your projects?`
- secondary explanatory text;
- `Create project`.

This is important.

The empty state shows the **shape of the future content**.

Users understand what the page will become.

## 8.6 Empty Blogs section

Same composition:

- ghost-card row;
- centered message;
- `Create blog`.

The page uses one empty-state grammar consistently across content types.

## 8.7 Direct applicability to 5Pixels

The public profile itself is **not a V1 requirement**.

But its local-tab and empty-state grammar is highly applicable to `/app/library`.

### Proposed 5Pixels Library tabs

- All
- Saved
- Downloaded

Then secondary filter controls for:

- Date
- Preset

This maps more naturally to the existing library IA than a separate complex filter panel.

## 8.8 5Pixels Library empty state inspired by this

Instead of a blank icon and one sentence only:

- render 3–4 muted ghost media cards;
- overlay a centered empty-state card or message;
- use the five-pixel motif subtly;
- CTA: `Explore presets`.

For a filtered empty state:

- keep actual library shell;
- message: `Nothing saved here yet.`
- CTA: `Browse presets` or `Clear filters`.

## 8.9 What not to adopt in V1

Do not add simply because Higgsfield has them:

- public follower counts;
- public likes;
- profile views;
- public creator projects;
- public blogs;
- publishing workflow;
- social feed behavior.

These would expand 5Pixels into a social network/product marketplace before its core transformation loop is proven.

---

# 9. S27 — Profile continuation: Blogs and Generations

## 9.1 Repetition is intentional

The Blogs and Generations sections use the same structural pattern:

- section title;
- 3–4 ghost cards;
- centered headline;
- explanatory copy;
- single CTA.

Consistency reduces the design cost of multiple empty content types.

## 9.2 Generation empty state

`Ready to show your work?`

CTA:

`Publish generations`

Again, this is social-publication behavior and should not be copied literally into 5Pixels V1.

## 9.3 5Pixels translation

The same empty-state component can power:

### Library empty

`Your transformations will appear here.`

CTA:

`Explore presets`

### Saved filter empty

`Nothing saved yet.`

CTA:

`View your results`

### Downloaded filter empty

`Downloads you prepare will be easy to find here.`

CTA:

`View library`

### Favorites empty

`Save looks you want to try later.`

CTA:

`Explore presets`

### Recent work empty on `/app`

`Start with a look you love.`

CTA:

`Browse presets`

## 9.4 Ghost cards should not imply loading

Important distinction:

If ghost cards are decorative empty-state scaffolding, they must not look identical to skeleton loaders.

Use:

- stable dark surfaces;
- no shimmer;
- no animation;
- slightly more deliberate composition.

Skeleton loaders should use separate loading semantics.

---

# 10. S28 — Edit profile modal: upper section

## 10.1 Modal shell

The page behind is strongly dimmed.

The modal is centered and medium-width.

The container has:

- large rounded corners;
- dark elevated fill;
- subtle border;
- strong internal contrast.

## 10.2 Header

Fixed-looking top bar:

- `Edit profile` title;
- close `X` top-right;
- thin separator below.

The title is concise.

There is no subtitle.

## 10.3 Profile picture control

The avatar is shown with a small `+` button overlapping its bottom-right edge.

This is an excellent visual affordance.

No extra `Change photo` button is necessary.

The relationship is obvious.

## 10.4 Form field hierarchy

Visible fields:

- Name
- Username
- Headline
- Bio
- Location

Each field uses:

- label above;
- full-width rounded input;
- generous height;
- muted placeholder;
- strong fill distinction from modal background.

## 10.5 Supporting copy

Under Headline:

`Examples: Film Director, Film Creator`

This is a small but important pattern.

Examples reduce ambiguity without becoming permanent UI clutter inside the field.

## 10.6 Bio field

The biography field is much taller.

Character count appears at lower-right:

`0 / 300`

This gives users a clear constraint without making it a validation error.

## 10.7 Action footer

Bottom actions remain visible:

- Cancel
- Save

`Save` is white/high-contrast rather than lime.

This indicates Higgsfield is distinguishing **utility commit actions** from its high-intent branded commercial/creative CTAs.

## 10.8 5Pixels applicability

For `/app/account/profile`, a quick `Edit` action can open a modal if the edit set is modest.

Potential fields:

- profile photo;
- display name;
- optional public-facing name if public sharing ever exists;
- locale;
- maybe no biography at all in V1.

Do not add fields merely to fill the modal.

## 10.9 Modal vs dedicated page

Because 5Pixels already has a dedicated `/app/account/profile` route, the route should remain the canonical profile settings surface.

The modal can exist as:

- a shortcut from account overview;
- a shortcut from avatar menu;
- a quick-edit layer.

For security, privacy, deletion, and billing changes, use dedicated pages rather than this modal.

---

# 11. S29 — Edit profile modal: lower section

## 11.1 Long-form modal behavior

The screenshot shows the lower portion of the same modal.

The header remains visible.

The footer actions remain visible.

The body has scrolled.

This strongly suggests:

- sticky header;
- scrollable body;
- sticky footer.

This is the correct architecture for forms that might exceed viewport height.

## 11.2 Social fields

Fields are prefixed visually by platform icons and URL stems:

- X
- Instagram
- YouTube
- TikTok

The prefix clarifies expected input format.

## 11.3 Additional settings

A separated section:

`Additional settings`

Contains a full-width setting row:

`Show spent credits on profile`

with toggle at far right.

This shows how optional boolean preferences can be integrated without turning the modal into a settings matrix.

## 11.4 Toggle-row pattern

Strong anatomy:

- whole row acts as container;
- label left;
- switch right;
- enough vertical height for touch;
- no explanatory overload.

5Pixels can reuse this pattern for small account preferences.

## 11.5 Useful 5Pixels profile-modal settings

Only if product needs them:

- `Use my uploaded avatar across the app`
- `Show generation tips`
- `Email me when a generation finishes` — though notifications may be better on dedicated Notifications page
- locale preference

Avoid putting privacy-critical retention controls in a quick modal.

## 11.6 Utility button strategy

The footer again reinforces:

- neutral `Cancel`;
- high-contrast `Save`.

Potential 5Pixels decision:

Use **warm cream** for utility save actions and reserve vivid lime for generative/commercial actions.

This would need to become an explicit design-system rule if adopted.

---

# 12. S30 — Manage account / Personal profile

This is the other major screenshot in Batch 03.

## 12.1 Overall layout

The page uses:

- left local settings rail;
- large main settings canvas;
- global dark shell.

The local rail is approximately one-quarter of page width.

Main content is centered with a controlled maximum width rather than stretching edge-to-edge.

This makes administrative content feel calm.

## 12.2 Local settings rail

Visible destinations:

- Personal profile
- Gifts
- Subscription
- Usage
- Promocode

Each has an icon.

The active row uses a rounded highlighted background.

Icons have more color variation than the rest of the page.

At the bottom:

- help card;
- sign-out action.

## 12.3 Help card

The help card is docked near the lower portion of the rail.

Contains:

- question-mark icon;
- `Need help?`;
- short explanation;
- `Go to Help Center` button.

This is excellent placement.

Account/billing surfaces generate support questions.

Help should be available where confusion occurs.

## 12.4 Main identity header

Top shows:

- avatar;
- name;
- email;
- small `Edit` button.

It gives context without turning the account page into a giant profile hero.

## 12.5 Credits card

First major card:

- label `Credits`;
- large exact balance;
- subtle subtext indicating pool status;
- `Top-up` button aligned to right.

This is compact and legible.

## 12.6 Usage-history card

Adjacent card:

- `Usage history`;
- `See all` link;
- very lightweight chart/timeline;
- date labels.

The chart is subdued.

It supports awareness without making the page feel financial-dashboard-heavy.

## 12.7 Lower history card

A large `Collab karma history` card contains:

- three compact summary metrics;
- a large empty state.

This is product-specific to Higgsfield.

But the structure is useful.

## 12.8 5Pixels private account translation

The strongest translation is to split responsibilities according to the existing 5Pixels IA.

### `/app/account`

Local rail:

- Profile
- Security
- Privacy
- Notifications

Main overview can show:

- identity summary;
- account status;
- shortcut cards;
- privacy status;
- recent account events if useful.

### `/app/billing`

Local rail or sibling group:

- Plan
- Credits
- History

Main overview can show:

- credit balance;
- current plan;
- next renewal date;
- credit usage trend;
- top-up;
- invoices/payment history.

## 12.9 Avoid duplicating IA

Do not let the Higgsfield rail cause 5Pixels to duplicate:

- Library;
- Favorites;
- Discover;
- Explore.

Those remain main-app navigation.

The settings rail is only for settings/account/billing.

## 12.10 Proposed 5Pixels account/billing local navigation

A single combined left rail could be:

### ACCOUNT
- Profile
- Security
- Privacy
- Notifications

### BILLING
- Plan
- Credits
- History

### SUPPORT
- Help center

Bottom:

- Sign out

This is cleaner than creating a separate left rail for every sub-route.

## 12.11 Credit overview card for 5Pixels

Card anatomy:

**Credits**

`248 credits left`

Subcopy:

`Resets on Oct 1` or `Purchased credits do not expire`, depending on actual policy.

Actions:

- `Buy credits`
- secondary `View usage`

If current plan includes monthly credits:

- small indicator of included vs purchased pool only if the distinction materially matters.

Avoid exposing accounting complexity unless necessary.

## 12.12 Usage chart

A useful 5Pixels chart should answer:

- Am I using my plan?
- Am I likely to run out before renewal?

Possible data:

- credits used by day/week;
- transformations completed;
- failed/refunded credits excluded or marked separately.

Do not turn it into a technical generation analytics dashboard for consumers.

---

# 13. Pattern library extracted from Batch 03

## 13.1 Sticky comparison header

**Use for:** `/pricing`

Contains:

- plan names;
- prices;
- billing state;
- plan CTAs.

Behavior:

- desktop sticky while comparison rows scroll;
- subtle backdrop or elevated fill when sticky;
- preserve column alignment exactly;
- mobile transforms into plan selector rather than impossible four-column table.

## 13.2 Comparison category accordion

**Anatomy:**

- icon;
- title;
- chevron;
- expanded table;
- optional `View more`.

States:

- collapsed;
- hover/focus;
- expanded;
- nested expanded-all.

## 13.3 Category `View More`

Use when:

- category has secondary/rarely decisive features.

Do not use to hide:

- charges;
- renewal terms;
- core credit quantities;
- failure/refund behavior.

## 13.4 Pricing final CTA

Small centered closure:

- short prompt;
- primary action.

5Pixels copy direction:

`Found your fit?`
`Choose your plan`

or:

`Ready to create?`
`Choose a plan`

## 13.5 Account popover

**Sections:**

1. identity;
2. plan;
3. credit balance;
4. economic CTA;
5. account navigation;
6. language/help;
7. sign out.

## 13.6 Credit meter

Must combine:

- exact numerical balance;
- visual status;
- accessible label.

5Pixels-specific meter should use the five-pixel motif rather than copying Higgsfield’s dotted line.

## 13.7 Settings rail

Use on:

- Account;
- Billing.

Do not use on:

- discovery;
- create;
- result;
- preset detail.

## 13.8 Help card

Persistent on desktop settings rail.

Mobile:

- collapses into `Need help?` row near bottom of settings page;
- or appears in overflow/account menu.

## 13.9 Ghost-card empty state

Use to preview future layout while empty.

Must not animate like loading skeletons.

## 13.10 Edit modal

Anatomy:

- scrim;
- modal shell;
- sticky header;
- scroll body;
- sticky footer;
- Cancel;
- Save.

---

# 14. 5Pixels pricing page — refined architecture after Batches 02 + 03

The screenshots now reveal enough to define a likely pricing-page information hierarchy.

## 14.1 Section 1 — Pricing hero

- concise pricing headline;
- monthly/annual control;
- discount badge if real;
- plan cards;
- one visually recommended plan;
- credits/month;
- approximate transformations/month only if framed carefully and preset costs vary.

## 14.2 Section 2 — Plan finder

Borrow from Batch 02.

Ask:

1. What do you mostly create?
2. Roughly how often?
3. Do you care more about volume, quality, or flexibility?

Show:

- recommended plan;
- estimated credit usage;
- headroom;
- short reason.

## 14.3 Section 3 — Comparison

Sticky plan header.

Expanded by default:

- Credits & transformations
- Preset access

Collapsed by default:

- Output & quality
- Library & history
- Support & rights

This avoids making the initial comparison look intimidating.

## 14.4 Section 4 — FAQ

Narrow reading width.

Focus on:

- credits;
- failures;
- privacy;
- billing;
- cancellation;
- top-ups;
- commercial use;
- storage/retention.

## 14.5 Section 5 — Final CTA

Short conversion closure.

## 14.6 Footer

- Help
- Terms
- Privacy
- Cookies
- Content policy
- License
- language only if localization exists.

---

# 15. 5Pixels account menu — detailed proposal

The account menu should be designed as a compact operational dashboard.

## 15.1 Default state

Top:

- avatar;
- display name;
- current plan.

Credits card:

- exact balance;
- five-pixel segmented meter;
- optional renewal/reset date;
- info icon.

Action row:

- `Buy credits`
- or `Upgrade`

Navigation:

- Account
- Billing
- Help

Optional:

- Language

Divider:

- Sign out.

## 15.2 Free-plan state

Show:

- `Free plan`
- current credits
- `Upgrade` in lime.

## 15.3 Paid-plan state

Show:

- plan name
- renewal date if useful
- `Manage plan`.

## 15.4 Low-credit state

Use warning accent sparingly.

Copy:

`18 credits left`

Action:

`Buy credits`

No forced upsell modal merely on opening menu.

## 15.5 In-flight generation state

Potential enhancement:

If a generation is running, the account popover could include a tiny non-intrusive status row:

`1 transformation in progress`

Click routes to generation page/history.

This should only be added if it simplifies returning to active work.

---

# 16. 5Pixels Library — patterns borrowed from Higgsfield profile without social features

## 16.1 Header

Title:

`Library`

Top controls:

- Search
- filter
- maybe `Explore presets` secondary action.

## 16.2 Tabs

- All
- Saved
- Downloaded

Optional future:

- Favorites belongs elsewhere because it stores presets, not generated assets.

## 16.3 Filters

Secondary row or popover:

- Date
- Preset
- aspect ratio if genuinely useful

## 16.4 Card grid

Media-first.

Card hover/focus can reveal:

- Download
- Save/unsave
- Open
- More actions

Do not expose provider/model metadata.

## 16.5 Empty state

Use 3–4 ghost cards.

Centered content:

`Your transformations will appear here.`

CTA:

`Explore presets`

## 16.6 Filtered empty state

Do not show onboarding copy again.

Use:

`No results match these filters.`

Actions:

- `Clear filters`
- optional `Explore presets`.

---

# 17. Public profile patterns — future-only reference

The profile screenshots are strong, but they should not pull 5Pixels off course.

## 17.1 Do not add to V1

- follower graph;
- likes/views;
- public blogs;
- public creator publishing;
- project storefronts;
- public generation feed;
- social comments;
- creator profile search.

## 17.2 Keep as future reference for

If 5Pixels later adds public sharing:

- profile left rail;
- published-results tab;
- public collection tabs;
- profile preview;
- draft vs published separation;
- empty-state grid;
- creator bio editing.

## 17.3 Protect the core thesis

Any future social feature should remain downstream of:

`Discover preset → transform → love result → optionally share`

It should never replace the core visual-shopping loop.

---

# 18. Modal and overlay implications

Batch 03 gives one high-quality modal example.

## 18.1 Small profile edit modal

Use for:

- avatar;
- display name;
- lightweight metadata.

## 18.2 Credit explanation modal

Can reuse same shell but shorter.

Content:

- what credits are;
- exact cost where relevant;
- failed-generation protection;
- link to Billing.

## 18.3 Insufficient credits modal

Do not use a giant marketing page inside a modal.

Structure:

- concise title;
- current balance;
- required balance;
- `Buy credits`;
- `View plans`;
- Cancel.

## 18.4 Delete confirmation

Much smaller shell.

Do not reuse long-form modal dimensions.

## 18.5 Mobile

Long-form modal becomes full-height bottom sheet or full-screen sheet.

Sticky header and footer remain.

---

# 19. Micro-interaction ledger

## 19.1 Pricing accordions

On expand:

- chevron rotates 180°;
- body expands 180–240ms;
- no overshoot;
- border/surface may become slightly brighter;
- scroll position should remain stable.

## 19.2 `View More`

On click:

- reveal rows inline;
- label changes to `View less`;
- preserve category context.

## 19.3 Sticky plan header

When it becomes sticky:

- add subtle background opacity;
- optional one-pixel bottom border;
- avoid dramatic shadow.

## 19.4 Account popover

Open:

- 120–180ms opacity + slight translate;
- anchor to avatar;
- focus moves into menu for keyboard users.

Close:

- outside click;
- Escape;
- route selection;
- focus returns to trigger where appropriate.

## 19.5 Credit meter

No continuous animation.

When credits update after generation:

- number transitions quickly;
- optional one-time pulse of changed segment;
- no confetti.

## 19.6 Empty-state CTA

Hover:

- dark/cream surface gains subtle elevation;
- lime text or lime primary depending context.

## 19.7 Edit modal

Open:

- scrim fades;
- modal scales from ~0.98 to 1;
- autofocus only if it does not create disruptive mobile keyboard behavior.

## 19.8 Save state

Button:

- `Save`
- then compact spinner + `Saving`
- return to `Save`
- toast: `Profile updated`.

Critical errors remain inline near relevant field.

---

# 20. Responsive behavior inferred and recommended

## 20.1 Pricing comparison desktop

Keep 4-plan columns.

Sticky plan header.

## 20.2 Pricing comparison tablet

Possible:

- horizontally scrollable comparison body with frozen feature column;
- plan header scrolls in sync.

Avoid shrinking text too far.

## 20.3 Pricing comparison mobile

Do **not** render four tiny plan columns.

Better pattern:

- plan picker at top: `Free / Basic / Pro / Max`;
- compare selected plan against current/another plan;
- category accordions;
- each row displays selected plan value.

Alternative:

- horizontally swipeable plan cards with one active column.

## 20.4 Account popover mobile

Instead of tiny floating menu:

- bottom sheet or full-width anchored sheet;
- retain credits block at top.

## 20.5 Settings desktop

Left rail + content canvas.

## 20.6 Settings mobile

Left rail becomes:

- top back link;
- page title;
- settings category selector;
- stacked routes.

Help card moves to page bottom.

## 20.7 Edit profile mobile

Full-screen sheet:

- sticky header;
- body;
- sticky footer;
- 16px minimum body padding;
- fields full width.

---

# 21. Accessibility notes from this batch

## 21.1 Accordions

Each accordion trigger must expose:

- expanded/collapsed state;
- clear label;
- keyboard activation.

## 21.2 Comparison table

Use real semantic table relationships where feasible.

If custom responsive layouts are used, preserve:

- plan header association;
- feature label association;
- screen-reader reading order.

## 21.3 Credit meter

Never communicate remaining credits only through filled pixels/dots.

Always show exact text.

## 21.4 Popovers

- trap focus only if behaving as dialog; otherwise use menu semantics;
- Escape closes;
- focus indicator visible;
- account balance is readable text.

## 21.5 Modal

- labelled by `Edit profile`;
- focus contained;
- close control has accessible name;
- character count announced appropriately but not on every keystroke in an intrusive way.

## 21.6 Ghost cards

Mark decorative empty-state cards appropriately so screen readers do not encounter meaningless card placeholders.

---

# 22. Copywriting implications

Higgsfield’s strongest utility copy is short and direct.

5Pixels should continue that style.

### Good account copy

- `248 credits left`
- `Buy credits`
- `Manage plan`
- `View usage`
- `Profile updated`
- `No history yet`

### Good empty-state copy

- `Your transformations will appear here.`
- `Save looks you want to try later.`
- `Nothing downloaded yet.`

### Avoid

- `Manage your credit utilization ecosystem`
- `AI compute consumption`
- `Inference history`
- `Model usage analytics`

Consumer language should remain visual and outcome-oriented.

---

# 23. Design-system refinements suggested by Batch 03

These are proposals, not locked decisions.

## 23.1 Introduce a utility-primary button role

Current system:

- Primary = lime
- Secondary = dark
- Tertiary = text

Potential refined system:

### Brand primary
Lime fill, dark text.

Use for:

- Generate
- Try this look
- Upgrade
- Choose plan
- Explore presets when it is the main conversion action

### Utility primary
Warm cream fill, dark text.

Use for:

- Save
- Confirm non-destructive settings
- Top up in administrative contexts
- Account settings entry

### Secondary
Dark surface, subtle border.

### Tertiary
Text or text + icon.

### Destructive
Dedicated error styling.

This preserves lime scarcity.

## 23.2 Five-pixel credit meter

Turn the five-pixel motif into a functional UI element.

Each of the five groups represents 20% of available credits.

Within each group:

- tiny squares can fill partially;
- exact balance remains text.

This gives 5Pixels a distinctive account-economics signature.

## 23.3 Local settings rail token

Create a reusable `SettingsNavItem`:

- icon slot;
- text;
- active background;
- optional badge;
- keyboard focus;
- 44px+ height.

## 23.4 Empty-state scaffold token

Create:

`GhostMediaGridEmptyState`

Props:

- headline;
- description;
- CTA;
- card count;
- aspect mix;
- optional motif.

---

# 24. Concrete page-level implications for the 5Pixels sitemap

## `/pricing`

Add/confirm:

- plan cards;
- optional plan finder;
- progressive comparison;
- FAQ;
- final CTA;
- footer.

## `/app/library`

Use:

- top tabs;
- search;
- date/preset filters;
- media grid;
- ghost-card empty state.

## `/app/account`

Use:

- local settings rail;
- profile summary;
- shortcut cards;
- contextual Help.

## `/app/account/profile`

Dedicated page remains canonical.

Optional quick edit modal from overview/avatar.

## `/app/account/security`

Dedicated page.

No modal-only security management.

## `/app/account/privacy`

Dedicated page.

Privacy/storage decisions deserve full context.

## `/app/account/notifications`

Dedicated page using toggle rows.

## `/app/billing`

Account-like shell with:

- plan summary;
- credits;
- usage;
- renewal.

## `/app/billing/credits`

Detailed credit ledger / usage view.

## `/app/billing/history`

Invoices / purchases / credit history.

## Global avatar menu

Add:

- identity;
- plan;
- credits;
- buy/upgrade action;
- account;
- billing;
- help;
- sign out.

---

# 25. Designer prompt seeds produced by this batch

These are not yet the final master page-by-page prompt sequence. They are reference prompts to preserve discoveries from this batch.

## Prompt seed A — 5Pixels account dropdown

Design a premium dark-theme account popover for 5Pixels, opened from the top-right avatar. The popover should function as a compact account and credit dashboard rather than a plain menu. At the top show avatar, display name/email, and current plan. Beneath it show an exact credit balance and a branded five-pixel segmented credit meter, followed by a context-sensitive `Buy credits`, `Upgrade`, or `Manage plan` action. Below that include Account, Billing, Help, optional Language, a divider, and Sign out. Use warm off-white text, charcoal surfaces, subtle borders, restrained lime only for the strongest economic action, excellent keyboard/focus states, and no AI model/provider terminology.

## Prompt seed B — 5Pixels billing overview

Design `/app/billing` as a calm premium account surface, not a technical dashboard. Use a local left settings rail with Account and Billing groups. In the main content area show a compact identity/header row, a credit-balance card with top-up action, a current-plan card, a lightweight usage-history card, and a recent billing/credit activity section. Keep charts subdued and consumer-readable. Emphasize exact credit state, renewal information, and clear next actions. Do not expose inference, models, providers, or engineering metrics.

## Prompt seed C — 5Pixels pricing comparison

Design a progressive-disclosure pricing comparison for 5Pixels. On desktop, keep a sticky plan header aligned above plan columns. Show only decisive rows first. Group secondary details into large rounded accordions such as Credits & Transformations, Preset Access, Output & Quality, Library & History, and Support & Rights. Each expanded category reveals a small aligned comparison table and may include `View more` for secondary rows. Use lime sparingly to emphasize the recommended plan and conversion CTA. Do not make the page look like a spreadsheet and do not use model/vendor names.

## Prompt seed D — 5Pixels Library empty state

Design the empty state of `/app/library` using the visual structure of a future media grid rather than a lonely empty icon. Render several muted static ghost media cards with no shimmer so they do not look like loading skeletons. Center a concise message: `Your transformations will appear here.` and a clear `Explore presets` CTA. Keep top tabs for All, Saved, and Downloaded visible so the user understands the eventual library structure.

## Prompt seed E — quick Edit Profile modal

Design a medium-width dark `Edit profile` modal for 5Pixels with a dimmed backdrop, sticky header, scrollable body, and sticky action footer. Include avatar editing with a small overlay change control, display name, and only the minimum profile metadata 5Pixels actually needs. Use generous field heights, clear labels, inline validation, Cancel and Save actions, and responsive conversion to a full-screen mobile sheet. Do not put security, privacy, account deletion, or billing changes in this modal.

---

# 26. Product decisions Batch 03 should trigger

## Decision 1 — Public profile in V1?

**Recommendation:** No.

Reason:

The existing product direction is preset-first transformation, not a social creator network. Keep the Higgsfield profile screenshots as future reference.

## Decision 2 — Should the avatar dropdown show credits?

**Recommendation:** Yes.

Credits are central to generation ability. Hiding them inside Billing creates unnecessary uncertainty.

## Decision 3 — Should account and billing use a local left rail?

**Recommendation:** Yes on desktop.

This maps well to the existing sub-routes and prevents global nav overload.

## Decision 4 — Should `/pricing` use one giant table?

**Recommendation:** No.

Use sticky plan context + progressive category accordions.

## Decision 5 — Should profile editing be modal or page?

**Recommendation:** Both, with clear responsibility.

- dedicated Profile page = canonical;
- modal = quick edit shortcut.

## Decision 6 — Should 5Pixels introduce a cream utility-primary button?

**Recommendation:** Worth testing.

It could preserve lime for creative/commercial moments while making settings surfaces calmer.

---

# 27. Cross-batch emerging 5Pixels application shell

After three batches, a coherent shell is emerging.

## Global top navigation

Left:

- 5Pixels mark
- Discover
- Explore
- optional Categories
- Library
- Favorites

Right:

- Search
- Credits indicator
- Pricing / Upgrade depending state
- Notifications if needed
- Avatar

## Discover / Explore

- rich media-first preset grid;
- category chips;
- hover/focus preview;
- badge system;
- contextual quick actions.

## Preset detail

- large outcome preview;
- compatibility;
- what changes / what stays;
- credit cost;
- `Try this look`.

## Create

Desktop:

- left configuration rail;
- large stage.

Rail:

- selected preset;
- source;
- compatibility;
- controlled options;
- output summary;
- credit cost;
- Generate.

Stage:

- upload;
- crop/preview;
- help;
- generation status;
- result;
- history.

## Library

- tabs;
- search/filter;
- media grid;
- empty states.

## Pricing

- cards;
- plan finder;
- progressive comparison;
- FAQ;
- final CTA.

## Account/Billing

- local settings rail;
- calm card-based main content;
- credits;
- usage;
- plan;
- privacy/account destinations.

## Global overlays

- Search
- Auth
- Upload source
- Credit explanation
- Insufficient credits
- Share
- Delete
- Report
- Quick profile edit
- Upgrade

---

# 28. What 5Pixels should borrow vs reject from this batch

| Pattern | Borrow? | 5Pixels treatment |
|---|---|---|
| Sticky plan header | Yes | Use for comparison |
| Progressive comparison accordions | Yes | Outcome/credit categories |
| `View More` inside categories | Yes | Only for non-critical details |
| FAQ + final CTA | Yes | Include privacy/failure questions |
| Credit-aware account popover | Strong yes | Use five-pixel credit meter |
| Upgrade in account menu | Yes | Contextual, not aggressive |
| Public follower/like profile | No for V1 | Future only |
| Projects/blogs publishing | No for V1 | Future only |
| Ghost-card empty states | Yes | Library/Favorites |
| Edit profile modal | Yes | Quick edit only |
| Private settings rail | Strong yes | Account/Billing |
| Help card inside settings | Yes | Contextual support |
| Usage chart | Yes, simplified | Credits/transformations only |
| Promo/gifts | Only if product has them | Do not add speculatively |
| Utility white button role | Maybe | Test as design-system refinement |

---

# 29. Batch 03 conclusions

Batch 03 does not materially change the core 5Pixels creative workflow established by Batches 01 and 02.

Instead, it fills in the **commercial and account-operational shell** around that workflow.

The most valuable new principles are:

1. **Pricing detail should unfold progressively.**
2. **Credits belong in global account context, not only on a billing page.**
3. **Private account management should have its own calm local navigation.**
4. **Empty states should visually preview future content.**
5. **Small account edits work well in a sticky-header/sticky-footer modal.**
6. **Public creator profiles are visually interesting but strategically premature for 5Pixels V1.**
7. **Lime can remain powerful if utility surfaces are allowed a quieter primary-action treatment.**
8. **The five-pixel motif can become functional through a branded credit meter rather than existing only as decoration.**

The strongest direct product recommendation from this batch is:

> Make the 5Pixels avatar menu a compact **identity + credits + plan + navigation hub**, and make the Account/Billing area a separate, calm settings environment with a local rail.

The strongest pricing recommendation is:

> Replace a giant all-at-once comparison matrix with **sticky plan context + expandable feature categories + a narrow FAQ + a final plan CTA**.

These two systems would give 5Pixels the polish of a mature paid creative product without importing Higgsfield’s model-centric or social-network complexity.

---

# 30. Batch 03 follow-up checklist

When later screenshots arrive, specifically watch for:

- account-menu behavior on non-pricing pages;
- whether the credit meter changes at low balance;
- notification center;
- subscription management details;
- credit top-up flow;
- purchase/checkout modal;
- invoice/history UI;
- security settings;
- privacy/data deletion;
- actual populated Library/Assets behavior;
- generation-history detail;
- result action menu;
- mobile account navigation;
- search inside Library;
- share/download menus;
- toast placement;
- destructive confirmation modals.

These will determine the final page-by-page designer prompt sequence.

