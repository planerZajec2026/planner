// Input data of the timetable generator (spec 13): schema, types and structural validation of `dane_planu`.
// One schema drives everything: the TypeScript types, the parsing of the .xlsx sheets and the checks of a JSON file.
// No imports on purpose: scripts run by Node's type stripping (scripts/*.ts) use this file directly.

/**
 * How a column is stored. `?` means the value may be empty (null).
 * In .xlsx, lists are one cell with items separated by `;`, booleans are the text "true"/"false" and an empty cell
 * is null (or "" for plain text); in JSON they are arrays, booleans and null.
 */
export type Rodzaj = "tekst" | "tekst?" | "liczba" | "liczba?" | "logiczna" | "lista" | "listaLiczb";

/** Tables in dependency order (a table only refers to tables above it) with their columns in sheet order. */
export const SCHEMAT = {
  kalendarz: {
    data: "tekst",
    dzien_tygodnia: "tekst",
    typ_dnia: "tekst",
    plan_dnia: "liczba?",
    nr_tygodnia: "liczba?",
    opis: "tekst",
  },
  sloty: { slot: "liczba", od: "tekst", do: "tekst" },
  sale: {
    id: "tekst",
    nazwa: "tekst?",
    budynek: "tekst",
    typ: "tekst",
    pojemnosc: "liczba?",
    pojemnosc_szacowana: "logiczna",
    metraz_m2: "liczba?",
    wyposazenie: "lista",
    przeznaczenie: "tekst?",
    dostepna_do_planowania: "logiczna",
    uwagi: "tekst?",
  },
  prowadzacy: {
    id: "tekst",
    stopien: "tekst",
    nazwa: "tekst",
    jednostka: "tekst",
    czlonek_rady_wydzialu: "logiczna",
  },
  roczniki: {
    id: "tekst",
    kierunek: "tekst",
    stopien_studiow: "tekst",
    rok: "liczba",
    semestr: "liczba",
    nazwa: "tekst",
    liczba_studentow: "liczba",
    syntetyczny: "logiczna",
  },
  grupy: {
    id: "tekst",
    rocznik: "tekst",
    nazwa: "tekst",
    typ: "tekst",
    podzial: "tekst?",
    grupa_nadrzedna: "tekst?",
    liczba_studentow: "liczba",
  },
  studenci: { id: "tekst", rocznik: "tekst" },
  studenci_grupy: { student: "tekst", grupa: "tekst" },
  kolizje_grup: { grupa_a: "tekst", grupa_b: "tekst", wspolni_studenci: "liczba" },
  przedmioty: { id: "tekst", rocznik: "tekst", nazwa: "tekst" },
  zajecia: {
    id: "tekst",
    rocznik: "tekst",
    przedmiot_id: "tekst",
    przedmiot: "tekst",
    forma: "tekst",
    forma_opis: "tekst",
    grupy: "lista",
    liczba_studentow: "liczba",
    laczone_z: "tekst?",
    dodatkowi_studenci: "liczba",
    prowadzacy: "lista",
    godziny_programowe: "liczba?",
    liczba_spotkan: "liczba",
    sloty_na_spotkanie: "liczba",
    czestotliwosc: "tekst",
    tydzien_od: "liczba",
    tydzien_do: "liczba",
    typy_sal: "lista",
    dozwolone_sale: "lista",
    wymagane_wyposazenie: "lista",
    tryb: "tekst",
    powiazanie: "tekst?",
    typ_powiazania: "tekst?",
    tygodnie_niedostepne: "listaLiczb",
    uwagi: "tekst?",
  },
  blokady_stale: { grupa: "tekst", dzien: "liczba", slot_od: "liczba", slot_do: "liczba", opis: "tekst" },
  rada_wydzialu: { dzien: "liczba", slot_od: "liczba", slot_do: "liczba", opis: "tekst" },
  dezyderaty_terminy: { prowadzacy: "tekst", dzien: "liczba", slot: "liczba", typ: "tekst" },
  dezyderaty_ogolne: {
    prowadzacy: "tekst",
    liczba_godzin_wykluczonych: "liczba",
    powod_wykluczen: "tekst?",
    preferencja_dni: "tekst",
    inne_uwagi: "tekst?",
  },
  dezyderaty_sale: {
    prowadzacy: "tekst",
    przedmiot: "tekst",
    forma: "tekst",
    rodzaj_sali_nr: "tekst",
    sprzet: "tekst?",
  },
} as const satisfies Record<string, Record<string, Rodzaj>>;

