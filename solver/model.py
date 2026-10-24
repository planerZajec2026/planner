"""Model CP-SAT: znajduje plan spełniający ograniczenia twarde 1-10.

Każde zajęcia mają czas startowy `t` (0..59 = dzień * 12 + slot - 1), salę (zmienne logiczne `x[zajecia, sala]`)
i tygodnie (stałe, parzystość albo wybór). Zasób (prowadzący, sala, student) może mieć jedne zajęcia naraz,
więc dla każdego zasobu i tygodnia dodajemy `NoOverlap` na przedziałach, które w tym tygodniu istnieją.
"""

from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations

from ortools.sat.python import cp_model

from .data import DNI, LICZBA_SLOTOW, LICZBA_TYGODNI, Dane, Zajecia
from .validator import Przydzial

# Obecność zajęć w tygodniu: True = zawsze, literał = zależnie od wyboru solvera.
Obecnosc = bool | cp_model.IntVar | cp_model.NotBooleanVariable


@dataclass
class Wynik:
    status: str
    plan: list[Przydzial]
    czas: float

    @property
    def znaleziono(self) -> bool:
        return bool(self.plan)


class Planista:
    def __init__(self, dane: Dane):
        self.dane = dane
        self.m = cp_model.CpModel()
        self.t: dict[str, cp_model.IntVar] = {}
        self.dzien: dict[str, cp_model.IntVar] = {}
        self.sala: dict[tuple[str, str], cp_model.IntVar] = {}
        self.tygodnie: dict[str, dict[int, Obecnosc]] = {}
        self._przedzialy: dict[tuple, cp_model.IntervalVar] = {}
        self._zbuduj()

    # --- zmienne ---------------------------------------------------------------------------------

    def _dozwolone_czasy(self, z: Zajecia) -> list[int]:
        """Start `t`, który mieści się w dniu i omija wykluczenia prowadzących oraz blokady stałe."""
        zablokowane = {
            (b.dzien, s)
            for b in self.dane.blokady
            if any(self.dane.koliduja(b.grupa, g) for g in z.grupy)
            for s in range(b.slot_od, b.slot_do + 1)
        }
        czasy = []
        for dzien in DNI:
            for start in range(1, LICZBA_SLOTOW - z.sloty + 2):
                sloty = [(dzien, s) for s in range(start, start + z.sloty)]
                if any(k in zablokowane for k in sloty):
                    continue
                if any(k in self.dane.wykluczone.get(p, ()) for p in z.prowadzacy for k in sloty):
                    continue
                czasy.append((dzien - 1) * LICZBA_SLOTOW + start - 1)
        return czasy

    def _zmienne_zajec(self, z: Zajecia) -> None:
        m = self.m
        czasy = self._dozwolone_czasy(z)
        t = m.NewIntVarFromDomain(cp_model.Domain.FromValues(czasy), f"t_{z.id}")
        d = m.NewIntVar(0, len(DNI) - 1, f"d_{z.id}")
        so = m.NewIntVar(0, LICZBA_SLOTOW - 1, f"s_{z.id}")
        m.Add(t == LICZBA_SLOTOW * d + so)
        self.t[z.id], self.dzien[z.id] = t, d

        sale = self.dane.dozwolone_sale(z)
        for r in sale:
            self.sala[(z.id, r)] = m.NewBoolVar(f"x_{z.id}_{r}")
        m.AddExactlyOne(self.sala[(z.id, r)] for r in sale)

        self.tygodnie[z.id] = self._tygodnie_zajec(z)

    def _tygodnie_zajec(self, z: Zajecia) -> dict[int, Obecnosc]:
        m = self.m
        dostepne = z.dostepne_tygodnie()
        if z.czestotliwosc == "co_tydzien":
            return {w: True for w in dostepne}
        if z.czestotliwosc == "wybrane_tygodnie":
            wybor = {w: m.NewBoolVar(f"w_{z.id}_{w}") for w in dostepne}
            m.Add(sum(wybor.values()) == z.liczba_spotkan)
            return dict(wybor)
        # co_2_tygodnie: nieparzyste albo parzyste tygodnie zakresu, zależnie od literału `q`.
        q = m.NewBoolVar(f"nieparzyste_{z.id}")
        for parzystosc, literal in ((1, q), (0, q.Not())):
            tygodnie = [w for w in dostepne if w % 2 == parzystosc]
            if len(tygodnie) != z.liczba_spotkan:
                m.AddBoolAnd([literal.Not()])
        return {w: (q if w % 2 == 1 else q.Not()) for w in dostepne}

    # --- przedziały ------------------------------------------------------------------------------

    def _przedzial(self, z: Zajecia, tydzien: int) -> cp_model.IntervalVar:
        """Przedział zajęć w danym tygodniu (opcjonalny, gdy obecność zależy od wyboru solvera)."""
        obecnosc = self.tygodnie[z.id][tydzien]
        if obecnosc is True:
            klucz: tuple = (z.id, None)
            presence = None
        else:
            klucz = (z.id, obecnosc.Index())
            presence = obecnosc
        if klucz not in self._przedzialy:
            if presence is None:
                iv = self.m.NewFixedSizeIntervalVar(self.t[z.id], z.sloty, f"iv_{z.id}")
            else:
                iv = self.m.NewOptionalFixedSizeIntervalVar(self.t[z.id], z.sloty, presence, f"iv_{z.id}_{klucz[1]}")
            self._przedzialy[klucz] = iv
        return self._przedzialy[klucz]

    def _przedzial_w_sali(self, z: Zajecia, sala: str, tydzien: int) -> cp_model.IntervalVar:
        x = self.sala[(z.id, sala)]
        obecnosc = self.tygodnie[z.id][tydzien]
        if obecnosc is True:
            presence, klucz = x, (z.id, sala, None)
        else:
            klucz = (z.id, sala, obecnosc.Index())
            presence = None
        if klucz not in self._przedzialy:
            if presence is None:
                presence = self.m.NewBoolVar(f"p_{z.id}_{sala}_{klucz[2]}")
                self.m.AddBoolAnd([x, obecnosc]).OnlyEnforceIf(presence)
                self.m.AddBoolOr([x.Not(), obecnosc.Not(), presence])
            self._przedzialy[klucz] = self.m.NewOptionalFixedSizeIntervalVar(
                self.t[z.id], z.sloty, presence, f"iv_{z.id}_{sala}_{klucz[2]}"
            )
        return self._przedzialy[klucz]

    def _bez_nakladania(self, zajecia: list[Zajecia], sala: str | None = None) -> None:
        """NoOverlap dla zasobu w każdym tygodniu, w którym ma co najmniej dwa przedziały."""
        widziane: set[tuple[int, ...]] = set()
        for tydzien in range(1, LICZBA_TYGODNI + 1):
            przedzialy = [
                self._przedzial(z, tydzien) if sala is None else self._przedzial_w_sali(z, sala, tydzien)
                for z in zajecia
                if tydzien in self.tygodnie[z.id]
            ]
            klucz = tuple(sorted(iv.Index() for iv in przedzialy))
            if len(przedzialy) < 2 or klucz in widziane:
                continue
            widziane.add(klucz)
            self.m.AddNoOverlap(przedzialy)

    # --- ograniczenia ----------------------------------------------------------------------------

    def _zbuduj(self) -> None:
        zajecia = list(self.dane.zajecia.values())
        for z in zajecia:
            self._zmienne_zajec(z)

        # 3. Prowadzący.
        for p in sorted(self.dane.prowadzacy):
            self._bez_nakladania([z for z in zajecia if p in z.prowadzacy])

        # 4. Sala.
        for sala in self.dane.sale:
            self._bez_nakladania([z for z in zajecia if (z.id, sala) in self.sala], sala)

        # 5. Studenci: jeden zasób na każdą unikalną kombinację grup, do której należy student.
        for ids in self._zestawy_zajec_studentow():
            self._bez_nakladania([self.dane.zajecia[i] for i in sorted(ids)])

        self._powiazania(zajecia)

    def _zestawy_zajec_studentow(self) -> list[frozenset[str]]:
        dane = self.dane
        grupy_studenta: dict[str, set[str]] = {}
        for g, studenci in dane.studenci_grup.items():
            for s in studenci:
                grupy_studenta.setdefault(s, set()).add(g)
        zestawy = {
            frozenset(z.id for z in dane.zajecia.values() if grupy & set(z.grupy))
            for grupy in map(frozenset, grupy_studenta.values())
        }
        # Zestaw zawarty w innym jest już pokryty jego NoOverlap.
        return [a for a in zestawy if len(a) > 1 and not any(a < b for b in zestawy)]

    def _powiazania(self, zajecia: list[Zajecia]) -> None:
        zestawy: dict[str, list[Zajecia]] = {}
        for z in zajecia:
            if z.powiazanie:
                zestawy.setdefault(z.powiazanie, []).append(z)
        for czlonkowie in zestawy.values():
            for a, b in combinations(czlonkowie, 2):
                if a.typ_powiazania == "rozne_dni":
                    self.m.Add(self.dzien[a.id] != self.dzien[b.id])
                elif a.typ_powiazania == "ten_sam_termin":
                    self.m.Add(self.t[a.id] == self.t[b.id])
                    for r in self.dane.sale:
                        xa, xb = self.sala.get((a.id, r)), self.sala.get((b.id, r))
                        if xa is not None and xb is not None:
                            self.m.Add(xa == xb)
                        elif xa is not None:
                            self.m.Add(xa == 0)
                        elif xb is not None:
                            self.m.Add(xb == 0)

    # --- rozwiązanie -----------------------------------------------------------------------------

    def rozwiaz(self, limit_czasu: float = 60, workers: int = 8, log: bool = False) -> Wynik:
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = limit_czasu
        solver.parameters.num_workers = workers
        solver.parameters.log_search_progress = log
        status = solver.Solve(self.m)
        nazwa = solver.StatusName(status)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return Wynik(nazwa, [], solver.WallTime())
        return Wynik(nazwa, self._odczytaj(solver), solver.WallTime())

    def _odczytaj(self, solver: cp_model.CpSolver) -> list[Przydzial]:
        plan = []
        for z in self.dane.zajecia.values():
            t = solver.Value(self.t[z.id])
            sala = next(r for (zid, r), x in self.sala.items() if zid == z.id and solver.Value(x))
            tygodnie = tuple(
                w
                for w, o in sorted(self.tygodnie[z.id].items())
                if o is True or solver.BooleanValue(o)
            )
            plan.append(Przydzial(z.id, t // LICZBA_SLOTOW + 1, t % LICZBA_SLOTOW + 1, sala, tygodnie))
        return plan


def generuj(dane: Dane, limit_czasu: float = 60, workers: int = 8, log: bool = False) -> Wynik:
    return Planista(dane).rozwiaz(limit_czasu, workers, log)
