# QA: Referral Welcome Page (`/r/[code]`)

What changed: referred visitors no longer land on a bare signup form. `/r/<referrer_id>`
is a public welcome page (GrowPal "claim the gift" + Revolut patterns) that names the
sender, states the gift, and claims via one CTA. All first-party share links
(`ReferralCard` in the offer card and blocked-credit surface) now point at `/r/<id>`
instead of `/signup?ref=<id>`.

## Test steps

### Happy path
1. Grab a referrer's user id (any `profiles.id`, e.g. your own test account).
2. In a fresh/incognito browser, open `/r/<id>` → centered card: "**{name}** sent you
   a gift" (falls back to "A friend…" when no display name), the lime "What you get"
   card (first transformation free / every Filter & Poster / no card required),
   **Claim your gift** CTA, and a quiet "Browse the looks first" link.
3. Click **Claim your gift** → lands on `/signup?ref=<id>` with the referral context
   intact.
4. Sign up → confirm `referral_participants` gains a row (`referred_by = <id>`) and the
   referee profile gets `free_unlock_source = 'referral'` (one free generation).

### Attribution resilience
5. Open `/r/<id>` but **don't** claim — browse to `/explore`, come back later, sign up
   directly. Attribution should still land: the `spx_ref` cookie is dropped on the
   welcome page itself (30-day, httpOnly) and survives the browse-first path.

### Edge cases
6. `/r/<not-a-uuid>` → redirects to `/` (no error page).
7. `/r/<uuid-that-doesnt-exist>` → redirects to `/`.
8. Signed-in user visits `/r/<valid-id>` → redirected to `/app` (no self-attribution
   or double-claim weirdness).
9. Self-referral: sign up with your own `?ref=<your id>` → `claimReferralForUser`
   rejects self-attribution (existing guard, unchanged).

### Events
10. `promo_events` gains `impression` + `accept` rows with `context = 'referral_welcome'`,
    `surface = 'referral'`, `meta.referrer_id = <id>`. Anonymous visitors get an
    `spx_anon` cookie minted by the action so the events aren't dropped.

## Automated coverage

`components/auth/__tests__/referral-welcome.test.tsx` — impression once on mount;
claim link preserves `?ref=` and records the accept event.
