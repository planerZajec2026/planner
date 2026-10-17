# Spec 02: Harmonogram grup

**Branch:** `feat/02-harmonogram-grup` · **Route:** `/harmonogram?tryb=&kierunek=&grupa=&tydzien=`

## Goal
Show the weekly timetable (Monday–Sunday) for one group. The group is picked by study mode, then programme, then group.

## UI
- Back link "← Kierunki i grupy" to `/kierunki`.
- `PageHeader`:
  - title "Harmonogram zajęć";
  - description "Plan zajęć dla wybranego kierunku i grupy, poniedziałek–niedziela.";
  - action: a secondary button "Eksportuj do Excela" (TODO(backend)).
- Filters bar (`.filters-bar`):
  - **Tryb studiów**: Niestacjonarne (zaoczne) / Stacjonarne.
  - **Kierunek**: all programmes.
  - **Grupa**: only groups that match the selected mode and programme.
    - If the current group stops matching, select the first matching group.
    - If none match, show "Brak grup".
  - **Week navigator** (`WeekNav`): ‹ "12–18 października 2026" ›.
- Every filter value lives in the URL (`useRouter().replace`), so links can be shared.
  - Defaults: the group's own mode and programme when `grupa` is given; otherwise the first group.
  - `tydzien` is the Monday of the week as `YYYY-MM-DD`, defaulting to the current week.
- `WeekCalendar`:
  - CSS grid: a 64px time column plus 7 day columns, a 44px header row, and 56px rows per hour from 8:00 to 20:00;
  - day headers "Pon 12.10" … "Niedz 18.10", with weekend headers and tracks in blue;
  - each class is placed from `od`/`do`. Support non-full hours by using 15-minute grid rows, or by absolute positioning within the day track.
- `ClassBlock`: type tag (Wykład / Ćwiczenia / Laboratorium / Seminarium), subject title, and meta line "sala · prowadzący".
- Week parity: a class with `powtarzalnosc = parzyste` appears only in even ISO weeks, and `nieparzyste` only in odd ones.
- Empty state when the group has no classes: "Brak zajęć w tym tygodniu."

## Components
- `src/components/calendar/WeekCalendar.tsx`: generic. It takes `events: { id, dzien, od, do, typ, tytul, meta }[]`, the week start, and the hour range.
- `src/components/calendar/ClassBlock.tsx`
- `src/components/calendar/WeekNav.tsx`: a client component that updates the `tydzien` search param.
- `src/components/harmonogram/GrupaFilters.tsx`: a client component.
- `src/lib/schedule.ts`: `zajeciaWTygodniu(zajecia, weekStart)` filters by parity. `typLabel(typ)` returns the Polish label for a class type.

## Backend TODOs
- `TODO(backend)`: fetch classes for the group and week from Supabase, including date-based exceptions such as cancelled classes or holidays.
- `TODO(backend)`: export the group timetable to `.xlsx`.

## Acceptance criteria
- `/harmonogram?grupa=inf-z-3` reproduces the design: 2 classes on Friday, 5 on Saturday, 3 on Sunday.
- Changing the mode or programme narrows the group list. Changing the group updates the grid.
- The prev/next week buttons change the label and the dates in the headers.
- The calendar scrolls horizontally inside its card at narrow widths.
