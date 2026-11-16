// Domain logic of the generated timetable (spec 13): slots, weeks, filters and calendar events.
// Pure functions only, so they are unit-tested without a database. Data comes from src/lib/data/plan.ts.
import type { CalendarEvent } from "@/components/calendar/WeekCalendar";
import { addDays, DNI_PELNE, parseISODate, shortDate, toISODate } from "./dates";
import type { DzienTygodnia, TypZajec } from "./types";

/** 12 slots of 45 minutes with 15-minute breaks: slot 1 = 8:15–9:00, slot 12 = 19:15–20:00. */
export const LICZBA_SLOTOW = 12;
export const LICZBA_TYGODNI = 14;
export const DNI_PLANU: DzienTygodnia[] = [1, 2, 3, 4, 5];

const pad = (n: number) => String(n).padStart(2, "0");

/** Start of a slot as "HH:MM". */
export function poczatekSlotu(slot: number): string {
  const minuty = 8 * 60 + 15 + (slot - 1) * 60;
  return `${pad(Math.floor(minuty / 60))}:${pad(minuty % 60)}`;
}

/** End of a slot as "HH:MM" (45 minutes after its start). */
export function koniecSlotu(slot: number): string {
  const minuty = 8 * 60 + 15 + (slot - 1) * 60 + 45;
  return `${pad(Math.floor(minuty / 60))}:${pad(minuty % 60)}`;
}

export type Forma = "W" | "K" | "LI" | "P" | "LEK" | "SEM";
export type Czestotliwosc = "co_tydzien" | "co_2_tygodnie" | "wybrane_tygodnie";

export const FORMA_LABEL: Record<Forma, string> = {
  W: "Wykład",
  K: "Konwersatorium",
  LI: "Laboratorium",
  P: "Pracownia",
  LEK: "Lektorat",
  SEM: "Seminarium",
};

/** Maps the source class form onto the calendar's four block styles. */
export function formaNaTyp(forma: Forma): TypZajec {
  switch (forma) {
    case "W":
      return "wyklad";
    case "LI":
    case "P":
      return "laboratorium";
    case "SEM":
      return "seminarium";
    default:
      return "cwiczenia";
  }
}

/** One placed class: the generator's answer for a row of `zajecia_plan`. */
export type PlanWiersz = {
  zajeciaId: string;
  przedmiot: string;
  forma: Forma;
  rocznikId: string;
  grupy: string[];
  prowadzacy: string[];
  dzien: DzienTygodnia;
  slotOd: number;
  slotDo: number;
  sala: string;
  tygodnie: number[];
  czestotliwosc: Czestotliwosc;
};

export type KalendarzDzien = { data: string; planDnia: number | null; nrTygodnia: number | null };

export type PlanFiltry = {
  rocznik?: string;
  grupa?: string;
  prowadzacy?: string;
  sala?: string;
  dzien?: DzienTygodnia;
  tydzien?: number;
};

export function czasZajec(w: Pick<PlanWiersz, "slotOd" | "slotDo">): { od: string; do: string } {
  return { od: poczatekSlotu(w.slotOd), do: koniecSlotu(w.slotDo) };
}

/** "co tydzień", "co 2 tygodnie, nieparzyste (1, 3, 5…)", "wybrane tygodnie: 2, 5, 11". */
export function opisTygodni(w: Pick<PlanWiersz, "tygodnie" | "czestotliwosc">): string {
  const t = [...w.tygodnie].sort((a, b) => a - b);
  const zakres = t.length > 0 ? `tyg. ${t[0]}–${t[t.length - 1]}` : "brak tygodni";
  if (w.czestotliwosc === "co_tydzien") return t.length === LICZBA_TYGODNI ? "co tydzień" : `co tydzień, ${zakres}`;
  if (w.czestotliwosc === "co_2_tygodnie") {
    const parzystosc = t[0] % 2 === 0 ? "parzyste" : "nieparzyste";
    return `co 2 tygodnie, ${parzystosc} (${t.join(", ")})`;
  }
  return `wybrane tygodnie: ${t.join(", ")}`;
}

export function pasuje(w: PlanWiersz, f: PlanFiltry): boolean {
  return (
    (!f.rocznik || w.rocznikId === f.rocznik) &&
    (!f.grupa || w.grupy.includes(f.grupa)) &&
    (!f.prowadzacy || w.prowadzacy.includes(f.prowadzacy)) &&
    (!f.sala || w.sala === f.sala) &&
    (!f.dzien || w.dzien === f.dzien) &&
    (!f.tydzien || w.tygodnie.includes(f.tydzien))
  );
}

export function filtruj(wiersze: PlanWiersz[], f: PlanFiltry): PlanWiersz[] {
  return wiersze.filter((w) => pasuje(w, f));
}