export type Tabela = keyof typeof SCHEMAT;

export const TABELE = Object.keys(SCHEMAT) as Tabela[];

type Wartosc<R extends Rodzaj> = R extends "tekst"
  ? string
  : R extends "tekst?"
    ? string | null
    : R extends "liczba"
      ? number
      : R extends "liczba?"
        ? number | null
        : R extends "logiczna"
          ? boolean
          : R extends "lista"
            ? string[]
            : number[];

export type Wiersz<T extends Tabela> = { -readonly [K in keyof (typeof SCHEMAT)[T]]: Wartosc<(typeof SCHEMAT)[T][K] & Rodzaj> };

export type DanePlanu = { [T in Tabela]: Wiersz<T>[] };

export type WynikSprawdzenia = { ok: true; dane: DanePlanu } | { ok: false; bledy: string[] };

const MAKS_BLEDOW = 25;

function odczytaj(wartosc: unknown, rodzaj: Rodzaj): { ok: true; wartosc: unknown } | { ok: false } {
  switch (rodzaj) {
    case "tekst":
      return typeof wartosc === "string" ? { ok: true, wartosc } : { ok: false };
    case "tekst?":
      return wartosc === null || typeof wartosc === "string" ? { ok: true, wartosc } : { ok: false };
    case "liczba":
      return typeof wartosc === "number" && Number.isFinite(wartosc) ? { ok: true, wartosc } : { ok: false };
    case "liczba?":
      return wartosc === null || (typeof wartosc === "number" && Number.isFinite(wartosc))
        ? { ok: true, wartosc }
        : { ok: false };
    case "logiczna":
      return typeof wartosc === "boolean" ? { ok: true, wartosc } : { ok: false };
    case "lista":
      return Array.isArray(wartosc) && wartosc.every((x) => typeof x === "string") ? { ok: true, wartosc } : { ok: false };
    case "listaLiczb":
      return Array.isArray(wartosc) && wartosc.every((x) => typeof x === "number" && Number.isFinite(x))
        ? { ok: true, wartosc }
        : { ok: false };
  }
}

/**
 * Checks the shape of parsed data: every table present, every row has exactly the schema's columns with the right
 * types, ids are unique and references point at existing rows. It does not judge whether a feasible plan exists:
 * that is the solver's job, and it reports a failed job.
 */
