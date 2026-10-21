# Issue #139 — Auth & deployment hardening review

Scope: compromised-password protection, admin MFA, auth settings, Vercel
environment variables/secrets, deployment protection, cron auth, webhook
verification, security headers, and release verification for the Next.js
security update (#98).

Status legend: **verified** = checked in code or live config by this
review; **owner action** = requires dashboard/console access the engineer
does not have, or a product-level decision.

## Verified in code

| Control | Evidence | Status |
|---|---|---|
| Cron authentication | All 6 routes (`teaser-sweep`, `credit-drip`, `referral-hold-release`, `article-media-sweep`, `billing-reconcile`, `pricing-sync`) require `Authorization: Bearer $CRON_SECRET`; fail closed (500) when unset, 401 on mismatch | verified |
| Webhook verification | `bachs`, `whop`, `creem` handlers verify HMAC signatures over the raw body; fail closed (500) on missing `*_WEBHOOK_SECRET`, 401 on bad signature | verified |
| Secret exposure | `SUPABASE_SERVICE_ROLE_KEY` only in `lib/supabase/service.ts` + `lib/db/share.ts` (server-only factory, JWT-shape check, `persistSession: false`); no `NEXT_PUBLIC_*` secret, token, or key values | verified |
| Service-side session handling | `proxy.ts` gates `/app` and `/admin` server-side; admin routes check `is_admin`/`is_owner` per request | verified |
| DB authorization | 72 definers pin `search_path`, all `public` tables have RLS, privileged RPCs self-guard — see `issue-139-rpc-permissions.md` | verified (PR D) |
| Security headers | Added in PR E: `nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, HSTS, minimal CSP (`frame-ancestors`, `object-src 'none'`, `base-uri 'self'`), `poweredByHeader: false` | verified (this PR) |

## Owner action required

These are production-dashboard controls the repository cannot change or
verify. Each is listed with the recommended setting.

| Control | Recommendation | Status |
|---|---|---|
| **Leaked-password protection** (Supabase Auth → Settings → Password) | Enable "Prevent use of leaked passwords" (HaveIBeenPwned check). Reviewer confirmed this is still flagged in the project security advisor | owner action |
| **Minimum password length** | Raise to ≥ 8 (local `config.toml` shows 6 — dev-only, but production should be at least 8) | owner action |
| `secure_password_change` | Enable so password changes require recent re-authentication | owner action |
| **Admin MFA** | Enforce TOTP MFA for every account holding `is_admin`/`is_owner` (Supabase MFA is per-user; enforce via policy or process) | owner action |
| **Session/JWT settings** | Confirm access-token expiry ≤ 1h and sensible refresh-token rotation in production | owner action |
| **Vercel environment variables** | Verify `SUPABASE_SERVICE_ROLE_KEY`, `*_WEBHOOK_SECRET`, `CRON_SECRET`, provider API keys are scoped **Production only** (not Preview) where appropriate, and that no secrets are duplicated into `NEXT_PUBLIC_*` vars | owner action |
| **Vercel deployment protection** | Enable protection for preview deployments (SSO/password) so pre-release code isn't publicly reachable | owner action |
| **Supabase SMTP / signup** | Issue #216: signup emails fail with Resend 550 `5pixels.app domain not verified` — verify sender-domain DNS. This is a **release blocker** already documented on release PR #245 | owner action |
| **Full CSP** | A script-src/style-src policy needs a nonce-based design against Next.js inline payloads; deferred — minimal safe CSP shipped in PR E | documented risk |

## Release verification — Next.js security update (#98 / P0-C)

- `develop` runs `next@16.3.8` (patched); `main` runs `next@16.3.3`
  (vulnerable). The fix has **not reached production**.
- The normal release path exists: **PR #245** (`develop` → `main`,
  "staged Preset Studio 2.0 limited launch") is open but deliberately
  held on launch blockers — chiefly #216 (unverified sender domain →
  broken signup email) plus release-checklist #185.
- **Recommendation**: if the launch hold persists, consider a narrow
  hotfix release that fast-forwards `main` only to the #98 fix, or a
  cherry-pick release branch — the CVE is a public known-vulnerable
  dependency on a live production app and shouldn't wait indefinitely
  for the full feature launch. Owner's call on release mechanics.

## Remaining accepted/documented risks

- `is_admin()`/`is_owner()` and the public catalog/article RPCs are
  intentionally anon-executable (documented in the PR D matrix).
- `sweep_stale_article_uploads` keeps `authenticated` EXECUTE; its body
  rejects non-staff callers (42501) — defense in depth is in the
  function, not the grant.
- Aikido free checks run on PRs; paid Deep Review was declined by the
  reviewer — noted as an accepted coverage gap, not a defect.
