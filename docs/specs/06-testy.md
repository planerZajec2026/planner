# Spec 06: Testy aplikacji

**Branch:** `feat/06-testy` · **Route(s):** none (tooling + tests)

## Goal
Add an automated test suite that guards the behaviour already built in specs 00–04 (and 05 once it exists), so that later work, especially the switch from mock data to Supabase, can't silently break it. The suite has three layers:

| Layer | Tool | What it covers | Where |
|-------|------|----------------|-------|
| Unit | Vitest | Pure functions in `src/lib/` | `src/**/*.test.ts` |
| Component | Vitest + React Testing Library (jsdom) | Client components in isolation | `src/**/*.test.tsx` |
| End-to-end | Playwright | Whole pages in a real browser against a production build | `e2e/*.spec.ts` |

Async Server Components (pages, `HarmonogramGrupy`, `HarmonogramProwadzacego`) can't be rendered by React Testing Library. They are covered by the e2e layer only.

## Tooling

### Dependencies (dev)
- `vitest`, `@vitejs/plugin-react`, `jsdom`
- `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
- `@playwright/test`, `@axe-core/playwright`

### Config
- `vitest.config.ts`:
  - `environment: "jsdom"`;
  - alias `@` → `src` (matching `tsconfig.json`);
  - `setupFiles: ["./vitest.setup.ts"]`, which imports `@testing-library/jest-dom/vitest` and calls `cleanup()` after each test;
  - `include: ["src/**/*.test.{ts,tsx}"]`, so Playwright files are never picked up.
- `playwright.config.ts`:
  - `testDir: "e2e"`;
  - `webServer`: `npm run build && npm run start -- -p 3100`, `url: http://127.0.0.1:3100`, `reuseExistingServer: !process.env.CI`;
  - projects: `desktop` (Chromium, 1440×900) and `phone` (Chromium, 390×844). Only tests tagged `@phone` run in the phone project;
  - `use: { locale: "pl-PL", timezoneId: "Europe/Warsaw", trace: "retain-on-failure" }`.
- `next/navigation` is mocked in component tests with `vi.mock`. A small helper, `src/test/navigation.ts`, exposes the `replace` spy and lets a test set the current `pathname` and `searchParams`.

### npm scripts
- `test`: `vitest run`
- `test:watch`: `vitest`
- `test:e2e`: `playwright test`
- `test:all`: `npm run test && npm run test:e2e`

### Workflow change
Update the "Workflow" section of [the specs index](README.md). Before a branch is merged, `npm run test` and `npm run test:e2e` must pass, in addition to `npm run lint` and `npm run build`.

## Rules for writing tests
- **No dependence on today's date.**
  - Unit tests use fixed dates.
  - E2e tests always pass `?tydzien=`. The only exception is the "defaults to the current week" test, which computes the expected Monday itself.
- **Query like a user.** Use `getByRole`, `getByLabelText` and `getByText` with the Polish UI strings. CSS classes are used only where the class *is* the behaviour, e.g. layout checks or `.class-block` grid placement.
- **Every e2e test fails on browser errors.** A shared fixture in `e2e/fixtures.ts` collects `pageerror` and `console.error` and asserts the list is empty after each test.
- **Test names are in English.** Assertions use the real Polish UI strings.
- Tests read the same mock data as the app, through `src/lib/data/*`. Keep expected values in sync with `src/lib/mock-data.ts`. Never import `mock-data.ts` from a test directly, so tests keep working once the data layer reads from Supabase.

## Small refactors this spec needs
- Move `layoutDay` (lane assignment for overlapping classes) out of `WeekCalendar.tsx` into `src/components/calendar/layout.ts` and export it, so it can be unit-tested.

## Unit tests (`src/lib/`)

### `dates.test.ts`
- `parseISODate`: returns `null` for `"2026-02-30"`, `"2026-1-5"`, `""` and `undefined`, and returns a local date for `"2026-10-12"`.
- `startOfWeek`: returns Monday for every day Mon–Sun of one week, including Sunday.
- `weekLabel` formats:
  - same month: `"12–18 października 2026"`;
  - across months: `"28 września – 4 października 2026"`;
  - across years: `"29 grudnia 2025 – 4 stycznia 2026"`.
- `isoWeekNumber`:
  - 2026-10-12 → 42;
  - 2026-01-01 → 1;
  - 2020-12-31 → 53;
  - 2021-01-03 → 53 (belongs to the previous ISO year).
- `timeToMinutes` and `minutesToTime` convert back and forth, e.g. `"08:05"` ⇄ 485.

