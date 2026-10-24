"""Niezależny walidator planu: liczy ograniczenia twarde 1-10 i wynik miękkich z surowych danych.

Nie korzysta z modelu solvera. Plan to lista przydziałów (jeden na zajęcia):
{"przydzialy": [{"zajecia_id": "Z001", "dzien": 1, "slot": 3, "sala": "A281", "tygodnie": [1, ..., 14]}]}
"""

from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass, field
from itertools import combinations
from pathlib import Path

from .data import DNI, LICZBA_SLOTOW, Dane, Zajecia
from .weights import DOMYSLNE_WAGI, LIMIT_SLOTOW_W_DNIU, PIERWSZY_SLOT_POZNY


@dataclass(frozen=True)
class Przydzial:
    zajecia_id: str
    dzien: int
    slot: int
    sala: str
    tygodnie: tuple[int, ...]


@dataclass(frozen=True)
class Naruszenie:
    ograniczenie: int
    opis: str
    zajecia: tuple[str, ...] = ()

    def __str__(self) -> str:
        ids = f" [{', '.join(self.zajecia)}]" if self.zajecia else ""
        return f"({self.ograniczenie}) {self.opis}{ids}"


@dataclass
class Raport:
    naruszenia: list[Naruszenie] = field(default_factory=list)
    miekkie: dict[str, int] = field(default_factory=dict)
    wynik_miekkich: int = 0

    @property
    def poprawny(self) -> bool:
        return not self.naruszenia

    def liczba_wg_ograniczenia(self) -> dict[int, int]:
        licznik: dict[int, int] = defaultdict(int)
        for n in self.naruszenia:
            licznik[n.ograniczenie] += 1
        return dict(sorted(licznik.items()))


def wczytaj_plan(sciezka: str | Path) -> list[Przydzial]:
    with open(sciezka, encoding="utf-8") as f:
        return plan_z_slownika(json.load(f))


def zapisz_plan(plan: list[Przydzial], sciezka: str | Path) -> None:
    dane = {
        "przydzialy": [
            {"zajecia_id": p.zajecia_id, "dzien": p.dzien, "slot": p.slot, "sala": p.sala, "tygodnie": list(p.tygodnie)}
            for p in sorted(plan, key=lambda p: p.zajecia_id)
        ]
    }
    with open(sciezka, "w", encoding="utf-8") as f:
        json.dump(dane, f, ensure_ascii=False, indent=1)


def plan_z_slownika(d: dict) -> list[Przydzial]:
    return [
        Przydzial(
            zajecia_id=r["zajecia_id"],
            dzien=r["dzien"],
            slot=r["slot"],
            sala=r["sala"],
            tygodnie=tuple(r["tygodnie"]),
        )
        for r in d["przydzialy"]
    ]


def blad_tygodni(z: Zajecia, tygodnie: tuple[int, ...]) -> str | None:
    """Ograniczenie 2: liczba spotkań, zakres, częstotliwość i tygodnie niedostępne."""
    t = sorted(tygodnie)
    if len(set(t)) != len(t):
        return "powtórzone tygodnie"
    if any(w < z.tydzien_od or w > z.tydzien_do for w in t):
        return f"tygodnie poza zakresem {z.tydzien_od}-{z.tydzien_do}"
    if set(t) & set(z.tygodnie_niedostepne):
        return "tydzień niedostępny"
    if len(t) != z.liczba_spotkan:
        return f"{len(t)} spotkań zamiast {z.liczba_spotkan}"
    dostepne = set(z.dostepne_tygodnie())
    if z.czestotliwosc == "co_tydzien":
        if set(t) != dostepne:
            return "co_tydzien: nie wszystkie tygodnie zakresu"
    elif z.czestotliwosc == "co_2_tygodnie":
        if len({w % 2 for w in t}) > 1:
            return "co_2_tygodnie: mieszane tygodnie parzyste i nieparzyste"
        parzystosc = t[0] % 2 if t else 0
        if set(t) != {w for w in dostepne if w % 2 == parzystosc}:
            return "co_2_tygodnie: nie co drugi tydzień zakresu"
    elif z.czestotliwosc == "wybrane_tygodnie":
        pass  # dowolny podzbiór zakresu o właściwej liczności, sprawdzony wyżej
    else:
        return f"nieznana częstotliwość {z.czestotliwosc}"
    return None


def _zajmuje_sloty(p: Przydzial, z: Zajecia) -> range:
    return range(p.slot, p.slot + z.sloty)


