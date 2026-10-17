# Spec 08: Supabase — CLI, schemat i migracje

**Branch:** `feat/08-supabase-schemat` · **Route(s):** none (database, tooling)

## Goal
Put the database under version control and make it reproducible on any machine:
- the Supabase CLI runs the full stack locally;
- every schema change is a SQL migration in the repo;
- `seed.sql` loads the same data the app shows today, so the UI and all tests keep their expectations;
- TypeScript types are generated from the schema.

This spec creates the database only. The app keeps reading mock data until spec 10 switches `src/lib/data/*` over. That keeps this step small and safe to merge.

## Prerequisites
- **Docker Desktop**, running. The local stack is a set of containers. On Windows, use the WSL 2 backend.
- **Node 22**, as in CI.
- No global install: the CLI is a dev dependency, run with `npx supabase …`.

## Tooling

### CLI
- `npm i -D supabase`, pinned to an exact version (e.g. `2.121.0`). The CLI and the local images move fast, so upgrades are deliberate, in their own commit.
- `npx supabase init` creates `supabase/config.toml`. Then, in `config.toml`:
  - `project_id = "planner"`;
  - `[db] major_version = 17`. Match this to the cloud project in spec 09;
  - `[auth] site_url = "http://localhost:3000"`. Auth itself is configured in spec 11;
  - `[db.seed] sql_paths = ["./seed.sql"]`.
- Default local ports: API 54321, Postgres 54322, Studio 54323, local mail 54324. Keep them.

### npm scripts
| Script | Command | Use |
|--------|---------|-----|
| `db:start` | `supabase start` | Start the local stack and print URLs and keys |
| `db:stop` | `supabase stop` | Stop it (data is kept) |
| `db:status` | `supabase status` | URLs and keys again |
| `db:reset` | `supabase db reset` | Recreate the local DB from all migrations plus `seed.sql` |
| `db:migration` | `supabase migration new` | `npm run db:migration -- add_foo` creates an empty, timestamped migration |
| `db:diff` | `supabase db diff -f` | Turn changes made in Studio into a migration file (review it before committing) |
| `db:types` | `supabase gen types typescript --local > src/lib/supabase/database.types.ts` | Regenerate types after any schema change |
| `db:lint` | `supabase db lint --local --level warning` | Static checks of functions and types |
| `db:advisors` | `supabase db advisors --local --type security` | Security checks, e.g. a table without RLS |
| `db:test` | `supabase test db` | pgTAP tests in `supabase/tests/` |
| `db:seed:generate` | `node --experimental-strip-types scripts/generate-seed.ts` | Rebuild `seed.sql` from `src/lib/mock-data.ts` |