/** Stable order for the table and exports: day, start, room, class id. */
export function sortujWgCzasu(wiersze: PlanWiersz[]): PlanWiersz[] {
  return [...wiersze].sort(
    (a, b) =>
      a.dzien - b.dzien ||
      a.slotOd - b.slotOd ||
      a.sala.localeCompare(b.sala, "pl") ||
      a.zajeciaId.localeCompare(b.zajeciaId),
  );
}

/** Calendar date of the `tydzien`-th occurrence of plan day `dzien` (Wednesday week 11 → 2027-01-08). */
export function dataDnia(kalendarz: KalendarzDzien[], dzien: number, tydzien: number): string | undefined {
  return kalendarz.find((k) => k.planDnia === dzien && k.nrTygodnia === tydzien)?.data;
}

/** "08.01" for the column header, or "" when the day has no date in that week. */
export function podpisDnia(kalendarz: KalendarzDzien[], dzien: number, tydzien: number): string {
  const data = parseISODate(dataDnia(kalendarz, dzien, tydzien));
  return data ? shortDate(data) : "";
}

export function wTygodniu(wiersze: PlanWiersz[], tydzien: number): PlanWiersz[] {
  return wiersze.filter((w) => w.tygodnie.includes(tydzien));
}

export type Etykiety = { grupy: Record<string, string>; prowadzacy: Record<string, string> };

export function doEventow(wiersze: PlanWiersz[], etykiety: Etykiety): CalendarEvent[] {
  return wiersze.map((w) => {
    const czas = czasZajec(w);
    const grupy = w.grupy.map((g) => etykiety.grupy[g] ?? g).join(", ");
    const prowadzacy = w.prowadzacy.map((p) => etykiety.prowadzacy[p] ?? p).join(", ");
    return {
      id: w.zajeciaId,
      dzien: w.dzien,
      od: czas.od,
      do: czas.do,
      typ: formaNaTyp(w.forma),
      tytul: w.przedmiot,
      meta: `${grupy} · ${w.sala} · ${prowadzacy}`,
    };
  });
}

/** Parses `?tydzien=` into a plan week 1–14, or undefined. */
export function odczytajTydzien(value: string | undefined): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= LICZBA_TYGODNI ? n : undefined;
}

/** Parses `?dzien=` into a plan day 1–5, or undefined. */
export function odczytajDzien(value: string | undefined): DzienTygodnia | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? (n as DzienTygodnia) : undefined;
}

export function dzienLabel(dzien: number): string {
  return DNI_PELNE[dzien - 1] ?? String(dzien);
}

/** Rows for an export, ready to write to a sheet or JSON. */
export type WierszEksportu = {
  id: string;
  przedmiot: string;
  forma: string;
  grupy: string;
  prowadzacy: string;
  dzien: string;
  od: string;
  do: string;
  sala: string;
  tygodnie: string;
};

export function doEksportu(wiersze: PlanWiersz[], etykiety: Etykiety): WierszEksportu[] {
  return sortujWgCzasu(wiersze).map((w) => {
    const czas = czasZajec(w);
    return {
      id: w.zajeciaId,
      przedmiot: w.przedmiot,
      forma: FORMA_LABEL[w.forma],
      grupy: w.grupy.map((g) => etykiety.grupy[g] ?? g).join(", "),
      prowadzacy: w.prowadzacy.map((p) => etykiety.prowadzacy[p] ?? p).join(", "),
      dzien: dzienLabel(w.dzien),
      od: czas.od,
      do: czas.do,
      sala: w.sala,
      tygodnie: opisTygodni(w),
    };
  });
}

/** A `plan_zajec` row with the class it places, as returned by the embedded Supabase select. */
export type PlanRowDb = {
  zajecia_id: string;
  dzien: number;
  slot: number;
  sala_id: string;
  tygodnie: number[];
  zajecia_plan: {
    forma: string;
    rocznik_id: string;
    sloty_na_spotkanie: number;
    czestotliwosc: string;
    przedmioty_plan: { nazwa: string };
    zajecia_plan_grupy: { grupa_id: string }[];
    zajecia_plan_prowadzacy: { prowadzacy_id: string }[];
  };
};

export function wierszZBazy(r: PlanRowDb): PlanWiersz {
  const z = r.zajecia_plan;
  return {
    zajeciaId: r.zajecia_id,
    przedmiot: z.przedmioty_plan.nazwa,
    forma: z.forma as Forma,
    rocznikId: z.rocznik_id,
    grupy: z.zajecia_plan_grupy.map((g) => g.grupa_id).sort(),
    prowadzacy: z.zajecia_plan_prowadzacy.map((p) => p.prowadzacy_id).sort(),
    dzien: r.dzien as DzienTygodnia,
    slotOd: r.slot,
    slotDo: r.slot + z.sloty_na_spotkanie - 1,
    sala: r.sala_id,
    tygodnie: [...r.tygodnie].sort((a, b) => a - b),
    czestotliwosc: z.czestotliwosc as Czestotliwosc,
  };
}

