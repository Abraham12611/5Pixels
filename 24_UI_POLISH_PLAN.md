# 5Pixels — UI Polish Plan

> Analysis of the reference screenshots (Higgsfield Soul) and the planned 5Pixels UI refresh.  
> This document is a **planning-only artifact**; implementation will follow in the next batch of work.

---

## 1. Acknowledgement

Acknowledged. The reference UI uses a dark, premium, icon-first design language with heavy use of a single neon accent (lime), floating toolbars, large custom dropdowns, and clear credit-cost / action anchoring. The next batch of screenshots will be used to refine further (e.g. profile dropdown, settings page, notifications, viral-preset grid, mobile states).

---

## 2. What the reference does well

| Pattern | Why it works | 5Pixels adaptation |
|---|---|---|
| **Dark, high-contrast canvas** | Keeps focus on the generated media. | Already aligned with our ink/charcoal/cream/lime system. |
| **Lime as a signal, not the only color** | CTAs, active states, cost badges, and highlights pop. | Use lime for Generate, active plan, success, and notification dots; keep chrome neutral. |
| **Icon-first mega menus** | Top nav items open large, scannable panels with icons, labels, and status badges (TOP, NEW, PREMIUM). | Marketing header should expose Presets, Filters, Posters, Categories, and Pricing in a single dropdown panel. |
| **Hover micro-interactions** | Subtle background shifts and scale on menu items and cards. | Add `transition`, `hover:bg-cream-100/5`, `hover:scale-[1.02]`, and focus rings. |
| **Floating bottom control bar** | Model, aspect ratio, quality, resolution, batch size, and cost are anchored above the Generate button. | Adapt to a preset toolbar: **Preset**, **Aspect Ratio**, **Quality**, **Resolution**, **Intensity**, **Credits**, **Generate**. |
| **Clear cost anchoring** | Generate button shows the credit cost right next to the action. | Always show `Generate · X credits` or `Buy credits` if balance is too low. |
| **Checkable option menus** | Aspect ratio, quality, and resolution use selectable rows with checkmarks and helper text. | Replace our native `<select>` with shadcn `Select` / `DropdownMenu` rows or `ToggleGroup`. |
| **Dynamic ratio example cards** | Hero section shows a handful of outputs with varying aspect ratios in one visual cluster. | Explore/Landing cards should support multiple aspect ratios gracefully (no forced square grid). |
| **Top-right profile cluster** | Avatar, notifications, and settings are grouped and accessible from one dropdown. | Add a user menu with profile, billing, settings, notifications, and sign-out. |

---

## 3. Constraints we must keep

- **Preset-first.** No prompt box for consumers. The big central input in the reference is replaced by a **source-photo upload** and **schema-driven controls**.
- **Images only.** We are not building video generation or model selection for this phase.
- **No custom models.** The “model selector” becomes a **preset selector** (Filter/Poster + variant).
- **Credits are the currency.** Every generate action must show the cost.
- **Private intelligence.** Provider/model names stay server-side; never leak into the UI.

---

## 4. New / upgraded components

### 4.1 Marketing header — mega dropdown

Replace the simple text links with a navigation bar that supports:

- **Logo + home** on the left.
- **Explore** mega dropdown:
  - Featured presets (Filters, Posters, Viral / Trending).
  - Categories grid with icons.
  - “All presets” footer link.
- **Pricing** link.
- **How it works** link.
- **Search icon** opening a command palette (`Command` component) for presets.
- **Right side cluster** (when authenticated): Notifications bell + profile avatar dropdown.
- **Right side cluster** (logged out): Login + “Try 5Pixels”.
- **Announcement banner** (dismissible) for promos, e.g. “Get 30% off premium plans”.

Files to touch / create:

- `components/marketing/marketing-header.tsx` — rewrite.
- `components/marketing/nav-mega-menu.tsx` — new mega dropdown.
- `components/marketing/announcement-banner.tsx` — already exists; style to match lime bar.
- `components/consumer/command-palette.tsx` — new search overlay.

### 4.2 App header — profile + notifications

The current app header is just a row of links. Upgrade to:

- Slim, sticky, blurred header.
- Left: logo + collapsed nav (Home, Explore, Favorites, History).
- Right:
  - **Credit balance chip** (shows current credits).
  - **Notifications bell** with unread dot and dropdown.
  - **Avatar button** with dropdown:
    - Profile
    - Billing & plans
    - Settings
    - Support
    - Sign out

Files to touch / create:

- `app/(app)/layout.tsx` — replace header.
- `components/consumer/app-header.tsx` — new.
- `components/consumer/notification-dropdown.tsx` — new.
- `components/consumer/user-dropdown.tsx` — new.
- `components/consumer/credit-balance-chip.tsx` — new.

### 4.3 Notifications system

- `notifications` table migration:
  - `id`, `user_id`, `type`, `title`, `body`, `link`, `read_at`, `created_at`.
- Server function: `getNotifications()` / `markNotificationRead()`.
- Real-time: optional Supabase realtime on `notifications`.
- Bell icon with red/lime dot when unread.
- Dropdown panel showing recent notifications, mark-read, and “View all” link.

### 4.4 Create / preset studio toolbar

The current `/app/create/[slug]` form is a vertical form. Restructure into a studio layout:

- **Hero area:**
  - Preset name + short description.
  - Mini gallery of example results (if product has assets).
- **Main stage:**
  - Upload drop zone (or source preview if already uploaded).
  - Live preview / placeholder.
- **Right sidebar (desktop):**
  - Schema-driven controls (GenerationControls).
- **Floating bottom bar:**
  - **Preset** selector (Filter / Poster / variant) — small dropdown.
  - **Aspect Ratio** selector.
  - **Quality** selector (Low / Medium / High).
  - **Resolution** selector (1K / 2K / 4K) where supported.
  - **Intensity / Style weight** slider for Filters.
  - **Batch size** stepper (1–4).
  - **Cost badge** + **Generate** button.
  - If insufficient credits, show “Buy credits” button.

Files to touch / create:

