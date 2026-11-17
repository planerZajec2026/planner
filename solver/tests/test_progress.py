"""Raporter postępu (spec 15): stan, czas od startu solvera, zapis w tle i odporność na błędy zapisu."""

from __future__ import annotations

import threading
import time

from solver.progress import ETAP_OPTYMALIZACJA, ETAP_SZUKANIE, ETAP_WCZYTYWANIE, ETAP_ZAPIS, Raporter


class Zegar:
    def __init__(self):
        self.teraz = 100.0

    def __call__(self) -> float:
        return self.teraz


def test_stan_poczatkowy_to_wczytywanie_bez_uplywu_czasu():
    zegar = Zegar()
    r = Raporter(lambda stan: None, 200.0, zegar=zegar)
    zegar.teraz += 30  # wczytywanie danych nie zużywa limitu solvera

    assert r.stan() == {"etap": ETAP_WCZYTYWANIE, "limit_s": 200.0, "uplynelo_s": 0.0, "rozwiazania": 0}


def test_czas_biegnie_od_startu_solvera_i_nie_zeruje_sie_w_kolejnych_etapach():
    zegar = Zegar()
    r = Raporter(lambda stan: None, 200.0, zegar=zegar)

    r(ETAP_SZUKANIE)
    zegar.teraz += 2.5
    assert r.stan()["uplynelo_s"] == 2.5

    r(ETAP_OPTYMALIZACJA)
    r(ETAP_SZUKANIE)  # ponowne zgłoszenie nie przesuwa początku
    zegar.teraz += 10
    assert r.stan()["uplynelo_s"] == 12.5


def test_zgloszenie_lepszego_planu_nadpisuje_pola_i_zostawia_reszte():
    r = Raporter(lambda stan: None, 300.0, zegar=Zegar())
    r(ETAP_OPTYMALIZACJA, rozwiazania=1, kara=900, kara_startowa=900, dolna_granica=100)
    r(ETAP_OPTYMALIZACJA, rozwiazania=2, kara=700, kara_startowa=900, dolna_granica=120)

    stan = r.stan()
    assert stan["etap"] == ETAP_OPTYMALIZACJA
    assert (stan["rozwiazania"], stan["kara"], stan["kara_startowa"], stan["dolna_granica"]) == (2, 700, 900, 120)
    assert stan["limit_s"] == 300.0


def test_watek_zapisuje_stan_co_okres_i_od_razu_po_zmianie_etapu():
    zapisane: list[dict] = []
    nowy_etap = threading.Event()

    def zapisz(stan):
        zapisane.append(stan)
        if stan["etap"] == ETAP_SZUKANIE:
            nowy_etap.set()

    # Okres dłuższy niż test: zapis etapu "szukanie" może wynikać tylko z obudzenia wątku zmianą etapu.
    with Raporter(zapisz, 200.0, okres=30.0) as r:
        r(ETAP_SZUKANIE)
        assert nowy_etap.wait(5), "zmiana etapu powinna być zapisana od razu"

    assert zapisane[0]["etap"] == ETAP_WCZYTYWANIE
    assert zapisane[-1]["etap"] == ETAP_SZUKANIE


def test_watek_zapisuje_okresowo_gdy_glowny_watek_jest_zajety():
    zapisane: list[dict] = []
    with Raporter(zapisane.append, 200.0, okres=0.02) as r:
        r(ETAP_SZUKANIE)
        time.sleep(0.3)

    assert len(zapisane) >= 4
    czasy = [s["uplynelo_s"] for s in zapisane]
    assert czasy == sorted(czasy)


def test_po_wyjsciu_watek_konczy_prace():
    zapisane: list[dict] = []
    with Raporter(zapisane.append, 200.0, okres=0.01):
        time.sleep(0.05)
    ile = len(zapisane)
    time.sleep(0.05)

    assert len(zapisane) == ile


def test_blad_zapisu_nie_przerywa_liczenia_i_jest_zglaszany_raz(caplog):
    proby = 0

    def zapisz(stan):
        nonlocal proby
        proby += 1
        raise RuntimeError("kolumna postep nie istnieje")

    r = Raporter(zapisz, 200.0)
    with caplog.at_level("WARNING", logger="solver.progress"):
        r.zapisz()
        r(ETAP_ZAPIS)
        r.zapisz()

    assert proby == 2
    assert len([rec for rec in caplog.records if "postępu" in rec.message]) == 1
