// Manual edits of a generated plan (spec 14): the hard constraints 1–10 of spec 13 for a changed placement.
// Pure functions without a database, shared by the edit form (live hints) and the Server Action (the check that
// decides). They mirror solver/validator.py; only the changed classes are checked against the rest of the plan.
import {
  dzienLabel,
  FORMA_LABEL,
  koniecSlotu,
  LICZBA_SLOTOW,
  poczatekSlotu,
  type Czestotliwosc,
  type Etykiety,
  type Forma,
} from "./plan";

export type TypPowiazania = "rozne_dni" | "ten_sam_termin";

/** A class to schedule, with everything the hard constraints need. */
export type ZajeciaPlanu = {
  id: string;
  przedmiot: string;
  forma: Forma;
  grupy: string[];
  prowadzacy: string[];
  /** Seats needed: students of the class plus additional students. */
  miejsca: number;
  liczbaSpotkan: number;
  /** Length of one meeting in slots. */
  sloty: number;
  czestotliwosc: Czestotliwosc;
  tydzienOd: number;
  tydzienDo: number;
  tygodnieNiedostepne: number[];
  typySal: string[];
  dozwoloneSale: string[];
  wymaganeWyposazenie: string[];
  powiazanie: string | null;
  typPowiazania: TypPowiazania | null;
};

/** Where and when a class takes place: one row of `plan_zajec`. */
export type Przydzial = { zajeciaId: string; dzien: number; slot: number; sala: string; tygodnie: number[] };

export type SalaPlanu = { id: string; typ: string; pojemnosc: number | null; wyposazenie: string[]; dostepna: boolean };

export type Blokada = { grupa: string; dzien: number; slotOd: number; slotDo: number };

/**
 * Everything needed to check an edit of one class (and the classes that move with it). Plain data, so a Server
 * Component can pass it to the client form.
 */
export type KontekstEdycji = {
  jobId: string;
  /** `generation_jobs.zmiany_reczne` when the data was read; a save with another version is refused. */
  wersja: number;
  /** All classes of the plan by id. */
  zajecia: Record<string, ZajeciaPlanu>;
  /** The whole plan, one placement per class. */
  plan: Przydzial[];
  sale: SalaPlanu[];
  /** Pairs of groups with common students. Must cover the groups of the edited classes; order does not matter. */
  kolizje: [string, string][];
  blokady: Blokada[];
  /** Hours `[dzien, slot]` in which an instructor cannot teach. Must cover the instructors of the edited classes. */
  wykluczone: Record<string, [number, number][]>;
  etykiety: Etykiety;
};

export type Naruszenie = { ograniczenie: number; opis: string; zajecia: string[] };

/** The new time and room chosen in the form for one class. */
export type Cel = { dzien: number; slot: number; sala: string; tygodnie: number[] };

export const TYP_SALI_LABEL: Record<string, string> = {
  aula: "aula",
  sala_dydaktyczna: "sala dydaktyczna",
  pracownia_komputerowa: "pracownia komputerowa",
  pracownia_robotyki: "pracownia robotyki",
  pracownia_specjalistyczna: "pracownia specjalistyczna",
};

const typSali = (typ: string) => TYP_SALI_LABEL[typ] ?? typ;
const rosnaco = (a: number, b: number) => a - b;

/** Weeks of the class's range without the unavailable ones. */
export function dostepneTygodnie(z: ZajeciaPlanu): number[] {
  const tygodnie: number[] = [];
  for (let t = z.tydzienOd; t <= z.tydzienDo; t++) {
    if (!z.tygodnieNiedostepne.includes(t)) tygodnie.push(t);
  }
  return tygodnie;
}

