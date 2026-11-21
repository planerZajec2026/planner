# Wdrożenie

Aplikacja działa na **Vercelu**, baza danych na **Supabase**. Szczegóły i uzasadnienie decyzji: [spec 09](specs/09-wdrozenie.md).

| Element | Usługa | Kto wdraża |
|---------|--------|------------|
| Aplikacja Next.js | Vercel, projekt połączony z `github.com/planerZajec2026/planner` | integracja Vercela z GitHubem: `main` → Production, pozostałe gałęzie i PR → Preview |
| Baza danych (schemat ze spec 08 i 13) | Supabase | workflow GitHub Actions [`deploy-db.yml`](../.github/workflows/deploy-db.yml) (`supabase db push`) |
| Worker generatora planu (spec 13) | GitHub Actions | workflow [`solver-worker.yml`](../.github/workflows/solver-worker.yml), z gałęzi `main`, uruchamiany przez bazę przy każdym nowym zadaniu (zapasowo co 5 minut) |

Strony czytają wszystko z bazy (spec 13). Bez danych wejściowych pokazują „Brak danych wejściowych”.

## Stan konfiguracji

Uzupełniaj na bieżąco: nazwy, regiony, daty i to, **które** sekrety istnieją. Nigdy nie wpisuj tu wartości sekretów.

