# Spec 15: Postęp generowania i miejsca do poprawy

**Branch:** `feat/15-postep-i-problemy` · **Route(s):** `/generator`; `/plan/edycja?zajecia=<id>&powrot=generator`; `/import` (dawniej `/import-eksport`); `/`

## Cel
Generowanie trwa kilka minut (limit 200–400 s plus start workera) i do tej pory strona pokazywała tylko „Liczy się”. Planista nie wiedział, czy coś się dzieje. Po wygenerowaniu widział jedną liczbę, karę miękkich, ale nie wiedział, które zajęcia ją podnoszą.

Ten spec dodaje trzy rzeczy:
1. **Pasek postępu** liczonego zadania. Każda pokazana liczba pochodzi z workera. Przeglądarka niczego nie szacuje ani nie animuje między raportami poza płynnym przejściem paska do nowej wartości.
2. **Listę „Do poprawy”** przy aktywnym planie: miejsca, które najbardziej podnoszą karę miękkich, z linkami do edycji zajęć ([spec 14](14-edycja-planu.md)) i powrotem do generatora.
3. **Postęp wgrywania pliku** w `/import` i strefę wyboru pliku zamiast gołego `<input type="file">`.

## Zakres
- Kolumna `generation_jobs.postep` i zapis postępu przez worker.
- Pasek postępu i opis etapu na karcie zadania w `/generator`.
- Liczenie kary miękkich w TypeScripcie, z rozbiciem na miejsca w planie, dla aktualnego stanu `plan_zajec` (z ręcznymi zmianami).
- Lista „Do poprawy” na karcie aktywnego planu i parametr `powrot=generator` na stronie edycji.

**Poza zakresem:**
- szacowanie, kiedy solver skończy (kończy zawsze po limicie czasu, chyba że udowodni optimum),
- anulowanie liczonego zadania,
- automatyczne poprawianie miejsc z listy,
- przeliczanie kary po każdym zapisie na stronie edycji (lista w generatorze liczy się od nowa przy każdym wejściu).

## Postęp

### Co jest postępem
Solver liczy w dwóch etapach (spec 13): etap 1 szuka planu bez naruszeń twardych (`min(limit/2, 60)` s), etap 2 zmniejsza karę miękkich do końca limitu. Oba liczą się do jednego limitu czasu zadania, więc postęp to **czas solvera / limit czasu**. Solver kończy po limicie, więc 100% oznacza koniec liczenia.

Liczba lepszych planów, kara bieżącego planu i dolna granica kary to dane z wywołań zwrotnych CP-SAT (`on_solution_callback`), a nie szacunki.

### Zapis (worker)
- `solver/progress.py`: `Raporter` przyjmuje zgłoszenia z wątków solvera i zapisuje bieżący stan co `OKRES_ZAPISU` = 2 s z osobnego wątku. Zmiana etapu zapisuje się od razu. Nieudany zapis loguje się raz i nie przerywa liczenia.
- `solver/model.py`: `generuj`/`rozwiaz` dostają opcjonalne `postep`; wywołanie zwrotne `_LepszePlany` zgłasza każdy lepszy plan.
- `solver/db.py`: `zapisz_postep` ustawia `postep` z `zaktualizowano = now()` z bazy (zegar serwera, nie workera).
- `solver/worker.py`: etapy `wczytywanie` → `szukanie` → `optymalizacja` → `zapis`.

### Schemat
Migracja `20261117100000_postep_generowania.sql`, tylko rozszerzająca: stary worker nie pisze kolumny, stara aplikacja jej nie czyta.

| Pole `postep` | Znaczenie |
|---|---|
| `etap` | `wczytywanie`, `szukanie`, `optymalizacja`, `zapis` |
| `uplynelo_s`, `limit_s` | sekundy pracy solvera od początku etapu 1; limit zadania |
| `rozwiazania` | ile lepszych planów solver znalazł w bieżącym etapie |
| `kara`, `kara_startowa`, `dolna_granica` | kara wg modelu solvera: bieżąca, pierwszego planu etapu 2, najlepsza możliwa wg solvera |
| `zaktualizowano` | czas ostatniego zapisu (bazy) |

Kara modelu solvera nie jest tą samą liczbą co kara miękkich z walidatora (`wynik_miekkich`), dlatego strona podpisuje ją „kara wg solvera”.

### Strona
- `queued`: tekst, że zadanie czeka na worker, który na serwerze startuje co kilka minut.
- `running` bez raportu: worker zaczyna pracę.
- `running` z raportem: tytuł etapu („Etap 1 z 2: plan bez naruszeń”, „Etap 2 z 2: optymalizacja”), „czas solvera: X z L s”, pasek `role="progressbar"`, opis (w etapie 2 przed pierwszym lepszym planem: solver analizuje model, co trwa zwykle kilkadziesiąt sekund), statystyki kary wg solvera.
- Gdy ostatni raport jest starszy niż 30 s: ostrzeżenie, że worker mógł przestać działać.
- Strona odświeża się co 3 s, gdy jakieś zadanie się liczy (co 5 s, gdy tylko czeka).

## Do poprawy

