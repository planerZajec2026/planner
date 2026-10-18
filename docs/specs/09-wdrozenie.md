# Spec 09: Wdrożenie — Vercel + Supabase

**Branch:** `feat/09-wdrozenie` · **Route(s):** none (infrastructure, CI/CD)

## Goal
Every push to `main` runs the app in production, and every pull request gets a preview URL. Schema changes reach the cloud database through migrations only, from CI, never by hand.

| Piece | Service | Deployed by |
|-------|---------|-------------|
| Next.js app | **Vercel** project linked to `github.com/planerZajec2026/planner` | Vercel's Git integration: `main` → Production, other branches/PRs → Preview |
| Database (schema from spec 08) | **Supabase** cloud project | GitHub Actions workflow `deploy-db.yml`, running `supabase db push` |

The app still runs on mock data until spec 10, so the first Vercel deploy needs no database at all. Do it first; it proves the build works on Vercel.

## Decisions (defaults; change them here before implementing)
- **Region:**
  - Supabase `eu-west-1` (Ireland), where the project was created;
  - Vercel functions in `dub1` (Dublin), next to the database.
- **One Supabase project to start** (`planner-prod`). Preview deployments use it as well. That's safe while the database refuses every write (spec 08).
- **Add a `planner-staging` project before spec 11 enables writes,** and point Preview deployments at it, so PRs can't change production data.
- **Production data:**
  - the cloud database gets the schema only;
  - the demo seed is applied once, on request (see `deploy-db.yml`), and never automatically.

  Real timetables arrive later through the JSON import.
- **Plans:**
  - Vercel Hobby is for non-commercial use, so a deployment for a university should use Vercel Pro;
  - Supabase Free projects pause after a week without activity, so production should be on Supabase Pro.

  Billing is the project owner's decision; nothing in the code depends on it.

## One-time setup (done by the project owner)
These steps need account access, so they are a checklist, not code. Record what was done in `docs/wdrozenie.md` (created by this spec): project names, regions, and which secrets exist. Never record secret values.

1. **Supabase**
   - Create project `planner-prod` in `eu-west-1`, Postgres 17 (matching `config.toml` from spec 08).
   - Note the project ref, the database password, and the **publishable key** (Settings → API Keys).
   - Create a personal access token for CI (Account → Access Tokens).
2. **GitHub**, repo → Settings:
   - an Environment named `production`, with a required reviewer (optional but recommended), so a migration push to the cloud needs one click of approval;
   - secrets in that environment: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`.
3. **Vercel**
   - Import the GitHub repo. The framework preset is Next.js and the build command is `npm run build`; leave both as detected.
   - Production branch: `main`.
   - Environment variables:
     - for Production and Preview: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from step 1;
     - for Development: leave them unset, because local development uses the local stack (spec 08).
   - Alternatively, install the **Supabase integration** from the Vercel Marketplace, which syncs these variables. If you do, make sure the publishable key ends up under the name the app reads.
   - Enable **Deployment Checks** requiring the GitHub `CI` workflow, so a red build never goes to Production.

## Repository changes

### `package.json`
- `"engines": { "node": "22.x" }`, so Vercel builds with the same Node as CI and local development.

### `vercel.json`
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["dub1"]
}
```
Nothing else. Next.js settings stay in `next.config.ts`; Vercel supports `cacheComponents` and Partial Prefetching natively.

### `.github/workflows/deploy-db.yml`
- **Triggers:**
  - `push` to `main` with `paths: ["supabase/migrations/**"]`;
  - `workflow_dispatch` with a boolean input `seed` (default `false`).
- `concurrency: { group: deploy-db, cancel-in-progress: false }`: migrations never run in parallel.
- **Job** `push-migrations`, `environment: production`:
  1. `actions/checkout`, then `supabase/setup-cli@v1` with the version pinned in `package.json`.
  2. `supabase link --project-ref $SUPABASE_PROJECT_ID`, with `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` from secrets.
  3. `supabase db push --dry-run`, which prints the pending migrations in the log.
  4. `supabase db push`.
  5. Only when `inputs.seed` is true and the run was started by hand: `supabase db push --include-seed`. Use it once, on a fresh project, for the demo data.
- The job never runs `db reset` against the cloud.

### CI (`ci.yml`)
- Unchanged, apart from what spec 08 adds.
- Vercel's Deployment Checks wait for it before promoting a Production deployment.

### Order of deploys
- Vercel deploys the app and `deploy-db.yml` migrates the database independently, in either order.
- That's why spec 08 requires backward-compatible migrations (expand, migrate, contract): the old app must work with the new schema, and the new app must work for the minute before the migration lands.

### Documentation
- `README.md` (Polish) gains a section "Wdrożenie" covering:
  - where production runs;
  - how a PR gets a preview;
  - how a migration reaches the cloud;
  - a link to `docs/wdrozenie.md`.
- `docs/wdrozenie.md`: the setup checklist above, with the actual project names and dates once done, plus rollback notes:
  - app: "Instant Rollback" in Vercel;
  - database: write a new migration that reverts the change. Never edit history.

## Security
- Only `NEXT_PUBLIC_SUPABASE_URL` and the publishable key reach the browser. Both are public by design; RLS (spec 08) is what protects the data.
- No secret or service-role key exists in Vercel or in the code. If a later spec needs one, it is a server-only variable (no `NEXT_PUBLIC_`), scoped to Production, and documented in `docs/wdrozenie.md`.
- `SUPABASE_ACCESS_TOKEN` can manage every project of the owner's account. It lives only in the GitHub `production` environment. Rotate it if a maintainer leaves.
- `.env*` files stay git-ignored (already the case). `.env.example` lists names only.

## Later, not in this spec
- Login redirect URLs for production and preview domains (Supabase Auth URL configuration), in spec 11.
- A custom domain.
- Vercel Analytics or Speed Insights.
- Supabase Branching (a database per PR) instead of a shared staging project.

## Acceptance criteria
- Merging to `main` produces a Production deployment on Vercel, built with Node 22 in region `dub1`, that serves every route.
- Opening a PR produces a Preview URL on the PR. A PR whose CI fails is never promoted to Production.
- After a PR that adds a migration is merged:
  - `deploy-db.yml` runs, waits for approval in the `production` environment (if configured), and applies exactly the new migrations;
  - `supabase migration list` against the cloud matches `supabase/migrations/`.
- `deploy-db.yml` started by hand with `seed: true` on a fresh project loads the demo data. Without the flag it never touches data.
- No secret values appear in the repository, workflow logs or client bundles. Search the built `.next/static` for `sb_secret` and `service_role` to confirm.
- `README.md` and `docs/wdrozenie.md` describe the setup well enough for someone new to deploy a change and roll it back.
