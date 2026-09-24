# 14 — Account, Profile, Settings & Notifications

Surfaces: `app/(app)/app/account/*` (`page`, `profile`, `security`, `privacy`, `notifications`,
`delete`), `app/(app)/app/settings/*`, `app/(app)/app/profile`, `settings-shell.tsx`,
`setting-card.tsx`, `toggle-row.tsx`, `edit-account-dialog.tsx`, `avatar-uploader.tsx`,
`delete-account-card.tsx`, `notification-dropdown.tsx`, `user-dropdown.tsx`.

---

## 1. Current state and gaps

`settings-shell.tsx` renders a horizontally scrolling **chip rail** for account navigation below `lg`,
with the content pane beside it on desktop. `notification-dropdown.tsx` is a dropdown anchored to the
header. `user-dropdown.tsx` is the account menu.

Gaps:

1. **Chip-rail navigation** hides sections off-screen and gives no sense of the whole. Every researched
   mobile settings implementation uses a **grouped list** (`02 §5.1`).
2. **Three overlapping roots** — `/app/account`, `/app/settings`, `/app/profile` — with a duplicated
   delete route (`04 §2`).
3. **Dropdowns as mobile UI**: the notification dropdown and the user dropdown are anchored popovers,
   which are cramped and mis-positioned on small screens (`02 §5.5`).
4. **No notification inbox surface** — only the dropdown.
5. **Destructive account deletion** needs the researched staged confirmation.
6. Edit flows use a centred dialog rather than a sheet.

---

## 2. Target: `/app/account` as a grouped index

```
[app header: Account]
──────────────────────────────────────────
[ avatar 56px ]  Display name
                 email@domain.com            → /app/account/profile
──────────────────────────────────────────
CREDITS & BILLING
  Balance                     12 credits  ›
  Plan                     Monthly plan  ›
  Payment history                        ›
──────────────────────────────────────────
ACCOUNT
  Profile                                ›
  Security                               ›
  Notifications                          ›
  Privacy & data                         ›
──────────────────────────────────────────
SUPPORT
  Help & FAQ                             ›
  Terms · Privacy policy                 ›
──────────────────────────────────────────
  Sign out
  Delete account                         (muted red)
──────────────────────────────────────────
v1.4.2                                    build/version line
```

- Group headers: 11 px uppercase muted, 24 px above.
- Rows: 56 px, leading icon optional, trailing value + chevron, whole row tappable (`03 §5.3`).
- Each row navigates to a **full sub-page** with a labelled back (`← Account`) — the standard mobile
  drill-down, replacing the chip rail below `lg`.
- Desktop keeps the two-pane `settings-shell` layout; only the mobile branch changes.

---

## 3. Sub-pages

| Page | Content | Notes |
| --- | --- | --- |
| Profile | avatar uploader, display name, email (read-only + change action) | edits save inline with an explicit `Save` docked button; avatar picker reuses the source sheet from `08 §3.1` |
| Security | password change, active sessions (if available), 2FA (if available) | password rules as a live checklist (`12 §4`) |
| Notifications | grouped toggles (see §4) | toggles save immediately with an undo toast on failure |
| Privacy & data | retention explanation, `Download my data`, `Delete my photos`, marketing consent | this is the destination linked from the create screen's privacy line (`08 §7`) |
| Delete account | staged confirmation (§5) | single canonical route |

---

## 4. Notifications

### 4.1 Preferences

Grouped toggle rows, each with a one-line description of *when* it fires:

- **Your transformations** — "When a result is ready", "When one fails"
- **Credits & billing** — "Low balance", "Before a trial ends", "Payment issues"
- **Product** — "New looks and collections" (marketing; off by default)

Each group offers a channel note (in-app / email) and honours a single global "Pause all" at the top.

### 4.2 Inbox

Replace the mobile dropdown with a **T2 sheet** (or a full `/app/notifications` route — either is
acceptable; the sheet is cheaper and keeps context):

```
──── ▂▂ ────  Notifications        [Mark all read]
[ thumb ] Your Cyber Punk result is ready   2m  •
[ thumb ] Manga Cutout failed — credits returned  1h
[ ⓘ ]     You're low on credits              1d
──────────────────────────────────────────
[ Notification settings ]                   ghost
```

- Unread dot on the left of the row; the header bell carries a count badge capped at `9+`.
- Tapping a row navigates to the relevant result/generation/billing surface and marks it read.
- Grouped by Today / Earlier; empty state: "You're all caught up."
- Full-height sheet, scrollable, with `Mark all read` in the header.

---

## 5. Account deletion

Staged, per the researched destructive pattern (`02 §3.2`):

1. **Page** (`/app/account/delete`): plain-language list of exactly what is deleted (results, photos,
   library, credits — state whether unused credits are forfeited) and what is retained for legal
   reasons, plus a `Download my data` suggestion first.
2. **Confirm sheet (T1)**: requires typing the word `DELETE` or re-entering the password; the primary is
   destructive-styled and named `Delete my account`.
3. **Outcome**: immediate sign-out with a confirmation page and an email receipt.

An active subscription must be surfaced at step 1 with a link to cancel first; never silently delete a
paying account.

---

## 6. Profile visibility

There is currently no public profile concept on mobile. If `/app/profile` is intended as a public page,
it needs its own spec; if it is a duplicate of account settings, it should redirect (`20 Q3`).

---

## 7. Route consolidation (decision required)

Proposal:
- `/app/account` — the index (above).
- `/app/settings` → redirect to `/app/account`.
- `/app/profile` → redirect to `/app/account/profile`.
- `/app/settings/delete` → redirect to `/app/account/delete`.

This removes duplicate delete implementations and gives the tab bar's Account slot a single target.

---

## 8. States

| State | Behaviour |
| --- | --- |
| Loading | skeleton rows preserving group structure |
| Save success | inline `Saved` affordance + toast |
| Save failure | inline error, the value reverts, no data loss |
| Offline | toggles disabled with a banner |
| Unverified email | banner on Profile with `Resend verification` |
| Notification permission denied (web push) | explain and link to browser settings; never repeat the prompt |

---

## 9. Work items

| # | Item | Files |
| --- | --- | --- |
| 14.1 | Grouped account index replacing the mobile chip rail | `settings-shell.tsx`, `account/page.tsx` |
| 14.2 | Full sub-pages with labelled back | `account/*` |
| 14.3 | Route consolidation + redirects | `app/(app)/app/settings/*`, `profile` |
| 14.4 | Notification preferences grouped with when-it-fires copy | `account/notifications/page.tsx`, `toggle-row.tsx` |
| 14.5 | Notification inbox as a T2 sheet with unread state and Mark all read | `notification-dropdown.tsx` |
| 14.6 | User dropdown → T2 sheet on mobile | `user-dropdown.tsx` |
| 14.7 | Edit dialogs → sheets; docked Save | `edit-account-dialog.tsx`, `avatar-uploader.tsx` |
| 14.8 | Staged deletion with subscription check and data export first | `delete-account-card.tsx`, `account/delete/page.tsx` |
| 14.9 | Privacy & data page as the target of the create-screen privacy line | `account/privacy/page.tsx` |

Acceptance criteria: `19 §12`.
