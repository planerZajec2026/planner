"""CLI: `python -m solver.cli dane` (kontrola danych) i `python -m solver.cli waliduj --plan plan.json`."""

from __future__ import annotations

import argparse
import sys

from .checks import sprawdz_dane
from .data import DOMYSLNE_DANE, wczytaj
from .weights import DOMYSLNE_WAGI
from .validator import waliduj, wczytaj_plan, zapisz_plan


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="solver")
    parser.add_argument("--dane", default=str(DOMYSLNE_DANE), help="ścieżka do dane_planu.json")
    sub = parser.add_subparsers(dest="polecenie", required=True)
    sub.add_parser("dane", help="sprawdź spójność danych wejściowych")
    w = sub.add_parser("waliduj", help="sprawdź plan względem ograniczeń")
    w.add_argument("--plan", required=True, help="ścieżka do planu JSON")
    g = sub.add_parser("generuj", help="wygeneruj plan solverem CP-SAT")
    g.add_argument("--out", default="plan.json", help="gdzie zapisać plan JSON")
    g.add_argument("--time", type=float, default=120, help="limit czasu solvera w sekundach")
    g.add_argument("--workers", type=int, default=8)
    g.add_argument("--log", action="store_true", help="pokaż postęp solvera")
    g.add_argument(
        "--waga", action="append", default=[], metavar="NAZWA=WARTOSC",
        help=f"nadpisz wagę ograniczenia miękkiego ({', '.join(DOMYSLNE_WAGI)}); można powtarzać",
    )
    args = parser.parse_args(argv)

    dane = wczytaj(args.dane)

    if args.polecenie == "generuj":
        from .model import generuj  # ortools jest potrzebny tylko do generowania

        wagi = {}
        for para in args.waga:
            nazwa, _, wartosc = para.partition("=")
            if nazwa not in DOMYSLNE_WAGI or not wartosc.lstrip("-").isdigit():
                parser.error(f"zła waga '{para}', oczekiwano NAZWA=LICZBA, NAZWA z: {', '.join(DOMYSLNE_WAGI)}")
            wagi[nazwa] = int(wartosc)
        wynik = generuj(dane, args.time, args.workers, args.log, wagi)
        print(f"status: {wynik.status}, czas: {wynik.czas:.1f}s")
        if not wynik.znaleziono:
            return 1
        print(f"kara wg modelu: {wynik.cel}, dolna granica: {wynik.dolna_granica:.0f}")
        zapisz_plan(wynik.plan, args.out)
        raport = waliduj(dane, wynik.plan, {**DOMYSLNE_WAGI, **wagi})
        for n in raport.naruszenia:
            print(f"  {n}")
        print(f"zapisano {args.out}; naruszenia twarde: {len(raport.naruszenia)}")
        print(f"ograniczenia miękkie: {raport.miekkie}, wynik: {raport.wynik_miekkich}")
        return 0 if raport.poprawny else 1

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