export function sprawdzDanePlanu(wejscie: unknown): WynikSprawdzenia {
  const bledy: string[] = [];
  const blad = (tekst: string) => {
    if (bledy.length < MAKS_BLEDOW) bledy.push(tekst);
  };

  if (typeof wejscie !== "object" || wejscie === null || Array.isArray(wejscie)) {
    return { ok: false, bledy: ["Dane muszą być obiektem z tabelami (kalendarz, sale, grupy, zajecia…)."] };
  }
  const dane = wejscie as Record<string, unknown>;

  for (const tabela of TABELE) {
    const wiersze = dane[tabela];
    if (!Array.isArray(wiersze)) {
      blad(`Brakuje tabeli „${tabela}”.`);
      continue;
    }
    const kolumny = Object.entries(SCHEMAT[tabela]) as [string, Rodzaj][];
    wiersze.forEach((wiersz: unknown, i) => {
      if (typeof wiersz !== "object" || wiersz === null) return blad(`${tabela}, wiersz ${i + 1}: oczekiwano obiektu.`);
      const r = wiersz as Record<string, unknown>;
      for (const [kolumna, rodzaj] of kolumny) {
        if (!odczytaj(r[kolumna], rodzaj).ok) {
          blad(`${tabela}, wiersz ${i + 1}: niepoprawna wartość w kolumnie „${kolumna}” (oczekiwano: ${rodzaj}).`);
        }
      }
    });
  }
  if (bledy.length > 0) return { ok: false, bledy };

  const d = dane as unknown as DanePlanu;
  const ids = (wiersze: { id: string }[]) => new Set(wiersze.map((w) => w.id));
  const unikalne = (tabela: string, wartosci: string[]) => {
    const widziane = new Set<string>();
    for (const w of wartosci) {
      if (widziane.has(w)) blad(`${tabela}: powtórzony identyfikator „${w}”.`);
      widziane.add(w);
    }
  };
  const istnieje = (opis: string, zbior: Set<string>, wartosc: string) => {
    if (!zbior.has(wartosc)) blad(`${opis}: nie ma „${wartosc}”.`);
  };

  for (const tabela of ["sale", "prowadzacy", "roczniki", "grupy", "studenci", "przedmioty", "zajecia"] as const) {
    unikalne(tabela, d[tabela].map((w) => w.id));
  }
  const roczniki = ids(d.roczniki);
  const grupy = ids(d.grupy);
  const studenci = ids(d.studenci);
  const prowadzacy = ids(d.prowadzacy);
  const sale = ids(d.sale);
  const przedmioty = ids(d.przedmioty);

  for (const g of d.grupy) {
    istnieje(`grupy ${g.id}, rocznik`, roczniki, g.rocznik);
    if (g.grupa_nadrzedna !== null) istnieje(`grupy ${g.id}, grupa nadrzędna`, grupy, g.grupa_nadrzedna);
  }
  for (const s of d.studenci) istnieje(`studenci ${s.id}, rocznik`, roczniki, s.rocznik);
  for (const s of d.studenci_grupy) {
    istnieje("studenci_grupy, student", studenci, s.student);
    istnieje("studenci_grupy, grupa", grupy, s.grupa);
  }
  for (const k of d.kolizje_grup) {
    istnieje("kolizje_grup, grupa_a", grupy, k.grupa_a);
    istnieje("kolizje_grup, grupa_b", grupy, k.grupa_b);
  }
  for (const p of d.przedmioty) istnieje(`przedmioty ${p.id}, rocznik`, roczniki, p.rocznik);
  for (const z of d.zajecia) {
    istnieje(`zajecia ${z.id}, rocznik`, roczniki, z.rocznik);
    istnieje(`zajecia ${z.id}, przedmiot`, przedmioty, z.przedmiot_id);
    for (const g of z.grupy) istnieje(`zajecia ${z.id}, grupa`, grupy, g);
    for (const p of z.prowadzacy) istnieje(`zajecia ${z.id}, prowadzący`, prowadzacy, p);
    for (const s of z.dozwolone_sale) istnieje(`zajecia ${z.id}, sala`, sale, s);
    if (z.grupy.length === 0) blad(`zajecia ${z.id}: brak grup.`);
    if (z.prowadzacy.length === 0) blad(`zajecia ${z.id}: brak prowadzących.`);
  }
  for (const b of d.blokady_stale) istnieje("blokady_stale, grupa", grupy, b.grupa);
  for (const t of d.dezyderaty_terminy) istnieje("dezyderaty_terminy, prowadzący", prowadzacy, t.prowadzacy);
  for (const o of d.dezyderaty_ogolne) istnieje("dezyderaty_ogolne, prowadzący", prowadzacy, o.prowadzacy);
  for (const s of d.dezyderaty_sale) istnieje("dezyderaty_sale, prowadzący", prowadzacy, s.prowadzacy);

  if (d.zajecia.length === 0) blad("Brak zajęć do zaplanowania.");
  return bledy.length > 0 ? { ok: false, bledy } : { ok: true, dane: oczysc(d) };
}

/** Keeps only the schema's tables and columns, so extras in a file (such as the JSON's `meta`) never reach the database. */
function oczysc(d: DanePlanu): DanePlanu {
  return Object.fromEntries(
    TABELE.map((tabela) => [
      tabela,
      d[tabela].map((wiersz) =>
        Object.fromEntries(Object.keys(SCHEMAT[tabela]).map((kolumna) => [kolumna, (wiersz as Record<string, unknown>)[kolumna]])),
      ),
    ]),
  ) as DanePlanu;
}

/** Counts of rows per table, for a summary after an import. */
export function podsumuj(dane: DanePlanu): Record<Tabela, number> {
  return Object.fromEntries(TABELE.map((t) => [t, dane[t].length])) as Record<Tabela, number>;
}