type Parametry = Record<string, string | string[] | undefined>;

function pierwszy(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s ? s : undefined;
}

/** Filters from the query string (`?grupa=…&prowadzacy=…&sala=…&rocznik=…&dzien=1&tydzien=3`). */
export function odczytajFiltry(sp: Parametry): PlanFiltry {
  return {
    rocznik: pierwszy(sp.rocznik),
    grupa: pierwszy(sp.grupa),
    prowadzacy: pierwszy(sp.prowadzacy),
    sala: pierwszy(sp.sala),
    dzien: odczytajDzien(pierwszy(sp.dzien)),
    tydzien: odczytajTydzien(pierwszy(sp.tydzien)),
  };
}

/** "?a=1&b=2" without empty values, or "" when nothing is set. */
export function zapytanie(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Machine-readable form of the plan for the JSON export: ids, numbers and arrays instead of display text. */
export function doJson(wiersze: PlanWiersz[]) {
  return sortujWgCzasu(wiersze).map((w) => {
    const czas = czasZajec(w);
    return {
      id: w.zajeciaId,
      przedmiot: w.przedmiot,
      forma: w.forma,
      rocznik: w.rocznikId,
      grupy: w.grupy,
      prowadzacy: w.prowadzacy,
      dzien: w.dzien,
      slot_od: w.slotOd,
      slot_do: w.slotDo,
      od: czas.od,
      do: czas.do,
      sala: w.sala,
      czestotliwosc: w.czestotliwosc,
      tygodnie: w.tygodnie,
    };
  });
}

/** "plan-zajec", "plan-zajec-grupa-INF1-R1-G1", … with only safe characters, plus the extension. */
export function nazwaPliku(f: PlanFiltry, rozszerzenie: "xlsx" | "json"): string {
  const czesci = (
    [
      ["rocznik", f.rocznik],
      ["grupa", f.grupa],
      ["prowadzacy", f.prowadzacy],
      ["sala", f.sala],
      ["dzien", f.dzien],
      ["tydzien", f.tydzien],
    ] as const
  )
    .filter(([, v]) => v !== undefined)
    .map(([nazwa, v]) => `${nazwa}-${String(v).replace(/[^A-Za-z0-9_-]/g, "_")}`);
  return ["plan-zajec", ...czesci].join("-") + `.${rozszerzenie}`;
}

/** A class on one calendar date: `dzien` is the real weekday of `data` (the plan day may differ on make-up days). */
export type Spotkanie = { wiersz: PlanWiersz; data: string; dzien: DzienTygodnia };

/** The group and the groups it belongs to, nearest first (a lab group, then the whole year it is part of). */
export function lancuchGrup(grupy: { id: string; nadrzednaId?: string }[], grupaId: string): string[] {
  const poId = new Map(grupy.map((g) => [g.id, g]));
  const lancuch: string[] = [];
  let biezaca = poId.get(grupaId);
  while (biezaca && !lancuch.includes(biezaca.id)) {
    lancuch.push(biezaca.id);
    biezaca = biezaca.nadrzednaId ? poId.get(biezaca.nadrzednaId) : undefined;
  }
  return lancuch;
}

/** Classes held in the calendar week starting on `poniedzialek`, each on the date the calendar gives it. */
export function spotkaniaWTygodniu(wiersze: PlanWiersz[], kalendarz: KalendarzDzien[], poniedzialek: Date): Spotkanie[] {
  const dni = new Map(kalendarz.map((k) => [k.data, k]));
  const spotkania: Spotkanie[] = [];
  for (let i = 0; i < 7; i++) {
    const data = toISODate(addDays(poniedzialek, i));
    const dzien = dni.get(data);
    if (!dzien || dzien.planDnia === null || dzien.nrTygodnia === null) continue;
    for (const wiersz of wiersze) {
      if (wiersz.dzien === dzien.planDnia && wiersz.tygodnie.includes(dzien.nrTygodnia)) {
        spotkania.push({ wiersz, data, dzien: (i + 1) as DzienTygodnia });
      }
    }
  }
  return spotkania;
}

export function spotkaniaDoEventow(spotkania: Spotkanie[], etykiety: Etykiety, opis: (w: PlanWiersz) => string): CalendarEvent[] {
  return spotkania.map(({ wiersz: w, data, dzien }) => {
    const czas = czasZajec(w);
    return {
      id: `${w.zajeciaId}-${data}`,
      dzien,
      od: czas.od,
      do: czas.do,
      typ: formaNaTyp(w.forma),
      tytul: w.przedmiot,
      meta: opis(w),
    };
  });
}
