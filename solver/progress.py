"""Postęp liczonego zadania (spec 15): solver zgłasza zmiany, wątek w tle zapisuje bieżący stan co kilka sekund.

Zapis jest rozdzielony od zgłoszeń, bo solver zgłasza lepsze plany z własnych wątków, czasem wiele razy na sekundę,
a w trakcie liczenia główny wątek stoi w `Solve` i sam niczego nie zapisze.
"""

from __future__ import annotations

import logging
import threading
import time
from collections.abc import Callable
from typing import Any

log = logging.getLogger("solver.progress")

ETAP_WCZYTYWANIE = "wczytywanie"
ETAP_SZUKANIE = "szukanie"  # etap 1 solvera: pierwszy plan bez naruszeń twardych
ETAP_OPTYMALIZACJA = "optymalizacja"  # etap 2 solvera: zmniejszanie kary do końca limitu czasu
ETAP_ZAPIS = "zapis"

# Co ile sekund stan trafia do bazy. Strona generatora odświeża się w podobnym rytmie.
OKRES_ZAPISU = 2.0


class Raporter:
    """Trzyma stan postępu jednego zadania i oddaje go funkcji `zapisz` (zwykle zapis do `generation_jobs.postep`).

    `uplynelo_s` liczy się od początku pracy solvera (pierwsze zgłoszenie etapu "szukanie"), bo od tej chwili
    biegnie limit czasu zadania. Nieudany zapis nie przerywa liczenia: postęp jest informacją dodatkową.
    """

    def __init__(
        self,
        zapisz: Callable[[dict[str, Any]], None],
        limit_s: float,
        okres: float = OKRES_ZAPISU,
        zegar: Callable[[], float] = time.monotonic,
    ):
        self._zapisz = zapisz
        self._okres = okres
        self._zegar = zegar
        self._stan: dict[str, Any] = {"etap": ETAP_WCZYTYWANIE, "limit_s": limit_s, "uplynelo_s": 0.0, "rozwiazania": 0}
        self._start: float | None = None
        self._blokada = threading.Lock()
        self._budzik = threading.Event()
        self._koniec = False
        self._watek: threading.Thread | None = None
        self._blad_zgloszony = False

    def __call__(self, etap: str, **pola: Any) -> None:
        """Przyjmuje zgłoszenie z solvera. Nie dotyka bazy, więc można wołać z dowolnego wątku."""
        with self._blokada:
            if etap == ETAP_SZUKANIE and self._start is None:
                self._start = self._zegar()
            nowy_etap = etap != self._stan["etap"]
            self._stan.update(pola, etap=etap)
        if nowy_etap:
            self._budzik.set()  # zmianę etapu widać od razu, a lepsze plany przy następnym zapisie

    def stan(self) -> dict[str, Any]:
        with self._blokada:
            stan = dict(self._stan)
            if self._start is not None:
                stan["uplynelo_s"] = round(self._zegar() - self._start, 1)
        return stan

    def zapisz(self) -> None:
        try:
            self._zapisz(self.stan())
        except Exception:  # noqa: BLE001 - np. baza sprzed migracji albo chwilowy brak połączenia
            if not self._blad_zgloszony:
                log.warning("nie udało się zapisać postępu; liczenie trwa dalej", exc_info=True)
                self._blad_zgloszony = True

    def __enter__(self) -> Raporter:
        self._watek = threading.Thread(target=self._petla, name="postep", daemon=True)
        self._watek.start()
        return self

    def __exit__(self, *_: object) -> None:
        self._koniec = True
        self._budzik.set()
        if self._watek is not None:
            self._watek.join()

    def _petla(self) -> None:
        while not self._koniec:
            self.zapisz()
            self._budzik.wait(self._okres)
            self._budzik.clear()