### Environment
- `.env.example` documents:
  - `NEXT_PUBLIC_SUPABASE_URL`;
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, which replaces `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Supabase now issues publishable keys (`sb_publishable_…`), and the old anon key still works in the same place.
- For local development, `.env.local` takes the API URL and the publishable (or anon) key from `npm run db:status`.
- `src/lib/supabase/client.ts` and `server.ts` read the new variable name and take the `Database` generic from `database.types.ts`.
- No secret or service-role key is used anywhere in the app in this spec.

## Rules for migrations
1. **Every schema change is a migration.** Create it with `npm run db:migration -- <snake_case_name>`, or write it in Studio and capture it with `npm run db:diff -- <name>`.
2. **Never edit a migration that has been merged to `main`.** It may already be applied in the cloud (spec 09). Fix forward with a new migration.
3. **One concern per migration**, with a name that says what it does: `create_zajecia`, `add_wyjatki_zajec`.
4. **Same commit:**
   - the migration;
   - `npm run db:types` output;
   - `seed.sql` changes, if the data shape changed;
   - pgTAP tests for new constraints or policies.
5. **Changes must be backward-compatible with the deployed app** (expand, migrate, contract), because Vercel and the database deploy independently (spec 09). Rename a column in three steps: add the new one, ship code that uses it, then drop the old one.
6. `npm run db:reset` must succeed from an empty database. CI enforces this.
7. `supabase db push` to a cloud project runs only from the deploy workflow in spec 09, never by hand from a laptop.

## Schema
Identifiers are Polish and snake_case, matching the domain model in [the index](README.md). `src/lib/data/*` maps rows to the camelCase types in `src/lib/types.ts` (done in spec 10).

### Migration 1: `extensions_and_types`
- `create extension if not exists btree_gist;`, needed for the exclusion constraints below.
- Enums:
  - `tryb_studiow` (`stacjonarne`, `niestacjonarne`);
  - `typ_zajec` (`wyklad`, `cwiczenia`, `laboratorium`, `seminarium`);
  - `powtarzalnosc` (`co-tydzien`, `parzyste`, `nieparzyste`);
  - `tytul_naukowy` (`mgr`, `mgr inż.`, `dr`, `dr inż.`, `dr hab.`, `prof.`).
- `create type timerange as range (subtype = time);`, so hours can be compared with `&&`.

### Migration 2: `create_core_tables`
IDs are `text` with a default of `gen_random_uuid()::text`:
- the seed keeps today's readable ids (`inf-z-3`, `p-zielinski`), which URLs and tests already use;
- new rows get UUIDs.

| Table | Columns | Constraints |
|-------|---------|-------------|
| `kierunki` | `id`, `nazwa text not null`, `created_at timestamptz default now()` | `unique (nazwa)` |
| `grupy` | `id`, `kod text not null`, `kierunek_id text not null → kierunki`, `tryb tryb_studiow not null`, `liczba_studentow int not null default 0`, `created_at` | `unique (kod)`, `check (liczba_studentow >= 0)`, FK `on delete restrict` |
| `prowadzacy` | `id`, `tytul tytul_naukowy not null`, `imie text not null`, `nazwisko text not null`, `instytut text not null default ''`, `email text not null`, `zdjecie_url text`, `created_at` | `unique index on lower(email)` |
| `przedmioty` | `id`, `nazwa text not null` | `unique (nazwa)` |
| `prowadzacy_przedmioty` | `prowadzacy_id → prowadzacy`, `przedmiot_id → przedmioty` | PK on both columns; `on delete cascade` from `prowadzacy` |
| `zajecia` | `id`, `przedmiot_id → przedmioty`, `typ typ_zajec`, `prowadzacy_id → prowadzacy`, `grupa_id → grupy`, `dzien smallint`, `godzina_od time`, `godzina_do time`, `sala text`, `powtarzalnosc powtarzalnosc default 'co-tydzien'`, `created_at` | all `not null`; `check (dzien between 1 and 7)`, `check (godzina_od < godzina_do)`, `check (btrim(sala) <> '')`; FKs `on delete restrict` |

- `do` is a reserved word in SQL, so the columns are `godzina_od` and `godzina_do`. The data layer maps them to `od` and `do`.
- Index the foreign keys that are used for lookups: `grupy(kierunek_id)`, `zajecia(grupa_id)`, `zajecia(prowadzacy_id)`.

### Migration 3: `zajecia_conflicts`
The database enforces the same rules as `src/lib/conflicts.ts`, so two users can't create a clash at the same time.
- Generated columns on `zajecia`:
  - `czas timerange generated always as (timerange(godzina_od, godzina_do, '[)')) stored`. Half-open, so 10:00–12:00 and 12:00–14:00 don't overlap;
  - `tygodnie int4range generated always as (case powtarzalnosc when 'parzyste' then '[0,1)' when 'nieparzyste' then '[1,2)' else '[0,2)' end::int4range) stored`. Weekly overlaps both kinds; even and odd weeks never overlap each other.
- Three exclusion constraints, each with a readable name, because the app turns the name into a Polish message in spec 10:
  - `zajecia_grupa_bez_kolizji exclude using gist (grupa_id with =, dzien with =, czas with &&, tygodnie with &&)`;
  - `zajecia_sala_bez_kolizji exclude using gist (lower(btrim(sala)) with =, dzien with =, czas with &&, tygodnie with &&)`;
  - `zajecia_prowadzacy_bez_kolizji exclude using gist (prowadzacy_id with =, dzien with =, czas with &&, tygodnie with &&)`.

### Migration 4: `calendar_exceptions_and_settings`
- `dni_wolne (data date primary key, opis text not null)`: holidays and days off.
- `odwolane_zajecia (zajecia_id → zajecia on delete cascade, data date, powod text, primary key (zajecia_id, data))`: a single cancelled occurrence.
- `ustawienia`, a single row (`id boolean primary key default true check (id)`):
  - `rok_akademicki text not null`;
  - `semestr text not null check (semestr in ('zimowy', 'letni'))`.

  This feeds the sidebar footer.
- Nothing reads these tables yet. Spec 10 uses them for the week view.

### Migration 5: `rls_read_policies`
- `alter table … enable row level security` on **every** table in `public`, existing and future. CI checks it (see Tests).
- One `select` policy per table for `anon, authenticated`, using `(true)`: the timetable is public within the app.
- **No insert, update or delete policies.** Until login exists (spec 11), the database refuses all writes through the API. Writes are opened in spec 11, for signed-in users with the planner role only.
- `grant select` is left at Supabase's defaults. `npx supabase db advisors --local --type security` must report nothing (CI enforces it).

## Seed data
- `scripts/generate-seed.ts` imports `KIERUNKI`, `GRUPY`, `PROWADZACY` and `ZAJECIA` from `src/lib/mock-data.ts` and writes `supabase/seed.sql`:
  - one `insert … values` per table, in FK order;
  - `przedmioty` collected from the instructors' subjects and the classes' subjects;
  - every value escaped as a SQL literal;
  - one `ustawienia` row (`2026/2027`, `zimowy`);
  - a header comment saying the file is generated.
- `seed.sql` is committed. Regenerate it whenever `mock-data.ts` changes. CI checks that it's current.
- Ids stay identical to the mock data, so every e2e expectation from spec 06 still holds after spec 10.

## Types
- Run `npm run db:types` after each migration and commit `src/lib/supabase/database.types.ts`.
- Export small aliases next to the clients, e.g. `type ZajeciaRow = Database["public"]["Tables"]["zajecia"]["Row"]`.

## Tests (pgTAP, `supabase/tests/*.test.sql`)
- `schema.test.sql`:
  - every table exists;
  - RLS is enabled on every table in `public` (a query over `pg_tables` / `pg_class.relrowsecurity` lists none without it);
  - the enums have exactly the values above.
- `zajecia_constraints.test.sql`:
  - clash on the same group, the same room (ignoring case and spaces) and the same instructor, each rejected by its named constraint;
  - touching times (10:00–12:00 and 12:00–14:00) are allowed;
  - `parzyste` against `nieparzyste` is allowed, `co-tydzien` against either is rejected;
  - `godzina_od >= godzina_do` and `dzien = 8` are rejected.
- `rls.test.sql`:
  - as `anon`, `select` works on every table;
  - `insert`, `update` and `delete` fail on `zajecia` and `prowadzacy`.
- The design's JSON sample (Bazy danych, B21, Friday 18:00–20:00, INF/Z-3) fails on insert against the seed, matching `conflicts.test.ts`.

## CI
A new job, `database`, in `.github/workflows/ci.yml`:
1. `supabase/setup-cli@v1` with the pinned version.
2. `supabase db start`, then `supabase db reset`: migrations plus seed from scratch.
3. `supabase test db`.
4. `supabase db lint --local --level warning --fail-on warning`.
5. `supabase db advisors --local --type security --fail-on warn`.
6. Run `npm run db:types` and `npm run db:seed:generate`, then `git diff --exit-code`, so types and seed are never stale.

The existing `test` job is unchanged and still runs on mock data.

## Out of scope
- Reading from Supabase in the app (spec 10).
- Writes, login and roles (spec 11).
- Storage for instructor photos (spec 11).
- The cloud project and deployment (spec 09).

## Acceptance criteria
- On a fresh clone with Docker running:
  - `npm ci && npm run db:start && npm run db:reset` produces a database with the seed data;
  - Studio at `http://127.0.0.1:54323` shows it.
- `npm run db:test` passes, and every case listed under Tests exists.
- Inserting the design's sample class is rejected with `zajecia_sala_bez_kolizji` (or the group/instructor constraint).
- As `anon` through the API, `select` works and every write is refused.
- CI's `database` job passes, and fails if a migration is edited so that `db reset` breaks, or if types or seed are stale.
- `npm run lint`, `npm run build`, `npm run test` and `npm run test:e2e` still pass, since the app still uses mock data.
