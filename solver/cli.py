"""CLI: `python -m solver.cli dane` (kontrola danych) i `python -m solver.cli waliduj --plan plan.json`."""

from __future__ import annotations

import argparse
import sys

from .checks import sprawdz_dane
from .data import DOMYSLNE_DANE, wczytaj
from .validator import waliduj, wczytaj_plan


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="solver")
    parser.add_argument("--dane", default=str(DOMYSLNE_DANE), help="ścieżka do dane_planu.json")
    sub = parser.add_subparsers(dest="polecenie", required=True)
    sub.add_parser("dane", help="sprawdź spójność danych wejściowych")
    w = sub.add_parser("waliduj", help="sprawdź plan względem ograniczeń")
    w.add_argument("--plan", required=True, help="ścieżka do planu JSON")
    args = parser.parse_args(argv)

    dane = wczytaj(args.dane)

    if args.polecenie == "dane":
        problemy = sprawdz_dane(dane)
        print(f"zajęcia: {len(dane.zajecia)}, sale: {len(dane.sale)}, grupy: {len(dane.grupy)}")
        for p in problemy:
            print(f"  - {p}")
        print("dane spójne" if not problemy else f"problemów: {len(problemy)}")
        return 1 if problemy else 0

    raport = waliduj(dane, wczytaj_plan(args.plan))
    for n in raport.naruszenia:
        print(f"  {n}")
    print(f"naruszenia twarde: {len(raport.naruszenia)} {raport.liczba_wg_ograniczenia()}")
    print(f"ograniczenia miękkie: {raport.miekkie}, wynik: {raport.wynik_miekkich}")
    return 0 if raport.poprawny else 1


if __name__ == "__main__":
    sys.exit(main())
