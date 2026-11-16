"""Wspólne dane testowe: mały, ręcznie zbudowany zestaw z kontrolowanymi kolizjami."""

from __future__ import annotations

import copy

import pytest

from solver.data import Dane, z_slownika
from solver.validator import Przydzial

WSZYSTKIE_TYGODNIE = tuple(range(1, 15))


def zajecia(id: str, **nadpisz) -> dict:
    baza = {
        "id": id,
        "rocznik": "R1",
        "przedmiot": "Przedmiot",
        "forma": "K",
        "grupy": ["R1-ALL"],
        "liczba_studentow": 20,
        "laczone_z": None,
        "dodatkowi_studenci": 0,
        "prowadzacy": ["P01"],
        "liczba_spotkan": 14,
        "sloty_na_spotkanie": 2,
        "czestotliwosc": "co_tydzien",
        "tydzien_od": 1,
        "tydzien_do": 14,
        "typy_sal": ["sala_dydaktyczna"],
        "dozwolone_sale": [],
        "wymagane_wyposazenie": [],
        "powiazanie": None,
        "typ_powiazania": None,
        "tygodnie_niedostepne": [],
    }
    baza.update(nadpisz)
    return baza


def mini_slownik() -> dict:
    return {
        "zajecia": [zajecia("Z1"), zajecia("Z2", prowadzacy=["P02"], grupy=["R1-G1"])],
        "sale": [
            {"id": "S1", "typ": "sala_dydaktyczna", "pojemnosc": 30, "wyposazenie": ["projektor"], "dostepna_do_planowania": True},
            {"id": "S2", "typ": "sala_dydaktyczna", "pojemnosc": 10, "wyposazenie": [], "dostepna_do_planowania": True},
            {"id": "S3", "typ": "pracownia_komputerowa", "pojemnosc": 30, "wyposazenie": ["MAC"], "dostepna_do_planowania": False},
            {"id": "S4", "typ": "sala_dydaktyczna", "pojemnosc": 30, "wyposazenie": [], "dostepna_do_planowania": True},
        ],
        "prowadzacy": [
            {"id": "P01", "czlonek_rady_wydzialu": False},
            {"id": "P02", "czlonek_rady_wydzialu": True},
        ],
        "grupy": [
            {"id": "R1-ALL", "rocznik": "R1", "grupa_nadrzedna": None, "liczba_studentow": 4},
            {"id": "R1-G1", "rocznik": "R1", "grupa_nadrzedna": "R1-ALL", "liczba_studentow": 2},
            {"id": "R1-G2", "rocznik": "R1", "grupa_nadrzedna": "R1-ALL", "liczba_studentow": 2},
            {"id": "R2-ALL", "rocznik": "R2", "grupa_nadrzedna": None, "liczba_studentow": 2},
        ],
        "studenci_grupy": [
            {"student": "s1", "grupa": "R1-ALL"}, {"student": "s2", "grupa": "R1-ALL"},
            {"student": "s3", "grupa": "R1-ALL"}, {"student": "s4", "grupa": "R1-ALL"},
            {"student": "s1", "grupa": "R1-G1"}, {"student": "s2", "grupa": "R1-G1"},
            {"student": "s3", "grupa": "R1-G2"}, {"student": "s4", "grupa": "R1-G2"},
            {"student": "t1", "grupa": "R2-ALL"}, {"student": "t2", "grupa": "R2-ALL"},
        ],
        "kolizje_grup": [
            {"grupa_a": "R1-ALL", "grupa_b": "R1-G1"},
            {"grupa_a": "R1-ALL", "grupa_b": "R1-G2"},
        ],
        "blokady_stale": [],
        "rada_wydzialu": [{"dzien": 2, "slot_od": 9, "slot_do": 10}],
        "dezyderaty_terminy": [{"prowadzacy": "P01", "dzien": 1, "slot": 5, "typ": "wykluczony"}],
        "dezyderaty_ogolne": [{"prowadzacy": "P01", "preferencja_dni": "brak"}],
        "kalendarz": [],
    }


def zbuduj(*, zajecia_lista: list[dict] | None = None, **nadpisz) -> Dane:
    d = copy.deepcopy(mini_slownik())
    if zajecia_lista is not None:
        d["zajecia"] = zajecia_lista
    d.update(nadpisz)
    return z_slownika(d)


def przydzial(zid: str, dzien: int = 1, slot: int = 1, sala: str = "S1", tygodnie=WSZYSTKIE_TYGODNIE) -> Przydzial:
    return Przydzial(zid, dzien, slot, sala, tuple(tygodnie))


@pytest.fixture
def dane() -> Dane:
    return zbuduj()
