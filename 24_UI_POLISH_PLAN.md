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