def _nakladaja(a: Przydzial, za: Zajecia, b: Przydzial, zb: Zajecia) -> bool:
    return (
        a.dzien == b.dzien
        and a.slot < b.slot + zb.sloty
        and b.slot < a.slot + za.sloty
        and bool(set(a.tygodnie) & set(b.tygodnie))
    )


def waliduj(dane: Dane, plan: list[Przydzial], wagi: dict[str, int] | None = None) -> Raport:
    raport = Raport()
    n = raport.naruszenia

    # 1. Dokładnie jeden przydział na zajęcia, poprawny dzień, slot i sala.
    wg_id: dict[str, list[Przydzial]] = defaultdict(list)
    for p in plan:
        wg_id[p.zajecia_id].append(p)
    for zid in dane.zajecia:
        if zid not in wg_id:
            n.append(Naruszenie(1, "brak przydziału", (zid,)))
    for zid, lista in wg_id.items():
        if zid not in dane.zajecia:
            n.append(Naruszenie(1, "przydział nieznanych zajęć", (zid,)))
        elif len(lista) > 1:
            n.append(Naruszenie(1, f"{len(lista)} przydziałów zamiast jednego", (zid,)))

    ocenione: list[tuple[Przydzial, Zajecia]] = []
    for zid, lista in wg_id.items():
        z = dane.zajecia.get(zid)
        if z is None or len(lista) != 1:
            continue
        p = lista[0]
        if p.dzien not in DNI:
            n.append(Naruszenie(1, f"dzień {p.dzien} poza 1-5", (zid,)))
        elif p.slot < 1 or p.slot + z.sloty - 1 > LICZBA_SLOTOW:
            n.append(Naruszenie(1, f"sloty {p.slot}-{p.slot + z.sloty - 1} poza 1-{LICZBA_SLOTOW}", (zid,)))
        elif p.sala not in dane.sale:
            n.append(Naruszenie(1, f"nieznana sala {p.sala}", (zid,)))
        else:
            ocenione.append((p, z))

    for p, z in ocenione:
        # 2. Tygodnie.
        blad = blad_tygodni(z, p.tygodnie)
        if blad:
            n.append(Naruszenie(2, blad, (z.id,)))

        sala = dane.sale[p.sala]
        # 6. Typ, wyposażenie, dostępność sali.
        if z.dozwolone_sale:
            if p.sala not in z.dozwolone_sale:
                n.append(Naruszenie(6, f"sala {p.sala} poza dozwolone_sale", (z.id,)))
        elif not sala.dostepna or sala.typ not in z.typy_sal:
            n.append(Naruszenie(6, f"sala {p.sala} ({sala.typ}) niedozwolona", (z.id,)))
        brak = set(z.wymagane_wyposazenie) - sala.wyposazenie
        if brak:
            n.append(Naruszenie(6, f"sala {p.sala} bez wyposażenia {sorted(brak)}", (z.id,)))
        # 7. Pojemność.
        if sala.pojemnosc < z.potrzebne_miejsca:
            n.append(
                Naruszenie(7, f"sala {p.sala} ({sala.pojemnosc} miejsc) dla {z.potrzebne_miejsca} osób", (z.id,))
            )

        # 8. Dezyderaty i Rada Wydziału prowadzących.
        for prow in z.prowadzacy:
            zle = [s for s in _zajmuje_sloty(p, z) if (p.dzien, s) in dane.wykluczone.get(prow, ())]
            if zle:
                n.append(Naruszenie(8, f"{prow} wykluczony: dzień {p.dzien}, sloty {zle}", (z.id,)))

        # 9. Blokady stałe grup (i grup z nimi kolidujących).
        for b in dane.blokady:
            if (
                b.dzien == p.dzien
                and p.slot <= b.slot_do
                and b.slot_od < p.slot + z.sloty
                and any(dane.koliduja(b.grupa, g) for g in z.grupy)
            ):
                n.append(Naruszenie(9, f"blokada stała {b.grupa} dzień {b.dzien}", (z.id,)))

    # 3-5. Nakładanie się zajęć prowadzącego, sali i studentów.
    for (a, za), (b, zb) in combinations(ocenione, 2):
        if not _nakladaja(a, za, b, zb):
            continue
        wspolni = set(za.prowadzacy) & set(zb.prowadzacy)
        if wspolni:
            n.append(Naruszenie(3, f"prowadzący {sorted(wspolni)} ma nakładające się zajęcia", (za.id, zb.id)))
        if a.sala == b.sala:
            n.append(Naruszenie(4, f"sala {a.sala} zajęta podwójnie", (za.id, zb.id)))
        if dane.grupy_koliduja(za.grupy, zb.grupy):
            n.append(Naruszenie(5, "studenci mają nakładające się zajęcia", (za.id, zb.id)))

    # 10. Powiązania.
    zestawy: dict[str, list[tuple[Przydzial, Zajecia]]] = defaultdict(list)
    for p, z in ocenione:
        if z.powiazanie:
            zestawy[z.powiazanie].append((p, z))
    for pow_id, czlonkowie in zestawy.items():
        for (a, za), (b, zb) in combinations(czlonkowie, 2):
            if za.typ_powiazania == "rozne_dni" and a.dzien == b.dzien:
                n.append(Naruszenie(10, f"{pow_id}: ten sam dzień {a.dzien}", (za.id, zb.id)))
            elif za.typ_powiazania == "ten_sam_termin" and (a.dzien, a.slot, a.sala) != (b.dzien, b.slot, b.sala):
                n.append(Naruszenie(10, f"{pow_id}: inny dzień, godzina lub sala", (za.id, zb.id)))

    raport.miekkie = ocen_miekkie(dane, ocenione)
    w = wagi or DOMYSLNE_WAGI
    raport.wynik_miekkich = sum(w.get(k, 0) * v for k, v in raport.miekkie.items())
    return raport


