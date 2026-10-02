# QA — Phase 4.6–4.7: Notifications + staged account deletion

Spec refs: `14_ACCOUNT_SETTINGS_NOTIFICATIONS.md` §4 (notifications), §5 (deletion).

## Setup

- Signed-in user with at least one completed and one failed generation (to
  have inbox entries), and ideally an active subscription for the delete
  page variant.
- Apply migration `20260927120000_notifications_paused.sql`
  (`npx supabase db reset` or push to the linked project).

## 4.6 — Notification preferences (`/app/account/notifications`)

1. Open the page on mobile. Expect four cards in order:
   - **Pause all notifications** — standalone, own card at the top.
   - **Your transformations** — "In-app · also by email" channel note; rows:
     *When a result is ready* (toggle) and *When one fails* (locked,
     "In-app only").
   - **Credits & billing** — "Email" note; *Billing & low-credit* (toggle)
     and *Important account & security* (locked, "Always on").
   - **Product** — "Marketing email · off by default" note; *New looks and
     collections* + *Tips & offers*.
2. Toggle **Pause all** on → generate a transformation → confirm **no**
   inbox entry lands (the trigger now checks `notifications_paused`).
   Toggle off → next generation lands an inbox entry again.
3. Each toggle flips with optimistic state + "On/Off" text label (never
   color-only) and rolls back with an error message if the save fails.

## 4.6 — Inbox + bell (app header)

1. Tap the bell on **mobile**: a T2 content sheet opens (drag handle, scrim,
   Escape, Back all dismiss). On **desktop** the popover still opens.
2. With unread items, the bell shows a numeric badge; with >9 unread it
   reads `9+`. Aria label stays `Notifications, N unread`.
3. Rows group under sticky **Today** / **Earlier** headers. Unread rows show
   the lime dot + `— unread` in the accessible name.
4. Tap a row → it marks read immediately, navigates to `n.link`
   (result/generation/billing), and the badge decrements.
5. **Mark all read** (in-sheet on mobile, popover header on desktop) clears
   the badge and dots.
6. Footer **Notification settings** ghost → `/app/account/notifications`.
7. Empty inbox → "You're all caught up."

## 4.7 — Staged account deletion (`/app/account/delete`)

1. Open the page. Expect, in order:
   - "What gets deleted" list — results, uploaded photos, saved
     presets/favorites/library, profile/settings, remaining credit balance
     (with the live count) — **"Unused credits are forfeited and not
     refunded."**
   - "What we keep" — billing records/invoices retained for tax/legal.
   - A **Download your results first** row → `/app/library` (bulk download
     lives there; no separate export exists).
   - With an active plan: a warning banner naming the plan + renewal date,
     linking **cancel it now** → `/app/billing/plan`.
   - A destructive-outline **Delete my account** button.
2. Tap it → T1 confirmation sheet: consequence recap, `type DELETE` field,
   **Keep my account** ghost + **Delete my account** destructive CTA.
3. CTA stays disabled until exactly `DELETE` is typed. On success the server
   action signs out globally and lands on **`/account-deleted`** — a public
   confirmation page with links back home / to sign up again.
4. Legacy routes still converge: `/app/settings/delete` → `/app/account/delete`.

## Automated coverage

- `components/consumer/__tests__/notification-inbox.test.tsx` — badge cap
  `9+`, Today/Earlier grouping, row-tap marks read, empty state, settings
  link, conditional Mark-all-read.
- `app/(app)/app/account/delete/__tests__/delete-account-flow.test.tsx` —
  consequence list incl. forfeited credits, retained-records copy,
  download-first link, subscription surfacing, T1 sheet + `DELETE` gating.
- Suite: **448/448** green; lint / typecheck / build clean.
