// Client-side parsing and validation of the timetable JSON import format.
import { DNI_PELNE, minutesToTime, timeToMinutes } from "./dates";
import { normalize } from "./pl";
import { pelneImie } from "./prowadzacy";
import type {
  DzienTygodnia,
  Grupa,
  Kierunek,
  Powtarzalnosc,
  Prowadzacy,
  TrybStudiow,
  TypZajec,
  Zajecia,
} from "./types";

/** The example shown next to the dropzone (and the reference file for tests). */
export const PRZYKLADOWY_PLAN = `{
  "kierunek": "Informatyka",
  "grupa": "INF/Z-3",
  "tryb": "niestacjonarne",
  "zajecia": [
    {
      "przedmiot": "Bazy danych",
      "typ": "wyklad",
      "prowadzacy": "prof. Ewa Kaminska",
      "dzien": "piatek",
      "od": "18:00",
      "do": "20:00",
      "sala": "B21"
    }
  ]
}`;

export type ZajeciaJson = {
  przedmiot: string;
  typ: TypZajec;
  prowadzacy: string;
  dzien: DzienTygodnia;
  od: string;
  do: string;
  sala: string;
  powtarzalnosc: Powtarzalnosc;
};

export type PlanJson = {
  kierunek: string;
  grupa: string;
  tryb: TrybStudiow;
  zajecia: ZajeciaJson[];
};

export type ImportBlad = {
  /** 1-based index in `zajecia`, when the error concerns one class. */
  wiersz?: number;
  komunikat: string;
};

export type ParseResult = { ok: true; plan: PlanJson; errors: [] } | { ok: false; plan: null; errors: ImportBlad[] };

const TRYBY: TrybStudiow[] = ["stacjonarne", "niestacjonarne"];
const TYPY: TypZajec[] = ["wyklad", "cwiczenia", "laboratorium", "seminarium"];
const POWTARZALNOSCI: Powtarzalnosc[] = ["co-tydzien", "parzyste", "nieparzyste"];
const DNI = DNI_PELNE.map((d) => normalize(d));

/** "piatek" / "Piątek" / "PIATEK" → 5; null when unknown. */
export function dzienFromNazwa(nazwa: string): DzienTygodnia | null {
  const i = DNI.indexOf(normalize(nazwa));
  return i === -1 ? null : ((i + 1) as DzienTygodnia);
}

/** "8:00" / "08:00" → "08:00"; null when not a valid time of day. */
function parseGodzina(value: string): string | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return minutesToTime(Number(m[1]) * 60 + Number(m[2]));
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Reads a required non-empty string field, pushing a Polish error when it is missing or not text. */
function tekst(obj: Record<string, unknown>, pole: string, errors: ImportBlad[], wiersz?: number): string | null {
  const v = obj[pole];
  if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
    errors.push({ wiersz, komunikat: `Brak pola „${pole}”` });
    return null;
  }
  if (typeof v !== "string") {
    errors.push({ wiersz, komunikat: `Pole „${pole}” musi być tekstem` });
    return null;
  }
  return v.trim();
}

function parseZajecia(raw: unknown, wiersz: number, errors: ImportBlad[]): ZajeciaJson | null {
  if (!isRecord(raw)) {
    errors.push({ wiersz, komunikat: "Oczekiwano obiektu z danymi zajęć" });
    return null;
  }
  const before = errors.length;
  const przedmiot = tekst(raw, "przedmiot", errors, wiersz);
  const typRaw = tekst(raw, "typ", errors, wiersz);
  const prowadzacy = tekst(raw, "prowadzacy", errors, wiersz);
  const dzienRaw = tekst(raw, "dzien", errors, wiersz);
  const odRaw = tekst(raw, "od", errors, wiersz);
  const doRaw = tekst(raw, "do", errors, wiersz);
  const sala = tekst(raw, "sala", errors, wiersz);

  const typ = typRaw ? TYPY.find((t) => t === normalize(typRaw)) : undefined;
  if (typRaw && !typ) {
    errors.push({ wiersz, komunikat: `Nieznany typ zajęć „${typRaw}” (dozwolone: ${TYPY.join(", ")})` });
  }
  const dzien = dzienRaw ? dzienFromNazwa(dzienRaw) : null;
  if (dzienRaw && !dzien) errors.push({ wiersz, komunikat: `Nieznany dzień tygodnia „${dzienRaw}”` });

  const od = odRaw ? parseGodzina(odRaw) : null;
  if (odRaw && !od) errors.push({ wiersz, komunikat: `Nieprawidłowa godzina „${odRaw}” w polu „od” (oczekiwano GG:MM)` });
  const doGodz = doRaw ? parseGodzina(doRaw) : null;
  if (doRaw && !doGodz) errors.push({ wiersz, komunikat: `Nieprawidłowa godzina „${doRaw}” w polu „do” (oczekiwano GG:MM)` });
  if (od && doGodz && timeToMinutes(od) >= timeToMinutes(doGodz)) {
    errors.push({ wiersz, komunikat: `Godzina rozpoczęcia (${od}) musi być wcześniejsza niż zakończenia (${doGodz})` });
  }

  let powtarzalnosc: Powtarzalnosc = "co-tydzien";
  if (raw.powtarzalnosc !== undefined) {
    const p = POWTARZALNOSCI.find((x) => x === raw.powtarzalnosc);
    if (p) powtarzalnosc = p;
    else errors.push({ wiersz, komunikat: `Nieznana powtarzalność „${String(raw.powtarzalnosc)}” (dozwolone: ${POWTARZALNOSCI.join(", ")})` });
  }

  if (errors.length > before) return null;
  return { przedmiot: przedmiot!, typ: typ!, prowadzacy: prowadzacy!, dzien: dzien!, od: od!, do: doGodz!, sala: sala!, powtarzalnosc };
}

