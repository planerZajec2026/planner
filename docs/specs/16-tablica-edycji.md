# Spec 16: Tablica edycji planu

**Branch:** `feat/16-tablica-edycji` · **Route(s):** `/plan/edycja?grupa=|prowadzacy=|sala=&tydzien=&zajecia=&powrot=`

## Cel
Do tej pory zajęcia przenosiło się po jednych, w formularzu ([spec 14](14-edycja-planu.md)), do którego prowadził link „Edytuj” albo lista „Do poprawy”. Planista nie widział zajęć na siatce tygodnia.

Strona „Edycja planu” pokazuje cały plan jako siatkę dni i slotów, jak harmonogram. Zajęcia przenosi się przeciągnięciem kafelka. Siatka podświetla w trakcie, gdzie wolno je postawić, a upuszczenie otwiera okno z potwierdzeniem, starym i nowym terminem.

## Zakres
- `/plan/edycja` to tablica całego planu z pozycją „Edycja planu” w menu.
- Filtr: jedna grupa (z zajęciami grup nadrzędnych, jak harmonogram), jeden prowadzący albo jedna sala, opcjonalnie jeden tydzień.
- Przeciąganie myszą, piórem albo palcem (po przytrzymaniu).
- Okno przeniesienia: termin teraz i po zmianie, sala do wyboru, zajęcia powiązane, konflikty, zmiana kary, zapis.
- Kliknięcie kafelka zaznacza zajęcia i pokazuje nad tablicą kartę zajęć i formularz „Nowy termin” (dostęp z klawiatury, zmiana tygodni). Tabela „Wolne terminy” formularza zniknęła: tę samą informację daje przeciąganie.
- Prawy przycisk (albo klawisz menu / Shift+F10 na kafelku) otwiera okno ze szczegółami zajęć, to samo co w harmonogramach (`SzczegolyZajecDialog`), z liczbą osób i kodem zajęć.
- Nazwy grup są wszędzie takie same: „INF1-R1 · Grupa 1” (`etykietaGrupy` w `src/lib/labels.ts`), a listy są posortowane tak samo (`wgEtykiety`), w harmonogramie grup, na `/plan` i na tablicy.

**Poza zakresem:**
- zapis mimo konfliktu (plan zawsze spełnia ograniczenia twarde, jak w spec 14),
- przeciąganie z klawiatury (zastępuje je formularz pod tablicą),
- zmiana tygodni przeciągnięciem (tygodnie zostają; zmienia się je w formularzu),
- cofanie zmian.

## Tablica
- Kolejność na stronie: filtr, karta zaznaczonych zajęć i formularz, podpowiedź z legendą, tablica.
- Kolumny pn–pt, wiersze to 12 slotów po 45 minut. Kafelek zajmuje tyle wierszy, ile slotów mają zajęcia. Wygląd jak w harmonogramie (`.class-block`; jeden slot = kafelek kompaktowy).
- Zajęcia w tym samym czasie (np. tygodnie parzyste i nieparzyste) stoją obok siebie (`layoutDay`). Kafelek mówi, w których tygodniach są zajęcia, gdy nie co tydzień (`krotkieTygodnie`).
- Druga linia kafelka podaje to, czego nie mówi filtr: dla grupy salę i prowadzącego, dla prowadzącego salę i grupy, dla sali grupy i prowadzącego.
- Filtr i tydzień („Zakres tygodni”; nie „Tydzień”, bo wyszukiwanie etykiet w testach dopasowuje fragmenty słów, a formularz ma „Dzień”) są w adresie. Bez filtra: grupa zajęć z `?zajecia=`, w przeciwnym razie pierwsza grupa. Zaznaczenie zmienia `?zajecia=` bez przeładowania strony; zmiana filtra je zachowuje.

