#!/usr/bin/env bash
# One-command financial DB integration suite:
#   pnpm test:db
#
# Starts the full Supabase CLI local stack (Postgres + PostgREST; requires a
# Docker-compatible runtime), applies every migration + seed via db reset,
# then runs the vitest suite in apps/web/tests/db against it. The stack is
# left running for fast iteration; `pnpm supabase stop` shuts it down.
set -euo pipefail

cd "$(dirname "$0")/.."

# Full stack (not `db start`): pricing-sync db tests exercise supabase-js
# queries through PostgREST, so the API gateway must be up.
pnpm supabase start
pnpm supabase db reset

# Expose the local API URL + service role key to the tests. Newer CLIs mint
# per-install keys, so export from `status` rather than hardcoding. The
# anon key + JWT secret let tests mint real authenticated-scoped requests
# (e.g. storage-overwrite attacks through the actual API, not raw SQL).
eval "$(pnpm supabase status -o env \
  | grep -E '^(API_URL|SERVICE_ROLE_KEY|ANON_KEY|JWT_SECRET)=' \
  | sed -e 's/^API_URL=/SUPABASE_TEST_URL=/' \
      -e 's/^SERVICE_ROLE_KEY=/SUPABASE_TEST_SERVICE_ROLE_KEY=/' \
      -e 's/^ANON_KEY=/SUPABASE_TEST_ANON_KEY=/' \
      -e 's/^JWT_SECRET=/SUPABASE_TEST_JWT_SECRET=/')"

pnpm --filter @5pixels/web test:db