/** Parses and validates the file's text. Any error rejects the whole file. */
export function parsePlanJson(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, plan: null, errors: [{ komunikat: "Nieprawidłowy plik JSON" }] };
  }
  if (!isRecord(data)) {
    return { ok: false, plan: null, errors: [{ komunikat: "Plik musi zawierać obiekt z planem zajęć" }] };
  }

  const errors: ImportBlad[] = [];
  const kierunek = tekst(data, "kierunek", errors);
  const grupa = tekst(data, "grupa", errors);
  const trybRaw = tekst(data, "tryb", errors);
  const tryb = trybRaw ? TRYBY.find((t) => t === normalize(trybRaw)) : undefined;
  if (trybRaw && !tryb) {
    errors.push({ komunikat: `Nieznany tryb studiów „${trybRaw}” (dozwolone: ${TRYBY.join(", ")})` });
  }

  const zajecia: ZajeciaJson[] = [];
  if (data.zajecia === undefined) errors.push({ komunikat: "Brak pola „zajecia”" });
  else if (!Array.isArray(data.zajecia)) errors.push({ komunikat: "Pole „zajecia” musi być listą" });
  else if (data.zajecia.length === 0) errors.push({ komunikat: "Lista „zajecia” jest pusta" });
  else {
    data.zajecia.forEach((raw, i) => {
      const z = parseZajecia(raw, i + 1, errors);
      if (z) zajecia.push(z);
    });
  }

  if (errors.length > 0) return { ok: false, plan: null, errors };
  return { ok: true, plan: { kierunek: kierunek!, grupa: grupa!, tryb: tryb!, zajecia }, errors: [] };
}

export type ResolveContext = {
  kierunki: Kierunek[];
  grupy: Grupa[];
  prowadzacy: Prowadzacy[];
};

export type ResolveResult = { ok: true; zajecia: Omit<Zajecia, "id">[]; errors: [] } | { ok: false; zajecia: null; errors: ImportBlad[] };

/**
 * Matches the plan's programme, group and instructors (by name, ignoring case and diacritics) to known records.
 * TODO(backend): resolve names on the server against Supabase instead of the lists loaded on the page.
 */
export function resolvePlan(plan: PlanJson, ctx: ResolveContext): ResolveResult {
  const errors: ImportBlad[] = [];
  const kierunek = ctx.kierunki.find((k) => normalize(k.nazwa) === normalize(plan.kierunek));
  const grupa = ctx.grupy.find((g) => normalize(g.kod) === normalize(plan.grupa));

  if (!kierunek) errors.push({ komunikat: `Nie znaleziono kierunku „${plan.kierunek}”` });
  if (!grupa) errors.push({ komunikat: `Nie znaleziono grupy „${plan.grupa}”` });
  else {
    if (kierunek && grupa.kierunekId !== kierunek.id) {
      errors.push({ komunikat: `Grupa ${grupa.kod} nie należy do kierunku ${kierunek.nazwa}` });
    }
    if (grupa.tryb !== plan.tryb) {
      errors.push({ komunikat: `Grupa ${grupa.kod} ma tryb „${grupa.tryb}”, a plik podaje „${plan.tryb}”` });
    }
  }

  const zajecia: Omit<Zajecia, "id">[] = [];
  plan.zajecia.forEach((z, i) => {
    const p = ctx.prowadzacy.find(
      (x) => normalize(pelneImie(x)) === normalize(z.prowadzacy) || normalize(`${x.imie} ${x.nazwisko}`) === normalize(z.prowadzacy),
    );
    if (!p) {
      errors.push({ wiersz: i + 1, komunikat: `Nie znaleziono prowadzącego „${z.prowadzacy}”` });
      return;
    }
    if (grupa) {
      zajecia.push({
        przedmiot: z.przedmiot,
        typ: z.typ,
        prowadzacyId: p.id,
        grupaId: grupa.id,
        dzien: z.dzien,
        od: z.od,
        do: z.do,
        sala: z.sala,
        powtarzalnosc: z.powtarzalnosc,
      });
    }
  });

  if (errors.length > 0) return { ok: false, zajecia: null, errors };
  return { ok: true, zajecia, errors: [] };
}

/** "Zajęcia nr 2: Brak pola „sala”" */
export function formatBlad(b: ImportBlad): string {
  return b.wiersz ? `Zajęcia nr ${b.wiersz}: ${b.komunikat}` : b.komunikat;
}
