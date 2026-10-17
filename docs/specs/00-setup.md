# Spec 00: Project setup, layout & data layer

**Branch:** `feat/00-setup`

## Goal
Create the Next.js app skeleton. Every later spec builds on it: shared layout, design styles, domain types, mock data, the data-access layer and Supabase client stubs.

## Scope

### Tooling
- Next.js (App Router), TypeScript, ESLint, with code under `src/`. No Tailwind.
- npm scripts: `dev`, `build`, `start`, `lint`.
- `README.md`, in Polish: what the app is, how to run it, where the specs live.
- `.env.example` containing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Styles & fonts
- `src/app/globals.css`: the design stylesheet ported verbatim (`:root` tokens, `.app-shell`, `.sidebar`, `.btn`, `.card`, `.calendar-*`, `.class-block`, `.instructor-card`, `.form-*`, `.dropzone`, `.json-sample`, `.kierunek-*`, `.grupa-*`, `.conflict-banner`, `.import-*`, …).
- Load Poppins (600) and Inter (300–600) with `next/font/google` and expose them as CSS variables used by `globals.css`.

### Layout
- `src/app/layout.tsx`: `<html lang="pl">`, metadata title "Siatka — plan zajęć uczelni", renders `AppShell`.
- `AppShell` renders `Sidebar` plus `<main className="content">`.
- `Sidebar` contains:
  - brand mark (calendar icon) with "Siatka" / "Plan zajęć uczelni";
  - nav items: Kierunki i grupy → `/kierunki`, Harmonogram grup → `/harmonogram`, Prowadzący → `/prowadzacy`, Harmonogram prowadzących → `/harmonogram-prowadzacych`, Import i eksport danych → `/import-eksport`;
  - the active item is chosen with `usePathname`;
  - footer "Rok akademicki 2026/2027 / Semestr zimowy" (TODO(backend): current academic year/semester).
- `PageHeader` takes a title, a description, an optional back link and action children.
- `/` redirects to `/kierunki`.

### UI primitives (`src/components/ui/`)
`Icon` (inline stroke SVGs from the design), `Button`/`ButtonLink` (primary/secondary), `SearchField`, `SelectField` (filter-bar style, uppercase label), `FormField` (form label plus input/select), `Tag`, `Avatar` (initials).

### Data
- `src/lib/types.ts`: the domain model from the [index](README.md).
- `src/lib/mock-data.ts`: every entity shown in the design. That means 3 programmes, 8 groups, the 6 instructors, and the classes visible on both calendars.
- `src/lib/data/*.ts`: async functions that return mock data. Each one carries a `TODO(backend)` describing the Supabase query that will replace it.
  - `kierunki.ts`: `getKierunki()`, `getGrupy()`, `getGrupa(id)`
  - `prowadzacy.ts`: `getProwadzacy()`, `getProwadzacyById(id)`
  - `zajecia.ts`: `getZajeciaGrupy(grupaId)`, `getZajeciaProwadzacego(prowadzacyId)`, `getWszystkieZajecia()`
- `src/lib/supabase/client.ts` and `server.ts`: `@supabase/ssr` client factories. They are not called anywhere yet (TODO(backend)).
- `src/lib/dates.ts`: helpers for the Monday of a week, the week range, the Polish week label ("12–18 października 2026"), day labels, even/odd ISO week, and `HH:MM` ⇄ minutes.

### Pages
Placeholders for the 5 routes, each showing only its `PageHeader`.

## Acceptance criteria
- `npm run dev` serves every route. The sidebar highlights the current route.
- The visual style matches the design: tokens, fonts, pill buttons, white sidebar.
- At phone width the sidebar wraps above the content, with no horizontal page scroll.
- `npm run lint` and `npm run build` pass.