- `app/(app)/app/create/[slug]/create-form.tsx` — major refactor.
- `app/(app)/app/create/[slug]/page.tsx` — layout.
- `components/consumer/studio-toolbar.tsx` — new bottom toolbar.
- `components/consumer/aspect-ratio-selector.tsx` — new.
- `components/consumer/quality-selector.tsx` — new.
- `components/consumer/resolution-selector.tsx` — new.
- `components/consumer/batch-size-stepper.tsx` — new.
- `components/consumer/source-upload-zone.tsx` — new polished dropzone.

### 4.5 Explore / viral presets grid

- Move away from a strict square-card grid.
- Support landscape, portrait, and square poster cards in one responsive masonry or bento grid.
- Cards should:
  - Show looping MP4/GIF preview (already supported).
  - Have a subtle hover scale + shadow.
  - Display category tag, name, credit cost, and favorite button.
  - Add a “Trending” / “New” badge.
- Add a “Viral Presets” section on the landing page with a dynamic layout.

Files to touch / create:

- `components/consumer/product-card.tsx` — enhance.
- `components/consumer/product-grid.tsx` — new responsive grid.
- `components/marketing/viral-presets.tsx` — new landing section.
- `components/consumer/trending-badge.tsx` — new.

### 4.6 Settings page redesign

Turn the current settings page into a tabbed / sidebar layout:

- **Personal Profile** — display name, avatar, email.
- **Subscription** — active plan, upgrade/change, billing portal.
- **Usage** — generations this month, credits used, storage used.
- **Credits** — balance, top-up, transaction history.
- **Promo Code** — redeem code.
- **Preferences** — output format, retention days, marketing emails.
- **Security** — password change, 2FA placeholder.
- **Danger Zone** — delete account.

Files to touch / create:

- `app/(app)/app/settings/page.tsx` — redesign.
- `components/consumer/settings-nav.tsx` — new.
- `components/consumer/profile-card.tsx` — new.
- `components/consumer/usage-panel.tsx` — new.
- `components/consumer/promo-code-form.tsx` — new.

### 4.7 Profile page / account pop-up

- `/app/profile` page or pop-up:
  - Avatar upload.
  - Display name.
  - Public handle (optional).
  - Joined date.
  - Recent public shares (if any).
- Accessible from the user dropdown.

Files to touch / create:

- `app/(app)/app/profile/page.tsx` — new.
- `components/consumer/avatar-upload.tsx` — new.
- Migration: add `avatar_url` and `display_name` to `profiles` if not already present.

---

## 5. Design tokens & interactions to apply globally

- **Rounded corners:** `rounded-xl` for cards, `rounded-full` for pills and buttons, `rounded-2xl` for modals.
- **Transitions:** `transition duration-200` on all interactive elements.
- **Hover backgrounds:** `hover:bg-cream-100/5` on dark surfaces, `hover:bg-lime-400/10` on lime-accented items.
- **Focus rings:** `focus-visible:ring-2 focus-visible:ring-lime-400/50 focus-visible:outline-none`.
- **Active state:** `active:scale-[0.98]` on buttons.
- **Tooltips:** `Tooltip` for icon-only controls.
- **Skeletons:** add loading skeletons for cards, toolbar, and settings panels.

---

## 6. shadcn/ui components to install

Use the shadcn CLI to add the following components. They will be customized to match our tokens.

- `dropdown-menu` — mega menus, user dropdown, notifications.
- `navigation-menu` — top-bar nav with flyouts.
- `select` — improved option menus.
- `toggle-group` — aspect ratio, quality, resolution.
- `slider` — intensity / batch size style.
- `tabs` — settings page.
- `avatar` — profile pictures.
- `dialog` — account pop-ups, confirmation modals.
- `popover` — compact tooltips / quick panels.
- `command` — search palette.
- `separator` — menu dividers.
- `tooltip` — icon labels.
- `badge` — TOP / NEW / PREMIUM tags.
- `sonner` or `toast` — notification toasts.

Command sequence (to run in `apps/web`):

```bash
npx shadcn@latest add dropdown-menu navigation-menu select toggle-group slider tabs avatar dialog popover command separator tooltip badge sonner
```

---

## 7. Phosphor icons

Replace the current `lucide-react` icons with `@phosphor-icons/react` for the new polished surfaces. Phosphor gives us:

- Six weights (Thin, Light, Regular, Bold, Fill, Duotone).
- Better matching to the reference’s bold, rounded iconography.
- Easy `weight` prop switching for active/inactive states.

Install:

```bash
pnpm add @phosphor-icons/react
```

Use the React component form:

```tsx
import { Image, Faders, Sparkle, User, Bell } from "@phosphor-icons/react";
<Image size={20} weight="bold" />
```

Keep `lucide-react` for existing pages that do not need a polish pass; migrate gradually as each surface is redesigned.

---

## 8. Suggested implementation order

1. **Foundation:** install shadcn components and Phosphor icons; set up the new design tokens in a shared `ui-polish` config.
2. **Marketing header:** mega dropdown, command palette, announcement banner.
3. **App header:** credit chip, notifications, user dropdown.
4. **Notifications backend:** migration + functions + dropdown.
5. **Studio toolbar:** aspect ratio, quality, resolution, batch size, Generate button.
6. **Create page layout:** studio split with sidebar and floating toolbar.
7. **Explore / landing grid:** dynamic ratio cards, trending badges, viral presets section.
8. **Settings redesign:** tabbed settings, profile card, usage panel, promo code.
9. **Profile page:** avatar upload, public shares.
10. **Polish pass:** skeletons, loading states, error states, accessibility, reduced motion.

---

## 9. Open questions for next batch

- Do you want the **notifications system** to be real-time (Supabase realtime) or pull-to-refresh only?
- Should the **credit balance chip** in the header be a server-rendered value or a client-side polling value?
- Which **aspect ratios** and **resolutions** should be supported for launch? (1:1, 4:5, 16:9, 9:16, 21:9, 2:3? 1K/2K/4K?)
- Do you want **batch size** (1–4 images per generation) as a V1 feature, or should we defer it because it affects pricing and storage?
- Should the **profile page** be public (e.g. `/u/handle`) or private-only?
- Which **promo code** mechanics do you want? (Simple credit grant, plan discount, free trial?)
- Do you want the **landing page** to keep the current dark hero or move to the reference’s centered “Start Creating” layout with the floating toolbar?

---

## 10. Files that will be created or heavily modified

### New components

