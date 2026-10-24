# Spec 13: Generator planu zajęć

**Branch:** `feat/13-generator-planu` · **Route(s):** `/generator`, `/plan`, `/import-eksport`; `/kierunki`, `/harmonogram`, `/prowadzacy`, `/harmonogram-prowadzacych` czytają z bazy

## Cel
Z danych wejściowych w `requirements/` (WFiIS UŁ, Informatyka, studia stacjonarne, semestr zimowy 2026/27) wygenerować plan zajęć na cały semestr, sprawdzić go niezależnym walidatorem i pokazać w aplikacji. Każde zajęcia z tabeli `zajecia` dostają dzień, slot startowy, salę i (dla zajęć `co_2_tygodnie`) tydzień parzysty lub nieparzysty. Plan musi spełniać wszystkie ograniczenia twarde, a ograniczenia miękkie służą do oceny jakości.

Dane są spójne: istnieje co najmniej jeden plan spełniający wszystkie ograniczenia twarde.

Źródło prawdy o danych i regułach: `requirements/README.md`. Ten spec go nie zastępuje, tylko opisuje, co budujemy.

## Zakres
- Solver w Pythonie (OR-Tools CP-SAT) z limitem czasu i funkcją celu.
- Niezależny walidator planu.
- Worker uruchamiany z kolejki zadań w Supabase, na start lokalnie w dockerze.
- Nowy schemat bazy na dane wejściowe, zadania i wynik.
- Strony `/generator` (uruchomienie i raport) oraz `/plan` (cały plan).
- Eksport planu do XLSX i JSON.
- **Dane tylko z bazy.** Żadna strona nie czyta makiet: `src/lib/mock-data.ts` zawiera prawdziwe dane z `requirements/` i służy wyłącznie do seedowania bazy (reguła ESLint zabrania importu z `src/`). Gdy w bazie nic nie ma, strony są puste i odsyłają do importu.
- **Wgrywanie danych przez użytkownika** na stronie `/import-eksport` (plik `.xlsx` lub `.json`), tą samą funkcją bazy co seed.

**Poza zakresem:** edycja planu w UI (następny etap), inne kierunki niż Informatyka, hosting workera poza lokalnym dockerem. **Studia niestacjonarne nie są wspierane**: z aplikacji, bazy i dokumentacji zniknął tryb studiów.

## Dane wejściowe
Pliki w `requirements/`: `dane_planu.xlsx`, `dane_planu.json`, `README.md`. Dane są identyczne w obu formatach (test `src/lib/dane-planu.test.ts` porównuje je tabela po tabeli).

Droga danych do bazy: `requirements/dane_planu.json` → `npm run db:mock:generate` → `src/lib/mock-data.ts` (wygenerowany, typowany plik z prawdziwymi danymi) → `npm run db:seed:generate` → `supabase/seed.sql`, który woła `wgraj_dane_planu` → baza. Użytkownik wgrywa dane przez `/import-eksport` tą samą funkcją. Schemat tabel i ich kolumn (typy, walidacja strukturalna, odczyt `.xlsx`) jest w `src/lib/dane-planu.ts` i `src/lib/dane-planu-xlsx.ts`.

| Tabela | Rozmiar | Rola |
|---|---|---|
| `zajecia` | 174 | co trzeba zaplanować |
| `sale` | 55 | zasoby (typ, pojemność, wyposażenie, dostępność) |
| `prowadzacy` | 50 | zasoby, w tym `czlonek_rady_wydzialu` |
| `grupy`, `roczniki` | 51, 6 | uczestnicy |
| `studenci`, `studenci_grupy`, `kolizje_grup` | 372, 1126, 173 | źródło prawdy o kolizjach grup |
| `kalendarz`, `sloty` | 84, 12 | czas |
| `dezyderaty_terminy`, `dezyderaty_ogolne`, `dezyderaty_sale` | 288, 50, 10 | preferencje i wykluczenia prowadzących |
| `blokady_stale`, `rada_wydzialu` | 1, 1 | terminy poza planowaniem |

### Czas
- Dzień ma 12 slotów po 45 minut z 15-minutową przerwą: slot 1 = 8:15–9:00, slot 12 = 19:15–20:00. Zajęcia dwuslotowe zajmują kolejne sloty.
- Dni 1–5 to poniedziałek–piątek.
- Każdy dzień planu odbywa się dokładnie 14 razy. `nr_tygodnia` (1–14) to numer kolejnego wystąpienia danego dnia planu, nie tydzień kalendarzowy. Daty wynikają z tabeli `kalendarz` (dni wolne, dni odpracowania: 8 I i 26 I mają plan środy, 25 I to dodatkowy poniedziałek).
- Jeden wiersz `zajecia` to cykl spotkań: zawsze ten sam dzień planu, godzina i sala.

