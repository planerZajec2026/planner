# Spec 05: Import i eksport danych

> **Superseded by [spec 13](13-generator-planu.md):** the JSON import described here belonged to the first, mock-up model and was removed. `/import-eksport` now loads the generator's input data (`dane_planu`), and there is no study mode any more.

**Branch:** `feat/05-import-eksport` · **Route:** `/import-eksport`

## Goal
Build the import and export screen:
- Load a timetable from a JSON file and preview the result, including any conflicts.
- Add a single class by hand.
- Export data to Excel.

All persistence and the Excel generation are backend TODOs.

## UI

### Card "Import z pliku JSON"
Two columns:
- **Dropzone** (`.dropzone`)
  - Text: "Przeciągnij plik .json lub kliknij, aby wybrać" and "Jeden plik zawiera cały plan dla kierunku i grupy".
  - A "Wybierz plik" button opens a hidden `<input type="file" accept=".json,application/json">`.
  - Drag & drop is supported, with a highlighted state while a file is dragged over.
- **"Oczekiwany format pliku"**: a `.json-sample` block with the example from the design.

After a file is chosen, it is read on the client (`File.text()` → `JSON.parse`) and validated:
- Top-level fields: `kierunek`, `grupa`, `tryb` (`stacjonarne` | `niestacjonarne`), and a `zajecia[]` array.
- Each class needs: `przedmiot`, `typ` (`wyklad` | `cwiczenia` | `laboratorium` | `seminarium`), `prowadzacy`, `dzien` (Polish day name, without diacritics, case-insensitive), `od`/`do` (`HH:MM`, with `od < do`), and `sala`.

Result panel:
- `.import-summary` showing three counts: **N** "zajęć w pliku", **N** "gotowych do importu", **N** "konfliktów" (danger style).
- A `.conflict-banner` when there are conflicts.
- One `.import-result-row` per class.
- Conflict rows (`.conflict`) are flagged when the class overlaps an existing mock class on the same day for the same group, room or instructor. The note explains it, e.g. "Sala B21 jest zajęta: Bazy danych (INF/Z-3), pt 18:00–20:00".
  - Row actions: "Pomiń" (skip) and "Zastąp" (replace). For now these only change the row's state locally.
- A parse or validation error shows a banner with a Polish message, such as "Nieprawidłowy plik JSON" or "Brak pola „grupa”", plus the row index where relevant.
- Buttons:
  - "Importuj N zajęć": disabled when nothing is valid. It shows the message "Zaimportowano (dane lokalne)". (TODO(backend))
  - "Anuluj": clears the result.

### Card "Dodaj zajęcia ręcznie"
- Form fields: Kierunek, Grupa (filtered by programme), Przedmiot, Typ zajęć, Prowadzący, Dzień tygodnia, Godzina od, Godzina do (`<input type="time">`), Sala, Powtarzalność (Co tydzień / Tygodnie parzyste / Tygodnie nieparzyste).
- Validation:
  - Required fields.
  - `od < do`.
  - Conflict check against mock data, reusing the import conflict logic. A conflict shows the error banner.
- "Dodaj zajęcia do planu" shows the message "Dodano zajęcia (dane lokalne)". (TODO(backend))
- "Wyczyść formularz" resets the form.

### Card "Eksport danych"
- "Zakres eksportu" select: Cały plan uczelni / Wybrany kierunek / Wybrana grupa / Wybrany prowadzący.
- When the scope needs a target, a second select appears for the programme, group or instructor.
- Note: "Plik .xlsx będzie zawierał wszystkie zaplanowane zajęcia wraz z salami i prowadzącymi."
- "Eksportuj do Excela" is a TODO(backend). For now it shows the message "Eksport będzie dostępny po podłączeniu backendu".

## Components
- `src/app/import-eksport/page.tsx`: a server component that loads the mock lists.
- `src/components/import/JsonImport.tsx`: a client component with the dropzone and results.
- `src/components/import/ManualZajeciaForm.tsx`: a client component.
- `src/components/import/ExportPanel.tsx`: a client component.
- `src/lib/import.ts`: `parsePlanJson(text)` returns `{ ok, plan, errors }`. `dzienFromNazwa()`.
- `src/lib/conflicts.ts`: `znajdzKonflikty(nowe, istniejace, ctx)`.

## Backend TODOs
- `TODO(backend)`:
  - Upload the JSON to a route handler or server action.
  - Validate it on the server.
  - Resolve instructors and groups by name.
  - Insert the rows inside a single transaction.
- `TODO(backend)`: check conflicts on the server, with a DB constraint or RPC.
- `TODO(backend)`: insert a manually added class into `zajecia`.
- `TODO(backend)`: generate `.xlsx`, either in a route handler (e.g. with `exceljs`) or a Supabase Edge Function, and return a download.

## Acceptance criteria
- Dropping the sample JSON from the design reports 1 class and 1 conflict, because it duplicates "Bazy danych" in B21 on Friday 18:00–20:00.
- A malformed file shows a readable Polish error and does not crash.
- The manual form blocks submission when `od >= do` or a required field is missing.
- At narrow widths, the two-column import layout stacks into one column.