- `components/marketing/nav-mega-menu.tsx`
- `components/consumer/command-palette.tsx`
- `components/consumer/app-header.tsx`
- `components/consumer/user-dropdown.tsx`
- `components/consumer/notification-dropdown.tsx`
- `components/consumer/credit-balance-chip.tsx`
- `components/consumer/studio-toolbar.tsx`
- `components/consumer/aspect-ratio-selector.tsx`
- `components/consumer/quality-selector.tsx`
- `components/consumer/resolution-selector.tsx`
- `components/consumer/batch-size-stepper.tsx`
- `components/consumer/source-upload-zone.tsx`
- `components/consumer/product-grid.tsx`
- `components/consumer/trending-badge.tsx`
- `components/consumer/settings-nav.tsx`
- `components/consumer/profile-card.tsx`
- `components/consumer/usage-panel.tsx`
- `components/consumer/promo-code-form.tsx`
- `components/consumer/avatar-upload.tsx`
- `components/marketing/viral-presets.tsx`

### Modified pages / components

- `components/marketing/marketing-header.tsx`
- `app/(app)/layout.tsx`
- `app/(app)/app/page.tsx`
- `app/(app)/app/create/[slug]/create-form.tsx`
- `app/(app)/app/create/[slug]/page.tsx`
- `app/(app)/app/settings/page.tsx`
- `app/(app)/app/settings/settings-form.tsx`
- `components/consumer/product-card.tsx`
- `app/(marketing)/page.tsx`

### Migrations

- `supabase/migrations/2026XXXXXXXX_notifications.sql`
- `supabase/migrations/2026XXXXXXXX_profile_avatar.sql` (if needed)
- `supabase/migrations/2026XXXXXXXX_promo_codes.sql` (if needed)

---

## 11. Next step

Awaiting the next batch of screenshots to finalize:

- profile / account dropdown,
- settings page layout,
- notification panel,
- viral-preset grid layout,
- mobile responsive states.

Then we will cut the first implementation branch from `develop`.

---

## 12. Batch 2 analysis — Studio and Viral Presets

### 12.1 Studio layout

The reference studio is a **two-pane layout**:

- **Left rail** (fixed-width, dark): shows the active preset card at top (image preview + preset name overlaid), an **Aspect Ratio** selector panel with checkmarks and a current choice highlighted, a **Resolution** selector at the bottom, and the **Generate button** with the credit cost directly on it (`Generate · 28`).
- **Right stage**: a large dark work area with a **dotted grid texture**, a centered **upload drop zone**, and a **History / How it works** chip at the top.
- **Bottom center floating nav**: small pill with left/right arrows, the preset name, and quick action icons. On mobile this would collapse to the bottom sheet.
- **Upload state**: the drop zone turns into a small preview card of the uploaded image, with the aspect ratio and resolution selectors still visible below.

**5Pixels adaptation:**

- Replace the model-based studio with a **preset studio**.
- Left rail shows the active **Filter or Poster** preset card, its category, and credit cost.
- Aspect ratio and resolution are the two primary hard controls.
- Quality/intensity shadcn controls live inside the right sidebar for schema-driven fields; the left rail is a quick-control rail.
- Source upload occupies the stage.
- Generate button is always visible, pinned at the bottom of the left rail with the cost.
- On mobile the left rail becomes a bottom sheet; the right stage is full-width.

### 12.2 Viral presets pages

The reference viral presets flow has two page types:

- **Viral Presets index:**
  - A giant lime **“VIRAL PRESETS”** title.
  - A dense grid of **preset-name chips** with `NEW` tags, wrapped like a word cloud.
  - A **header sub-nav** with sections (Explore, Artistry, Marketing, etc.).
  - A top **announcement banner** with a discount CTA (`Get your discount`, `30% OFF` tag).

- **Preset detail page (`/viral-presets/...`):**
  - A **horizontal chip sub-menu** of related presets directly under the header.
  - A **masonry / bento grid** of example results in mixed aspect ratios (square, portrait, landscape).
  - Hover/focus on a card shows the preset name and a lime **Generate** button.
  - The grid cards are images/videos with rounded corners and a thin dark frame; the layout is not locked to one ratio.

**5Pixels adaptation:**

- We already have `/explore` with product cards; we need to upgrade it to a **masonry/bento grid** that respects `product_assets` ratios.
- A new **Viral / Trending presets index** can reuse `/explore` but add:
  - a promo banner at the top,
  - a preset chip quick-select row,
  - and the caption overlay with **Generate** on hover.
- Each preset detail page (`/presets/[slug]`) should add:
  - a **related presets chip row** at the top,
  - a **dynamic-ratio gallery** of example results,
  - and an inline **Generate** CTA on main examples.
- The promo banner component already exists (`announcement-banner.tsx`) but should be restyled to the lime bar with a dismiss button.

### 12.3 Micro-interactions to copy exactly

- **Preset chip hover:** slight scale-up + brighter border.
- **Preset card hover:** slight zoom on the inner media, caption fade-in, Generate button scale-in.
- **Generate button:** scale on active, subtle shine sweep on hover.
- **Dropdown row hover:** light background highlight, checkmark slides in from left.
- **Upload drop zone:** dashed/glow border on drag-over, image preview zoom out after drop.
- **Preset sub-nav horizontal scroll:** snap-to-item, left/right shadow fade.

---

## 13. New or updated component list (batch 2)

### New components

- `components/consumer/studio-sidebar.tsx` — preset card + aspect ratio + resolution + Generate.
- `components/consumer/aspect-ratio-menu.tsx` — icon + checkmark panel.
- `components/consumer/resolution-menu.tsx` — icon + checkmark panel.
- `components/consumer/preset-subnav.tsx` — horizontal chip bar with scroll fade.
- `components/consumer/viral-grid.tsx` — masonry grid wrapper.
- `components/consumer/viral-grid-item.tsx` — card with caption + Generate overlay.
- `components/consumer/upload-dropzone.tsx` — polished drop zone for source image.
- `components/consumer/studio-bottom-nav.tsx` — small floating nav with arrows.
- `components/marketing/viral-presets-index.tsx` — preset chips wall.

### Modified components

