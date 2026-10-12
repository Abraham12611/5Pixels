#!/usr/bin/env bash
# One-command financial DB integration suite:
#   pnpm test:db
#
# Starts the Supabase CLI local Postgres (requires a Docker-compatible
# runtime), applies every migration + seed via db reset, then runs the
# vitest suite in apps/web/tests/db against it. The database is left
# running for fast iteration; `pnpm supabase stop` shuts everything down.
set -euo pipefail

cd "$(dirname "$0")/.."

pnpm supabase db start
pnpm supabase db reset
pnpm --filter @5pixels/web test:db
