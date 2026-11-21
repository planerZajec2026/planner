# Spec 17: Czyszczenie bazy danych

**Branch:** `feat/czyszczenie-bazy` · **Route(s):** `/import`

## Cel
Do tej pory bazę dało się wyczyścić tylko zapytaniem w SQL Editorze Supabase. Strona Import danych dostaje „Strefę zagrożenia” z przyciskiem „Wyczyść bazę danych…”. Jak przy usuwaniu repozytorium na GitHubie, okno potwierdzenia mówi, co zniknie, a przycisk odblokowuje się dopiero, gdy użytkownik ręcznie wpisze frazę.

## Co jest usuwane
Funkcja bazy `wyczysc_dane_planu()` (migracja `20261121120000_wyczysc_dane_planu.sql`) w jednej transakcji czyści te same tabele, które zastępuje `wgraj_dane_planu`:
- dane wejściowe: kalendarz, sloty, sale, prowadzący, roczniki, grupy, studenci, kolizje, przedmioty, zajęcia, blokady, Rada Wydziału, dezyderaty,
- wygenerowane plany (`generation_jobs`, `plan_zajec`) z ręcznymi zmianami.

`ustawienia` (rok akademicki w stopce) zostają. Funkcja zwraca liczby usuniętych zajęć, grup, sal, prowadzących i planów. Wywołać ją może tylko `service_role`.

## Potwierdzenie
- Fraza: **wyczyść bazę danych** (`FRAZA_POTWIERDZENIA` w `src/lib/czyszczenie-bazy.ts`). Wielkość liter i polskie znaki muszą się zgadzać; spacje wokół nie przeszkadzają (`potwierdzono`).
- Okno (`src/components/import/CzyszczenieBazy.tsx`, modalny `<dialog>`): ostrzeżenie, że tego nie da się cofnąć, lista tego, co zostanie usunięte (z liczbami z `getStanBazy`), pole na frazę, przycisk „Rozumiem, wyczyść bazę danych” (czerwony, `btn-danger`), „Anuluj”. Escape, „Zamknij” i kliknięcie w tło zamykają okno.
- Server Action `wyczyscBaze` (`src/app/import/actions.ts`) sprawdza frazę jeszcze raz, bo akcję da się wywołać bezpośrednim żądaniem POST, a dopiero potem woła funkcję bazy kluczem `service_role`. Po sukcesie odświeża wszystkie strony (`revalidatePath("/", "layout")`).
- Po wyczyszczeniu karta mówi, co usunięto, a strona pokazuje, że baza jest pusta. Przy pustej bazie przycisk jest wyłączony.

## Bezpieczeństwo
Logowania jeszcze nie ma (spec 11), więc wyczyścić bazę może każdy, kto otworzy aplikację. To ten sam poziom ryzyka co dotychczasowy import, który też zastępuje wszystkie dane. Fraza chroni przed pomyłką, nie przed złą wolą.

## Kryteria akceptacji
- [x] `/import` ma „Strefę zagrożenia” z przyciskiem „Wyczyść bazę danych…”; przy pustej bazie wyłączonym.
- [x] Okno wylicza, co zostanie usunięte; przycisk jest wyłączony, dopóki fraza nie zgadza się dokładnie.
- [x] Serwer odrzuca czyszczenie bez frazy i niczego nie usuwa.
- [x] Po czyszczeniu nie ma danych wejściowych ani planów; `ustawienia` zostają (test pgTAP `wyczysc_dane_planu.test.sql`).
- [x] `anon` i `authenticated` nie mogą wywołać `wyczysc_dane_planu`.
- [ ] `npm run db:test` i `npm run test:e2e` przechodzą (uruchomi CI).