## Ograniczenia twarde
Dwa spotkania **nakładają się**, jeśli są w tym samym dniu planu, mają wspólny slot i wspólny tydzień.

1. Każde zajęcia mają dokładnie jeden dzień, slot startowy i salę; wszystkie sloty mieszczą się w zakresie 1–12.
2. Liczba spotkań, zakres tygodni, częstotliwość (`co_tydzien`, `co_2_tygodnie`, `wybrane_tygodnie`) i `tygodnie_niedostepne` są zachowane.
3. Prowadzący nie ma dwóch nakładających się zajęć (dotyczy wszystkich osób z listy `prowadzacy`).
4. Sala nie ma dwóch nakładających się zajęć.
5. Student nie ma dwóch nakładających się zajęć (kolidują grupy ze wspólnymi studentami według `studenci_grupy` / `kolizje_grup`; grupy z różnych podziałów nie zawsze kolidują).
6. Sala ma dozwolony typ (lub jest w `dozwolone_sale`), ma wymagane wyposażenie i ma `dostepna_do_planowania = true` (chyba że jest w `dozwolone_sale`).
7. Pojemność sali ≥ `liczba_studentow` + `dodatkowi_studenci`.
8. Zajęcia nie trafiają w godziny wykluczone przez prowadzącego (`dezyderaty_terminy`) ani w Radę Wydziału (dla członków rady).
9. Zajęcia nie nakładają się na `blokady_stale` swoich studentów.
10. Powiązania są zachowane: `rozne_dni` (różne dni) i `ten_sam_termin` (ten sam dzień, godzina i sala).

## Ograniczenia miękkie
Służą do oceny i optymalizacji jakości. Wagi są konfigurowalne (domyślne w `solver/weights.py`, nadpisywane z `/generator`). Zestaw startowy:
- preferencja prowadzącego `skumulowane` / `nieskumulowane`,
- mało okienek w dniu studenta i prowadzącego,
- mało zajęć po 17:00 i przed 9:00,
- rozsądne obciążenie dnia studenta (np. ≤ 8 slotów),
- sala niezbyt duża dla grupy,
- uwagi z `dezyderaty_ogolne.inne_uwagi`.

## Solver
- Python 3.12, OR-Tools CP-SAT. Wybrany, bo ograniczenia twarde (`NoOverlap` na zasobach, opcjonalne interwały, tabele dozwolonych sal i slotów) opisuje się wprost, a solver daje gwarancję spełnienia reguł i ocenę odległości od optimum. Własny solver w TypeScript nie daje takich gwarancji.
- Zmienne na zajęcia: dzień, slot startowy, sala (z domeny wyznaczonej z ograniczeń 6–7), parzystość dla `co_2_tygodnie`, wybór tygodni dla `wybrane_tygodnie`.
- Tygodnie zajęć wynikają z częstotliwości i zakresu; nakładanie liczone z użyciem maski 14 tygodni.
- Etap 1: znalezienie planu spełniającego ograniczenia twarde (ułamek sekundy). Etap 2: ten plan jest rozwiązaniem startowym, a solver minimalizuje karę za ograniczenia miękkie do końca limitu. Zawsze zwracany jest najlepszy znaleziony plan, razem z dolną granicą kary.
- Funkcja celu ma te same składniki co walidator. Okienka i przeciążenie dnia model liczy po dniu grupy lub prowadzącego niezależnie od tygodnia i mnoży przez 14, więc jego kara jest przybliżeniem; wiążący jest wynik walidatora.
- Wagi: `solver/weights.py`, nadpisywane w CLI przez `--waga nazwa=liczba` (powtarzalne).
- Typowy wynik na danych z `requirements/`: kara miękkich 16274 (sama wykonalność), ok. 8000 po 60 s, ok. 5100 po 180 s, zawsze 0 naruszeń twardych.
- Struktura w katalogu `solver/`: `loader.py`, `model.py`, `weights.py`, `validator.py`, `worker.py`, `cli.py`, `tests/`, `Dockerfile`.
- CLI: `python -m solver.cli generuj --out plan.json --time 120` (dane domyślnie z `requirements/dane_planu.json`); dodatkowo `dane` (kontrola spójności) i `waliduj --plan plan.json`.
- Uruchomienie w dockerze: `docker build -f solver/Dockerfile -t planner-solver .`, potem `docker run --rm -v "$PWD:/app" planner-solver generuj`.

