"""Wczytywanie danych wejściowych (requirements/dane_planu.json) do typowanych struktur."""

from __future__ import annotations

import json
from dataclasses import dataclass
from itertools import combinations
from pathlib import Path

LICZBA_SLOTOW = 12
DNI = (1, 2, 3, 4, 5)
LICZBA_TYGODNI = 14

DOMYSLNE_DANE = Path(__file__).resolve().parent.parent / "requirements" / "dane_planu.json"


@dataclass(frozen=True)
class Zajecia:
    id: str
    rocznik: str
    przedmiot: str
    forma: str
    grupy: tuple[str, ...]
    liczba_studentow: int
    dodatkowi_studenci: int
    prowadzacy: tuple[str, ...]
    liczba_spotkan: int
    sloty: int
    czestotliwosc: str
    tydzien_od: int
    tydzien_do: int
    typy_sal: tuple[str, ...]
    dozwolone_sale: tuple[str, ...]
    wymagane_wyposazenie: tuple[str, ...]
    powiazanie: str | None
    typ_powiazania: str | None
    tygodnie_niedostepne: tuple[int, ...]

    @property
    def potrzebne_miejsca(self) -> int:
        return self.liczba_studentow + self.dodatkowi_studenci

    def dostepne_tygodnie(self) -> tuple[int, ...]:
        """Tygodnie z dozwolonego zakresu, bez `tygodnie_niedostepne`."""
        return tuple(
            w
            for w in range(self.tydzien_od, self.tydzien_do + 1)
            if w not in self.tygodnie_niedostepne
        )


@dataclass(frozen=True)
class Sala:
    id: str
    typ: str
    pojemnosc: int | None  # brak dla części sal niedostępnych do planowania
    wyposazenie: frozenset[str]
    dostepna: bool


@dataclass(frozen=True)
class Grupa:
    id: str
    rocznik: str
    nadrzedna: str | None
    liczba_studentow: int


@dataclass(frozen=True)
class Blokada:
    grupa: str
    dzien: int
    slot_od: int
    slot_do: int


@dataclass(frozen=True)
class DzienKalendarza:
    data: str
    typ: str
    plan_dnia: int | None
    nr_tygodnia: int | None


@dataclass(frozen=True)
class Dane:
    zajecia: dict[str, Zajecia]
    sale: dict[str, Sala]
    prowadzacy: frozenset[str]
    grupy: dict[str, Grupa]
    studenci_grup: dict[str, frozenset[str]]
    kolizje: frozenset[frozenset[str]]
    blokady: tuple[Blokada, ...]
    # Godziny, w których prowadzący nie może prowadzić zajęć: dezyderaty + Rada Wydziału dla członków rady.
    wykluczone: dict[str, frozenset[tuple[int, int]]]
    # Z dezyderaty_terminy, tylko typ "wykluczony" (limit 12 godzin na osobę).
    wykluczone_wlasne: dict[str, frozenset[tuple[int, int]]]
    preferencje: dict[str, str]
    kalendarz: tuple[DzienKalendarza, ...]
    kolizje_podane: frozenset[frozenset[str]]

    def koliduja(self, a: str, b: str) -> bool:
        """Czy grupy mają wspólnego studenta (grupa koliduje sama ze sobą)."""
        return a == b or frozenset((a, b)) in self.kolizje

    def grupy_koliduja(self, ga: tuple[str, ...], gb: tuple[str, ...]) -> bool:
        return any(self.koliduja(a, b) for a in ga for b in gb)

    def dozwolone_sale(self, z: Zajecia) -> list[str]:
        """Sale spełniające ograniczenia 6 i 7 dla danych zajęć."""
        return [s.id for s in self.sale.values() if sala_pasuje(z, s)]

    def przodkowie(self, grupa_id: str) -> list[str]:
        """Grupa i jej grupy nadrzędne, od najbliższej do rocznika."""
        wynik: list[str] = []
        biezaca: str | None = grupa_id
        while biezaca is not None and biezaca not in wynik:
            wynik.append(biezaca)
            biezaca = self.grupy[biezaca].nadrzedna if biezaca in self.grupy else None
        return wynik


def sala_pasuje(z: Zajecia, s: Sala) -> bool:
    if z.dozwolone_sale:
        typ_ok = s.id in z.dozwolone_sale
    else:
        typ_ok = s.dostepna and s.typ in z.typy_sal
    return (
        typ_ok
        and set(z.wymagane_wyposazenie) <= s.wyposazenie
        and (s.pojemnosc or 0) >= z.potrzebne_miejsca
    )


