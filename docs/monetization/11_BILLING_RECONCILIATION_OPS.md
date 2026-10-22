# Billing Reconciliation — Operations

Ops runbook for the Fal Billing Events reconciliation cron (issue #103).
Owned by `lib/billing/fal-billing.ts` behind `GET /api/cron/billing-reconcile`.

## Cadence

**Hourly**, at minute 17 (`"17 * * * *"` in `apps/web/vercel.json`).

Chosen deliberately, not by default:

- Authoritative provider cost settles within ~1h instead of ~24h, so
  generation credit **reserves release sooner** and users aren't holding
  locked credits overnight.
- The overrun circuit breaker — suspending a route whose real billed cost
  exceeds its quoted max — reacts within the hour instead of sleeping a day.
- A broken billing key/API is detected within ~1h via the fail-loud path
  below, not at the next morning's run.
- Hourly is cheap: each run only queries generations still pending
  reconciliation plus the bounded late sweep, and Fal's Billing Events API
  is batched (REQUESTS_PER_CALL per fetch).

Caveat: Vercel cron timing is approximate — treat "hourly" as "roughly once
an hour", never exact-minute. The job is idempotent, so drift is harmless.

## Auth

All cron endpoints require `Authorization: Bearer $CRON_SECRET`; Vercel
injects it automatically for scheduled runs. `CRON_SECRET` must be set in
the production environment — if unset the route returns 500
("Not configured") rather than running unauthenticated. See
`apps/web/.env.example`.

## Fail-loud contract (do not soften)

A failed run must never silently pass:

| Condition | Result |
|---|---|
| `CRON_SECRET` missing | HTTP 500 + error log |
| `FAL_BILLING_KEY` (or `FAL_KEY` fallback) missing | `billing_reconcile_broken` **critical** `admin_alerts` row + HTTP 500 |
| Fal returns 401/403 | `billing_reconcile_broken` **critical** alert + HTTP 500 |
| Every fetch in a run fails (provider outage) | `billing_reconcile_broken` **critical** alert + HTTP 500 |
| Some fetches fail | `billing_reconcile_partial` **warning** alert; affected generations retry next run |

Even when Fal reconciliation is broken, the run still executes the
**database-local 72h fallback**: generations older than 72h with no
billing event settle at the provisional quote math (`fallback_timeout`)
so reserves can't pin forever. The 48h aged-pending warning and the 72h
fallback threshold are product decisions — don't change them here.

## "Cron stopped firing" checklist

Detection (a stopped cron produces *silence*, not alerts — these are the
tells):

1. **Vercel**: Project → Deployments → Crons — check the last-invocation
   timestamp for `/api/cron/billing-reconcile`. Hourly cadence means a gap
   >2h is suspicious.
2. **Logs**: search deployment logs for `[billing-reconcile]` — a healthy
   deploy logs a run every hour.
3. **Data**: generations with an unreconciled billing event aging past
   48h raise the `billing_reconcile_aged_pending` warning alert, and
   fallback settles raise `billing_reconcile_missing_events` — but if the
   *cron itself* is dead, nothing runs to raise either. A growing backlog
   of unreconciled rows (no `billing_reconciled_at`, no
   `billing_reconcile_state`) is the smoke.

Fix:

- Redeploy or re-trigger manually: `curl -H "Authorization: Bearer
  $CRON_SECRET" https://<host>/api/cron/billing-reconcile`. A manual call
  is safe — the job is idempotent.
- If the schedule registration was lost (e.g. vercel.json reverted),
  restore it and redeploy production. Crons only register on production
  deployments.

Blast radius while dead: bounded. New generations still reserve at quote
math; the 72h fallback stops applying, so reserves stay held until the
cron resumes — money stays safe, availability of spendable balance
degrades first.

## Related

- #99 — Fal Billing Events ingestion + overrun circuit breaker.
- #100 — reserve-until-authoritative-settlement, 48h warning, 72h
  fallback, bounded late sweep.
- #83 — annual credit-drip cron (separate cadence, do not couple).
