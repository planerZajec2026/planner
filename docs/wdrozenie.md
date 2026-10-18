# Wdrożenie

Aplikacja działa na **Vercelu**, baza danych na **Supabase**. Szczegóły i uzasadnienie decyzji: [spec 09](specs/09-wdrozenie.md).

| Element | Usługa | Kto wdraża |
|---------|--------|------------|
| Aplikacja Next.js | Vercel, projekt połączony z `github.com/planerZajec2026/planner` | integracja Vercela z GitHubem: `main` → Production, pozostałe gałęzie i PR → Preview |
| Baza danych (schemat ze spec 08) | Supabase | workflow GitHub Actions [`deploy-db.yml`](../.github/workflows/deploy-db.yml) (`supabase db push`) |

Do specu 10 aplikacja czyta dane z mocków, więc działa także bez bazy.

## Stan konfiguracji

Uzupełniaj na bieżąco: nazwy, regiony, daty i to, **które** sekrety istnieją. Nigdy nie wpisuj tu wartości sekretów.

| Co | Wartość |
|----|---------|
| Projekt Supabase | `planner-prod` (do potwierdzenia), region `eu-west-1` (Irlandia), Postgres 17, compute Nano |
| Region funkcji Vercela | `dub1` (Dublin), ustawiony w [`vercel.json`](../vercel.json) |
| Node | 22.x (`engines` w `package.json`, tak samo jak w CI) |
| Środowisko GitHub `production` | sekrety `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`; dodane: — |
| Zmienne w Vercelu (Production, Preview) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; dodane: — |
| Pierwsze wdrożenie produkcyjne | — |
| Seed demo w chmurze | — |

## Jednorazowa konfiguracja (właściciel projektu)

1. **Supabase**
   - [x] Projekt w `eu-west-1`, Postgres 17 (zgodnie z `supabase/config.toml`).
   - [ ] Zanotuj project ref, hasło do bazy i **publishable key** (Settings → API Keys).
   - [ ] Utwórz token dostępu dla CI (Account → Access Tokens).
2. **GitHub**, repozytorium → Settings
   - [ ] Environment `production`, najlepiej z wymaganym recenzentem: wtedy każda migracja do chmury czeka na jedno kliknięcie zatwierdzenia.
   - [ ] W tym środowisku sekrety `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`.
3. **Vercel**
   - [ ] Zaimportuj repozytorium. Preset Next.js i komendę `npm run build` zostaw tak, jak zostały wykryte.
   - [ ] Gałąź produkcyjna: `main`.
   - [ ] Zmienne `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dla Production i Preview. Dla Development nie ustawiaj: lokalnie działa lokalny stack (`npm run db:start`).
     Integracja Supabase z Vercel Marketplace też je ustawia; sprawdź wtedy, czy klucz publishable ma nazwę, którą czyta aplikacja.
   - [ ] **Deployment Checks** wymagające workflow `CI`, żeby czerwony build nigdy nie trafił na Production.

Pierwsze wdrożenie Vercela nie potrzebuje bazy, więc zrób je najpierw: sprawdza, czy build działa na Vercelu.

Migracje ze spec 08 są już w `main`, więc `deploy-db.yml` nie uruchomi się dla nich sam. Po dodaniu sekretów uruchom go raz ręcznie: Actions → Deploy database → Run workflow, z zaznaczonym `seed`, jeśli chcesz dane demo.

### Plany

- Vercel Hobby jest tylko do użytku niekomercyjnego; wdrożenie dla uczelni powinno być na Vercel Pro.
- Projekt Supabase Free (compute Nano) jest wstrzymywany po tygodniu bez aktywności; produkcja powinna być na Supabase Pro.

Decyzja o płatnościach należy do właściciela projektu; kod od niej nie zależy.

## Jak zmiana trafia na produkcję

- **Aplikacja:** każdy PR dostaje adres Preview od Vercela. Po scaleniu do `main` Vercel buduje wersję produkcyjną, a Deployment Checks czekają na zielone `CI`.
- **Schemat bazy:** nowa migracja w `supabase/migrations/` (spec 08). Po scaleniu do `main` uruchamia się `deploy-db.yml`: czeka na zatwierdzenie w środowisku `production`, pokazuje oczekujące migracje (`db push --dry-run`) i je stosuje. Nigdy nie wypychaj migracji ręcznie.
- **Kolejność:** aplikacja i baza wdrażają się niezależnie, w dowolnej kolejności. Dlatego migracje muszą być wstecznie zgodne (expand → migrate → contract).
- **Seed demo:** tylko raz, na świeżym projekcie: Actions → Deploy database → Run workflow, zaznacz `seed`. Bez tej opcji workflow nigdy nie zmienia danych.

Sprawdzenie, czy chmura ma wszystkie migracje (lokalnie, po `npx supabase link`):

```bash
npx supabase migration list
```

## Wycofanie zmian

- **Aplikacja:** w Vercelu Deployments → poprzednie wdrożenie → **Instant Rollback**.
- **Baza:** napisz nową migrację, która odwraca zmianę, i scal ją jak każdą inną. Nigdy nie edytuj ani nie usuwaj migracji, które już trafiły do chmury, i nigdy nie uruchamiaj `db reset` na bazie w chmurze.

## Bezpieczeństwo

- Do przeglądarki trafiają tylko `NEXT_PUBLIC_SUPABASE_URL` i klucz publishable. Oba są publiczne z założenia; dane chroni RLS (spec 08).
- W Vercelu ani w kodzie nie ma żadnego klucza secret ani service-role. Jeśli kolejny spec będzie go potrzebował: zmienna tylko po stronie serwera (bez `NEXT_PUBLIC_`), tylko dla Production, opisana tutaj.
- `SUPABASE_ACCESS_TOKEN` zarządza wszystkimi projektami na koncie właściciela. Jest tylko w środowisku `production` na GitHubie. Wymień go, gdy odchodzi ktoś z dostępem.
- Pliki `.env*` są w `.gitignore`; `.env.example` zawiera tylko nazwy.
- Kontrola po buildzie: w `.next/static` nie może być `sb_secret` ani `service_role`.