## Walidator
`solver/validator.py` liczy wszystko od zera z surowych danych i nie używa kodu modelu. Zwraca:
- listę naruszeń z numerem ograniczenia (1–10) i identyfikatorami zajęć,
- wynik ograniczeń miękkich z rozbiciem na składniki.

Używany w CLI, w workerze (plan jest zapisywany razem z raportem) i w testach. Plan z naruszeniem twardym nie jest oznaczany jako gotowy.

## Worker i kolejka
- UI wstawia wiersz do `generation_jobs` (parametry: limit czasu, wagi, status `queued`).
- Worker (kontener lokalny, `docker compose up solver-worker` po `npm run db:start`) łączy się bezpośrednio z Postgresem (`DATABASE_URL`, domyślnie lokalny Supabase). Zadanie bierze atomowo (`for update skip locked`), ustawia `running`, wczytuje dane wejściowe z tabel, liczy i waliduje.
- Wynik: plan i raport (status solvera, kara modelu, dolna granica, naruszenia, składniki miękkich) zapisuje w jednej transakcji i ustawia `done`. Brak planu, naruszenie twarde wykryte przez walidator, błędne parametry lub wyjątek kończą zadanie jako `failed` z komunikatem w `blad`; plan z naruszeniem nigdy nie trafia do `plan_zajec`.
- Parametry zadania (`generation_jobs.parametry`): `{"limit_czasu": 200-400 s (domyślnie 200), "wagi": {nazwa: liczba całkowita ≥ 0}}`. Dolna granica 200 s jest wymuszona, bo krótsze limity dają słabsze plany: etap optymalizacji dostaje pół czasu i potrzebuje go na poprawę planu startowego (przy 20 s plan bywał gorszy niż sam plan wykonalny).
- Zadanie `running` starsze niż godzina uchodzi za przerwane i przy starcie workera dostaje `failed`. Zakładamy jeden worker na bazę.
- Polecenia: `python -m solver.cli worker [--raz] [--poll 5] [--workers N]`; `--raz` przetwarza jedno zadanie i kończy.
- Połączenie z bazą ma uprawnienia zapisu, więc dane dostępowe istnieją tylko w środowisku workera, nigdy w aplikacji Next.js.
- Supabase służy jako baza i kolejka. Nie hostuje Pythona (Edge Functions: Deno, krótki limit CPU), więc worker działa poza nim. Później można go przenieść na GitHub Actions (`workflow_dispatch`) lub Cloud Run bez zmiany modelu danych.

## Schemat Supabase
Nowe migracje w `supabase/migrations/`, zgodnie z regułami z [spec 08](08-supabase-schemat.md). Tabele mają przyrostek `_plan` tam, gdzie nazwa kolidowała ze starym modelem; ten model usuwa migracja 6.

Cztery migracje (`20261024100000`–`20261024100300`):
1. `plan_dane_slownikowe`: `sloty`, `kalendarz`, `sale`, `roczniki`, `grupy_plan`, `studenci`, `studenci_grupy`, `kolizje_grup`, `prowadzacy_plan`, `przedmioty_plan`.
2. `plan_zajecia_i_dezyderaty`: `zajecia_plan` (wejście) z tabelami łączącymi `zajecia_plan_grupy` i `zajecia_plan_prowadzacy`, `blokady_stale`, `rada_wydzialu`, `dezyderaty_terminy`, `dezyderaty_ogolne`, `dezyderaty_sale`.
3. `plan_generowanie`: `generation_jobs` (status `queued`/`running`/`done`/`failed`, parametry, raport walidatora, wynik miękkich), `plan_zajec` (wynik: zajęcia, dzień, slot, sala, tygodnie, `job_id`) i widok `plan_spotkania`, który rozwija przydział na spotkania z datami z `kalendarz` (`security_invoker`).
4. `plan_api_grants_and_rls`: RLS na wszystkich tabelach, odczyt dla `anon` i `authenticated`, zapis tylko dla `service_role` (worker i import).

