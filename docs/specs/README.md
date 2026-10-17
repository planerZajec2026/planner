# Siatka: frontend specs

Frontend for **Siatka**, a university timetable planner. Built with Next.js (App Router) + TypeScript; Supabase is the planned backend.

**Design source:** [Claude Design canvas "Siatka — planer zajęć na studia"](https://claude.ai/artifact/BeDZgnTmohanL6XoEWa3CS)

## Scope of this phase

- UI only. Every screen renders from **mock data** in `src/lib/mock-data.ts`, which is accessed only through the async data layer in `src/lib/data/`.
- No backend logic. Each place that will need Supabase or server work is marked `// TODO(backend): …`. To list them all, run `grep -rn "TODO(backend)" src`.
- The UI language is **Polish**. Code identifiers for domain concepts are also Polish (`kierunek`, `grupa`, `zajecia`, `prowadzacy`), matching the design and the JSON import format.
- Styling is the design's stylesheet ported as-is into `src/app/globals.css` (tokens plus classes). Fonts are Poppins 600 for headings and Inter for body text.

## Specs

| # | Spec | Branch | Route(s) |
|---|------|--------|----------|
| 00 | [Project setup, layout & data layer](00-setup.md) | `feat/00-setup` | all (placeholders) |
| 01 | [Kierunki i grupy](01-kierunki-grupy.md) | `feat/01-kierunki-grupy` | `/kierunki` |
| 02 | [Harmonogram grup](02-harmonogram-grup.md) | `feat/02-harmonogram-grup` | `/harmonogram` |
| 03 | [Prowadzący](03-prowadzacy.md) | `feat/03-prowadzacy` | `/prowadzacy` |
| 04 | [Harmonogram prowadzącego](04-harmonogram-prowadzacego.md) | `feat/04-harmonogram-prowadzacego` | `/harmonogram-prowadzacych` |
| 05 | [Import i eksport danych](05-import-eksport.md) | `feat/05-import-eksport` | `/import-eksport` |
| 06 | [Testy aplikacji](06-testy.md) | `feat/06-testy` | none (tooling + tests) |
| 07 | [Animacje i mikrointerakcje](07-animacje.md) | `feat/07-animacje` | all |

## Workflow

Each spec is built on its own branch, created from the latest `main`. Before a branch is merged back with `git merge --no-ff`, both of these must pass:

```bash
npm run lint
npm run build
```

Once spec 06 is merged, these must pass as well:

```bash
npm run test
npm run test:e2e
```

## Domain model (shared by all specs)

| Type | Fields |
|------|--------|
| `TrybStudiow` | `"stacjonarne" \| "niestacjonarne"` |
| `Kierunek` | `id`, `nazwa` |
| `Grupa` | `id`, `kod` (e.g. `INF/Z-3`), `kierunekId`, `tryb`, `liczbaStudentow` |
| `Prowadzacy` | `id`, `tytul`, `imie`, `nazwisko`, `instytut`, `email`, `przedmioty[]`, `zdjecieUrl?` |
| `TypZajec` | `"wyklad" \| "cwiczenia" \| "laboratorium" \| "seminarium"` |
| `DzienTygodnia` | `1` (Mon) … `7` (Sun) |
| `Powtarzalnosc` | `"co-tydzien" \| "parzyste" \| "nieparzyste"` |
| `Zajecia` | `id`, `przedmiot`, `typ`, `prowadzacyId`, `grupaId`, `dzien`, `od` (`"HH:MM"`), `do`, `sala`, `powtarzalnosc` |
