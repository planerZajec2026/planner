import ExcelJS from "exceljs";
import { sprawdzDanePlanu, SCHEMAT, TABELE, type Rodzaj, type WynikSprawdzenia } from "./dane-planu";

type Komorka = ExcelJS.CellValue;

/** The plain value of a cell: text, number, boolean or null (formulas and rich text are flattened). */
function wartosc(komorka: Komorka): string | number | boolean | null {
  if (komorka === null || komorka === undefined) return null;
  if (typeof komorka === "string" || typeof komorka === "number" || typeof komorka === "boolean") return komorka;
  if (komorka instanceof Date) return komorka.toISOString().slice(0, 10);
  if ("richText" in komorka) return komorka.richText.map((t) => t.text).join("");
  if ("result" in komorka) return wartosc(komorka.result as Komorka);
  if ("text" in komorka) return String(komorka.text);
  return null;
}

const lista = (w: string | number | boolean | null): string[] =>
  w === null ? [] : String(w).split(";").map((x) => x.trim()).filter((x) => x !== "");

/** Turns a cell into the type the schema expects. Values that don't fit are left as they are, so validation reports them. */
function zamien(w: string | number | boolean | null, rodzaj: Rodzaj): unknown {
  const pusta = w === null || (typeof w === "string" && w.trim() === "");
  switch (rodzaj) {
    case "tekst":
      return w === null ? "" : String(w);
    case "tekst?":
      return pusta ? null : String(w);
    case "liczba":
    case "liczba?": {
      if (pusta) return rodzaj === "liczba?" ? null : w;
      const n = typeof w === "number" ? w : Number(String(w).trim().replace(",", "."));
      return Number.isFinite(n) ? n : w;
    }
    case "logiczna": {
      if (typeof w === "boolean") return w;
      const tekst = String(w).trim().toLowerCase();
      return tekst === "true" ? true : tekst === "false" ? false : w;
    }
    case "lista":
      return lista(w);
    case "listaLiczb": {
      const liczby = lista(w).map((x) => Number(x));
      return liczby.every((n) => Number.isFinite(n)) ? liczby : w;
    }
  }
}

/**
 * Reads a `dane_planu` workbook: one sheet per table, the first row holds the column names (extra columns and the
 * `_spis` sheet are ignored). Lists are one cell with items separated by `;`.
 */
export async function wczytajXlsx(bufor: ArrayBuffer | Uint8Array): Promise<WynikSprawdzenia> {
  const skoroszyt = new ExcelJS.Workbook();
  try {
    await skoroszyt.xlsx.load(bufor as ArrayBuffer);
  } catch {
    return { ok: false, bledy: ["Nie udało się odczytać pliku. Czy to na pewno skoroszyt .xlsx?"] };
  }

  const bledy: string[] = [];
  const dane: Record<string, unknown[]> = {};
  for (const tabela of TABELE) {
    const arkusz = skoroszyt.getWorksheet(tabela);
    if (!arkusz) {
      bledy.push(`Brakuje arkusza „${tabela}”.`);
      continue;
    }
    const naglowki = new Map<string, number>();
    arkusz.getRow(1).eachCell((komorka, numer) => naglowki.set(String(wartosc(komorka.value) ?? "").trim(), numer));

    const kolumny = Object.entries(SCHEMAT[tabela]) as [string, Rodzaj][];
    const brakujace = kolumny.filter(([nazwa]) => !naglowki.has(nazwa)).map(([nazwa]) => nazwa);
    if (brakujace.length > 0) {
      bledy.push(`Arkusz „${tabela}”: brakuje kolumn ${brakujace.map((k) => `„${k}”`).join(", ")}.`);
      continue;
    }

    const wiersze: unknown[] = [];
    arkusz.eachRow((wiersz, numer) => {
      if (numer === 1) return;
      const wartosci = kolumny.map(([nazwa]) => wartosc(wiersz.getCell(naglowki.get(nazwa)!).value));
      if (wartosci.every((w) => w === null)) return; // an empty row at the end of the sheet
      wiersze.push(Object.fromEntries(kolumny.map(([nazwa, rodzaj], i) => [nazwa, zamien(wartosci[i], rodzaj)])));
    });
    dane[tabela] = wiersze;
  }
  if (bledy.length > 0) return { ok: false, bledy };
  return sprawdzDanePlanu(dane);
}

/** Reads a `dane_planu` JSON document. */
export function wczytajJson(tekst: string): WynikSprawdzenia {
  try {
    return sprawdzDanePlanu(JSON.parse(tekst));
  } catch {
    return { ok: false, bledy: ["Plik nie jest poprawnym JSON-em."] };
  }
}
