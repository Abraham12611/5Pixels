# QA — Phase 5.1–5.3: Auth consolidation, mobile auth pages, recovery

Covers `12_AUTH_ONBOARDING_DEFERRED_AUTH.md` §§2–7 and roadmap Phase 5.

## 5.1 — One auth sheet

- [ ] On `/app/create/[slug]` as an anonymous user, tap **Generate** → the shared `Sheet` opens (drag handle, X, scrim) — not a custom overlay.
- [ ] Sheet shows the preset thumbnail + "Continue to {preset name}" and the reason line: "We keep your results in your Library and your credits with your account."
- [ ] **Continue with Google** is the first control, above the email field.
- [ ] Sign in / Create an account tabs switch **in the sheet** — no navigation, the create screen stays mounted behind the scrim.
- [ ] Signup tab shows the live password checklist (8+ chars, letters+numbers) updating while typing.
- [ ] Sign in with email → lands back on `/app/create/[slug]?draft=1`, photo + options + size restored, "We kept your photo and settings." status line, and generation is **one tap** away (nothing auto-fires).
- [ ] `components/consumer/auth-gate-modal.tsx` no longer exists; no placeholder Apple button anywhere.

## 5.2 — Mobile-first auth pages

- [ ] `/login`, `/signup`, `/forgot-password`, `/update-password`, `/verify-email` on a 375px viewport: single column, ~20px gutters, content starts ~15% viewport height, logo above title.
- [ ] Focusing an email input does **not** zoom iOS (inputs are 16px below `sm`).
- [ ] Email fields use `type=email` + `inputmode=email` + `autocomplete=email`; correct `enterkeyhint` (next/go) throughout.
- [ ] Google button appears **first** on `/login` and `/signup`.
- [ ] `/signup` and `/update-password` show the live password checklist before submission.
- [ ] Non-field errors render a `role="alert"` summary above the CTA.
- [ ] `?next=` survives login → verify-email → destination.

## 5.3 — Recovery surfaces

- [ ] `/verify-email` echoes the target address, offers **Open mail app**, resend with a **60s** countdown, **Wrong address? Change it** → `/signup?next=…`, and copy explaining you'll return to your look.
- [ ] Inside an Instagram/TikTok webview (spoof the UA): a notice appears on auth surfaces — "For Google sign-in, open this page in your browser" + **Copy link**; email auth remains available.
- [ ] Let a session expire, then tap **Generate**: the auth sheet opens in place (not a generic error), the draft is re-saved, and re-auth resumes with one tap.
- [ ] Trigger a Supabase rate limit → error reads "Too many attempts — try again in N minutes".
- [ ] Cancel the Google OAuth prompt → the sheet/page is unchanged, no spurious error.
- [ ] Toggle airplane mode → Generate CTA disables with "You're offline — reconnect to generate".

## Gates

- `pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm test` ✅ (454/454, incl. 5 new `auth-modal` tests) · `pnpm build` ✅
