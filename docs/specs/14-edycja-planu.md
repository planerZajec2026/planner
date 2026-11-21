# Spec 14: Ręczna edycja wygenerowanego planu

**Branch:** `feat/14-edycja-planu` · **Route(s):** `/plan/edycja?zajecia=<id>`; `/plan` dostaje link „Edytuj” przy każdych zajęciach

## Cel
Plan z generatora ([spec 13](13-generator-planu.md)) jest punktem wyjścia, nie ostatecznym wynikiem. Planista musi móc przenieść pojedyncze zajęcia na inny dzień, godzinę, do innej sali albo na inne tygodnie, bez generowania wszystkiego od nowa.

Po każdej zmianie plan nadal spełnia wszystkie ograniczenia twarde 1–10 ze spec 13. Zmiany, która je łamie, nie da się zapisać; aplikacja mówi, z czym koliduje.

## Zakres
- Strona edycji jednych zajęć: dzień, slot startowy, sala, tygodnie.
- Sprawdzanie ograniczeń twardych w TypeScripcie: na żywo w formularzu i ponownie na serwerze przed zapisem.
- Siatka wolnych terminów: dla każdego dnia i godziny liczba sal, w których te zajęcia mogą się odbyć. Usunięta w [spec 16](16-tablica-edycji.md): wolne terminy pokazuje teraz przeciąganie na tablicy.
- Zapis jedną funkcją bazy, która pilnuje, żeby dwie równoczesne edycje nie zepsuły planu.
- Oznaczenie zajęć zmienionych ręcznie na `/plan` i w eksporcie.

**Poza zakresem:**
- przeciąganie zajęć w kalendarzu (drag and drop): dodał je [spec 16](16-tablica-edycji.md), a formularz z tego specu jest pod tablicą,
- historia zmian i cofanie do terminu z generatora,
- zapis mimo konfliktu („wymuś”),
- przeliczanie kary miękkich po edycji: dodał je [spec 15](15-postep-i-problemy.md) („Kara po ręcznych zmianach”),
- zmiana prowadzącego, grup, liczby spotkań lub długości zajęć: to dane wejściowe, zmienia się je importem,
- dodawanie i usuwanie zajęć z planu,
- logowanie (spec 11): do tego czasu edytować może każdy, kto otworzy aplikację, tak samo jak import i generator.

## Co można zmienić
| Pole | Dozwolone wartości |
|---|---|
| Dzień | 1–5 (poniedziałek–piątek) |
| Slot startowy | 1–12, tak żeby całe zajęcia zmieściły się do slotu 12 |
| Sala | każda sala z tabeli `sale`; formularz proponuje tylko pasujące typem, wyposażeniem i pojemnością |
| Tygodnie | zależnie od `czestotliwosc` (niżej) |

Tygodnie:
- `co_tydzien`: bez wyboru, zawsze wszystkie dostępne tygodnie zakresu.
- `co_2_tygodnie`: tygodnie nieparzyste albo parzyste. Opcja jest dostępna tylko wtedy, gdy daje dokładnie `liczba_spotkan` spotkań.
- `wybrane_tygodnie`: dowolne `liczba_spotkan` tygodni z zakresu, bez `tygodnie_niedostepne`.

### Zajęcia powiązane
- `ten_sam_termin`: wszystkie zajęcia zestawu przenoszą się razem na ten sam dzień, slot i do tej samej sali. Każde zachowuje swoje tygodnie; tygodnie zmienia się osobno dla każdych zajęć zestawu. Formularz mówi, które zajęcia przeniosą się razem.
- `rozne_dni`: przenoszone są tylko edytowane zajęcia. Dzień, w którym są inne zajęcia zestawu, jest konfliktem (ograniczenie 10).

## Walidacja
Logika jest w `src/lib/plan-edycja.ts` (czyste funkcje, bez bazy) i odwzorowuje `solver/validator.py`. Sprawdzane są tylko zmieniane zajęcia względem reszty planu; reszta planu jest poprawna, bo każda wcześniejsza zmiana przeszła tę samą kontrolę.

