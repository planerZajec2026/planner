"""Worker: bierze zadania z `generation_jobs`, liczy plan solverem i zapisuje wynik w bazie."""

from __future__ import annotations

import logging
import os
import time
import traceback
from typing import Any

import psycopg

from . import db
from .model import generuj
from .validator import waliduj
from .weights import DOMYSLNE_WAGI

log = logging.getLogger("solver.worker")

# Krótsze limity dają słabe plany: optymalizacja dostaje pół czasu i potrzebuje go na poprawę planu startowego.
MINIMALNY_LIMIT_CZASU = 200.0
DOMYSLNY_LIMIT_CZASU = 200.0
MAKSYMALNY_LIMIT_CZASU = 400.0


class BladParametrow(ValueError):
    pass


def odczytaj_parametry(parametry: dict[str, Any]) -> tuple[float, dict[str, int]]:
    """Waliduje `generation_jobs.parametry`: {"limit_czasu": sekundy, "wagi": {nazwa: liczba całkowita}}."""
    limit = parametry.get("limit_czasu", DOMYSLNY_LIMIT_CZASU)
    if isinstance(limit, bool) or not isinstance(limit, (int, float)) or not MINIMALNY_LIMIT_CZASU <= limit <= MAKSYMALNY_LIMIT_CZASU:
        raise BladParametrow(
            f"limit_czasu musi być liczbą od {MINIMALNY_LIMIT_CZASU:.0f} do {MAKSYMALNY_LIMIT_CZASU:.0f} sekund"
        )
    wagi = parametry.get("wagi", {})
    if not isinstance(wagi, dict):
        raise BladParametrow("wagi muszą być obiektem {nazwa: liczba}")
    for nazwa, wartosc in wagi.items():
        if nazwa not in DOMYSLNE_WAGI:
            raise BladParametrow(f"nieznana waga '{nazwa}' (dozwolone: {', '.join(DOMYSLNE_WAGI)})")
        if isinstance(wartosc, bool) or not isinstance(wartosc, int) or wartosc < 0:
            raise BladParametrow(f"waga '{nazwa}' musi być nieujemną liczbą całkowitą")
    return float(limit), dict(wagi)


def przetworz_zadanie(conn: psycopg.Connection, workers: int | None = None) -> bool:
    """Bierze jedno zadanie z kolejki i je wykonuje. Zwraca False, gdy kolejka była pusta."""
    zadanie = db.zajmij_zadanie(conn)
    if zadanie is None:
        return False
    job_id = str(zadanie["id"])
    log.info("zadanie %s: start", job_id)
    try:
        limit, wagi = odczytaj_parametry(zadanie["parametry"])
        dane = db.wczytaj_z_bazy(conn)
        wynik = generuj(dane, limit, workers or min(os.cpu_count() or 1, 8), wagi=wagi)
        if not wynik.znaleziono:
            db.zapisz_blad(conn, job_id, f"Solver nie znalazł planu (status {wynik.status})")
            return True
        raport = waliduj(dane, wynik.plan, {**DOMYSLNE_WAGI, **wagi})
        opis = {
            "status_solvera": wynik.status,
            "czas_s": round(wynik.czas, 1),
            "kara_modelu": wynik.cel,
            "dolna_granica": round(wynik.dolna_granica) if wynik.dolna_granica is not None else None,
            "naruszenia": {str(k): v for k, v in raport.liczba_wg_ograniczenia().items()},
            "miekkie": raport.miekkie,
        }
        if not raport.poprawny:
            # Walidator jest ostatnią linią obrony: plan z naruszeniem twardym nie trafia do bazy.
            db.zapisz_blad(conn, job_id, f"Walidator wykrył {len(raport.naruszenia)} naruszeń twardych", opis)
            return True
        db.zapisz_wynik(conn, job_id, wynik.plan, opis, raport.wynik_miekkich)
        log.info("zadanie %s: gotowe, kara miękkich %s", job_id, raport.wynik_miekkich)
    except BladParametrow as e:
        db.zapisz_blad(conn, job_id, f"Błędne parametry: {e}")
    except Exception as e:  # noqa: BLE001 - każde zadanie musi się zakończyć statusem done albo failed
        log.error("zadanie %s: błąd\n%s", job_id, traceback.format_exc())
        db.zapisz_blad(conn, job_id, f"{type(e).__name__}: {e}")
    return True


def uruchom(url: str | None = None, odpytywanie: float = 5.0, raz: bool = False, workers: int | None = None) -> None:
    """Pętla workera. Z `raz` przetwarza jedno zadanie (jeśli jest) i kończy."""
    with db.polacz(url) as conn:
        przerwane = db.zakoncz_przerwane(conn)
        if przerwane:
            log.warning("oznaczono %s przerwanych zadań jako nieudane", przerwane)
        log.info("worker czeka na zadania")
        while True:
            zrobione = przetworz_zadanie(conn, workers)
            if raz:
                return
            if not zrobione:
                time.sleep(odpytywanie)