## Przeciąganie
Zdarzenia wskaźnika, bez biblioteki (`src/components/plan/tablica/TablicaPlanu.tsx`):
1. Mysz i pióro: przeciąganie zaczyna się po przesunięciu o 4 px; krótsze wciśnięcie to kliknięcie. Palec: po przytrzymaniu 300 ms; ruch o ponad 8 px przed tym czasem to przewinięcie (kafelki mają `touch-action: none`, siatkę przewija się poza nimi).
2. Na początku liczy się raz `wolneTerminy` przeciąganych zajęć (ta sama funkcja, która liczyła dawną siatkę wolnych terminów formularza). Każdy termin startu dostaje kolor (`stanKomorki`):
   - zielony: w co najmniej jednej sali nic nie koliduje,
   - bursztynowy: ludzie są wolni, ale żadna pasująca sala,
   - czerwony, kreskowany: konflikt prowadzącego, studentów, dezyderat, blokada albo powiązanie,
   - bez koloru: zajęcia nie zmieszczą się do końca dnia.

   Obecny termin przeciąganych zajęć ma własny kolor (niebieski), żeby było widać, co i skąd się przenosi.
3. Pod wskaźnikiem jest obrys docelowych slotów w kolorze stanu, a za wskaźnikiem idzie kopia kafelka. Kafelek trzyma się wskaźnika za slot, za który go chwycono (`komorkaPod`). Czytnik ekranu dostaje opis celu (`aria-live`).
4. Esc przerywa. Upuszczenie poza siatką albo na obecny termin nic nie robi. Kliknięcie kończące przeciąganie nie zaznacza zajęć.

## Okno przeniesienia
`PrzeniesienieDialog.tsx`, modalny `<dialog>`:
- tabela „Teraz | Po zmianie”: dzień, godziny, sala, tygodnie; zmienione wiersze są wyróżnione,
- sala: obecna, jeśli w nowym terminie jest wolna, w przeciwnym razie najmniejsza wolna (`salaPoUpuszczeniu`); lista podaje wolne sale,
- zajęcia `ten_sam_termin`, które przeniosą się razem (`zmianyDla`),
- konflikty z `naruszenia`; gdy są, „Zapisz zmianę” jest wyłączony,
- zmiana kary miękkich (`ZmianaKary`, [spec 15](15-postep-i-problemy.md)).

Zapis idzie przez tę samą Server Action co formularz (`zapiszPrzydzial`), więc serwer sprawdza zmianę od nowa i pilnuje wersji planu. Błąd, także „Plan został w międzyczasie zmieniony”, zostaje w oknie. Po zapisie okno się zamyka, nad tablicą pojawia się komunikat, a `revalidatePath` przenosi kafelek.

## Dane
`getKontekstPlanu` (`src/lib/data/plan-edycja.ts`) wczytuje aktywny plan z kolizjami grup i wykluczeniami wszystkich prowadzących (także Radę Wydziału dla jej członków), żeby tablica mogła sprawdzić przeniesienie dowolnych zajęć. To 173 kolizje i 288 wykluczeń; powyżej 1000 wierszy (limit API) funkcja zgłasza błąd zamiast po cichu uciąć dane. Akcja zapisu dalej używa `getKontekstEdycji`, zawężonego do przenoszonych zajęć. Schemat bazy bez zmian.

Logika bez Reacta jest w `src/lib/tablica-planu.ts`.

## Kryteria akceptacji
- [x] `/plan/edycja` pokazuje tablicę planu z filtrem grupy, prowadzącego albo sali i tygodnia; menu ma pozycję „Edycja planu”, a na tej stronie jest podświetlona tylko ona.
- [x] Przeciąganie koloruje terminy według `wolneTerminy` i pokazuje cel pod wskaźnikiem; Esc przerywa.
- [x] Upuszczenie otwiera okno ze starym i nowym terminem, salą do wyboru, zajęciami powiązanymi, konfliktami i karą; z konfliktem nie da się zapisać.
- [x] Zapis z okna przenosi zajęcia (ta sama akcja i walidacja co formularz).
- [x] Kliknięcie kafelka i link z `?zajecia=` zaznaczają zajęcia i pokazują formularz ze spec 14.
- [ ] `npm run test:e2e` przechodzi (`e2e/tablica-edycji.spec.ts`, axe dla `/plan/edycja` i okna).