| # | Ograniczenie | Komunikat mówi |
|---|---|---|
| 1 | dzień 1–5, sloty 1–12, znana sala | co jest poza zakresem |
| 2 | tygodnie zgodne z częstotliwością, zakresem i liczbą spotkań | co się nie zgadza |
| 3 | prowadzący nie ma dwóch zajęć naraz | który prowadzący i z jakimi zajęciami |
| 4 | sala nie jest zajęta podwójnie | jakie zajęcia są w tej sali |
| 5 | studenci nie mają dwóch zajęć naraz (grupy kolidujące z `kolizje_grup`) | z jakimi zajęciami |
| 6 | typ sali, `dozwolone_sale`, wyposażenie, `dostepna_do_planowania` | czego brakuje |
| 7 | pojemność sali | ile miejsc, ile osób |
| 8 | dezyderaty prowadzącego i Rada Wydziału | który prowadzący |
| 9 | blokady stałe grup | która grupa |
| 10 | powiązania | z jakimi zajęciami |

Dwa spotkania nakładają się, gdy mają wspólny dzień planu, wspólny slot i wspólny tydzień (jak w spec 13).

Kolizje grup aplikacja bierze z tabeli `kolizje_grup`. Solver liczy je ze `studenci_grupy`; test pgTAP i `solver.cli dane` pilnują, że obie wersje są równe.

**Gdzie działa walidacja:**
1. W przeglądarce, przy każdej zmianie pola: lista konfliktów i siatka wolnych terminów. To tylko podpowiedź.
2. W Server Action przed zapisem: te same funkcje na świeżo wczytanych danych. To jest kontrola, która decyduje.

Test `src/lib/plan-edycja.test.ts` sprawdza każde ograniczenie osobno oraz to, że plan z `e2e/fixtures/plan.json` (poprawny wg walidatora Pythona) nie ma naruszeń dla żadnych zajęć.

## Zapis
Server Action `zapiszPrzydzial` (`src/app/plan/edycja/actions.ts`):
1. Odczytuje formularz. Nie ufa mu: akcję da się wywołać bezpośrednim żądaniem POST.
2. Wczytuje aktywny plan i dane do walidacji.
3. Odrzuca zmianę, gdy formularz dotyczy innego planu niż aktywny (w międzyczasie wygenerowano nowy) albo innej wersji planu (ktoś zapisał inną zmianę).
4. Sprawdza ograniczenia twarde. Przy naruszeniach zwraca ich listę i nic nie zapisuje.
5. Woła funkcję bazy `zapisz_przydzialy` kluczem `service_role`.
6. Odświeża wszystkie strony (`revalidatePath("/", "layout")`), bo plan pokazują też harmonogramy.

### Równoczesne edycje
Dwie osoby mogą w tej samej chwili przenieść różne zajęcia w to samo miejsce: każda zmiana osobno jest poprawna, razem dają konflikt. Dlatego plan ma licznik zmian (`generation_jobs.zmiany_reczne`). Formularz pamięta licznik, z którym został wczytany. Funkcja bazy zapisuje tylko wtedy, gdy licznik się nie zmienił, i w tej samej instrukcji go podnosi. Druga osoba dostaje komunikat „Plan został w międzyczasie zmieniony” i świeże dane.

### Nowy plan a zmiany ręczne
Zmiany należą do konkretnego zadania generatora. Nowe generowanie tworzy nowy plan bez nich; poprzedni plan ze zmianami zostaje w bazie, ale aplikacja pokazuje najnowszy. Strona generatora ostrzega o tym, gdy aktywny plan ma zmiany ręczne.

## Schemat Supabase
Jedna migracja, tylko rozszerzająca. Starsza wersja aplikacji działa z nową bazą, ale nowa aplikacja czyta nowe kolumny, więc baza musi wdrożyć się pierwsza: do tego czasu `/plan` zgłasza błąd. `deploy-db` uruchamia się sam po merge do `main`.

- `generation_jobs.zmiany_reczne integer not null default 0`: liczba zapisanych zmian ręcznych; służy też jako wersja planu.
- `plan_zajec.edytowano timestamptz`: `null` = termin z generatora, inaczej czas ostatniej zmiany ręcznej.
- `zapisz_przydzialy(p_job_id uuid, p_wersja integer, p_przydzialy jsonb) returns boolean`:
  - `p_przydzialy` to tablica `{zajecia_id, dzien, slot, sala_id, tygodnie}`,
  - zwraca `false` i nic nie zmienia, gdy zadanie nie jest `done` albo `zmiany_reczne <> p_wersja`,
  - błąd, gdy któregoś `zajecia_id` nie ma w planie (wtedy nic się nie zapisuje),
  - `EXECUTE` tylko dla `service_role`.

