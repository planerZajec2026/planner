// Where a generated plan loses points (spec 15): the soft constraints of spec 13 per group, instructor and class,
// so the planner can open the worst places in the editor right after generation. Mirrors `ocen_miekkie` in
// solver/validator.py exactly; plan-problemy.test.ts checks the totals against the validator's numbers.
import { WAGI } from "./generator";
import { countPl } from "./pl";
import { dzienLabel, type Etykiety } from "./plan";
import { opisTerminu, opisZajec, type KontekstEdycji, type Przydzial, type SalaPlanu, type ZajeciaPlanu } from "./plan-edycja";

export const LIMIT_SLOTOW_W_DNIU = 8;
export const PIERWSZY_SLOT_POZNY = 10;

export type Rodzaj =
  | "preferencja_dni"
  | "okienka_studentow"
  | "okienka_prowadzacych"
  | "poza_godzinami"
  | "przeciazenie_dnia"
  | "zla_wielkosc_sali";

export const RODZAJE: Rodzaj[] = [
  "preferencja_dni",
  "okienka_studentow",
  "okienka_prowadzacych",
  "poza_godzinami",
  "przeciazenie_dnia",
  "zla_wielkosc_sali",
];

export type ZajeciaProblemu = Pick<ZajeciaPlanu, "id" | "przedmiot" | "forma" | "grupy" | "prowadzacy" | "miejsca" | "sloty">;

export type DaneProblemow = {
  zajecia: Record<string, ZajeciaProblemu>;
  plan: Przydzial[];
  sale: Pick<SalaPlanu, "id" | "pojemnosc">[];
  /** Parent group of each group (a lab group's class group, a class group's year). */
  nadrzedne: Record<string, string | null>;
  /** `dezyderaty_ogolne.preferencja_dni` per instructor: "skumulowane", "nieskumulowane" or "brak". */
  preferencje: Record<string, string>;
  etykiety: Etykiety;
};

export type ZajeciaWProblemie = { id: string; opis: string };

export type Problem = {
  rodzaj: Rodzaj;
  /** Weighted penalty this place adds to the plan's score. */
  kara: number;
  /** Raw units of the constraint (slots, percentage points, days). */
  jednostki: number;
  /** Who or what: a group, an instructor or a class. */
  kto: string;
  opis: string;
  /** Classes to move to fix it, in the order of the week. */
  zajecia: ZajeciaWProblemie[];
};

export type ProblemyPlanu = {
  miekkie: Record<Rodzaj, number>;
  /** Weighted sum: the plan's soft-constraint penalty, as `generation_jobs.wynik_miekkich` after generation. */
  wynik: number;
  problemy: Problem[];
};

export const DOMYSLNE_WAGI: Record<string, number> = Object.fromEntries(WAGI.map((w) => [w.klucz, w.domyslna]));

/** What scoring needs on top of the edit context, so the editor can show the penalty before and after a move. */
export type DaneOceny = Pick<DaneProblemow, "nadrzedne" | "preferencje"> & {
  /** The job's weights that differ from the defaults. */
  wagi: Record<string, number>;
  /** `generation_jobs.wynik_miekkich`: the score of the plan as the generator left it. */
  wynikPoGenerowaniu: number | null;
};

/** The edit context's plan scored as it is now, or with `zmiany` (new placements of some classes) applied. */
export function ocenaPlanu(k: KontekstEdycji, o: DaneOceny, zmiany: Przydzial[] = []): ProblemyPlanu {
  const nowe = new Map(zmiany.map((p) => [p.zajeciaId, p]));
  return problemyPlanu(
    {
      zajecia: k.zajecia,
      plan: k.plan.map((p) => nowe.get(p.zajeciaId) ?? p),
      sale: k.sale,
      nadrzedne: o.nadrzedne,
      preferencje: o.preferencje,
      etykiety: k.etykiety,
    },
    o.wagi,
  );
}