Dwie kolejne migracje:
5. `wgraj_dane_planu` (`20261024110000`): funkcja `wgraj_dane_planu(payload jsonb)`, `security definer`, wykonywalna tylko przez `service_role`. W **jednej transakcji** czyści tabele wejściowe i `generation_jobs` (kaskada usuwa `plan_zajec`) i wstawia dane z jsonb o kształcie `dane_planu.json`; odrzucony plik niczego nie zmienia. Zwraca liczby rekordów. Woła ją seed i strona importu.
6. `usun_stary_model` (`20261024110100`): usuwa tabele makiety ze spec 08 (`kierunki`, `grupy`, `prowadzacy`, `przedmioty`, `prowadzacy_przedmioty`, `zajecia`, `odwolane_zajecia`, `dni_wolne`) oraz typy `tryb_studiow`, `typ_zajec`, `powtarzalnosc`, `tytul_naukowy`. Zostaje `ustawienia`. Operacja destrukcyjna wdrażana w chmurze przez workflow `deploy-db`; tabele zawierały tylko makietę (chmura nie była seedowana).

Zapis z aplikacji (przycisk „Generuj" i import danych) idzie przez Server Action z kluczem `service_role`. To świadomy wyjątek od zasady ze spec 08, do czasu logowania (spec 11); klucz `SUPABASE_SERVICE_ROLE_KEY` jest tylko po stronie serwera (`server-only`, `src/lib/supabase/admin.ts`) i opisany w `.env.example`. Na Vercelu trzeba go ustawić (patrz `docs/wdrozenie.md`).

`sale.pojemnosc` jest pusta dla 24 sal niedostępnych do planowania (pracownie specjalistyczne), więc kolumna dopuszcza null, ale tylko dla sal niedostępnych.

Typy przez `npm run db:types`; testy pgTAP w `supabase/tests/plan.test.sql` (tabele, ograniczenia, RLS, widok spotkań, `wgraj_dane_planu`).

## UI
- **`/generator`:** formularz (limit czasu 200–400 s, wagi ograniczeń miękkich) z przyciskiem „Generuj plan". Server Action `zlecGenerowanie` waliduje dane (limity jak w workerze), odmawia, gdy w kolejce są już 3 zadania, i dodaje wiersz do `generation_jobs`. Pod formularzem lista ostatnich zadań (status, czas, raport: naruszenia twarde, kara miękkich, dolna granica, rozbicie na składniki); strona sama się odświeża co 5 s, dopóki jakieś zadanie jest `queued` lub `running`.
- **Zapis z aplikacji:** Server Action używa klucza `SUPABASE_SERVICE_ROLE_KEY` (tylko serwer, `server-only`, `src/lib/supabase/admin.ts`). To świadomy wyjątek od zasady ze spec 08, do czasu logowania (spec 11); klucz jest opisany w `.env.example`.
- **`/plan`:** pokazuje **cały plan** z ostatniego ukończonego zadania. Widok *Tabela* (domyślny) wypisuje wszystkie 174 zajęcia: przedmiot, forma, grupy, prowadzący, dzień, godziny od–do, sala, tygodnie / parzystość. Filtry (rocznik, grupa, prowadzący, sala, dzień) to zwykły formularz GET, więc działają w adresie URL i bez JavaScriptu. Widok *Kalendarz tygodniowy* pokazuje wybrany tydzień 1–14 z datami z `kalendarz` (środa tygodnia 11 to 8 I 2027); wymaga wyboru rocznika, grupy, prowadzącego lub sali, bo wszystkie zajęcia naraz są nieczytelne. Nic w tabeli nie jest ucinane.
- **Eksport:** `/plan/eksport` (route handler) zwraca plik XLSX (domyślnie; arkusze „Plan" i „Informacje") albo JSON (`?format=json`, z identyfikatorami i numerami slotów). Te same filtry zawężają zawartość, bez filtrów wychodzi cały plan. Przyciski są na stronie `/plan` i uwzględniają wybrane filtry.
- **`/import-eksport` (Import danych):** pole pliku `.xlsx` lub `.json` w formacie `dane_planu`, wymagane potwierdzenie (wgranie usuwa dotychczasowe dane i plany), podsumowanie po wgraniu. Server Action `wgrajDane` sprawdza plik (typy kolumn, unikalność id, odwołania między tabelami; limit 4 MB), a bazę ładuje funkcją `wgraj_dane_planu`. Błędy pliku są wypisane i nic się nie zmienia. Wykonalność planu sprawdza dopiero solver (`failed` z komunikatem w `blad`). Limit ciała Server Action: `serverActions.bodySizeLimit` w `next.config.ts`.
- **Strony z bazy:** `/kierunki` (grupy z roczników), `/prowadzacy` (pseudonimy `P01…`, stopień, jednostka, przedmioty z zajęć), `/harmonogram` i `/harmonogram-prowadzacych` (tydzień kalendarzowy z wygenerowanego planu; grupa ma też zajęcia swoich grup nadrzędnych, np. wykład dla roku; środa tygodnia 11 wypada w piątek 8 I). Pusta baza → „Brak danych wejściowych" z linkiem do importu; dane są, planu nie ma → „Nie wygenerowano jeszcze planu" z linkiem do generatora. `/generator` bez danych wejściowych pokazuje to samo zamiast formularza.
- Interfejs po polsku; dostęp do danych przez `src/lib/data/*`, logika bez bazy w `src/lib/plan.ts`, `src/lib/generator.ts` i `src/lib/dane-planu*.ts`. Granice `<Suspense>` leżą w stronach (`page.tsx`), nie w layoutach.
- Testy: jednostkowe i komponentów używają stałych danych z `src/test/fixtures.ts`. E2e (`e2e/`) działa na lokalnym Supabase: `e2e/global-setup.ts` wgrywa dane z `mock-data.ts` i gotowy plan z `e2e/fixtures/plan.json` (solver nie liczy się w testach). Testy wgrywania pliku zmieniają całą bazę, więc idą osobnym projektem `wgrywanie-danych`, po pozostałych.

## Uruchomienie lokalne
Wymagania: Docker Desktop i Node 22.
1. `npm install`, `npm run db:start` (lokalny Supabase; migracje i seed ładują się same), `npm run db:env` (zapisuje `.env.local` z lokalnymi kluczami).
2. `npm run dev` (http://localhost:3000). Dane wejściowe są już w bazie; po `npm run db:reset` wracają do stanu z seeda.
3. Worker (osobny terminal): `docker compose up --build solver-worker`.
4. Na `/generator` kliknij „Generuj plan" (limit 200–400 s). Gotowy plan jest na `/plan`, `/harmonogram` i `/harmonogram-prowadzacych`.
5. Własne dane: `/import-eksport` (plik w formacie `requirements/dane_planu.xlsx`).

Testy: `npm run lint`, `npm run test`, `npm run db:test`, `npm run test:e2e` (wymaga działającego Supabase i `.env.local`; lokalnie szuka zainstalowanego Chrome'a, z `CI=1` używa Chromium z Playwrighta), `pytest solver/tests` (w Dockerze: `docker build -f solver/Dockerfile -t planner-solver .`, potem `docker run --rm -v "$PWD:/app" --entrypoint python planner-solver -m pytest solver/tests`).

## Kryteria akceptacji
- Walidator zwraca 0 naruszeń twardych dla wszystkich 174 zajęć; wynik miękkich jest raportowany.
- `/plan` pokazuje 174 zajęcia; zmiana tygodnia pokazuje właściwe daty z kalendarza (np. środa, tydzień 11 = 8 I 2027).
- Eksport XLSX otwiera się w Excelu i zawiera ten sam przydział co UI.
- Żadna strona nie czyta makiet; po `db reset` baza ma dane z seeda, a bez danych strony są puste i odsyłają do importu.
- Wgranie `dane_planu.xlsx` i `dane_planu.json` przez `/import-eksport` daje te same dane; błędny plik jest odrzucony i niczego nie zmienia.
- W aplikacji nie ma pojęcia „tryb studiów" ani studiów niestacjonarnych.
- Przechodzą: `pytest solver/tests`, `npm run lint`, `npm run build`, `npm run test`, `npm run test:e2e`, `npm run db:test`.

## Etapy
1. Loader i walidator z testami na danych.
2. Model CP-SAT i CLI (0 naruszeń twardych).
3. Funkcja celu i wagi.
4. Schemat Supabase i import danych.
5. Worker i `generation_jobs`.
6. UI: `/generator`, `/plan`, eksport.
7. Testy (pytest, vitest, e2e) i dokumentacja.
8. Prawdziwe dane zamiast makiety: `mock-data.ts` z `requirements/`, seed przez `wgraj_dane_planu`, strony czytają z bazy, wgrywanie danych w aplikacji, koniec wsparcia dla studiów niestacjonarnych, e2e na lokalnym Supabase.

Następny etap po tym specu: edycja planu w UI.