Funkcja nie sprawdza ograniczeń twardych: robi to Server Action. Więzy tabeli (`dzien`, `slot`, `tygodnie`, klucz obcy sali) nadal obowiązują.

Worker nie wymaga zmian: wstawia wiersze `plan_zajec` z jawną listą kolumn.

## UI
**`/plan`**
- Tabela: przy każdych zajęciach link „Edytuj”. Zajęcia zmienione ręcznie mają znacznik „zmienione ręcznie”.
- Podsumowanie: „zmienione ręcznie: N”, gdy N > 0.
- Eksport XLSX i JSON: kolumna/pole mówiące, czy termin zmieniono ręcznie.

**`/plan/edycja?zajecia=<id>`**
- Nagłówek: przedmiot, forma, grupy, prowadzący, długość zajęć, obecny termin.
- Formularz: Dzień, Początek, Sala, Tygodnie; „Zapisz zmianę”, „Przywróć obecny termin”, „Wróć do planu”.
- Lista konfliktów dla wybranego terminu, aktualizowana na żywo. Z konfliktami nie da się zapisać.
- Informacja o zajęciach powiązanych.
- ~~„Wolne terminy”~~ (usunięte w spec 16): tabela dni × godzin. Komórka pokazuje liczbę sal, w których zajęcia mogą się odbyć w tym terminie; kliknięcie ustawia dzień i godzinę, a salę zostawia, gdy jest wolna, albo wybiera pierwszą wolną.
- Nieznane `zajecia` albo brak planu: komunikat i link do `/plan`.

Sala w formularzu: „A283 · aula · 120 miejsc”. Sale, które nie pasują do zajęć (ograniczenia 6 i 7), nie są proponowane; obecna sala jest na liście zawsze.

## Uruchomienie lokalne
```bash
npm run db:start && npm run db:reset   # schemat i dane wejściowe
docker compose up --build solver-worker # albo plan testowy: npm run test:e2e wgrywa e2e/fixtures/plan.json
npm run dev                             # /generator → Generuj plan → /plan → Edytuj
```

## Kryteria akceptacji
- [x] Z `/plan` da się przejść do edycji dowolnych zajęć i zmienić dzień, godzinę, salę i tygodnie.
- [x] Zmiana łamiąca dowolne ograniczenie twarde 1–10 nie zapisuje się, a komunikat nazywa konflikt.
- [x] Zajęcia `ten_sam_termin` przenoszą się razem.
- [x] Po zapisie `/plan`, harmonogramy i eksport pokazują nowy termin. Test e2e sprawdza `/plan`, eksport i generator; harmonogramy czytają te same dane po `revalidatePath`, ale nie mają własnego testu po edycji.
- [x] Zajęcia zmienione ręcznie są oznaczone.
- [x] Zapis z nieaktualną wersją planu jest odrzucany i nie zmienia danych.
- [x] `anon` i `authenticated` nie mogą wywołać `zapisz_przydzialy`.
- [ ] Plan po dowolnej serii zapisanych zmian przechodzi walidator Pythona (`python -m solver.cli waliduj`) bez naruszeń twardych. Jeszcze niesprawdzone walidatorem Pythona; pilnuje tego na razie tylko walidacja w TypeScripcie.
- [x] `npm run lint`, `npm run build`, `npm test`, `npm run db:test`, `npm run test:e2e` przechodzą.

## Etapy
1. Migracja, typy, testy pgTAP.
2. Walidacja w `src/lib/plan-edycja.ts` z testami.
3. Wczytywanie danych do walidacji i Server Action.
4. Strona edycji z formularzem, konfliktami na żywo i siatką wolnych terminów.
5. Znaczniki na `/plan`, eksport, ostrzeżenie w generatorze.
6. Testy e2e i dokumentacja.

Następne etapy po tym specu: historia zmian z cofaniem, przeciąganie w kalendarzu ([spec 16](16-tablica-edycji.md)). Karę po edycji i miejsca do poprawy pokazuje [spec 15](15-postep-i-problemy.md).
