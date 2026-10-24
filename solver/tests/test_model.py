"""Model CP-SAT: plan z solvera musi przejść niezależny walidator (wymaga ortools)."""

from __future__ import annotations

import pytest

pytest.importorskip("ortools")

from solver.data import wczytaj
from solver.model import generuj
from solver.validator import waliduj

from .conftest import zajecia, zbuduj


def test_mini_zestaw_daje_poprawny_plan(dane):
    wynik = generuj(dane, limit_czasu=10, workers=1)
    assert wynik.znaleziono
    assert waliduj(dane, wynik.plan).naruszenia == []


def test_powiazania_i_tygodnie_w_malym_zestawie():
    ten_sam = {"powiazanie": "TS", "typ_powiazania": "ten_sam_termin", "liczba_spotkan": 7}
    rozne = {"powiazanie": "RD", "typ_powiazania": "rozne_dni", "grupy": ["R2-ALL"]}
    d = zbuduj(
        zajecia_lista=[
            zajecia("Z1", tydzien_do=7, **ten_sam),
            zajecia("Z2", tydzien_od=8, prowadzacy=["P02"], **ten_sam),
            zajecia("Z3", czestotliwosc="co_2_tygodnie", liczba_spotkan=7, **rozne),
            zajecia("Z4", czestotliwosc="wybrane_tygodnie", liczba_spotkan=3, **rozne),
        ]
    )
    wynik = generuj(d, limit_czasu=10, workers=1)
    assert wynik.znaleziono
    assert waliduj(d, wynik.plan).naruszenia == []


def test_brak_rozwiazania_gdy_dane_sprzeczne():
    # Dwie zajęcia tego samego prowadzącego po 12 slotów w jednym dniu tygodnia nie mieszczą się
    # w dozwolonym slocie, gdy wszystkie dni poza jednym są wykluczone.
    wykluczenia = [
        {"prowadzacy": "P01", "dzien": dzien, "slot": 1, "typ": "wykluczony"} for dzien in (2, 3, 4, 5)
    ]
    d = zbuduj(
        zajecia_lista=[
            zajecia("Z1", sloty_na_spotkanie=12, grupy=["R2-ALL"]),
            zajecia("Z2", sloty_na_spotkanie=12, grupy=["R2-ALL"]),
        ],
        dezyderaty_terminy=wykluczenia,
    )
    wynik = generuj(d, limit_czasu=10, workers=1)
    assert not wynik.znaleziono
    assert wynik.status == "INFEASIBLE"


def test_prawdziwe_dane_daja_plan_bez_naruszen_twardych():
    dane = wczytaj()
    wynik = generuj(dane, limit_czasu=60)
    assert wynik.znaleziono
    raport = waliduj(dane, wynik.plan)
    assert raport.naruszenia == []
    assert len(wynik.plan) == len(dane.zajecia) == 174
