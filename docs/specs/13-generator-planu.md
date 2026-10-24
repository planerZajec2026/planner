# Spec 13: Generator planu zajęć

**Branch:** `feat/13-generator-planu` · **Route(s):** `/generator`, `/plan`

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

**Poza zakresem:** edycja planu w UI (następny etap), inne kierunki niż Informatyka, studia niestacjonarne, hosting workera poza lokalnym dockerem.

## Dane wejściowe
Pliki w `requirements/`: `dane_planu.json` (używany przez solver i import), `dane_planu.xlsx`, `README.md`. Dane są identyczne we wszystkich formatach.

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
Nowe migracje w `supabase/migrations/`, zgodnie z regułami z [spec 08](08-supabase-schemat.md). Nazwy nie kolidują ze starymi tabelami (`zajecia`, `grupy`, `prowadzacy`).

Cztery migracje (`20261024100000`–`20261024100300`):
1. `plan_dane_slownikowe`: `sloty`, `kalendarz`, `sale`, `roczniki`, `grupy_plan`, `studenci`, `studenci_grupy`, `kolizje_grup`, `prowadzacy_plan`, `przedmioty_plan`.
2. `plan_zajecia_i_dezyderaty`: `zajecia_plan` (wejście) z tabelami łączącymi `zajecia_plan_grupy` i `zajecia_plan_prowadzacy`, `blokady_stale`, `rada_wydzialu`, `dezyderaty_terminy`, `dezyderaty_ogolne`, `dezyderaty_sale`.
3. `plan_generowanie`: `generation_jobs` (status `queued`/`running`/`done`/`failed`, parametry, raport walidatora, wynik miękkich), `plan_zajec` (wynik: zajęcia, dzień, slot, sala, tygodnie, `job_id`) i widok `plan_spotkania`, który rozwija przydział na spotkania z datami z `kalendarz` (`security_invoker`).
4. `plan_api_grants_and_rls`: RLS na wszystkich tabelach, odczyt dla `anon` i `authenticated`, zapis tylko dla `service_role` (worker i import).

Zlecanie zadań z aplikacji (przycisk „Generuj") wymaga zapisu do `generation_jobs`. Do czasu logowania (spec 11) zrobiłaby to Server Action po stronie serwera z kluczem `service_role`; ten wyjątek od zasady ze spec 08 trzeba rozstrzygnąć w etapie 6.

`sale.pojemnosc` jest pusta dla 24 sal niedostępnych do planowania (pracownie specjalistyczne), więc kolumna dopuszcza null, ale tylko dla sal niedostępnych.

Dane wejściowe: `scripts/generate-plan-seed.ts` (`npm run db:plan-seed:generate`) zamienia `requirements/dane_planu.json` na `supabase/seeds/plan.sql`, ładowany po `seed.sql` przez `db reset`. CI sprawdza, że plik jest aktualny. Typy przez `npm run db:types`; testy pgTAP w `supabase/tests/plan.test.sql`.

## UI
- **`/generator`:** formularz (limit czasu 200–400 s, wagi ograniczeń miękkich) z przyciskiem „Generuj plan". Server Action `zlecGenerowanie` waliduje dane (limity jak w workerze), odmawia, gdy w kolejce są już 3 zadania, i dodaje wiersz do `generation_jobs`. Pod formularzem lista ostatnich zadań (status, czas, raport: naruszenia twarde, kara miękkich, dolna granica, rozbicie na składniki); strona sama się odświeża co 5 s, dopóki jakieś zadanie jest `queued` lub `running`.
- **Zapis z aplikacji:** Server Action używa klucza `SUPABASE_SERVICE_ROLE_KEY` (tylko serwer, `server-only`, `src/lib/supabase/admin.ts`). To świadomy wyjątek od zasady ze spec 08, do czasu logowania (spec 11); klucz jest opisany w `.env.example`.
- **`/plan`:** pokazuje **cały plan** z ostatniego ukończonego zadania. Widok *Tabela* (domyślny) wypisuje wszystkie 174 zajęcia: przedmiot, forma, grupy, prowadzący, dzień, godziny od–do, sala, tygodnie / parzystość. Filtry (rocznik, grupa, prowadzący, sala, dzień) to zwykły formularz GET, więc działają w adresie URL i bez JavaScriptu. Widok *Kalendarz tygodniowy* pokazuje wybrany tydzień 1–14 z datami z `kalendarz` (środa tygodnia 11 to 8 I 2027); wymaga wyboru rocznika, grupy, prowadzącego lub sali, bo wszystkie zajęcia naraz są nieczytelne. Nic w tabeli nie jest ucinane.
- **Eksport:** `/plan/eksport` (route handler) zwraca plik XLSX (domyślnie; arkusze „Plan" i „Informacje") albo JSON (`?format=json`, z identyfikatorami i numerami slotów). Te same filtry zawężają zawartość, bez filtrów wychodzi cały plan. Przyciski są na stronie `/plan` i uwzględniają wybrane filtry. Istniejący `ExportPanel` w `/import-eksport` dotyczy starego modelu danych i nie został zmieniony.
- Interfejs po polsku; dostęp do danych przez `src/lib/data/plan.ts`, logika bez bazy w `src/lib/plan.ts` i `src/lib/generator.ts`.
- Testy e2e nowych stron nie wchodzą do `e2e/` (CI testuje produkcyjny build bez Supabase); strony sprawdzają testy jednostkowe i komponentów oraz ręczny przebieg na lokalnym stosie.

## Kryteria akceptacji
- Walidator zwraca 0 naruszeń twardych dla wszystkich 174 zajęć; wynik miękkich jest raportowany.
- `/plan` pokazuje 174 zajęcia; zmiana tygodnia pokazuje właściwe daty z kalendarza (np. środa, tydzień 11 = 8 I 2027).
- Eksport XLSX otwiera się w Excelu i zawiera ten sam przydział co UI.
- Przechodzą: `pytest solver/tests`, `npm run lint`, `npm run build`, `npm run test`, `npm run test:e2e`, `npm run db:test`.

## Etapy
1. Loader i walidator z testami na danych.
2. Model CP-SAT i CLI (0 naruszeń twardych).
3. Funkcja celu i wagi.
4. Schemat Supabase i import danych.
5. Worker i `generation_jobs`.
6. UI: `/generator`, `/plan`, eksport.
7. Testy (pytest, vitest, e2e) i dokumentacja.

Następny etap po tym specu: edycja planu w UI.