def wczytaj(sciezka: str | Path = DOMYSLNE_DANE) -> Dane:
    with open(sciezka, encoding="utf-8") as f:
        return z_slownika(json.load(f))


def z_slownika(d: dict) -> Dane:
    zajecia = {
        r["id"]: Zajecia(
            id=r["id"],
            rocznik=r["rocznik"],
            przedmiot=r["przedmiot"],
            forma=r["forma"],
            grupy=tuple(r["grupy"]),
            liczba_studentow=r["liczba_studentow"],
            dodatkowi_studenci=r.get("dodatkowi_studenci") or 0,
            prowadzacy=tuple(r["prowadzacy"]),
            liczba_spotkan=r["liczba_spotkan"],
            sloty=r["sloty_na_spotkanie"],
            czestotliwosc=r["czestotliwosc"],
            tydzien_od=r["tydzien_od"],
            tydzien_do=r["tydzien_do"],
            typy_sal=tuple(r.get("typy_sal") or ()),
            dozwolone_sale=tuple(r.get("dozwolone_sale") or ()),
            wymagane_wyposazenie=tuple(r.get("wymagane_wyposazenie") or ()),
            powiazanie=r.get("powiazanie"),
            typ_powiazania=r.get("typ_powiazania"),
            tygodnie_niedostepne=tuple(r.get("tygodnie_niedostepne") or ()),
        )
        for r in d["zajecia"]
    }
    sale = {
        r["id"]: Sala(
            id=r["id"],
            typ=r["typ"],
            pojemnosc=r["pojemnosc"],
            wyposazenie=frozenset(r.get("wyposazenie") or ()),
            dostepna=bool(r["dostepna_do_planowania"]),
        )
        for r in d["sale"]
    }
    grupy = {
        r["id"]: Grupa(
            id=r["id"],
            rocznik=r["rocznik"],
            nadrzedna=r.get("grupa_nadrzedna"),
            liczba_studentow=r["liczba_studentow"],
        )
        for r in d["grupy"]
    }

    studenci: dict[str, set[str]] = {g: set() for g in grupy}
    for r in d["studenci_grupy"]:
        studenci.setdefault(r["grupa"], set()).add(r["student"])
    studenci_grup = {g: frozenset(s) for g, s in studenci.items()}
    # Kolizje liczymy ze studenci_grupy (źródło prawdy), nie z gotowej tabeli kolizje_grup.
    kolizje = frozenset(
        frozenset((a, b))
        for a, b in combinations(sorted(studenci_grup), 2)
        if studenci_grup[a] & studenci_grup[b]
    )
    kolizje_podane = frozenset(
        frozenset((r["grupa_a"], r["grupa_b"])) for r in d["kolizje_grup"]
    )

    prowadzacy_rady = {r["id"] for r in d["prowadzacy"] if r["czlonek_rady_wydzialu"]}
    wykluczone: dict[str, set[tuple[int, int]]] = {r["id"]: set() for r in d["prowadzacy"]}
    wlasne: dict[str, set[tuple[int, int]]] = {r["id"]: set() for r in d["prowadzacy"]}
    for r in d["dezyderaty_terminy"]:
        wykluczone.setdefault(r["prowadzacy"], set()).add((r["dzien"], r["slot"]))
        if r["typ"] == "wykluczony":
            wlasne.setdefault(r["prowadzacy"], set()).add((r["dzien"], r["slot"]))
    for rada in d["rada_wydzialu"]:
        for p in prowadzacy_rady:
            for slot in range(rada["slot_od"], rada["slot_do"] + 1):
                wykluczone[p].add((rada["dzien"], slot))

    return Dane(
        zajecia=zajecia,
        sale=sale,
        prowadzacy=frozenset(wykluczone),
        grupy=grupy,
        studenci_grup=studenci_grup,
        kolizje=kolizje,
        blokady=tuple(
            Blokada(r["grupa"], r["dzien"], r["slot_od"], r["slot_do"])
            for r in d["blokady_stale"]
        ),
        wykluczone={p: frozenset(s) for p, s in wykluczone.items()},
        wykluczone_wlasne={p: frozenset(s) for p, s in wlasne.items()},
        preferencje={r["prowadzacy"]: r["preferencja_dni"] for r in d["dezyderaty_ogolne"]},
        kalendarz=tuple(
            DzienKalendarza(r["data"], r["typ_dnia"], r["plan_dnia"], r["nr_tygodnia"])
            for r in d["kalendarz"]
        ),
        kolizje_podane=kolizje_podane,
    )
