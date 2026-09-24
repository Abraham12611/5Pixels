# 12 — Auth, Onboarding & Deferred Authentication

Surfaces: `app/login`, `app/signup`, `app/forgot-password`, `app/update-password`, `app/verify-email`,
`app/auth/*`, `components/auth/auth-modal.tsx`, `components/consumer/auth-gate-modal.tsx`,
`password-input.tsx`, `lib/anonymous-draft.ts`.

---

## 1. The principle: earn the account

5Pixels already implements the strongest researched pattern — **deferred auth**. Anonymous users can
browse, open quick sheets, open the studio, upload a photo and configure controls; the account is asked
for only at Generate, and the draft is persisted across the auth round-trip
(`AuthGateModal` + `saveStudioDraft`, `08 §5`). Picnic's value-before-wall ordering (`01 §4`) and
Gizmo's contextual sheet (`02 §6.1`) both validate this.

The polish work is therefore about **continuity and clarity**, not about adding gates.

---

## 2. Current state and gaps

`auth-modal.tsx` is already a bottom sheet on mobile and a centred dialog on desktop, preserves the
preset intent, shows the preset name/thumbnail, offers Google OAuth, and routes signup through
verify-email carrying `next`.

Gaps:

1. **Two modal components** (`auth-modal.tsx`, `auth-gate-modal.tsx`) with overlapping jobs; they must
   share one `Sheet` implementation and one copy set (`15 §3`).
2. **Full-page auth routes are desktop-centred** and duplicate the modal's fields, with a different
   visual treatment and different error presentation.
3. **No explanation of *why*** the account is needed at the gate. One line ("We save your results to
   your Library and your credits to your account") converts better than a bare form.
4. **Verify-email is a dead end on mobile** — the user leaves for their mail app and returns to a page
   with no state, no resend timer and no way back to the task.
5. **No password-manager and keyboard hints audit** (`autocomplete`, `enterkeyhint`, `inputmode`).
6. **OAuth return path** on mobile in-app browsers (Instagram/TikTok webviews) is a known failure class
   with no designed fallback.
7. **Error copy** for wrong credentials/rate limits is not specified per case.

---

## 3. Target: auth sheet (T2)

```
──── ▂▂ ────                                    [X]
[ preset thumb 48px ]  Continue to Cyber Punk    (when contextual)
Sign in to generate
We keep your results in your Library and your
credits with your account.
──────────────────────────────────────────────
[  Continue with Google  ]                       48px
────────────────  or  ────────────────
Email      [                    ]
Password   [                 👁 ]
[ Sign in ]                                      lime, 48px
Forgot password?                                 ghost
──────────────────────────────────────────────
New here? Create an account                      tab switch, not navigation
```

- Tab switch between Sign in / Create account happens **inside the sheet**; never navigate away from a
  half-finished task.
- Google first (fewest taps on mobile, no password entry, no email round-trip).
- On success: the sheet closes and the original action resumes automatically — the user should land back
  on the create screen with their photo and settings intact, and the Generate action should fire or be
  one tap away (decide which in `20 Q4`; auto-firing a credit-spending action after auth is risky, so
  the default recommendation is **restore + one tap**).
- The sheet is dismissible; dismissing must not lose the draft.

---

## 4. Full-page auth routes

Keep them (deep links, password managers, email links depend on them) but make them mobile-first:

- Single column, 20 px gutters, content top-aligned at 15 % viewport height, logo above the title.
- One field per row, 16 px inputs, correct `type`/`inputmode`/`autocomplete`/`enterkeyhint` (`03 §6`).
- Primary CTA directly under the last field — never below the fold, never in a header.
- `next` preserved through every hop (login → verify → update-password → destination).
- Errors inline per field, plus one summary line above the CTA for non-field errors (rate limits,
  provider outages), with `role="alert"`.
- Password rules shown *before* submission as a live checklist on signup and update-password.

### 4.1 Verify email

Make it an active surface: the address is echoed, an `Open mail app` affordance is offered (a plain
`mailto:`-less hint plus provider deep links are unreliable — use copy guidance instead), a **resend
button with a 60 s countdown**, a `Wrong address? Change it` link, and an explicit statement of what
happens next ("You'll come straight back to Cyber Punk"). On return, resume the task from `next`.

### 4.2 In-app browser fallback

Detect known in-app webviews and, when OAuth is unavailable or likely to fail, present email auth first
with a hint: "For Google sign-in, open this page in your browser." Provide a `Copy link` action.

---

## 5. Onboarding

**Reject** multi-slide onboarding carousels (`02 §6.3`). Instead:

1. **Landing** teaches by example (the feed is the tutorial).
2. **Create** carries the 3-step strip and the re-openable `ⓘ` guide (`08 §2`).
3. **First result** carries a one-time hint about Download vs Save.
4. **`/app` orientation block** for signed-in users with zero generations (`05 §3.1`), dismissible and
   never repeated.

No modal may block a first-time user's first action.

---

## 6. Sign-out and session expiry

- Sign-out lives in `/app/account` and asks for confirmation only when a draft or in-progress run
  exists.
- Session expiry mid-task must not discard work: show the auth sheet in place, preserve the draft, and
  resume after re-auth.
- A 401 from a server action while generating must map to the auth sheet, not to a generic error.

---

## 7. States

| State | Behaviour |
| --- | --- |
| Anonymous browsing | no prompts anywhere except at Generate |
| Gate at Generate | contextual sheet with preset context + reason line |
| Wrong credentials | inline: "Email or password is incorrect" (never say which) |
| Unverified email | route to verify-email with resend and the original `next` |
| Rate limited | "Too many attempts — try again in N minutes" |
| OAuth cancelled | sheet reopens unchanged; no error |
| Offline | CTA disabled + "You're offline" banner |

---

## 8. Work items

| # | Item | Files |
| --- | --- | --- |
| 12.1 | Merge the two auth modals onto the shared `Sheet` with one copy set | `auth-modal.tsx`, `auth-gate-modal.tsx` |
| 12.2 | Reason line + preset context in the gate | both modals |
| 12.3 | Restore-and-one-tap resume after auth | `create-form.tsx`, `anonymous-draft.ts` |
| 12.4 | Mobile-first full-page auth routes; field/keyboard attribute audit | `login`, `signup`, `forgot-password`, `update-password` |
| 12.5 | Verify-email: echo address, resend with countdown, change address, next-step copy | `verify-email/page.tsx` |
| 12.6 | Live password-rule checklist | `password-input.tsx`, signup/update |
| 12.7 | In-app-webview OAuth fallback + copy link | auth surfaces |
| 12.8 | Session-expiry recovery to the auth sheet | server-action error mapping |
| 12.9 | Per-case error copy (invalid, unverified, rate limited, provider down) | `app/actions/auth.ts` + UI |

Acceptance criteria: `19 §10`.
