# 5Pixels — Agent Context

## Project

5Pixels is a curated, preset-first AI image-transformation web app. Users choose a visual Filter or Poster, upload a photo, optionally tweak a few schema-driven controls, and receive a generated result — without writing prompts.

## Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript (strict)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Backend / DB:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **Forms:** React Hook Form + Zod
- **Testing:** Vitest + jsdom + React Testing Library
- **Package manager:** pnpm 10.33.0
- **CI / Git:** GitHub Actions, GitHub branch protection
- **Hosting target:** Vercel

## Monorepo layout

```text
5Pixels/
├── apps/web/           # Next.js application (consumer + admin)
├── packages/shared/    # Shared Zod schemas and domain types
├── supabase/
│   ├── migrations/     # SQL migrations
│   └── functions/      # Edge Functions
└── .github/workflows/  # CI definitions
```

## Common commands

Run from repo root:

```bash
# Install dependencies
pnpm install

# Dev server
pnpm dev

# Build
pnpm build

# Lint
pnpm lint

# Type check
pnpm typecheck

# Tests
pnpm test

# Format
pnpm format
```

Per-app commands also work:

```bash
pnpm --filter web dev
pnpm --filter web test
pnpm --filter shared typecheck
```

## Branching and merging

- `main` — production. Only the owner merges here.
- `develop` — integration/staging. Only the owner merges here.
- `feature/*`, `update/*`, `fix/*`, `chore/*` — contributor branches.

Workflow: branch from `develop` → open PR → review → owner merges into `develop` → when ready, owner opens release PR `develop` → `main`.

Branch protection on `main` and `develop` requires:
- PR before merge
- at least one approving review (owner)
- passing CI checks: `lint`, `typecheck`, `test`, `build`
- branch up to date before merge

## Code conventions

- Use conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, etc.
- TypeScript strict mode is enabled; no implicit `any`.
- Use the `cn()` utility from `@/lib/utils` for conditional Tailwind classes.
- Keep server-side secrets and private preset instructions out of client bundles.
- Always use signed URLs for private user assets and outputs.
- Write tests for Zod schemas, state machines, credit math, and critical UI flows.

## Important product rules

1. **Preset-first:** no generic prompt box in V1.
2. **Private intelligence:** AI instructions, provider names, and reference assets stay server-side.
3. **Two content types:**
   - **Filter** — pure style/semantic transformation.
   - **Poster** — AI visual + deterministic text/layout rendering.
4. **Consumer UX** should feel premium and visual; **Admin UX** can be dense and operational.
5. **Landing-page preset cards** must use short MP4/GIF previews, not draggable sliders.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Migrations

When changing schema, add a new SQL file under `supabase/migrations/`. Run locally with Supabase CLI when available:

```bash
npx supabase db reset
npx supabase db start
```

## Documentation

The canonical product spec lives in the markdown files at the repo root (`00_README_MASTER_INDEX.md` through `17_DECISION_LOG_AND_OPEN_QUESTIONS.md`). Read them before making product changes.