### `pl.test.ts`
- `pluralPl` for 1, 2, 4, 5, 12, 14, 21, 22, 112: one / few / many forms.
- `normalize`:
  - `"Łódź"` → `"lodz"`;
  - `"  GÓRSKI "` → `"gorski"`.

### `schedule.test.ts`
- `zajeciaWTygodniu`:
  - `parzyste` classes appear only in even ISO weeks and `nieparzyste` only in odd ones;
  - `co-tydzien` classes appear in both.
- `sumaGodzin`:
  - 08:00–10:00 + 12:00–13:30 → 3.5;
  - an empty list → 0.
- `typLabel` returns the Polish label for each of the 4 types.

### `grupa-selection.test.ts`
Use the real groups and programmes from `getGrupy()` and `getKierunki()`.
- `{ grupa: "inf-z-3" }` → niestacjonarne / informatyka / INF/Z-3.
- `{}` → the first group's mode and programme, and the first group.
- `{ tryb: "stacjonarne", kierunek: "zarzadzanie", grupa: "inf-z-3" }` → ZIP-1A, because the requested group doesn't match.
- Unknown values (`tryb: "xyz"`, `kierunek: "nope"`) are ignored.
- A mode and programme with no groups → `grupy: []`, `grupa: undefined`.

### `prowadzacy.test.ts`
- `pelneImie` → `"dr hab. Marta Nowak"`.
- `inicjaly` → `"MN"`, and upper-cases a lower-case input.

### `calendar/layout.test.ts`
- Non-overlapping classes each get `lane 0` and `lanes 1`.
- Two overlapping classes get lanes 0 and 1, with `lanes 2`.
- A chain A–B overlapping and B–C overlapping, where A and C don't overlap: C reuses lane 0, and all three have `lanes 2`.
- A class that starts exactly when another ends doesn't overlap it.

### Spec 05 (written together with spec 05)
- `import.test.ts`:
  - `parsePlanJson` accepts the design's sample;
  - it rejects invalid JSON with "Nieprawidłowy plik JSON";
  - it reports a missing field as "Brak pola „grupa”";
  - it reports a bad `typ`, a bad `dzien`, and `od >= do` with the row index;
  - `dzienFromNazwa` handles case and missing diacritics (`"sroda"`, `"Środa"`, `"PIATEK"`).
- `conflicts.test.ts`:
  - the design's sample clashes with "Bazy danych" in B21 on Friday 18:00–20:00;
  - classes that only touch each other (one ends at 10:00, the next starts at 10:00) don't conflict;
  - a clash is detected separately for the same group, the same room and the same instructor.

## Component tests

### `KierunkiList.test.tsx`
- Renders the 3 programmes with group counts ("4 grupy", "2 grupy", "2 grupy").
- Typing "zarz" shows only Zarządzanie. Typing "inf/z" shows only the INF/Z groups. Typing "xyz" shows "Brak wyników dla „xyz”."
- Each "Harmonogram" link points to `/harmonogram?grupa=<id>`.

### `WeekCalendar.test.tsx`
- Renders 7 headers, "Pon 12.10" … "Niedz 18.10", for `weekStart` 2026-10-12. The Saturday and Sunday headers have the `weekend` class.
- A 12:00–13:30 class gets `grid-row: 18 / 24` with the default 8–20 range.
- Two overlapping classes get `width` and `margin-left` that place them side by side.
- A class at 07:00 extends the time column to start at "7:00".

### `WeekNav.test.tsx`
- "Następny tydzień" calls `router.replace` with `tydzien` moved by +7 days. Other params already in the URL (e.g. `grupa`) are kept.
- The label shows the new week once the page re-renders with it. A mocked `router.replace` finishes its transition instantly, so the optimistic label shown *during* a real navigation can only be observed in e2e. The `harmonogram-grup` week-button test covers it there.

### `GrupaFilters.test.tsx`
- Starting from INF/Z-3, changing "Tryb studiów" to Stacjonarne calls `router.replace` with `tryb=stacjonarne`, `kierunek=informatyka` and `grupa=inf-2a`. Compare param values, not the raw query string; param order is not guaranteed.
- Picking a mode and programme with no groups shows a disabled "Grupa" select reading "Brak grup", and removes `grupa` from the URL.

### `ProwadzacyForm.test.tsx`
- Submitting empty shows "To pole jest wymagane" under Imię, Nazwisko and E-mail. Focus moves to Imię. Each field gets `aria-invalid`.
- An e-mail like "zly-adres" shows "Nieprawidłowy adres e-mail".
- Typing in a field with an error clears that error.
- A valid submit calls `onSave` once with trimmed values. `"Bazy danych , SQL,, "` becomes `["Bazy danych", "SQL"]`.

