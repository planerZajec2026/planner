# Spec 04: Harmonogram prowadzącego

**Branch:** `feat/04-harmonogram-prowadzacego` · **Route:** `/harmonogram-prowadzacych?prowadzacy=&tydzien=`

## Goal
Show the weekly timetable of one instructor across all of their groups and study modes.

## UI
- Back link "← Prowadzący" to `/prowadzacy`.
- `PageHeader`:
  - title "Harmonogram prowadzącego";
  - description "Plan zajęć wybranego prowadzącego we wszystkich grupach i trybach studiów.";
  - action: "Eksportuj do Excela" (TODO(backend)).
- Filters bar:
  - **Prowadzący** select (min-width 220px). Changing it updates `?prowadzacy=`. The default is the first instructor.
  - `WeekNav`, reused from spec 02.
- Summary card:
  - avatar and full name;
  - "Instytut · e-mail";
  - three stats on the right, calculated from that week's classes:
    - **"N godz."** "w tym tygodniu": sum of class durations;
    - **N** "grupy" / "grupa" / "grup": distinct groups;
    - **N** "tryby studiów" / "tryb studiów": distinct modes.
- `WeekCalendar` from spec 02. Each block's meta line reads "sala · Grupa <kod> · <tryb>".
- Empty state: "Brak zajęć w tym tygodniu."

## Components
- `src/app/harmonogram-prowadzacych/page.tsx`: server component.
- `src/components/harmonogram/ProwadzacyFilters.tsx`: client component.
- `src/components/harmonogram/ProwadzacySummary.tsx`
- `src/lib/schedule.ts`: add `sumaGodzin(zajecia)`.

## Backend TODOs
- `TODO(backend)`: query the instructor's classes for the week from Supabase, joined with groups.
- `TODO(backend)`: export the instructor's timetable to `.xlsx`.

## Acceptance criteria
- `?prowadzacy=p-zielinski` reproduces the design:
  - 4 classes: Mon 10–12, Tue 14–16, Fri 16–18, Sun 10–12;
  - stats: 8 godz., 3 grupy, 2 tryby studiów.

  The design mock shows "4 godz." and "2 grupy", but its own events add up to 8 h and 3 groups. Here the stats are calculated from the events.
- Switching the instructor updates the card, the stats and the grid.