/** Weighted penalty of each kind of soft constraint, as `wynik` adds them up. */
export function karaWgRodzaju(miekkie: Record<Rodzaj, number>, wagi: Record<string, number>): Record<Rodzaj, number> {
  const w = { ...DOMYSLNE_WAGI, ...wagi };
  return Object.fromEntries(RODZAJE.map((r) => [r, (w[r] ?? 0) * miekkie[r]])) as Record<Rodzaj, number>;
}

/** Python's `round()`: halves go to the even neighbour. */
export function zaokraglij(x: number): number {
  const dol = Math.floor(x);
  const reszta = x - dol;
  if (reszta === 0.5) return dol % 2 === 0 ? dol : dol + 1;
  return Math.round(x);
}

/** The group and its parents, nearest first (`Dane.przodkowie`). */
export function przodkowie(nadrzedne: Record<string, string | null>, grupa: string): string[] {
  const wynik: string[] = [];
  let biezaca: string | null | undefined = grupa;
  while (biezaca != null && !wynik.includes(biezaca)) {
    wynik.push(biezaca);
    biezaca = nadrzedne[biezaca];
  }
  return wynik;
}

/** Empty slots between the first and the last class of a day. */
function okienka(sloty: Set<number>): number {
  if (sloty.size === 0) return 0;
  const lista = [...sloty];
  return Math.max(...lista) - Math.min(...lista) + 1 - sloty.size;
}

type Dzien = { sloty: Set<number>; zajecia: Set<string> };

/** Per-day sets keyed by `kto|dzien|tydzien`. */
class Dni {
  readonly mapa = new Map<string, Dzien>();
  dodaj(kto: string, dzien: number, tydzien: number, sloty: number[], zajeciaId: string) {
    const klucz = `${kto}|${dzien}|${tydzien}`;
    let d = this.mapa.get(klucz);
    if (!d) this.mapa.set(klucz, (d = { sloty: new Set(), zajecia: new Set() }));
    for (const s of sloty) d.sloty.add(s);
    d.zajecia.add(zajeciaId);
  }
}

const rozbij = (klucz: string) => {
  const [kto, dzien, tydzien] = klucz.split("|");
  return { kto, dzien: Number(dzien), tydzien: Number(tydzien) };
};

/** Sums one per-day measure over the weeks, per (who, day), keeping the weeks and classes where it is non-zero. */
function poDniach(dni: Map<string, Dzien>, miara: (d: Dzien) => number) {
  const wynik = new Map<string, { kto: string; dzien: number; jednostki: number; tygodnie: number; zajecia: Set<string> }>();
  let suma = 0;
  for (const [klucz, d] of dni) {
    const n = miara(d);
    suma += n;
    if (n === 0) continue;
    const { kto, dzien } = rozbij(klucz);
    const k = `${kto}|${dzien}`;
    let w = wynik.get(k);
    if (!w) wynik.set(k, (w = { kto, dzien, jednostki: 0, tygodnie: 0, zajecia: new Set() }));
    w.jednostki += n;
    w.tygodnie += 1;
    for (const z of d.zajecia) w.zajecia.add(z);
  }
  return { suma, wpisy: [...wynik.values()] };
}

const wTygodniach = (n: number) => `w ${countPl(n, "tygodniu", "tygodniach", "tygodniach")}`;