/** Constraint 2: what is wrong with the weeks, or null. */
export function bladTygodni(z: ZajeciaPlanu, tygodnie: number[]): string | null {
  const t = [...tygodnie].sort(rosnaco);
  if (t.some((w) => !Number.isInteger(w))) return "tygodnie muszą być liczbami całkowitymi";
  if (new Set(t).size !== t.length) return "tygodnie się powtarzają";
  if (t.some((w) => w < z.tydzienOd || w > z.tydzienDo)) {
    return `tygodnie muszą być z zakresu ${z.tydzienOd}–${z.tydzienDo}`;
  }
  const niedostepne = t.filter((w) => z.tygodnieNiedostepne.includes(w));
  if (niedostepne.length > 0) return `tydzień ${niedostepne.join(", ")} jest niedostępny dla tych zajęć`;
  if (t.length !== z.liczbaSpotkan) return `wybrano ${t.length} tyg., a zajęcia mają ${z.liczbaSpotkan} spotkań`;

  const dostepne = dostepneTygodnie(z);
  if (z.czestotliwosc === "co_tydzien") {
    if (t.join() !== dostepne.join()) return "zajęcia co tydzień muszą zajmować wszystkie tygodnie zakresu";
  } else if (z.czestotliwosc === "co_2_tygodnie") {
    if (new Set(t.map((w) => w % 2)).size > 1) return "zajęcia co 2 tygodnie nie mogą mieszać tygodni parzystych i nieparzystych";
    const parzystosc = t.length > 0 ? t[0] % 2 : 0;
    if (t.join() !== dostepne.filter((w) => w % 2 === parzystosc).join()) {
      return "zajęcia co 2 tygodnie muszą zajmować co drugi tydzień zakresu";
    }
  } else if (z.czestotliwosc !== "wybrane_tygodnie") {
    return `nieznana częstotliwość ${z.czestotliwosc}`;
  }
  return null;
}

export type OpcjaTygodni = { id: "wszystkie" | "nieparzyste" | "parzyste"; label: string; tygodnie: number[] };

/**
 * The week sets a class may take, for the form. `co_tydzien` has one, `co_2_tygodnie` the parities that give the
 * right number of meetings, `wybrane_tygodnie` none (any subset of `dostepneTygodnie` of the right size).
 */
export function opcjeTygodni(z: ZajeciaPlanu): OpcjaTygodni[] {
  const dostepne = dostepneTygodnie(z);
  if (z.czestotliwosc === "co_tydzien") return [{ id: "wszystkie", label: "co tydzień", tygodnie: dostepne }];
  if (z.czestotliwosc === "co_2_tygodnie") {
    const opcje: OpcjaTygodni[] = [
      { id: "nieparzyste", label: "nieparzyste", tygodnie: dostepne.filter((w) => w % 2 === 1) },
      { id: "parzyste", label: "parzyste", tygodnie: dostepne.filter((w) => w % 2 === 0) },
    ];
    return opcje
      .filter((o) => o.tygodnie.length === z.liczbaSpotkan)
      .map((o) => ({ ...o, label: `${o.label} (${o.tygodnie.join(", ")})` }));
  }
  return [];
}

/** Constraints 6 and 7 together: may the class be held in this room at all. */
export function salaPasuje(z: ZajeciaPlanu, s: SalaPlanu): boolean {
  const typOk = z.dozwoloneSale.length > 0 ? z.dozwoloneSale.includes(s.id) : s.dostepna && z.typySal.includes(s.typ);
  return typOk && z.wymaganeWyposazenie.every((w) => s.wyposazenie.includes(w)) && (s.pojemnosc ?? 0) >= z.miejsca;
}

/** Lookup structures built once from a context; pass the result to the checks below. */
export type Indeks = {
  k: KontekstEdycji;
  plan: Map<string, Przydzial>;
  sale: Map<string, SalaPlanu>;
  kolizje: Set<string>;
  wykluczone: Map<string, Set<string>>;
};

const para = (a: string, b: string) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

export function przygotuj(k: KontekstEdycji): Indeks {
  return {
    k,
    plan: new Map(k.plan.map((p) => [p.zajeciaId, p])),
    sale: new Map(k.sale.map((s) => [s.id, s])),
    kolizje: new Set(k.kolizje.map(([a, b]) => para(a, b))),
    wykluczone: new Map(
      Object.entries(k.wykluczone).map(([prow, terminy]) => [prow, new Set(terminy.map(([d, s]) => `${d}:${s}`))]),
    ),
  };
}