### Liczenie
`src/lib/plan-problemy.ts` liczy karę miękkich tak samo jak walidator Pythona (`solver/validator.py`) i rozbija ją na miejsca w planie. Test porównuje wynik z walidatorem na planie z `e2e/fixtures/plan.json` (5088 przy domyślnych wagach). Wagi pochodzą z parametrów zadania.

| Rodzaj | Jedno miejsce na liście |
|---|---|
| Okienka studentów, przeciążenie dnia | grupa × dzień (grupy z identycznym problemem i tymi samymi zajęciami łączą się w jedną pozycję) |
| Okienka prowadzących | prowadzący × dzień |
| Godziny skrajne, wielkość sali | jedne zajęcia |
| Preferencje dni | prowadzący, tylko gdy da się to poprawić |

Pozycje są posortowane od największej kary (po wagach). Każda ma zajęcia, które ją tworzą, z linkiem `/plan/edycja?zajecia=<id>&powrot=generator`.

### Strona
- Karta aktywnego planu (najpóźniej zakończone zadanie `done`) ma sekcję „Do poprawy”: 8 pierwszych pozycji, do 32 kolejnych w zwiniętym „Pokaż N kolejnych miejsc”, liczbę pominiętych.
- Tekst podaje karę teraz i, gdy ręczne zmiany ją zmieniły, karę po wygenerowaniu.
- Sekcja wczytuje się w `<Suspense>`; karta zadania pokazuje się bez czekania na nią.
- Strona edycji z `powrot=generator` ma link „Wróć do generatora” do `/generator` zamiast „Wróć do planu”.

## Wgrywanie pliku

### Strefa wyboru
Pole „Plik z danymi” to strefa, którą można kliknąć albo upuścić na nią plik. Prawdziwy `<input type="file">` zostaje w niej (ukryty wizualnie), więc działa z klawiatury i czytnikiem ekranu. Po wyborze strefa pokazuje nazwę i rozmiar pliku. Przeglądarka sprawdza przed wysłaniem plik, rozmiar (do 4 MB, limit ciała żądania na Vercelu to 4,5 MB) i potwierdzenie.

### Postęp
Wgrywanie idzie przez route handler `POST /import/wgraj` zamiast Server Action, bo Server Action nie daje postępu.
1. **Wysyłanie**: pasek z liczbą bajtów wysłanych przez przeglądarkę (`XMLHttpRequest.upload.onprogress`, `fetch` nie raportuje wysyłania).
2. **Sprawdzanie** i 3. **zapis do bazy**: serwer strumieniuje odpowiedź NDJSON, jedną linię na rozpoczęty etap (`{"etap":"sprawdzanie"}`, `{"etap":"zapis"}`), a na końcu `{"wynik":…}`. Te etapy nie mają mierzalnej części pracy, więc pasek jest nieokreślony (bez `aria-valuenow`) i tylko pokazuje, że etap trwa.

Route handler sprawdza nagłówek `Origin` (Server Action robi to sam). Logika wgrywania jest w `src/lib/wgrywanie-danych.ts`.

### Adres i strona startowa
Strona nic już nie eksportuje, więc jej adres to `/import`. `next.config.ts` przekierowuje stary `/import-eksport` na `/import` (308).

`/` przekierowuje na `/import`, dopóki w bazie nie ma zajęć do zaplanowania, a potem na `/kierunki`. Po udanym wgraniu przycisk „Przejdź do generatora” prowadzi do `/generator`.

## Kryteria akceptacji
- [x] Liczone zadanie pokazuje pasek oparty na `uplynelo_s / limit_s` z raportu workera; bez raportu nie ma paska.
- [x] Worker zapisuje postęp co ~2 s i przy każdej zmianie etapu; błąd zapisu nie przerywa liczenia (testy `solver/tests/test_progress.py`, `test_worker.py`).
- [x] Stary raport (> 30 s) daje ostrzeżenie.
- [x] Kara z `plan-problemy.ts` zgadza się z walidatorem Pythona na planie testowym (5088 w rozbiciu 57/225/240/555/5/3073).
- [x] Aktywny plan ma listę „Do poprawy” z linkami do edycji zajęć; edycja wraca do generatora.
- [x] Lista uwzględnia ręczne zmiany (liczy się z `plan_zajec`).
- [x] Prawdziwy przebieg lokalny: worker zapisał postęp, strona pokazała etap 2, czas, karę i pasek rosnący co odświeżenie.
- [x] Wgrywanie pokazuje wysłane bajty, potem etap serwera; wynik i błędy jak wcześniej (testy `wgrywanie-klient`, `wgraj/route`, `ImportDanychForm`, e2e `wgrywanie-danych`).
- [x] `/` otwiera `/import` przy pustej bazie i `/kierunki` przy wgranych danych; `/import-eksport` przekierowuje na `/import` (test `src/app/page.test.ts`, e2e `layout`).
- [x] `npm run lint`, `npm run build`, `npm test`, `npm run db:test`, `npm run test:e2e`, testy solvera przechodzą.

## Wdrożenie
Migracja trafia do produkcji przez `deploy-db.yml` po merge'u do `main`; do tego czasu produkcyjna aplikacja nie dostaje kolumny `postep` i zapytanie o zadania by się nie udało, więc aplikacja i migracja muszą wejść razem (merge do `main`). Worker na GitHub Actions bierze kod z `main`, więc zacznie raportować po tym samym merge'u.
