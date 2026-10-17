# Spec 03: Prowadzący

**Branch:** `feat/03-prowadzacy` · **Route:** `/prowadzacy`

## Goal
List all instructors with their contact details and subjects, and provide a form for adding a new instructor.

## UI
- `PageHeader`
  - Title: "Prowadzący zajęcia"
  - Description: "Lista prowadzących wraz z danymi kontaktowymi i przypisanymi przedmiotami."
  - Actions:
    - `SearchField` with placeholder "Szukaj po nazwisku lub przedmiocie…"
    - A primary button that toggles the form. It reads "+ Dodaj prowadzącego" when the form is closed and "Anuluj" when it is open.
- Form "Nowy prowadzący" (`.card.form-panel`), shown only when toggled open:
  - Fields:
    - Imię*, Nazwisko*
    - Tytuł naukowy: mgr / mgr inż. / dr / dr inż. / dr hab. / prof.
    - Instytut / Katedra
    - E-mail*: validated as an e-mail address
    - Przedmioty: comma-separated, with the hint "Oddziel przecinkami"
    - Zdjęcie: `<input type="file" accept="image/*">`
  - Validation: required fields and the e-mail format. Errors appear under each field in Polish ("To pole jest wymagane", "Nieprawidłowy adres e-mail").
  - "Zapisz prowadzącego":
    - adds the instructor to local state only, at the top of the list;
    - resets and closes the form;
    - shows the message "Dodano prowadzącego (dane lokalne)".
  - "Anuluj" closes the form.
- Instructor grid (`.card-grid`). Each `.instructor-card` shows:
  - an initials avatar, or the photo preview when a photo was chosen;
  - full name with title, and the institute;
  - e-mail as a `mailto:` link;
  - subject tags;
  - "Zobacz harmonogram", linking to `/harmonogram-prowadzacych?prowadzacy=<id>`.
- Search is client-side and ignores diacritics. It matches the name and the subjects.
- Empty state: "Brak prowadzących spełniających kryteria."

## Components
- `src/app/prowadzacy/page.tsx`: a server component that loads `getProwadzacy()`.
- `src/components/prowadzacy/ProwadzacyView.tsx`: a client component holding the list, search and form-toggle state.
- `src/components/prowadzacy/ProwadzacyForm.tsx`
- `src/components/prowadzacy/ProwadzacyCard.tsx`
- `src/lib/prowadzacy.ts`: `pelneImie(p)` and `inicjaly(p)`

## Backend TODOs
- `TODO(backend)`: insert the instructor into Supabase `prowadzacy` (via server action or route handler) and revalidate the list.
- `TODO(backend)`: upload the photo to Supabase Storage and save `zdjecie_url`.
- `TODO(backend)`: check for a unique e-mail on the server.

## Acceptance criteria
- The 6 instructors from the design are rendered.
- Searching "sieci" shows only dr Paweł Zieliński.
- Submitting an invalid form shows errors. Submitting a valid form adds a card.