function koliduja(i: Indeks, a: string, b: string): boolean {
  return a === b || i.kolizje.has(para(a, b));
}

/** The first pair of groups (one from each class) that share students, or null. */
function kolizjaGrup(i: Indeks, ga: string[], gb: string[]): [string, string] | null {
  for (const a of ga) for (const b of gb) if (koliduja(i, a, b)) return [a, b];
  return null;
}

function nakladaja(a: Przydzial, za: ZajeciaPlanu, b: Przydzial, zb: ZajeciaPlanu): boolean {
  return (
    a.dzien === b.dzien &&
    a.slot < b.slot + zb.sloty &&
    b.slot < a.slot + za.sloty &&
    a.tygodnie.some((t) => b.tygodnie.includes(t))
  );
}

/** Ids of the classes that must share day, time and room with this one (the class itself included), sorted. */
export function razem(k: KontekstEdycji, zajeciaId: string): string[] {
  const z = k.zajecia[zajeciaId];
  if (!z) return [];
  if (!z.powiazanie || z.typPowiazania !== "ten_sam_termin") return [zajeciaId];
  return Object.values(k.zajecia)
    .filter((inne) => inne.powiazanie === z.powiazanie)
    .map((inne) => inne.id)
    .sort();
}

/**
 * The placements an edit changes: the edited class gets `cel`; classes linked to it by `ten_sam_termin` get the
 * same day, slot and room and keep their own weeks.
 */
export function zmianyDla(i: Indeks, zajeciaId: string, cel: Cel): Przydzial[] {
  const tygodnie = [...cel.tygodnie].sort(rosnaco);
  const zmiany: Przydzial[] = [{ zajeciaId, dzien: cel.dzien, slot: cel.slot, sala: cel.sala, tygodnie }];
  for (const id of razem(i.k, zajeciaId)) {
    const obecny = i.plan.get(id);
    if (id === zajeciaId || !obecny) continue;
    zmiany.push({ zajeciaId: id, dzien: cel.dzien, slot: cel.slot, sala: cel.sala, tygodnie: obecny.tygodnie });
  }
  return zmiany;
}

export function tenSamPrzydzial(a: Przydzial, b: Przydzial): boolean {
  return (
    a.dzien === b.dzien &&
    a.slot === b.slot &&
    a.sala === b.sala &&
    [...a.tygodnie].sort(rosnaco).join() === [...b.tygodnie].sort(rosnaco).join()
  );
}

/** "Analiza matematyczna (Wykład, Z001)". */
export function opisZajec(z: Pick<ZajeciaPlanu, "id" | "przedmiot" | "forma">): string {
  return `${z.przedmiot} (${FORMA_LABEL[z.forma] ?? z.forma}, ${z.id})`;
}

/** "Piątek 14:15–15:45". */
export function opisTerminu(p: Pick<Przydzial, "dzien" | "slot">, sloty: number): string {
  return `${dzienLabel(p.dzien)} ${poczatekSlotu(p.slot)}–${koniecSlotu(p.slot + sloty - 1)}`;
}

/**
 * Hard-constraint violations that the changed placements cause, against the rest of the plan and each other.
 * An empty list means the change may be saved. The rest of the plan is not re-checked: it was valid before.
 */