def ocen_miekkie(dane: Dane, plan: list[tuple[Przydzial, Zajecia]]) -> dict[str, int]:
    """Wartości surowe ograniczeń miękkich (mniej = lepiej), zsumowane po 14 tygodniach."""
    grupa_dzien: dict[tuple[str, int, int], set[int]] = defaultdict(set)
    prow_dzien: dict[tuple[str, int, int], set[int]] = defaultdict(set)
    prow_dni: dict[str, set[int]] = defaultdict(set)
    prow_liczba: dict[str, int] = defaultdict(int)
    poza = 0
    sala_luz = 0

    for p, z in plan:
        sloty = set(_zajmuje_sloty(p, z))
        poza += sum(1 for s in sloty if s == 1 or s >= PIERWSZY_SLOT_POZNY) * len(p.tygodnie)
        sala_luz += round(100 * (dane.sale[p.sala].pojemnosc - z.potrzebne_miejsca) / dane.sale[p.sala].pojemnosc)
        for w in p.tygodnie:
            for g in z.grupy:
                grupa_dzien[(g, p.dzien, w)] |= sloty
            for prow in z.prowadzacy:
                prow_dzien[(prow, p.dzien, w)] |= sloty
        for prow in z.prowadzacy:
            prow_dni[prow].add(p.dzien)
            prow_liczba[prow] += 1

    grupa_sloty = _sloty_grup_z_przodkami(dane, grupa_dzien)

    okienka_studentow = sum(_okienka(s) for s in grupa_sloty.values())
    okienka_prow = sum(_okienka(s) for s in prow_dzien.values())
    przeciazenie = sum(max(0, len(s) - LIMIT_SLOTOW_W_DNIU) for s in grupa_sloty.values())

    preferencja = 0
    for prow, dni in prow_dni.items():
        tryb = dane.preferencje.get(prow, "brak")
        if tryb == "skumulowane":
            preferencja += len(dni)
        elif tryb == "nieskumulowane":
            preferencja += max(0, min(3, prow_liczba[prow]) - len(dni))

    return {
        "preferencja_dni": preferencja,
        "okienka_studentow": okienka_studentow,
        "okienka_prowadzacych": okienka_prow,
        "poza_godzinami": poza,
        "przeciazenie_dnia": przeciazenie,
        "zla_wielkosc_sali": sala_luz,
    }


def _sloty_grup_z_przodkami(
    dane: Dane, grupa_dzien: dict[tuple[str, int, int], set[int]]
) -> dict[tuple[str, int, int], set[int]]:
    """Dzień grupy obejmuje też zajęcia jej grup nadrzędnych (np. wykład dla całego rocznika)."""
    wynik: dict[tuple[str, int, int], set[int]] = {}
    for (g, dzien, tydzien) in list(grupa_dzien):
        razem: set[int] = set()
        for a in dane.przodkowie(g):
            razem |= grupa_dzien.get((a, dzien, tydzien), set())
        wynik[(g, dzien, tydzien)] = razem
    return wynik


def _okienka(sloty: set[int]) -> int:
    """Puste sloty między pierwszymi a ostatnimi zajęciami dnia."""
    if not sloty:
        return 0
    return (max(sloty) - min(sloty) + 1) - len(sloty)
