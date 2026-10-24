"""Model CP-SAT: znajduje plan spełniający ograniczenia twarde 1-10 i minimalizuje karę za miękkie.

Każde zajęcia mają czas startowy `t` (0..59 = dzień * 12 + slot - 1), salę (zmienne logiczne `x[zajecia, sala]`)
i tygodnie (stałe, parzystość albo wybór). Zasób (prowadzący, sala, student) może mieć jedne zajęcia naraz,
więc dla każdego zasobu i tygodnia dodajemy `NoOverlap` na przedziałach, które w tym tygodniu istnieją.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from itertools import combinations

from ortools.sat.python import cp_model

from .data import DNI, LICZBA_SLOTOW, LICZBA_TYGODNI, Dane, Zajecia
from .validator import Przydzial
from .weights import DOMYSLNE_WAGI, LIMIT_SLOTOW_W_DNIU, PIERWSZY_SLOT_POZNY

# Obecność zajęć w tygodniu: True = zawsze, literał = zależnie od wyboru solvera.
Obecnosc = bool | cp_model.IntVar | cp_model.NotBooleanVariable


@dataclass
class Wynik:
    status: str
    plan: list[Przydzial]
    czas: float
    cel: int | None = None  # kara za ograniczenia miękkie wg modelu (mniej = lepiej)
    dolna_granica: float | None = None  # solver dowodzi, że kara nie może być mniejsza

    @property
    def znaleziono(self) -> bool:
        return bool(self.plan)


class Planista:
    def __init__(self, dane: Dane, wagi: dict[str, int] | None = None):
        self.dane = dane
        self.wagi = {**DOMYSLNE_WAGI, **(wagi or {})}
        self.m = cp_model.CpModel()
        self.t: dict[str, cp_model.IntVar] = {}
        self.dzien: dict[str, cp_model.IntVar] = {}
        self.start: dict[str, dict[int, cp_model.IntVar]] = {}  # one-hot po czasie startu
        self.sala: dict[tuple[str, str], cp_model.IntVar] = {}
        self.tygodnie: dict[str, dict[int, Obecnosc]] = {}
        self._przedzialy: dict[tuple, cp_model.IntervalVar] = {}
        self._pokrycie: dict[tuple[str, int, int], cp_model.IntVar] = {}
        self._czasy: dict[str, list[int]] = {}
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
        self._czasy[z.id] = czasy

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

    # --- funkcja celu ----------------------------------------------------------------------------
    #
    # Ten sam zestaw kar co `validator.ocen_miekkie`. Różnica: okienka i przeciążenie liczymy po dniu grupy
    # lub prowadzącego niezależnie od tygodnia (suma zajęć ze wszystkich tygodni) i mnożymy przez liczbę tygodni,
    # bo walidator liczy je w każdym tygodniu osobno.

    def _pokrywa(self, z: Zajecia, dzien: int, slot: int) -> cp_model.IntVar | None:
        """Zmienna równa 1, gdy zajęcia trwają w slocie `slot` dnia `dzien` (0..4)."""
        klucz = (z.id, dzien, slot)
        if klucz not in self._pokrycie:
            starty = [
                v
                for c, v in self.start[z.id].items()
                if c // LICZBA_SLOTOW == dzien and c % LICZBA_SLOTOW + 1 <= slot < c % LICZBA_SLOTOW + 1 + z.sloty
            ]
            if starty:
                p = self.m.NewBoolVar(f"pokr_{z.id}_{dzien}_{slot}")
                self.m.Add(p == sum(starty))
                self._pokrycie[klucz] = p
            else:
                self._pokrycie[klucz] = None
        return self._pokrycie[klucz]

    def _zajete_sloty(self, zajecia: list[Zajecia], nazwa: str) -> dict[tuple[int, int], cp_model.IntVar]:
        """`o[dzien, slot]` = 1, gdy którekolwiek z zajęć trwa w tym slocie."""
        o = {}
        for dzien in range(len(DNI)):
            for slot in range(1, LICZBA_SLOTOW + 1):
                pokrycia = [p for z in zajecia if (p := self._pokrywa(z, dzien, slot)) is not None]
                v = self.m.NewBoolVar(f"o_{nazwa}_{dzien}_{slot}")
                if pokrycia:
                    for p in pokrycia:
                        self.m.AddImplication(p, v)
                    self.m.AddBoolOr([v.Not(), *pokrycia])
                else:
                    self.m.Add(v == 0)
                o[dzien, slot] = v
        return o

    def _okienka(self, o: dict[tuple[int, int], cp_model.IntVar], nazwa: str) -> list[cp_model.IntVar]:
        """Puste sloty między pierwszym a ostatnim zajętym slotem każdego dnia."""
        m = self.m
        luki = []
        for dzien in range(len(DNI)):
            przed, po = {}, {}
            for slot in range(1, LICZBA_SLOTOW + 1):
                przed[slot] = m.NewBoolVar(f"przed_{nazwa}_{dzien}_{slot}")
                m.Add(przed[slot] >= o[dzien, slot])
                if slot > 1:
                    m.Add(przed[slot] >= przed[slot - 1])
            for slot in range(LICZBA_SLOTOW, 0, -1):
                po[slot] = m.NewBoolVar(f"po_{nazwa}_{dzien}_{slot}")
                m.Add(po[slot] >= o[dzien, slot])
                if slot < LICZBA_SLOTOW:
                    m.Add(po[slot] >= po[slot + 1])
            for slot in range(1, LICZBA_SLOTOW + 1):
                luka = m.NewBoolVar(f"luka_{nazwa}_{dzien}_{slot}")
                m.Add(luka >= przed[slot] + po[slot] - 1 - o[dzien, slot])
                luki.append(luka)
        return luki

    def _cel(self) -> None:
        dane, w, m = self.dane, self.wagi, self.m
        zajecia = list(dane.zajecia.values())
        kary: list = []

        # One-hot czasu startu: podstawa kosztów (pokrycie slotów, godziny skrajne). Dodajemy dopiero tutaj,
        # bo w etapie szukania planu spowalniają solver, a nie są potrzebne do ograniczeń twardych.
        for z in zajecia:
            self.start[z.id] = {c: m.NewBoolVar(f"at_{z.id}_{c}") for c in self._czasy[z.id]}
            m.AddExactlyOne(self.start[z.id].values())
            m.Add(self.t[z.id] == sum(c * v for c, v in self.start[z.id].items()))

        # Okienka i przeciążenie dnia grup. Dzień grupy obejmuje też zajęcia jej grup nadrzędnych.
        for g in sorted({g for z in zajecia for g in z.grupy}):
            lancuch = set(dane.przodkowie(g))
            o = self._zajete_sloty([z for z in zajecia if lancuch & set(z.grupy)], f"g_{g}")
            kary += [w["okienka_studentow"] * LICZBA_TYGODNI * luka for luka in self._okienka(o, f"g_{g}")]
            for dzien in range(len(DNI)):
                nadmiar = m.NewIntVar(0, LICZBA_SLOTOW, f"nadmiar_{g}_{dzien}")
                m.Add(nadmiar >= sum(o[dzien, s] for s in range(1, LICZBA_SLOTOW + 1)) - LIMIT_SLOTOW_W_DNIU)
                kary.append(w["przeciazenie_dnia"] * LICZBA_TYGODNI * nadmiar)

        # Okienka prowadzących i preferencja co do liczby dni.
        for p in sorted(dane.prowadzacy):
            zajecia_p = [z for z in zajecia if p in z.prowadzacy]
            if not zajecia_p:
                continue
            o = self._zajete_sloty(zajecia_p, f"p_{p}")
            kary += [w["okienka_prowadzacych"] * LICZBA_TYGODNI * luka for luka in self._okienka(o, f"p_{p}")]
            tryb = dane.preferencje.get(p, "brak")
            if tryb == "brak":
                continue
            uzyte = []
            for dzien in range(len(DNI)):
                dni_zajec = [
                    sum(v for c, v in self.start[z.id].items() if c // LICZBA_SLOTOW == dzien) for z in zajecia_p
                ]
                u = m.NewBoolVar(f"dzien_{p}_{dzien}")
                for ind in dni_zajec:
                    m.Add(u >= ind)
                m.Add(u <= sum(dni_zajec))
                uzyte.append(u)
            if tryb == "skumulowane":
                kary += [w["preferencja_dni"] * u for u in uzyte]
            else:  # nieskumulowane: kara za każdy brakujący dzień do min(3, liczba zajęć)
                brak = m.NewIntVar(0, 3, f"brak_dni_{p}")
                m.Add(brak >= min(3, len(zajecia_p)) - sum(uzyte))
                kary.append(w["preferencja_dni"] * brak)

        for z in zajecia:
            # Sloty przed 9:00 i po 17:00, razy liczba spotkań.
            for c, v in self.start[z.id].items():
                start = c % LICZBA_SLOTOW + 1
                poza = sum(1 for s in range(start, start + z.sloty) if s == 1 or s >= PIERWSZY_SLOT_POZNY)
                if poza:
                    kary.append(w["poza_godzinami"] * poza * z.liczba_spotkan * v)
            # Sala niezbyt duża dla grupy.
            for (zid, r), x in self.sala.items():
                if zid == z.id:
                    pojemnosc = dane.sale[r].pojemnosc
                    luz = round(100 * (pojemnosc - z.potrzebne_miejsca) / pojemnosc)
                    kary.append(w["zla_wielkosc_sali"] * luz * x)

        self._kary = sum(kary)

    # --- rozwiązanie -----------------------------------------------------------------------------

    def _solver(self, limit_czasu: float, workers: int, log: bool) -> cp_model.CpSolver:
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = limit_czasu
        solver.parameters.num_workers = workers
        solver.parameters.log_search_progress = log
        return solver

    def rozwiaz(self, limit_czasu: float = 60, workers: int = 8, log: bool = False) -> Wynik:
        """Etap 1: plan spełniający ograniczenia twarde (bez celu, zwykle ułamek sekundy).
        Etap 2: ten plan jest rozwiązaniem startowym, a solver minimalizuje karę za miękkie do końca limitu."""
        poczatek = time.monotonic()
        solver = self._solver(min(limit_czasu / 2, 60), workers, log)
        status = solver.Solve(self.m)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return Wynik(solver.StatusName(status), [], solver.WallTime())
        plan_startowy = self._odczytaj(solver)
        for i in range(len(self.m.Proto().variables)):
            zmienna = self.m.GetIntVarFromProtoIndex(i)
            self.m.AddHint(zmienna, solver.Value(zmienna))

        t_startowe = {z: solver.Value(v) for z, v in self.t.items()}
        self._cel()
        for zid, wartosci in self.start.items():
            for c, v in wartosci.items():
                self.m.AddHint(v, int(c == t_startowe[zid]))
        self.m.Minimize(self._kary)
        solver = self._solver(max(limit_czasu - (time.monotonic() - poczatek), 1), workers, log)
        solver.parameters.repair_hint = True
        status = solver.Solve(self.m)
        nazwa = solver.StatusName(status)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return Wynik("FEASIBLE", plan_startowy, time.monotonic() - poczatek)
        return Wynik(
            nazwa,
            self._odczytaj(solver),
            time.monotonic() - poczatek,
            cel=round(solver.ObjectiveValue()),
            dolna_granica=solver.BestObjectiveBound(),
        )

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


def generuj(
    dane: Dane,
    limit_czasu: float = 60,
    workers: int = 8,
    log: bool = False,
    wagi: dict[str, int] | None = None,
) -> Wynik:
    return Planista(dane, wagi).rozwiaz(limit_czasu, workers, log)