export function naruszenia(i: Indeks, zmiany: Przydzial[]): Naruszenie[] {
  const { k } = i;
  const wynik: Naruszenie[] = [];
  const zmieniane = new Map(zmiany.map((p) => [p.zajeciaId, p]));
  const etProw = (id: string) => k.etykiety.prowadzacy[id] ?? id;
  const etGrupy = (id: string) => k.etykiety.grupy[id] ?? id;
  // With several classes moving at once, each message says which class it is about.
  const przedrostek = (z: ZajeciaPlanu) => (zmiany.length > 1 ? `${z.id}: ` : "");

  if (zmieniane.size !== zmiany.length) {
    wynik.push({ ograniczenie: 1, opis: "Te same zajęcia są zmieniane dwa razy.", zajecia: zmiany.map((p) => p.zajeciaId) });
    return wynik;
  }

  const poprawne: [Przydzial, ZajeciaPlanu][] = [];
  for (const p of zmiany) {
    const z = k.zajecia[p.zajeciaId];
    // 1. A known class with a placement in this plan, a valid day, slots within the day, a known room.
    if (!z || !i.plan.has(p.zajeciaId)) {
      wynik.push({ ograniczenie: 1, opis: `Zajęć ${p.zajeciaId} nie ma w planie.`, zajecia: [p.zajeciaId] });
    } else if (!Number.isInteger(p.dzien) || p.dzien < 1 || p.dzien > 5) {
      wynik.push({ ograniczenie: 1, opis: `${przedrostek(z)}Dzień musi być od poniedziałku do piątku.`, zajecia: [z.id] });
    } else if (!Number.isInteger(p.slot) || p.slot < 1 || p.slot + z.sloty - 1 > LICZBA_SLOTOW) {
      wynik.push({
        ograniczenie: 1,
        opis: `${przedrostek(z)}Zajęcia trwają ${z.sloty} godz. lekcyjne i od tej godziny nie mieszczą się w dniu (ostatnie zajęcia kończą się o ${koniecSlotu(LICZBA_SLOTOW)}).`,
        zajecia: [z.id],
      });
    } else if (!i.sale.has(p.sala)) {
      wynik.push({ ograniczenie: 1, opis: `${przedrostek(z)}Nieznana sala ${p.sala || "(brak)"}.`, zajecia: [z.id] });
    } else {
      poprawne.push([p, z]);
    }
  }

  for (const [p, z] of poprawne) {
    const pre = przedrostek(z);

    // 2. Weeks.
    const blad = bladTygodni(z, p.tygodnie);
    if (blad) wynik.push({ ograniczenie: 2, opis: `${pre}Tygodnie: ${blad}.`, zajecia: [z.id] });

    // 6. Room type, allowed rooms, equipment, availability.
    const sala = i.sale.get(p.sala)!;
    if (z.dozwoloneSale.length > 0) {
      if (!z.dozwoloneSale.includes(sala.id)) {
        wynik.push({
          ograniczenie: 6,
          opis: `${pre}Sala ${sala.id} nie jest na liście sal dozwolonych dla tych zajęć (${z.dozwoloneSale.join(", ")}).`,
          zajecia: [z.id],
        });
      }
    } else if (!sala.dostepna) {
      wynik.push({ ograniczenie: 6, opis: `${pre}Sala ${sala.id} jest wyłączona z planowania.`, zajecia: [z.id] });
    } else if (!z.typySal.includes(sala.typ)) {
      wynik.push({
        ograniczenie: 6,
        opis: `${pre}Sala ${sala.id} to ${typSali(sala.typ)}, a zajęcia wymagają: ${z.typySal.map(typSali).join(" lub ")}.`,
        zajecia: [z.id],
      });
    }
    const brak = z.wymaganeWyposazenie.filter((w) => !sala.wyposazenie.includes(w));
    if (brak.length > 0) {
      wynik.push({ ograniczenie: 6, opis: `${pre}W sali ${sala.id} brakuje wyposażenia: ${brak.join(", ")}.`, zajecia: [z.id] });
    }

    // 7. Capacity.
    if ((sala.pojemnosc ?? 0) < z.miejsca) {
      wynik.push({
        ograniczenie: 7,
        opis: `${pre}Sala ${sala.id} ma ${sala.pojemnosc ?? "nieznaną liczbę"} miejsc, a potrzeba ${z.miejsca}.`,
        zajecia: [z.id],
      });
    }

    // 8. Hours excluded by the instructors' requests and by the Faculty Council.
    for (const prow of z.prowadzacy) {
      const wykluczone = i.wykluczone.get(prow);
      if (!wykluczone) continue;
      const zle: number[] = [];
      for (let s = p.slot; s < p.slot + z.sloty; s++) if (wykluczone.has(`${p.dzien}:${s}`)) zle.push(s);
      if (zle.length > 0) {
        wynik.push({
          ograniczenie: 8,
          opis: `${pre}${etProw(prow)} nie może prowadzić zajęć w tym czasie (${dzienLabel(p.dzien).toLowerCase()}, ${zle.map(poczatekSlotu).join(", ")}): dezyderat lub Rada Wydziału.`,
          zajecia: [z.id],
        });
      }
    }

    // 9. Fixed blocks of the groups and of the groups that share students with them.
    for (const b of k.blokady) {
      if (b.dzien === p.dzien && p.slot <= b.slotDo && b.slotOd < p.slot + z.sloty && z.grupy.some((g) => koliduja(i, b.grupa, g))) {
        wynik.push({
          ograniczenie: 9,
          opis: `${pre}Grupa ${etGrupy(b.grupa)} ma blokadę stałą: ${dzienLabel(b.dzien).toLowerCase()} ${poczatekSlotu(b.slotOd)}–${koniecSlotu(b.slotDo)}.`,
          zajecia: [z.id],
        });
      }
    }

    for (const [id, obecny] of i.plan) {
      if (id === z.id) continue;
      const q = zmieniane.get(id) ?? obecny;
      const zq = k.zajecia[id];
      if (!zq) continue;
      // A pair of two changed classes is reported once.
      const paraZmienianych = zmieniane.has(id);
      if (paraZmienianych && id < z.id) continue;
      const ids = [z.id, id];

      // 3–5. Overlapping classes of an instructor, in a room, of students.
      if (nakladaja(p, z, q, zq)) {
        const kiedy = `${opisZajec(zq)}, ${opisTerminu(q, zq.sloty)}`;
        const wspolni = z.prowadzacy.filter((prow) => zq.prowadzacy.includes(prow));
        if (wspolni.length > 0) {
          wynik.push({ ograniczenie: 3, opis: `${pre}${wspolni.map(etProw).join(", ")} prowadzi w tym czasie inne zajęcia: ${kiedy}.`, zajecia: ids });
        }
        if (p.sala === q.sala) {
          wynik.push({ ograniczenie: 4, opis: `${pre}Sala ${p.sala} jest w tym czasie zajęta: ${kiedy}.`, zajecia: ids });
        }
        const grupy = kolizjaGrup(i, z.grupy, zq.grupy);
        if (grupy) {
          const [a, b] = grupy;
          const kto = a === b ? `Grupa ${etGrupy(a)} ma` : `Grupy ${etGrupy(a)} i ${etGrupy(b)} mają wspólnych studentów, a ci mają`;
          wynik.push({ ograniczenie: 5, opis: `${pre}${kto} w tym czasie inne zajęcia: ${kiedy}.`, zajecia: ids });
        }
      }

      // 10. Linked classes.
      if (z.powiazanie && zq.powiazanie === z.powiazanie) {
        if (z.typPowiazania === "rozne_dni" && p.dzien === q.dzien) {
          wynik.push({
            ograniczenie: 10,
            opis: `${pre}Zajęcia powiązane muszą być w różnych dniach, a ${opisZajec(zq)} też są w dniu: ${dzienLabel(q.dzien).toLowerCase()}.`,
            zajecia: ids,
          });
        } else if (z.typPowiazania === "ten_sam_termin" && (p.dzien !== q.dzien || p.slot !== q.slot || p.sala !== q.sala)) {
          wynik.push({
            ograniczenie: 10,
            opis: `${pre}Zajęcia powiązane ${opisZajec(zq)} muszą mieć ten sam dzień, godzinę i salę.`,
            zajecia: ids,
          });
        }
      }
    }
  }

  return wynik.sort((a, b) => a.ograniczenie - b.ograniczenie);
}