- `components/marketing/announcement-banner.tsx` — restyle to lime bar + discount CTA.
- `app/(app)/app/create/[slug]/page.tsx` — new two-pane studio layout.
- `app/(app)/app/create/[slug]/create-form.tsx` — refactor to fit the studio layout.
- `components/consumer/product-card.tsx` — dynamic ratio support + Generate overlay.
- `app/(marketing)/explore/page.tsx` — swap to masonry grid.

### New pages

- `app/(marketing)/viral-presets/page.tsx` — preset chips wall.
- Optional: reuse `/presets/[slug]` as viral preset detail with masonry gallery.

---

## 14. Migrations & data needed for batch 2

- Aspect ratio and resolution should come from `product_versions.output_sizes` (already present).
- Each preset needs at least one `product_assets.preview_video_asset_id` or `preview_gif_asset_id` for viral cards.
- Category / preset chips need a `is_new` / `trending` flag on `products` (or derived from creation date and usage). Suggestion:
  - add `trending_score INT` to `products` (updated daily by a job or on generation), and
  - add `is_new BOOLEAN` computed from `created_at` or a boolean column.
- The header `How it works` and `History` links can stay as static pages for now; the real History page is `/app/generations`.

---

## 15. Next step (batch 3)

Awaiting the remaining screenshots for:

- profile / account dropdown,
- settings page layout,
- notification panel,
- mobile responsive states.

Then we will cut the first implementation branch from `develop`.

---

## 16. Batch 3 analysis — Profile page & Account settings

### 16.1 Profile page layout

The reference profile page uses a **two-column layout**:

- **Left sidebar (personal card):**
  - Large circular avatar with a lime gradient placeholder.
  - **Display name** in large cream text.
  - **Username** in `@username` format below.
  - Small stats row: `0 views` and `0 likes` with tiny icons.
  - **Preview** pill button.
  - **Followers** and **Following** counts as two large boxes.
  - **Account settings** — wide dark pill button at the bottom.

- **Right content area:**
  - Horizontal tab row: `All works`, `Projects`, `Blogs`, `Generations` with underline on active.
  - **Search**, **Publish**, and a lime **Create ▾** button (dropdown).
  - Empty-state sections:
    - **Projects** — empty grid with a centered CTA "Ready to show your projects? / Launch your projects and get noticed by millions / Create project".
    - **Blogs** — empty grid with "Share your process / Share process, breakdowns or tips — posts stay on your profile / Create blog".
    - **Generations** — empty grid with "Ready to show your work? / Launch your generations and get noticed by millions / Publish generations".

**5Pixels adaptation:**

- We don't have public projects/blogs/social yet, but a **personal profile page** is still valuable for V1.
- The right side can be simplified to three tabs:
  - **All works** — user's completed generations (or public shares).
  - **Presets** — user's saved/favorite presets.
  - **Generations** — all generations with filters.
- The **Create** button should be contextual: Create filter / Create poster / Start tutorial (prompt for presets only).
- **Publish** button can open the existing public sharing flow.

### 16.2 Edit profile modal

The reference modal is a **centered card** with:

- Header: **Edit profile** title and a close X.
- **Profile picture** (circular avatar with a plus overlay).
- **Name** (text input).
- **Username** (text input, `@` implied).
- **Headline** (text input, helper text with examples).
- **Bio** (textarea with `0 / 300` counter).
- **Location** (text input with placeholder).
- **Socials** — four prefixed inputs: `x.com/`, `instagram.com/`, `youtube.com/@`, `tiktok.com/@`.
- **Additional settings** — a switch for "Show spent credits on profile".
- Footer: **Cancel** ghost and **Save** lime buttons.

**5Pixels adaptation:**

- V1 fields should be trimmed: `avatar`, `display_name`, `username`, `headline`, `bio`, `location`, `socials`, `show_spent_credits`.
- The modal should be a shadcn `Dialog` with a max width and scrollable interior.
- The save button should be the lime accent; cancel should be a neutral dark pill.
- The username field should auto-prefix `@` in the display.

### 16.3 Account settings pop-up / page

The reference shows the same two-column layout in the left sidebar with the "Account settings" button. The actual settings page is likely the same pattern: a sidebar with the personal card and right-side tabs.

**5Pixels adaptation:**

- Build `/app/settings` as the "Account settings" hub (already exists).
- We need a new `/app/profile` page for the public-profile view and an **Edit profile** dialog that can be invoked from both the profile page and the app-header user dropdown.

### 16.4 Profile micro-interactions

- **Avatar hover:** subtle ring highlight, mini-edit icon reveal.
- **Tab underline:** animates left-to-right on active.
- **Create button dropdown:** slide-down with slight scale; when open, the button text toggles to a chevron-up.
- **Edit profile modal slide-up:** translate-and-fade in.
- **Social inputs:** only show lime border when focused; counter updates live.

---

## 17. New or updated component list (batch 3)

### New components

- `components/consumer/profile-card.tsx` — left sidebar personal card.
- `components/consumer/profile-stats.tsx` — views/likes/followers/following.
- `components/consumer/profile-tabs.tsx` — All works / Presets / Generations.
- `components/consumer/account-settings-button.tsx` — sidebar pill.
- `components/consumer/edit-profile-dialog.tsx` — the full edit form modal.
- `components/consumer/avatar-uploader.tsx` — circular avatar with plus overlay.
- `components/consumer/social-input.tsx` — prefixed social link input.

### Modified components

- `app/(app)/app/settings/page.tsx` — replace with new tabbed settings layout.
- `components/consumer/app-header.tsx` — add profile dropdown.
- `components/consumer/user-dropdown.tsx` — new dropdown with profile, settings, billing, sign-out.
- `components/consumer/share-actions.tsx` — reuse for public sharing of profile works.

### New pages

- `app/(app)/app/profile/page.tsx` — personal profile.
- `app/(app)/app/profile/edit/page.tsx` — optional dedicated edit route (if not a modal).

### Migrations

- `supabase/migrations/2026XXXXXXXX_profile_fields.sql`:
  - adds `username`, `headline`, `bio`, `location`, `socials JSONB`, `show_spent_credits BOOLEAN`, `avatar_asset_id` on `profiles`;
  - adds unique index on `profiles.username` (case-insensitive).
- `supabase/migrations/2026XXXXXXXX_profile_asset_policies.sql`:
  - allows users to write their own `avatar` asset and read profile avatars publicly.

