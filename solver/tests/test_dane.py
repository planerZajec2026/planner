"""Spójność prawdziwych danych z requirements/ i działanie loadera."""

from __future__ import annotations

import pytest

from solver.checks import sprawdz_dane
from solver.data import wczytaj


@pytest.fixture(scope="module")
def dane():
    return wczytaj()


def test_liczby_rekordow(dane):
    assert len(dane.zajecia) == 174
    assert len(dane.sale) == 55
    assert len(dane.prowadzacy) == 50
    assert len(dane.grupy) == 51


def test_dane_sa_spojne(dane):
    assert sprawdz_dane(dane) == []


def test_kolizje_liczone_ze_studentow_zgadzaja_sie_z_tabela(dane):
    assert dane.kolizje == dane.kolizje_podane


def test_grupy_koliduja_same_ze_soba_i_z_rocznikiem(dane):
    assert dane.koliduja("INF1-R1-G1", "INF1-R1-G1")
    assert dane.koliduja("INF1-R1-ALL", "INF1-R1-G1")
    assert not dane.koliduja("INF1-R1-G1", "INF1-R1-G2")
    assert not dane.koliduja("INF1-R1-ALL", "INF2-R1-ALL")


def test_rada_wydzialu_blokuje_tylko_czlonkow(dane):
    zablokowani = {p for p, g in dane.wykluczone.items() if (2, 9) in g}
    wlasni = {p for p, g in dane.wykluczone_wlasne.items() if (2, 9) in g}
    assert zablokowani and wlasni <= zablokowani