/** One start time in the grid of free times. */
export type WolnyTermin = {
  dzien: number;
  slot: number;
  /** False when the class cannot start here whatever the room: it does not fit in the day or someone is busy. */
  terminWolny: boolean;
  /** Rooms in which the class can be held at this time without any violation, smallest first. */
  sale: string[];
};

const ZALEZNE_OD_SALI = new Set([4, 6, 7]);

/**
 * For every day and start slot: the rooms in which the edited class (with the classes that move with it) can be
 * held in the given weeks. `naruszenia(zmianyDla(...))` is empty exactly for the rooms listed.
 */
export function wolneTerminy(i: Indeks, zajeciaId: string, tygodnie: number[]): WolnyTermin[] {
  const { k } = i;
  const z = k.zajecia[zajeciaId];
  const obecny = i.plan.get(zajeciaId);
  if (!z || !obecny) return [];

  const ruszane = razem(k, zajeciaId).filter((id) => i.plan.has(id));
  const klasy = ruszane.map((id) => k.zajecia[id]);
  // Rooms that suit every class that moves (constraints 6 and 7), smallest first so the grid suggests a tight fit.
  const pasujace = k.sale
    .filter((s) => klasy.every((klasa) => salaPasuje(klasa, s)))
    .sort((a, b) => (a.pojemnosc ?? 0) - (b.pojemnosc ?? 0) || a.id.localeCompare(b.id, "pl"));

  const wynik: WolnyTermin[] = [];
  for (let dzien = 1; dzien <= 5; dzien++) {
    for (let slot = 1; slot <= LICZBA_SLOTOW; slot++) {
      // Checked with the current room; violations that depend on the room are judged per room below.
      const zmiany = zmianyDla(i, zajeciaId, { dzien, slot, sala: obecny.sala, tygodnie });
      const terminWolny = !naruszenia(i, zmiany).some((n) => !ZALEZNE_OD_SALI.has(n.ograniczenie));
      let sale: string[] = [];
      if (terminWolny) {
        const zajete = new Set<string>();
        for (const p of zmiany) {
          const zp = k.zajecia[p.zajeciaId];
          for (const [id, q] of i.plan) {
            const zq = k.zajecia[id];
            if (ruszane.includes(id) || !zq) continue;
            if (nakladaja(p, zp, q, zq)) zajete.add(q.sala);
          }
        }
        sale = pasujace.filter((s) => !zajete.has(s.id)).map((s) => s.id);
      }
      wynik.push({ dzien, slot, terminWolny, sale });
    }
  }
  return wynik;
}

