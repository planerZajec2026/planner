// Generates supabase/seeds/plan.sql from requirements/dane_planu.json (spec 13): the input data of the timetable
// generator. Run with `npm run db:plan-seed:generate` after the source data changes; CI checks it's current.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

type Value = string | number | boolean | null | undefined | (string | number)[];
type Row = Record<string, Value>;

const SOURCE = fileURLToPath(new URL("../requirements/dane_planu.json", import.meta.url));
const OUT = fileURLToPath(new URL("../supabase/seeds/plan.sql", import.meta.url));

const data = JSON.parse(readFileSync(SOURCE, "utf8")) as Record<string, Row[]>;

/** A SQL literal: strings quoted with '' escaping, arrays as `array[...]`, null/undefined as null. */
function lit(value: Value, arrayType = "text"): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.length === 0 ? `'{}'` : `array[${value.map((v) => lit(v)).join(", ")}]::${arrayType}[]`;
  }
  return `'${value.replaceAll("'", "''")}'`;
}

type Column = [column: string, from: string | ((row: Row) => Value), arrayType?: string];

function insert(table: string, rows: Row[], columns: Column[]): string {
  const names = columns.map(([c]) => c).join(", ");
  const values = rows
    .map((row) => {
      const cells = columns.map(([, from, arrayType]) => {
        const v = typeof from === "function" ? from(row) : row[from];
        return lit(v, arrayType);
      });
      return `  (${cells.join(", ")})`;
    })
    .join(",\n");
  return `insert into public.${table} (${names}) values\n${values};\n`;
}

const same = (...names: string[]): Column[] => names.map((n) => [n, n]);

const sections = [
  insert("sloty", data.sloty, [["slot", "slot"], ["od", "od"], ['"do"', "do"]]),
  insert("kalendarz", data.kalendarz, [
    ["data", "data"],
    ["dzien_tygodnia", "dzien_tygodnia"],
    ["typ_dnia", (r) => (r.typ_dnia === "zajęcia" ? "zajecia" : r.typ_dnia)],
    ["plan_dnia", "plan_dnia"],
    ["nr_tygodnia", "nr_tygodnia"],
    ["opis", (r) => r.opis ?? ""],
  ]),
  insert("sale", data.sale, [
    ...same("id", "nazwa", "budynek", "typ", "pojemnosc", "pojemnosc_szacowana"),
    ["metraz_m2", "metraz_m2"],
    ["wyposazenie", "wyposazenie"],
    ...same("przeznaczenie"),
    ["dostepna_do_planowania", "dostepna_do_planowania"],
    ...same("uwagi"),
  ]),
  insert("roczniki", data.roczniki, same("id", "kierunek", "stopien_studiow", "rok", "semestr", "nazwa", "liczba_studentow", "syntetyczny")),
  insert("grupy_plan", data.grupy, [
    ["id", "id"],
    ["rocznik_id", "rocznik"],
    ...same("nazwa", "typ", "podzial", "grupa_nadrzedna", "liczba_studentow"),
  ]),
  insert("studenci", data.studenci, [["id", "id"], ["rocznik_id", "rocznik"]]),
  insert("studenci_grupy", data.studenci_grupy, [["student_id", "student"], ["grupa_id", "grupa"]]),
  insert("kolizje_grup", data.kolizje_grup, [["grupa_a", "grupa_a"], ["grupa_b", "grupa_b"], ["wspolni_studenci", "wspolni_studenci"]]),
  insert("prowadzacy_plan", data.prowadzacy, [["id", "id"], ["stopien", "stopien"], ["nazwa", "nazwa"], ["jednostka", "jednostka"], ["czlonek_rady_wydzialu", "czlonek_rady_wydzialu"]]),
  insert("przedmioty_plan", data.przedmioty, [["id", "id"], ["rocznik_id", "rocznik"], ["nazwa", "nazwa"]]),
  insert("zajecia_plan", data.zajecia, [
    ["id", "id"],
    ["rocznik_id", "rocznik"],
    ["przedmiot_id", "przedmiot_id"],
    ["forma", "forma"],
    ["liczba_studentow", "liczba_studentow"],
    ["laczone_z", "laczone_z"],
    ["dodatkowi_studenci", (r) => r.dodatkowi_studenci ?? 0],
    ["godziny_programowe", "godziny_programowe"],
    ["liczba_spotkan", "liczba_spotkan"],
    ["sloty_na_spotkanie", "sloty_na_spotkanie"],
    ["czestotliwosc", "czestotliwosc"],
    ["tydzien_od", "tydzien_od"],
    ["tydzien_do", "tydzien_do"],
    ["typy_sal", "typy_sal"],
    ["dozwolone_sale", "dozwolone_sale"],
    ["wymagane_wyposazenie", "wymagane_wyposazenie"],
    ["tryb", "tryb"],
    ["powiazanie", "powiazanie"],
    ["typ_powiazania", "typ_powiazania"],
    ["tygodnie_niedostepne", "tygodnie_niedostepne", "smallint"],
    ["uwagi", "uwagi"],
  ]),
  insert(
    "zajecia_plan_grupy",
    data.zajecia.flatMap((z) => (z.grupy as string[]).map((g) => ({ zajecia_id: z.id, grupa_id: g }))),
    same("zajecia_id", "grupa_id"),
  ),
  insert(
    "zajecia_plan_prowadzacy",
    data.zajecia.flatMap((z) => (z.prowadzacy as string[]).map((p) => ({ zajecia_id: z.id, prowadzacy_id: p }))),
    same("zajecia_id", "prowadzacy_id"),
  ),
  insert("blokady_stale", data.blokady_stale, [["grupa_id", "grupa"], ...same("dzien", "slot_od", "slot_do", "opis")]),
  insert("rada_wydzialu", data.rada_wydzialu, same("dzien", "slot_od", "slot_do", "opis")),
  insert("dezyderaty_terminy", data.dezyderaty_terminy, [["prowadzacy_id", "prowadzacy"], ...same("dzien", "slot", "typ")]),
  insert("dezyderaty_ogolne", data.dezyderaty_ogolne, [
    ["prowadzacy_id", "prowadzacy"],
    ...same("liczba_godzin_wykluczonych", "powod_wykluczen", "preferencja_dni", "inne_uwagi"),
  ]),
  insert("dezyderaty_sale", data.dezyderaty_sale, [["prowadzacy_id", "prowadzacy"], ...same("przedmiot", "forma", "rodzaj_sali_nr", "sprzet")]),
];

const sql = `-- GENERATED by scripts/generate-plan-seed.ts from requirements/dane_planu.json. Do not edit by hand:
-- change the source data and run \`npm run db:plan-seed:generate\`.
-- Applied by \`supabase db reset\` (local) after seed.sql (spec 13).

${sections.join("\n")}`;

mkdirSync(fileURLToPath(new URL("../supabase/seeds/", import.meta.url)), { recursive: true });
writeFileSync(OUT, sql.replaceAll("\r\n", "\n"));
console.log(`Wrote ${OUT}`);
