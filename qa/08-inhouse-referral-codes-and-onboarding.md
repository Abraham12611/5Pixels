# QA: In-house referral codes + multi-step onboarding

What changed: the referral identifier layer is now first-party — every user
has a short code (`K7M-2QX` format, 6 chars from an unambiguous alphabet)
on `profiles.referral_code`, backfilled for existing users. `/r/<code>`,
`?ref=<code>`, and manual onboarding entry all resolve through the same
code→referrer path (`resolveReferrerId`). The `spx_ref` cookie still carries
the resolved UUID internally. `/app/referrals` is rebuilt first-party
(code pill, Copy Code, Share Link, Invites/Rewards tabs) — no GrowSurf
blocks. Referrers earn a per-signup credit bonus plus the existing
first-payment share; referees keep "first transformation free".

New-user onboarding is a chromeless multi-screen flow at `/onboarding`
(ElevenLabs/Duolingo step grammar — one question per screen, single-select
auto-advances). Steps: welcome → username (required, live availability) →
"What will you create?" → interest tiles (wired live into Explore ordering)
→ "How did you hear about us?" → conditional referral code step → done.
Signed-in users with `onboarding_completed_at IS NULL` are routed to
`/onboarding` from the auth callback and gated out of `/app/*` by the proxy.
Existing users are backfilled and never see it.

## Test steps

### Referral codes
1. As any signed-in user, open `/app/referrals` → code pill shows the
   6-char code grouped `XXX-XXX`, plus Copy Code and Share Link.
2. Copy the link → it is `{site}/r/<code>` with the short code, not a UUID.
3. Open `/r/<code>` incognito → "{name} sent you a gift" resolves the
   referrer's display name; `spx_ref` cookie is set (dev tools).
4. Lowercase/mangled variants work: `/r/k7m-2qx`, `?ref=K7M 2QX` — the code
   normalizes separator- and case-insensitively.
5. `/r/<bogus>` → redirects to `/`; `/r/<code>` while signed in → `/app`.
6. Your own code: in onboarding or via `?ref=`, claiming your own code
   returns "That's your own code" and does not attribute.
7. After a referee completes signup + onboarding with a code, check
   `referral_participants.referred_by` is set and `referral_rewards` has a
   `referrer_signup_bonus` row; re-claiming returns "already has a referral".

### Onboarding flow
8. Fresh signup → auth callback lands on `/onboarding` (not `/app`).
   `?next=` on the original link survives into the post-onboarding redirect.
9. Welcome → "Let's go" → username step prefilled from the email local
   part; typing debounces a live availability check (spinner → green ✓ /
   red error). A taken name blocks Continue with "That one's taken."
10. "What will you create?" — clicking an option auto-advances (~300ms
    beat). Same for "How did you hear about us?" — no Continue needed.
11. Interests step — Continue is disabled until ≥1 tile picked and shows
    the count (`Continue · 2`); "Show me everything" skips.
12. Back returns to the previous step with answers intact; dots at the top
    reflect position; the heading receives focus on each step.
13. Source = "A friend sent me" → code step appears. Valid code →
    "{name}'s gift is yours" confirmation → Continue. Invalid code →
    inline error, input preserved. "No code — continue" skips.
14. If the account already has attribution (came via `/r/<code>`), the
    code step shows the applied state instead of the input — no
    double-claim prompt.
15. "Start creating" calls `completeOnboarding` (writes `username`,
    `onboarding_answers`, `onboarding_completed_at`) → lands on `next`.

### Gating + personalization
16. Signed-in with `onboarding_completed_at IS NULL`, hit `/app`,
    `/app/billing`, `/app/favorites` → all redirect to
    `/onboarding?next=<original>`. `/app/create/*` anonymous teaser path
    is unaffected (no session).
17. A user who picked "Poster" and "Cinematic" in onboarding sees products
    from those categories first on `/explore` (default featured view only;
    explicit sort/category/search and deep pages keep canonical order).
18. An account created before this deploy has `onboarding_completed_at`
    set → never sees the flow.

### Mobile + a11y
19. Narrow viewport: step content stays centered, tile grid is 3-up, CTA
    stays above the keyboard on the username/code inputs.
20. Keyboard: Enter submits on username (when available) and the code
    input; Back/Skip buttons are reachable; dots are `aria-hidden`.

## Notes

- The referrer signup bonus is 50 credits per confirmed signup
  (placeholder pending product confirmation) plus the existing 30%
  first-payment credit share — both idempotent via ledger key +
  unique reward constraints.
- GrowSurf remains dormant: `syncParticipantToGrowSurf` still runs in the
  callback but `/app/referrals` renders zero third-party UI.
- `promo_events` records `impression` per step view, `accept`/`decline`
  on the code step, and `dismiss` on skips — all with
  `context: "onboarding"`.