/** What the edit form posts. */
export type FormularzEdycji = { jobId: string; wersja: number; zajeciaId: string; cel: Cel };

function calkowita(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string" || !/^\d{1,4}$/.test(v.trim())) return null;
  return Number(v.trim());
}

/** Reads the posted form; null when a field is missing or malformed (the form never sends that). */
export function odczytajFormularz(formData: FormData): FormularzEdycji | null {
  const jobId = formData.get("job");
  const zajeciaId = formData.get("zajecia");
  const sala = formData.get("sala");
  const tygodnie = formData.get("tygodnie");
  const wersja = calkowita(formData.get("wersja"));
  const dzien = calkowita(formData.get("dzien"));
  const slot = calkowita(formData.get("slot"));
  if (typeof jobId !== "string" || !/^[0-9a-f-]{36}$/i.test(jobId)) return null;
  if (typeof zajeciaId !== "string" || zajeciaId === "" || typeof sala !== "string" || typeof tygodnie !== "string") return null;
  if (wersja === null || dzien === null || slot === null) return null;
  const lista = tygodnie.split(",").map((t) => t.trim()).filter(Boolean);
  if (lista.length > 14 || lista.some((t) => !/^\d{1,2}$/.test(t))) return null;
  return { jobId, wersja, zajeciaId, cel: { dzien, slot, sala, tygodnie: lista.map(Number) } };
}