/** Soft-constraint totals of the plan and the places that cause them, worst first. */
export function problemyPlanu(d: DaneProblemow, wagi: Record<string, number> = {}): ProblemyPlanu {
  const w = { ...DOMYSLNE_WAGI, ...wagi };
  const sale = new Map(d.sale.map((s) => [s.id, s]));
  const przydzial = new Map(d.plan.map((p) => [p.zajeciaId, p]));

  const grupy = new Dni();
  const prow = new Dni();
  const prowDni = new Map<string, Set<number>>();
  const prowZajecia = new Map<string, string[]>();
  const lista: { rodzaj: Rodzaj; jednostki: number; kto: string; opis: string; ids: string[] }[] = [];

  let poza = 0;
  let salaLuz = 0;

  for (const p of d.plan) {
    const z = d.zajecia[p.zajeciaId];
    if (!z) continue;
    const sloty = Array.from({ length: z.sloty }, (_, i) => p.slot + i);

    const slotyPoza = sloty.filter((s) => s === 1 || s >= PIERWSZY_SLOT_POZNY).length;
    if (slotyPoza > 0 && p.tygodnie.length > 0) {
      const n = slotyPoza * p.tygodnie.length;
      poza += n;
      lista.push({
        rodzaj: "poza_godzinami",
        jednostki: n,
        kto: opisZajec(z),
        opis: `${opisTerminu(p, z.sloty)}: ${countPl(slotyPoza, "slot", "sloty", "slotów")} przed 9:00 lub po 17:00, ${wTygodniach(p.tygodnie.length)}`,
        ids: [z.id],
      });
    }

    // Unknown capacity: no penalty, as in the validator.
    const pojemnosc = sale.get(p.sala)?.pojemnosc || z.miejsca || 1;
    const luz = zaokraglij((100 * (pojemnosc - z.miejsca)) / pojemnosc);
    salaLuz += luz;
    if (luz > 0) {
      lista.push({
        rodzaj: "zla_wielkosc_sali",
        jednostki: luz,
        kto: opisZajec(z),
        opis: `Sala ${p.sala} ma ${countPl(pojemnosc, "miejsce", "miejsca", "miejsc")} dla ${countPl(z.miejsca, "osoby", "osób", "osób")} (${luz}% wolnych)`,
        ids: [z.id],
      });
    }

    for (const t of p.tygodnie) {
      for (const g of z.grupy) grupy.dodaj(g, p.dzien, t, sloty, z.id);
      for (const x of z.prowadzacy) prow.dodaj(x, p.dzien, t, sloty, z.id);
    }
    for (const x of z.prowadzacy) {
      (prowDni.get(x) ?? prowDni.set(x, new Set()).get(x)!).add(p.dzien);
      (prowZajecia.get(x) ?? prowZajecia.set(x, []).get(x)!).push(z.id);
    }
  }

  // A group's day includes the classes of its parent groups (e.g. a lecture for the whole year).
  const grupySzersze = new Map<string, Dzien>();
  for (const klucz of grupy.mapa.keys()) {
    const { kto, dzien, tydzien } = rozbij(klucz);
    const razem: Dzien = { sloty: new Set(), zajecia: new Set() };
    for (const a of przodkowie(d.nadrzedne, kto)) {
      const x = grupy.mapa.get(`${a}|${dzien}|${tydzien}`);
      if (!x) continue;
      for (const s of x.sloty) razem.sloty.add(s);
      for (const z of x.zajecia) razem.zajecia.add(z);
    }
    grupySzersze.set(klucz, razem);
  }

  const grupa = (g: string) => d.etykiety.grupy[g] ?? g;
  const osoba = (x: string) => d.etykiety.prowadzacy[x] ?? x;

  const okienkaGrup = poDniach(grupySzersze, (x) => okienka(x.sloty));
  const scalone = new Map<string, { rodzaj: Rodzaj; jednostki: number; kto: string[]; opis: string; ids: string[] }>();
  const scal = (rodzaj: Rodzaj, e: (typeof okienkaGrup.wpisy)[number], opis: string) => {
    const ids = [...e.zajecia].sort();
    // Lab groups of one class group often share the very same problem (it comes from the common classes).
    const klucz = `${rodzaj}|${e.dzien}|${e.jednostki}|${e.tygodnie}|${ids.join(",")}`;
    const x = scalone.get(klucz);
    if (x) x.kto.push(grupa(e.kto));
    else scalone.set(klucz, { rodzaj, jednostki: e.jednostki, kto: [grupa(e.kto)], opis, ids });
  };
  for (const e of okienkaGrup.wpisy) {
    scal("okienka_studentow", e, `${dzienLabel(e.dzien)}: ${countPl(e.jednostki, "pusty slot", "puste sloty", "pustych slotów")} ${wTygodniach(e.tygodnie)}`);
  }
  const przeciazenie = poDniach(grupySzersze, (x) => Math.max(0, x.sloty.size - LIMIT_SLOTOW_W_DNIU));
  for (const e of przeciazenie.wpisy) {
    scal(
      "przeciazenie_dnia",
      e,
      `${dzienLabel(e.dzien)}: ${countPl(e.jednostki, "slot", "sloty", "slotów")} ponad limit ${LIMIT_SLOTOW_W_DNIU} ${wTygodniach(e.tygodnie)}`,
    );
  }
  for (const x of scalone.values()) {
    lista.push({
      rodzaj: x.rodzaj,
      // Each group counts on its own in the score; the place is listed once with all of them.
      jednostki: x.jednostki * x.kto.length,
      kto: x.kto.join(", "),
      opis: x.kto.length > 1 ? `${x.opis} (w każdej z grup)` : x.opis,
      ids: x.ids,
    });
  }

  const okienkaProw = poDniach(prow.mapa, (x) => okienka(x.sloty));
  for (const e of okienkaProw.wpisy) {
    lista.push({
      rodzaj: "okienka_prowadzacych",
      jednostki: e.jednostki,
      kto: osoba(e.kto),
      opis: `${dzienLabel(e.dzien)}: ${countPl(e.jednostki, "pusty slot", "puste sloty", "pustych slotów")} ${wTygodniach(e.tygodnie)}`,
      ids: [...e.zajecia],
    });
  }

  let preferencja = 0;
  for (const [x, dni] of prowDni) {
    const tryb = d.preferencje[x] ?? "brak";
    const ids = prowZajecia.get(x) ?? [];
    if (tryb === "skumulowane") {
      preferencja += dni.size;
      // One day is the best possible: only more days can be improved.
      if (dni.size > 1) {
        lista.push({
          rodzaj: "preferencja_dni",
          jednostki: dni.size,
          kto: osoba(x),
          opis: `Woli zajęcia skumulowane, a ma je w ${countPl(dni.size, "dniu", "dniach", "dniach")}`,
          ids,
        });
      }
    } else if (tryb === "nieskumulowane") {
      const brak = Math.max(0, Math.min(3, ids.length) - dni.size);
      preferencja += brak;
      if (brak > 0) {
        lista.push({
          rodzaj: "preferencja_dni",
          jednostki: brak,
          kto: osoba(x),
          opis: `Woli zajęcia rozłożone na różne dni, a ma je w ${countPl(dni.size, "dniu", "dniach", "dniach")}`,
          ids,
        });
      }
    }
  }

  const miekkie: Record<Rodzaj, number> = {
    preferencja_dni: preferencja,
    okienka_studentow: okienkaGrup.suma,
    okienka_prowadzacych: okienkaProw.suma,
    poza_godzinami: poza,
    przeciazenie_dnia: przeciazenie.suma,
    zla_wielkosc_sali: salaLuz,
  };

  const opisPrzydzialu = (id: string): ZajeciaWProblemie => {
    const z = d.zajecia[id];
    const p = przydzial.get(id)!;
    return { id, opis: `${opisZajec(z)} · ${opisTerminu(p, z.sloty)}, sala ${p.sala}` };
  };
  const wTygodniu = (a: string, b: string) => {
    const pa = przydzial.get(a)!;
    const pb = przydzial.get(b)!;
    return pa.dzien - pb.dzien || pa.slot - pb.slot || a.localeCompare(b);
  };

  return {
    miekkie,
    wynik: RODZAJE.reduce((s, r) => s + (w[r] ?? 0) * miekkie[r], 0),
    problemy: lista
      .map((x) => ({
        rodzaj: x.rodzaj,
        kara: (w[x.rodzaj] ?? 0) * x.jednostki,
        jednostki: x.jednostki,
        kto: x.kto,
        opis: x.opis,
        zajecia: [...new Set(x.ids)].sort(wTygodniu).map(opisPrzydzialu),
      }))
      .filter((x) => x.kara > 0)
      .sort((a, b) => b.kara - a.kara || RODZAJE.indexOf(a.rodzaj) - RODZAJE.indexOf(b.rodzaj) || a.kto.localeCompare(b.kto, "pl")),
  };
}