---

## 18. Open question for batch 3

- Should **username** be optional or required? The reference shows one by default. If not required, the profile URL falls back to a numeric ID or email handle.
- Should the profile be **public by default** or behind a toggle? We could support `public_profile_url` toggle to control whether `/<username>` links to a public profile.
- Do we want to show **spent credits** on the public profile or keep that private? The reference allows it as a toggle, which is a nice detail.

---

## 19. Next step (batch 4)

Awaiting the remaining screenshots for:

- notification panel,
- settings page detailed view,
- mobile states.

Then we will cut the first implementation branch from `develop`.

---

## 20. Batch 4 analysis — Settings & Usage

### 20.1 Settings layout pattern

The reference settings page uses a **persistent two-column layout**:

- **Left rail (persistent):**
  - Vertical nav with icons and labels:
    - **Personal profile**
    - **Gifts**
    - **Subscription**
    - **Usage**
    - **Promocode**
  - A **Need help?** card with a small blurb and a `Go to Help Center` button.
  - A **Join our Discord** card (optional promo card).
  - **Sign out** pinned at the very bottom.
- **Top utility bar:**
  - A lime **announcement / promo bar** with a countdown (`Offer expires in 02h 56m 24s`), a message (`Nano Banana... Personal 54% OFF`), and a dark CTA (`Get Unlimited with 54% OFF`) plus a close X.
- **Right main area:**
  - Section title + subtitle.
  - A grid of section cards.

### 20.2 Settings sections in the reference

- **Subscription**
  - Large card: current plan name (`Free Plan`), subtitle (`Unlock all features with a subscription`), lime `Upgrade plan` button.
  - **Credits** card: `Monthly credits left` with big `0 / 10` number, small red progress bar, `+ Buy credits` action button.
  - **Active unlimited models** row: three stat cards (`Currently unlimited`, `Free generations in total`, `Saved in total`).
  - **Unlimited Access History** with a link (`See Unlimited History`).
  - **Pending Invoices** with a link (`All invoices`) and an empty state.

- **Personal profile (Usage/credits)**
  - Avatar, full name, `@username`, email.
  - **Credits** card with big number `0 credits left`, small subtext `0% of maximum credit pool`, and `Top-up` button.
  - **Usage history** card with `See all` link and a daily-usage line chart (Aug 9 → Sep 7).
  - **Collab karma history** row: stat cards for `Total karma points`, `Current streak`, `Karma exchange limit`.
  - Lower sections: `Auto-publish new generations` toggle, `Application language` dropdown, `Manage Account Deletion` collapsible.

### 20.3 5Pixels settings adaptation

We should keep the same two-column skeleton, but start with a minimal section set:

Left rail:
- **Personal profile**
- **Subscription**
- **Credits**
- **Usage**
- **Promo code**
- **Preferences**
- **Security**
- **Delete account**
- Optional: **Help** card + **Discord** promo card + **Sign out** at bottom.

Right content per section:

1. **Personal profile**
   - Profile header card (avatar, name, email, `Edit` button opening edit-profile dialog).
   - Credits card (large balance, `Top-up` action).
   - **Usage history** line chart (using our existing `generation` and `credit_ledger` data).
   - Generation / feedback stat cards instead of karma.

2. **Subscription**
   - Current plan card with plan name, renewal date, and **Manage / Upgrade** button that opens the Dodo customer portal.
   - Credits allocation card: monthly included credits, remaining, and a `Buy extra credits` action.
   - Pending **Invoices** list with `Manage billing` link.

3. **Credits**
   - Balance card with progress bar.
   - Credit add-ons (weekly trial, extra credits).
   - Transaction history.

4. **Usage**
   - Daily/volume usage chart.
   - Generation success rate and breakdown.

5. **Promo code**
   - Single card with promo code input and redeem button.
   - Recent redemptions list.

6. **Preferences**
   - Output format (JPG/PNG) toggle.
   - Auto-publish or default public-sharing toggle (to be implemented in V1).
   - Retention days selectors (in pair with the existing retention settings).

7. **Security**
   - Change password.
   - 2FA placeholder.
   - Active sessions (future).

8. **Delete account**
   - Reuse our existing `/app/settings/delete` flow but move it to a collapsible **Danger zone** section.

### 20.4 Settings micro-interactions

- **Left nav active item:** background changes to `charcoal-800`, left border or icon color turns lime.
- **Left nav hover:** same `bg-charcoal-800/50` with a subtle `text-cream-100` shift.
- **Promo bar:** sticky on top of settings pages with a countdown timer and a close X.
- **Section cards:** `bg-charcoal-850 border-cream-100/10 hover:border-lime-500/30` with a 2-pixel lift on hover.
- **Progress bars:** a thin red (depleted) or lime (healthy) line inside a dark track.
- **Toggle row:** label and description on the left, switch on the right, thin divider above.
- **Collapsible sections:** chevron rotates 90° with a slide/fade.

### 20.5 New or updated components (batch 4)

- `components/consumer/settings-layout.tsx` — two-column settings shell.
- `components/consumer/settings-left-nav.tsx` — vertical icon+label nav.
- `components/consumer/username-display.tsx` — `@username` component.
- `components/consumer/avatar-card.tsx` — profile avatar with edit button.
- `components/consumer/credits-balance-card.tsx` — big credit number + progress.
- `components/consumer/usage-history-chart.tsx` — daily usage chart.
- `components/consumer/karma-stat-cards.tsx` — generic stat card row (renamed for our data: credits earned, streak, exchange limit).
- `components/consumer/subscription-card.tsx` — current plan + upgrade.
- `components/consumer/credits-allocation-card.tsx` — monthly included credits.
- `components/consumer/invoices-card.tsx` — pending invoices empty state.
- `components/consumer/promo-bar.tsx` — lime countdown promo banner (reusable).
- `components/consumer/delete-account-collapsible.tsx` — danger zone.
- `components/consumer/settings-toggle-row.tsx` — label + description + switch.

### Modified pages

- `app/(app)/app/settings/page.tsx` — new layout and nav wiring.
- `app/(app)/app/settings/delete/page.tsx` — fold into settings layout or keep standalone with new nav anchor.

### Migrations