### `ProwadzacyView.test.tsx`
- The toggle button reads "+ Dodaj prowadzącego" when the form is closed and "Anuluj" when it is open. It has the matching `aria-expanded`.
- Saving adds the card at the top and closes the form. It shows "Dodano prowadzącego (dane lokalne)".
- Searching "sieci" leaves only "dr Paweł Zieliński". Searching "kaminska" finds "prof. Ewa Kamińska". Searching "xyz" shows "Brak prowadzących spełniających kryteria."

### Spec 05 components (written together with spec 05)
`JsonImport`, `ManualZajeciaForm`, `ExportPanel`: cover their acceptance criteria. For file input, use `userEvent.upload` with a `File` built from the sample JSON.

## End-to-end tests (`e2e/`)

### `layout.spec.ts`
- Run for every route at 1440, 1024 and 780 px wide, on a page made taller than the viewport:
  - after scrolling, the sidebar's top is still 0 and its height equals the viewport;
  - `main.content` is the element that scrolled, and `document.scrollingElement.scrollTop` stays 0;
  - there is no horizontal page overflow.
- `@phone`: the sidebar stacks above the content, the whole page scrolls, and there is no horizontal overflow.
- The active nav item has `aria-current="page"` on each route.
- `/` redirects to `/kierunki`.

### `kierunki.spec.ts`
- Spec 01 acceptance criteria.
- Clicking "Harmonogram" for INF/Z-3 opens `/harmonogram?grupa=inf-z-3`.

### `harmonogram-grup.spec.ts`
- `?grupa=inf-z-3&tydzien=2026-10-12`: 2 `.class-block`s on Friday, 5 on Saturday and 3 on Sunday. Their meta lines match the design, e.g. "B21 · dr Paweł Zieliński".
- Parity:
  - INF-2A in week 2026-10-12 (even) shows the Wednesday "Programowanie obiektowe" lab;
  - in week 2026-10-19 (odd) it shows the Thursday "Matematyka dyskretna" class instead.
- Changing "Tryb studiów" narrows the "Grupa" options and updates the URL and the grid.
- The prev/next week buttons change the label, the header dates and `tydzien`.
- With no params, the page shows the first group and the current week. The test computes the expected Monday itself.
- At 780 px, `.calendar-scroll` scrolls horizontally (`scrollWidth > clientWidth`) and keeps its full height.

### `prowadzacy.spec.ts`
- 6 cards from the design. Searching "sieci" leaves only dr Paweł Zieliński.
- Invalid submit shows errors. A valid submit with a photo adds a card at the top, with an `<img>` avatar and the success message.
- "Zobacz harmonogram" opens `/harmonogram-prowadzacych?prowadzacy=<id>`.

### `harmonogram-prowadzacego.spec.ts`
- `?prowadzacy=p-zielinski&tydzien=2026-10-12`:
  - 4 classes: Mon 10–12, Tue 14–16, Fri 16–18 and Sun 10–12;
  - stats: "8 godz.", "3 grupy", "2 tryby studiów";
  - meta lines like "B21 · Grupa INF-2A · stacjonarne".
- Switching to Górski and then moving to the next week updates the card, the stats ("6 godz.", "2 grupy") and the grid.

### `import-eksport.spec.ts` (written together with spec 05)
The spec 05 acceptance criteria, including the narrow-width stacking.

### `a11y.spec.ts`
- Run `@axe-core/playwright` on every route, with the add-instructor form open on `/prowadzacy`.
- No `serious` or `critical` violations, colour contrast included. Also scan `/import-eksport` with an import preview, the form errors and the export banner showing.

## CI
Add `.github/workflows/ci.yml`, triggered on push and pull request. It runs:
1. `npm ci`
2. `npm run lint`
3. `npm run test`
4. `npx playwright install --with-deps chromium`
5. `npm run test:e2e`

On failure it uploads the Playwright report and traces as an artifact.

## Backend TODOs
- `TODO(backend)`: once `src/lib/data/*` reads from Supabase, run the e2e suite against a local Supabase (`supabase start`) seeded with the current mock data (`supabase/seed.sql`), so the expected values above still hold.
- `TODO(backend)`: add integration tests for the server actions and route handlers, covering instructor insert with a unique e-mail, JSON import inside a transaction, server-side conflict checks, and the `.xlsx` export.

## Acceptance criteria
- `npm run test` and `npm run test:e2e` pass on a clean checkout. The suite contains all the cases listed above for specs 00–04.
- Breaking any one of these makes at least one test fail:
  - the parity filter;
  - the group cascade;
  - the form validation;
  - the sidebar layout.
- No test depends on the current date, except the "current week" default test, which computes its own expectation.
- CI runs lint, unit/component tests and e2e tests, and publishes a Playwright report on failure.
