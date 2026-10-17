# Spec 01: Kierunki i grupy

**Branch:** `feat/01-kierunki-grupy` · **Route:** `/kierunki`

## Goal
Let users browse study programmes (kierunki) together with their groups and study modes. This screen is the app's entry point.

## UI
- `PageHeader`:
  - title "Kierunki i grupy";
  - description "Przeglądaj kierunki studiów oraz przypisane im grupy i tryby zajęć.";
  - action: `SearchField` with the placeholder "Szukaj kierunku lub grupy…".
- One `.kierunek-card` per programme:
  - header: programme name, plus a group count in correct Polish plural form ("1 grupa", "2 grupy", "5 grup").
  - one `.grupa-row` per group, showing:
    - group code;
    - `Tag` with the mode ("Stacjonarne" / "Niestacjonarne");
    - "N studentów";
    - link "Harmonogram →" to `/harmonogram?grupa=<id>`.
- Search, client-side, case- and diacritics-insensitive:
  - when a programme name matches, show the programme with all of its groups;
  - otherwise, show only the groups whose code matches;
  - hide programmes that end up with no groups.
- Empty state: "Brak wyników dla „<fraza>”."

## Components
- `src/app/kierunki/page.tsx`: a server component that loads `getKierunki()` and `getGrupy()`.
- `src/components/kierunki/KierunkiList.tsx`: a client component holding the search state.
- `src/lib/pl.ts`: `pluralPl(n, one, few, many)` and `normalize()` (strips diacritics).

## Backend TODOs
- `TODO(backend)`: load programmes and groups from Supabase (`kierunki` joined with `grupy`).
- `TODO(backend)`: student counts may come from a view or aggregate.

## Acceptance criteria
- All 3 programmes and 8 groups from the design are rendered.
- Typing "inf" leaves only Informatyka. Typing "Z-2" leaves INF/Z-2 and ZIP/Z-2.
- Each "Harmonogram" link opens the group calendar with that group preselected.