- `supabase/migrations/2026XXXXXXXX_profile_username_socials.sql`
- `supabase/migrations/2026XXXXXXXX_promo_codes.sql`
- `supabase/migrations/2026XXXXXXXX_usage_snapshots.sql` (if we want a separate daily usage aggregation)
- `supabase/migrations/2026XXXXXXXX_product_trending.sql` (batch 2 dependencies rolled up)

---

## 21. Next step (batch 5)

Awaiting the final screenshots for:

- notification panel,
- mobile responsive states.

Then we will cut the first implementation branch from `develop`.

---

## 22. Batch 5 analysis — Settings detail

### 22.1 Promo code page

The reference promo code page is a large, centered **borderless input** on a dark page:

- Page title `Promo code` in the upper-left of the content area.
- Centered input with very large placeholder text (`Enter promo code`).
- While typing, the text stays large and the underline shows a red squiggle on invalid input.
- A small lime **Claim** button appears below once a code is present.
- Left rail shows **Need help?** and **Join our Discord** cards; **Sign out** is pinned at the bottom.

**5Pixels adaptation:**

- Use a centered input but place it inside a `Card` with a max width for readability.
- Add real-time validation against the promo-code table.
- Use a lime **Redeem** button (we don't have a claim verb) and show a success/error toast.
- On success, show a snackbar and refresh the balance chip.

### 22.2 Usage history

The reference usage page has:

- Title: **Usage history** with the subtitle `View credits usage, history and statistics`.
- Top right actions: **Refresh** icon button and a date-range selector (`Last 7 days`).
- An inline **info banner** (dark card with a small info icon) that is dismissible; the message says "You can see your credit usage history starting from July 13, 2026.".
- **Spend overview** — four stat cards:
  - `Total cost`
  - `Credits spent`
  - `Features used`
  - `Total generations`
- **Spend chart** card with an empty-state illustration and `No spend data yet` message.
- **Usage history** list card with an empty-state and `No usage history yet` message.

**5Pixels adaptation:**

- We already track enough data to power this:
  - `credit_ledger` for credits spent.
  - `generations` for total generations and features used.
  - `fal_usage_logs` for provider cost.
- Build a simple spend series from `credit_ledger` where `entry_type = 'generation_debit'` or from `fal_usage_logs` by day.
- The banner is optional for V1; we can drop the "some earlier data..." notice because we have data from day one.

### 22.3 Subscription lower half

The reference shows three cards:

- **Pending Invoices** — an empty-state card with `No pending invoices` and an `All invoices` link.
- **Payment methods** — a card showing the current Mastercard, expire date, and an `Add new payment method` button.
- **Billing information** — a card with a `Manage` button that opens an external billing portal.

**5Pixels adaptation:**

- Payment methods and billing are handled by Dodo, so we should **not** reproduce them.
- Keep the **Pending invoices** card (link to Dodo customer portal).
- Keep a single **Billing portal** card instead of Payment methods / Billing information.
- We can add `Pending invoices` list as a future enhancement once Dodo is fully integrated.

### 22.4 Notification panel (not yet sent)

We expect the next batch to cover the notifications bell dropdown. If the pattern is similar to the user dropdown, it will be:

- A bell icon with a red / lime unread dot.
- A right-anchor popover with a scrollable list of notification cards.
- Each notification shows icon, title, body, and timestamp.
- Actions: mark as read, link, and `View all`.

Wait for the next screenshots to confirm.

---

## 23. Next step (batch 6)

Awaiting the final screenshots for:

- notification panel,
- mobile responsive states.

Then we will cut the first implementation branch from `develop`.

---

## 24. Batch 6 analysis — Notifications & mobile

### 24.1 Notifications panel

The notifications panel in the reference is a **right-anchored popover**:

- Header: **All notifications** with a chevron (`v` / `^`) indicating a filter menu.
- **Tabs** directly under the header: `All`, `Requests`, `Unread`.
- A close X at the top-right.
- Content area: large empty-state card with a subtle bell icon and `No notifications yet`.
- The type menu opens a small dropdown with radio-style selection: `All`, `Collaboration`, `Social`, `System`.
- The overall surface is charcoal with a translucent backdrop and rounded corners.

**5Pixels adaptation:**

- We do not have Collaboration / Social features, so use a simplified set:
  - **All**, **Generation**, **Billing**, **Unread** (or **System**).
- The panel should be smaller than the reference and should auto-dismiss on outside click.
- Unread notifications should show a small lime dot.
- Use Phosphor `Bell` icon with a filled variant when unread.
- The dropdown should be scrollable and accessible via keyboard.

### 24.2 Mobile responsive landing page

The reference mobile landing page uses a compact, card-driven layout:

- A thin lime **promo banner** at the very top (`Get an additional discount on premium plans`).
- A compact **app bar** with:
  - logo at left,
  - camera icon (home),
  - a `Pricing` pill with a small `21% OFF` tag,
  - a lime **Sign up** button.
- A **search bar** underneath.
- A **carousel hero** with a large image card, a lime `NEW MODEL` tag, the title `HIGGSFIELD GENJUTSU`, and a short description; dots under the image for carousel state.
- A **category grid** section titled `WHAT WOULD YOU CREATE?` with four cards: `Image`, `Video`, `Supercomputer`, `MCP` (lime border on selected).
- A **bottom nav** with icons:
  - **Home**
  - **Community**
  - **Create** (large lime circle with a star icon)
  - **Library**
  - **Profile**

**5Pixels adaptation:**

- We do not need Supercomputer/MCP. Adapt the category grid to **Filters**, **Posters**, **Trending**, **Categories**.
- We should add a **mobile bottom nav** to the app with:
  - Home
  - Explore
  - Create (large lime CTA)
  - My works
  - Profile
- The promo banner should be dismissible and stored in `sessionStorage` so it does not reappear on every load.
- The hero carousel can be used on the landing page with our curated presets.

### 24.3 Mobile preset/create listing

The reference mobile Create flow is a **full-screen modal-style** page:

- Top sheet: title (`Create`) on the left, close X on the right.
- A **filter chip row** (`All`, `New`, `Images`, `Videos`, `Edit`) with selected chips in lime and inactive in charcoal.
- A grid of model/preset cards:
  - full-width featured card at top (large preview image),
  - two-column cards (Create image, Create video, etc.),
  - badges (`TOP`, `CORE`, `NEW`) on the card image,
  - model name + tagline.
- A floating lime banner at the bottom (`Credits are running low! / All credits used / Upgrade`).

**5Pixels adaptation:**

- The grid cards become **preset cards** (Filter / Poster).
- A featured **Hero preset** can span full width.
- Badge types can be `New`, `Trending`, `Premium`.
- The floating credit-low banner should show the user's balance and link to `/app/billing`.
- For launch, we can use a simplified two-column masonry grid.

### 24.4 Mobile profile/settings

- Mobile stacks the left rail above the content:
  - avatar + name + username + stats,
  - Account settings button,
  - tab row/scroll row,
  - section cards.
- The promo banner is full-width.
- The **Create** button becomes a FAB (bottom-right on mobile) rather than an inline button in the header.

**5Pixels adaptation:**

- Settings nav becomes a **scrollable horizontal chip row** on mobile, then a sidebar on tablet+.
- Use `flex-col` at small breakpoints; the promo banner stays on top.

---

## 25. New or updated component list (batch 6)

### New components

- `components/consumer/mobile-bottom-nav.tsx`
- `components/consumer/promo-countdown-bar.tsx`
- `components/consumer/notification-sheet.tsx` (mobile-friendly popover)
- `components/consumer/notification-card.tsx`
- `components/consumer/preset-card-mobile.tsx`
- `components/consumer/category-card-grid.tsx`
- `components/consumer/low-credits-banner.tsx`
- `components/consumer/mobile-features-grid.tsx`

### Modified components

- `components/marketing/marketing-header.tsx` — mobile app bar + bottom nav sheet.
- `components/marketing/landing-page.tsx` — mobile carousel + category grid.
- `components/consumer/product-card.tsx` — mobile breakpoints, badges.
- `components/consumer/app-header.tsx` — collapse to bottom nav on mobile.

### Migrations

- `supabase/migrations/2026XXXXXXXX_notifications.sql` (with `type` column for filtering by generation/billing/system).

---

## 26. Next step

We have enough material to design or implement. Next step is to confirm the batch is complete, then start the first implementation branch. Options:

1. Start with the **shared shell** (shadcn components, Phosphor icons, global tokens).
2. Then implement the **app header + notifications + settings layout** as a high-impact first pass.
3. Then refactor the **studio toolbar and cards** in a second pass.

Please confirm if you have any final screenshots (e.g. for onboarding, checkout, or error states), otherwise I can begin the UI polish implementation phase.

---

## 27. Batch 7 analysis — Mobile sheet patterns & final mobile states

### 27.1 Full-screen mobile selection sheet

The reference uses a **full-screen sheet** (not a small dropdown) for the main selection:

- "CREATE IMAGE" title at the top-left with the app logo next to it.
- A chevron down opens the sheet.
- The sheet itself:
  - starts at the left edge of the viewport,
  - has a translucent dark background,
  - uses a large, pill-shaped list of items with a left icon + label,
  - has a **close button at the bottom center** (a small pill with an X),
  - keeps the current selection at the top with a chevron to switch.
- One variant shows categories: `Supercomputer`, `Image`, `Audio`, `Video`, `Viral Presets`, `Upscale`, `Inpaint`; then an `ALL` sub-section with more items.
- Another variant shows a flat list of presets like `Sora 2 Trends`, `Draw To Edit`, `Draw To Video`, etc.

**5Pixels adaptation:**

- The "model selector" is replaced by a **preset type selector** (`Filter`, `Poster`) plus a **preset picker** inside the studio.
- For quick switching we can use a full-screen **preset sheet** on mobile:
  - large preset name at top,
  - inline thumbnail,
  - a flat list with left icons for the preset type,
  - an "All presets" footer button that goes to `/explore`.
- Do not use the reference's many tool categories; ours are limited to Filter and Poster.

### 27.2 Mobile profile dropdown

The mobile profile dropdown is a **slide-down sheet** anchored to the top right:

- Compact header with avatar, name, and plan (`Free Plan`).
- **Credits** card:
  - progress dots (yellow for plan credits),
  - `Credits` label and `0 left` counter,
  - a small info icon.
- **Go Premium** section:
  - crown icon and label,
  - lime **Upgrade** button.
- Menu items:
  - `View profile`,
  - `Manage Account`,
  - `Affiliate program` with a `New` badge,
  - `Join Community`,
  - `Language` (with the current language).
  - `Sign Out`.
- A wide **Account settings** button at the bottom.
- The bottom nav shows a floating banner: "Credits are running low! / All credits used / Upgrade".

**5Pixels adaptation:**

- Replace `Affiliate program` and `Join Community` with:
  - **Help / support**,
  - **Notifications** toggle.
- Keep the credits card, premium upsell, View profile, Account settings, Language, and Sign out.
- Use a small badge for `New features` if we add release notes.

### 27.3 Mobile create sheet

The mobile create page is a **compact, single column** flow:

- Top sheet header with title and close X.
- **Upload card** area with a drop zone.
- A clean placeholder textarea (our preset-first constraint means this textarea is hidden).
- Bottom horizontal pills:
  - `High` quality,
  - `2K`,
  - `Auto` aspect,
  - `1` batch size.
- A large lime **Generate** button with the credit cost next to it (`6.5`).
- The pill order is affected by model selection.

**5Pixels adaptation:**

- Keep the compact design but show **Preset** instead of a text prompt.
- The bottom pills become:
  - `Preset`,
  - `Quality`,
  - `Resolution`,
  - `Aspect Ratio`,
  - `Batch size` (V1 optional; default 1).
- Use a fixed bottom lint for the Generate button and cost.

### 27.4 Mobile marketing and bottom nav

- Thin lime promo banner at the top with offer text and the chevron + X.
- Compact header with logo, camera icon, pricing pill, and sign-up button.
- Search bar directly below the header.
- A featured prescription carousel with a large preview "NEW MODEL" label, description, and pagination dot progress.
- A "WHAT WOULD YOU CREATE?" section with four cards: `Image`, `Video`, `Supercomputer`, `MCP`.
- Bottom navigation `Home`, `Community`, `Create` (big lime FAB), `Library`, `Profile`.

**5Pixels adaptation:**

- We will create `components/consumer/mobile-app-shell.tsx` (or place in the `(app)` layout) with:
  - top banner (reuse `announcement-banner` or the lime promo bar),
  - compact header (`logo · search · credits chip · profile`),
  - content body,
  - bottom nav with a lime **Create** FAB in the center.
- The bottom nav items should map to:
  - Home ("/app"),
  - Explore,
  - Create (opens preset sheet),
  - Works / History ("/app/generations"),
  - Profile ("/app/profile" or settings).

### 27.5 Mobile micro-interactions

- **Sheet animation:** bottom-to-top slide + fade; background dims to 70%.
- **Preset chip touch:** instant scale-up/collapse feedback.
- **Close button at bottom:** small pill that bounces on tap.
- **Credit banner:** continues to float above the bottom nav until it is dismissed.
- **Pill toggles:** instant background change (no heavy hover relationships on mobile).
- **Carousel dots:** click to jump; horizontal drag on cards.

---

## 28. Summary of implementation-ready decisions

We are ready to build:

1. **Shared foundation** (installation, tokens, fonts, UI primitives).
2. **App header rework** with profile dropdown and notifications.
3. **Preset studio** layout: two-pane studio with left control rail and right stage, plus a mobile bottom sheet.
4. **Settings rework** with the left-nav + main card grid.
5. **Explore / landing polish** with dynamic ratio cards and the viral preset chips wall.

Confirmation pending for the remaining open questions, but we can start with the shared shell and app header as the first implementation slice.

---

## 29. Next step

We will begin implementation with the shared foundation branch:

- install shadcn primitives,
- install `@phosphor-icons/react`,
- add global tokens and micro-interaction classes,
- then wire the app header with credits, notifications, and profile dropdown.

Subsequent branches will handle:

- studio two-pane layout,
- settings redesign,
- explore/landing cards.

---

## 30. Current progress and remaining work

### Implemented UI-polish branches (not yet merged to `develop`)

| Branch | Commit | Scope |
|---|---|---|
| `feature/ui-shared-foundation` | `6d8d810` | shadcn components, Phosphor icons, global tokens. |
| `feature/ui-settings-redesign` | `be92956` | Settings left-nav + section cards. |
| `feature/ui-studio-create` | `beba220` | Two-pane create page + floating `StudioToolbar`. |
| `feature/ui-explore-cards` | `176c055` | Dynamic-ratio product cards + `Generate` overlay. |
| `feature/ui-mobile-nav` | `4ffab2c` | Mobile bottom nav shell. |
| `feature/notifications-backend` | `6485d33` | `notifications` table + header dropdown. |
| `feature/ui-landing-polish` | `d2334f6` | Landing carousel, promo bar, category grid. |
| `feature/ui-marketing-header` | `60b4e7f` | Marketing header mega dropdown. |
| `feature/ui-viral-presets` | `f43908e` | Explore `CategoryChipWall` + viral index layout. |

These branches are **stacked** in the order above. Each one builds on the previous, and `feature/ui-viral-presets` currently contains the whole stack.

### Remaining slices (from this plan + open requests)

- **Preset-detail related sub-navigation and upsells** — `components/consumer/preset-subnav.tsx`, `viral-grid.tsx`, related-presets chip row on `/presets/[slug]` (plan §12.2, §13).
- **Dynamic-ratio “viral” gallery polish** — dedicated `/explore` or `/viral-presets` masonry gallery, `Trending`/`New` badges on product cards (plan §4.5, §12.2).
- **Profile page / account settings dialog** — `/app/profile`, edit-profile modal, avatar upload, username/headline/bio/location/socials (plan §4.7, §16–17).
- **Mobile sheet refinements** — full-screen preset picker, profile sheet, create bottom sheet (plan §27).
- **Search/command palette overlay** — `components/consumer/command-palette.tsx` (plan §4.1).
- **Accessibility / reduced-motion pass** — global focus rings, reduced-motion, ARIA, tooltips (plan §5).
- **Notification realtime updates** — optional Supabase realtime on `notifications` (plan §4.3).
- **Backend data work** — profile fields/avatar migration, promo codes, `trending_score` / `is_new` on products, usage snapshots (plan §14, §20, §22).

### Merge strategy

The cleanest way to land all the UI polish is to **open one PR per branch**, merging them in stack order into `develop`. Because the branches are linear, `feature/ui-viral-presets` could also be merged by itself to bring the whole stack in, but that would bypass the per-slice history. Recommended order:

1. `feature/ui-shared-foundation`
2. `feature/ui-settings-redesign`
3. `feature/ui-studio-create`
4. `feature/ui-explore-cards`
5. `feature/ui-mobile-nav`
6. `feature/notifications-backend`
7. `feature/ui-landing-polish`
8. `feature/ui-marketing-header`
9. `feature/ui-viral-presets`

Each PR must pass CI (`typecheck`, `lint`, `test`, `build`) and get an approving review because `develop` is branch-protected.

Branch PR links (replace `feature/...`):

```text
https://github.com/Abraham12611/5Pixels/pull/new/feature/ui-shared-foundation
https://github.com/Abraham12611/5Pixels/pull/new/feature/ui-settings-redesign
https://github.com/Abraham12611/5Pixels/pull/new/feature/ui-studio-create
https://github.com/Abraham12611/5Pixels/pull/new/feature/ui-explore-cards
https://github.com/Abraham12611/5Pixels/pull/new/feature/ui-mobile-nav
https://github.com/Abraham12611/5Pixels/pull/new/feature/notifications-backend
https://github.com/Abraham12611/5Pixels/pull/new/feature/ui-landing-polish
https://github.com/Abraham12611/5Pixels/pull/new/feature/ui-marketing-header
https://github.com/Abraham12611/5Pixels/pull/new/feature/ui-viral-presets
```

### Next step

Pick the next slice to implement. The highest-impact remaining items are:

1. **Profile page + edit profile dialog** (completes batch 3/4 and is required for `/app/profile`).
2. **Preset-detail sub-navigation + viral gallery** (completes batch 2 and improves conversion).
3. **Command palette** (relatively small, improves discovery).

Once the remaining UI slices are finished, we can create/update the PRs and, after your review, merge them into `develop`.