| Co | Wartość |
|----|---------|
| Adres produkcyjny | https://studia-planer.vercel.app (projekt Vercela `planner`, zespół `thewebcookies-projects`) |
| Projekt Supabase | `planner`, region `eu-west-1` (Irlandia), Postgres 17, compute Nano (plan Free) |
| Region funkcji Vercela | `dub1` (Dublin), ustawiony w [`vercel.json`](../vercel.json) |
| Node | 22.x (`engines` w `package.json`, tak samo jak w CI) |
| Środowisko GitHub `production` | sekrety `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`; dodane 2026-10-18. Bez wymaganego recenzenta: migracje wgrywają się bez zatwierdzania |
| Zmienne w Vercelu (Production, Preview) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; dodane 2026-10-18. `SUPABASE_SERVICE_ROLE_KEY` (tylko serwer); dodany 2026-11-16 |
| Pierwsze wdrożenie produkcyjne | 2026-10-18, commit `9b82405` (spec 09); wszystkie strony odpowiadają, w JS brak `sb_secret` i `service_role` |
| Migracje w chmurze | 5 ze spec 08 (2026-10-18, ręczne uruchomienie `deploy-db.yml`) i 6 ze spec 13 (2026-11-16, automatycznie po scaleniu PR #4, w tym `usun_stary_model`) |
| Dane wejściowe w chmurze | wgrane 2026-11-16 na stronie Import danych; seed z workflow nie był uruchamiany |
| Worker generatora | `solver-worker.yml` na GitHub Actions, od 2026-11-16; używa sekretów środowiska `production` |

## Jednorazowa konfiguracja (właściciel projektu)

1. **Supabase**
   - [x] Projekt w `eu-west-1`, Postgres 17 (zgodnie z `supabase/config.toml`).
   - [x] Zanotuj project ref, hasło do bazy i **publishable key** (Settings → API Keys).
   - [x] Utwórz token dostępu dla CI (Account → Access Tokens).
2. **GitHub**, repozytorium → Settings
   - [x] Environment `production`.
   - [ ] Wymagany recenzent w tym środowisku (zalecane): wtedy każda migracja do chmury czeka na jedno kliknięcie zatwierdzenia.
   - [x] W tym środowisku sekrety `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`.
3. **Vercel**
   - [x] Zaimportuj repozytorium. Preset Next.js i komendę `npm run build` zostaw tak, jak zostały wykryte.
   - [x] Gałąź produkcyjna: `main`.
   - [x] Zmienne `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dla Production i Preview. Dla Development nie ustawiaj: lokalnie działa lokalny stack (`npm run db:start`).
     Integracja Supabase z Vercel Marketplace też je ustawia; sprawdź wtedy, czy klucz publishable ma nazwę, którą czyta aplikacja.
   - [ ] **Deployment Checks** wymagające workflow `CI`, żeby czerwony build nigdy nie trafił na Production.

Pierwsze wdrożenie Vercela nie potrzebuje bazy, więc zrób je najpierw: sprawdza, czy build działa na Vercelu.

Migracje ze spec 08 trafiły do `main` przed `deploy-db.yml`, więc wgrano je jednym ręcznym uruchomieniem (2026-10-18, bez `seed`). Dane demo można wgrać później tak samo: Actions → Deploy database → Run workflow, z zaznaczonym `seed`.

### Plany

- Vercel Hobby jest tylko do użytku niekomercyjnego; wdrożenie dla uczelni powinno być na Vercel Pro.
- Projekt Supabase Free (compute Nano) jest wstrzymywany po tygodniu bez aktywności; produkcja powinna być na Supabase Pro.

Decyzja o płatnościach należy do właściciela projektu; kod od niej nie zależy.

## Jak zmiana trafia na produkcję

- **Aplikacja:** każdy PR dostaje adres Preview od Vercela. Po scaleniu do `main` Vercel buduje wersję produkcyjną, a Deployment Checks czekają na zielone `CI`.
- **Schemat bazy:** nowa migracja w `supabase/migrations/` (spec 08). Po scaleniu do `main` uruchamia się `deploy-db.yml`: czeka na zatwierdzenie w środowisku `production`, pokazuje oczekujące migracje (`db push --dry-run`) i je stosuje. Nigdy nie wypychaj migracji ręcznie.
- **Kolejność:** aplikacja i baza wdrażają się niezależnie, w dowolnej kolejności. Dlatego migracje muszą być wstecznie zgodne (expand → migrate → contract).
- **Dane wejściowe:** strony czytają wszystko z bazy (spec 13). Na świeżym projekcie baza jest pusta, a dane wgrywa się na stronie Import danych albo jednorazowo seedem: Actions → Deploy database → Run workflow, zaznacz `seed` (seed wywołuje `wgraj_dane_planu` z danymi z `requirements/`). Bez tej opcji workflow nigdy nie zmienia danych.
- **Klucz do zapisu:** import danych i przycisk „Generuj" zapisują do bazy przez Server Action z kluczem `service_role`. Ustaw `SUPABASE_SERVICE_ROLE_KEY` (secret key z Supabase → Settings → API Keys) w Vercelu dla Production i Preview, **bez** prefiksu `NEXT_PUBLIC_` i nigdy w repo. Worker planu działa poza Vercelem i łączy się z bazą przez `DATABASE_URL` (niżej).
- **Migracja usuwająca stary model** (`usun_stary_model`) kasuje tabele makiety ze spec 08; w chmurze zawierały tylko makietę, bo seed nie był tam wgrywany.

## Worker generatora planu

Przycisk „Generuj” tylko dopisuje zadanie do tabeli `generation_jobs`. Plan liczy worker (`solver/`), a Vercel nie uruchomi procesu na kilka minut, więc w chmurze robi to workflow [`solver-worker.yml`](../.github/workflows/solver-worker.yml).

- **Kiedy działa:** każde nowe zadanie `queued` uruchamia workflow od razu: wyzwalacz `generation_jobs_uruchom_workera` (migracja `uruchamianie_workera`) wysyła przez pg_net `workflow_dispatch` do GitHuba. Worker startuje zwykle w ciągu minuty. Gdy kolejka jest pusta, kończy po kilku sekundach. Gdy są zadania, instaluje solver i liczy je po kolei (do 5 na jedno uruchomienie, jedno zadanie to 200–400 s).
- **Harmonogram jako zapas:** workflow ma też `*/5`, ale GitHub uruchamia zadania z harmonogramu z dużym poślizgiem (w praktyce co kilka godzin). Łapie on zadania, których wywołanie się nie udało. Bez czekania: Actions → Solver worker → Run workflow.
- **Token do uruchamiania:** fine-grained token GitHuba tylko dla tego repozytorium z uprawnieniem **Actions: Read and write** (konto właściciela albo organizacji `planerZajec2026`, z datą ważności). Trzyma go wyłącznie Vault w Supabase. Jednorazowo w SQL Editorze projektu: `select vault.create_secret('<token>', 'github_worker_token');`, a przy wymianie: `select vault.update_secret((select id from vault.secrets where name = 'github_worker_token'), '<nowy token>');`. Bez tokenu wyzwalacz nic nie robi i zostaje tylko harmonogram.
- **Sprawdzenie wywołań:** `select created, status_code, content from net._http_response order by created desc limit 5;` w SQL Editorze. `204` to uruchomiony workflow; `401`/`403` to zły albo wygasły token lub brak uprawnienia; `404` to token bez dostępu do repozytorium.
- **Dostęp do bazy:** sekrety `SUPABASE_DB_PASSWORD` i `SUPABASE_PROJECT_ID` ze środowiska `production`, połączenie przez session pooler (`aws-0-eu-west-1.pooler.supabase.com:5432`), bo runnery GitHuba nie mają IPv6.
- **Wymagany recenzent:** jeśli środowisko `production` dostanie wymaganego recenzenta, każde uruchomienie workera będzie czekać na zatwierdzenie. Przenieś wtedy oba sekrety workera do osobnego środowiska bez recenzenta.
- **Wyłączanie przez GitHuba:** harmonogram w publicznym repo wyłącza się po 60 dniach bez aktywności w repozytorium. Włącza się go z powrotem w zakładce Actions.
- **Ograniczenie:** to rozwiązanie na etap projektu. GitHub Actions nie jest przeznaczone do obsługi ruchu produkcyjnego; docelowo worker powinien działać jako stały kontener (ten sam obraz z `solver/Dockerfile`, zmienna `DATABASE_URL`).
- **Ręcznie z laptopa:** ustaw `DATABASE_URL` na adres session poolera tylko w bieżącym terminalu (nie w `.env`) i uruchom `docker compose up --build solver-worker`.

Sprawdzenie, czy chmura ma wszystkie migracje (lokalnie, po `npx supabase link`):

```bash
npx supabase migration list
```

## Wycofanie zmian

- **Aplikacja:** w Vercelu Deployments → poprzednie wdrożenie → **Instant Rollback**.
- **Baza:** napisz nową migrację, która odwraca zmianę, i scal ją jak każdą inną. Nigdy nie edytuj ani nie usuwaj migracji, które już trafiły do chmury, i nigdy nie uruchamiaj `db reset` na bazie w chmurze.

## Bezpieczeństwo

- Do przeglądarki trafiają tylko `NEXT_PUBLIC_SUPABASE_URL` i klucz publishable. Oba są publiczne z założenia; dane chroni RLS (spec 08).
- `SUPABASE_SERVICE_ROLE_KEY` omija RLS. Jest tylko w Vercelu jako zmienna po stronie serwera (bez `NEXT_PUBLIC_`) i używają go wyłącznie Server Actions importu i generatora. Nigdy w repo ani w kodzie przeglądarki.
- Hasło do bazy zna tylko środowisko `production` na GitHubie (`deploy-db.yml` i `solver-worker.yml`).
- Token uruchamiający workera (`github_worker_token`) jest tylko w Vault w Supabase. Funkcji, która go czyta (`uruchom_workera`), nie mogą wywołać role API. Token pozwala tylko uruchamiać workflowy tego repozytorium; wymień go, gdy wygaśnie albo odchodzi ktoś z dostępem do bazy.
- `SUPABASE_ACCESS_TOKEN` zarządza wszystkimi projektami na koncie właściciela. Jest tylko w środowisku `production` na GitHubie. Wymień go, gdy odchodzi ktoś z dostępem.
- Pliki `.env*` są w `.gitignore`; `.env.example` zawiera tylko nazwy.
- Kontrola po buildzie: w `.next/static` nie może być `sb_secret` ani `service_role`.
- Doradcy bezpieczeństwa Supabase w chmurze (`npx supabase db advisors --linked --type security`) zgłaszają `public.rls_auto_enable()`: funkcję `SECURITY DEFINER` z `EXECUTE` dla `anon` i `authenticated`. Nie pochodzi z naszych migracji; Supabase tworzy ją przy zakładaniu projektu z automatycznym włączaniem RLS. To funkcja wyzwalacza zdarzeń, więc nie da się jej wywołać przez `/rest/v1/rpc`, ale ostrzeżenie zostaje, dopóki nie odbierze się jej `EXECUTE`. Lokalnie ta funkcja nie istnieje, więc CI tego nie wykryje.
