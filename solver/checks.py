"""Kontrola spójności danych wejściowych, zanim zaczniemy planować."""

from __future__ import annotations

from collections import Counter

from .data import DNI, LICZBA_SLOTOW, LICZBA_TYGODNI, Dane

LIMIT_GODZIN_WYKLUCZONYCH = 12


def sprawdz_dane(dane: Dane) -> list[str]:
    """Zwraca listę problemów; pusta lista oznacza, że dane są spójne."""
    problemy: list[str] = []

    for z in dane.zajecia.values():
        for g in z.grupy:
            if g not in dane.grupy:
                problemy.append(f"{z.id}: nieznana grupa {g}")
        for p in z.prowadzacy:
            if p not in dane.prowadzacy:
                problemy.append(f"{z.id}: nieznany prowadzący {p}")
        for s in z.dozwolone_sale:
            if s not in dane.sale:
                problemy.append(f"{z.id}: nieznana sala {s} w dozwolone_sale")
        if not 1 <= z.sloty <= LICZBA_SLOTOW:
            problemy.append(f"{z.id}: {z.sloty} slotów na spotkanie")
        if not dane.dozwolone_sale(z):
            problemy.append(f"{z.id}: brak sali spełniającej typ, wyposażenie i pojemność")
        if not _ma_wolny_termin(dane, z):
            problemy.append(f"{z.id}: brak terminu poza wykluczeniami prowadzących")
        problemy.extend(_sprawdz_tygodnie(z))

    problemy.extend(_sprawdz_powiazania(dane))

    if dane.kolizje != dane.kolizje_podane:
        problemy.append(
            f"kolizje_grup różni się od wyliczonych ze studenci_grupy "
            f"({len(dane.kolizje ^ dane.kolizje_podane)} par)"
        )

    for p, godziny in dane.wykluczone_wlasne.items():
        if len(godziny) > LIMIT_GODZIN_WYKLUCZONYCH:
            problemy.append(f"{p}: {len(godziny)} godzin wykluczonych (limit {LIMIT_GODZIN_WYKLUCZONYCH})")

    for b in dane.blokady:
        if b.grupa not in dane.grupy:
            problemy.append(f"blokada: nieznana grupa {b.grupa}")

    problemy.extend(_sprawdz_kalendarz(dane))
    return problemy


def _ma_wolny_termin(dane: Dane, z) -> bool:
    sale = dane.dozwolone_sale(z)
    if not sale:
        return False
    for dzien in DNI:
        for start in range(1, LICZBA_SLOTOW - z.sloty + 2):
            sloty = range(start, start + z.sloty)
            if all((dzien, s) not in dane.wykluczone.get(p, ()) for p in z.prowadzacy for s in sloty):
                return True
    return False


def _sprawdz_tygodnie(z) -> list[str]:
    dostepne = z.dostepne_tygodnie()
    if z.czestotliwosc == "co_tydzien":
        ok = len(dostepne) == z.liczba_spotkan
    elif z.czestotliwosc == "co_2_tygodnie":
        ok = any(len([w for w in dostepne if w % 2 == par]) == z.liczba_spotkan for par in (0, 1))
    elif z.czestotliwosc == "wybrane_tygodnie":
        ok = len(dostepne) >= z.liczba_spotkan
    else:
        return [f"{z.id}: nieznana częstotliwość {z.czestotliwosc}"]
    return [] if ok else [f"{z.id}: {z.czestotliwosc} nie daje {z.liczba_spotkan} spotkań w tygodniach {z.tydzien_od}-{z.tydzien_do}"]


def _sprawdz_powiazania(dane: Dane) -> list[str]:
    zestawy: dict[str, list] = {}
    for z in dane.zajecia.values():
        if z.powiazanie:
            zestawy.setdefault(z.powiazanie, []).append(z)
    problemy: list[str] = []
    for pow_id, czlonkowie in zestawy.items():
        if len(czlonkowie) < 2:
            problemy.append(f"{pow_id}: zestaw ma tylko jedne zajęcia")
        if len({z.typ_powiazania for z in czlonkowie}) != 1:
            problemy.append(f"{pow_id}: różne typy powiązań w jednym zestawie")
    return problemy


def _sprawdz_kalendarz(dane: Dane) -> list[str]:
    wystapienia = Counter(d.plan_dnia for d in dane.kalendarz if d.plan_dnia is not None)
    problemy = [
        f"dzień planu {dzien}: {wystapienia.get(dzien, 0)} wystąpień zamiast {LICZBA_TYGODNI}"
        for dzien in DNI
        if wystapienia.get(dzien, 0) != LICZBA_TYGODNI
    ]
    for dzien in DNI:
        numery = sorted(d.nr_tygodnia for d in dane.kalendarz if d.plan_dnia == dzien)
        if numery != list(range(1, len(numery) + 1)):
            problemy.append(f"dzień planu {dzien}: numeracja tygodni nie jest ciągła")
    return problemy
