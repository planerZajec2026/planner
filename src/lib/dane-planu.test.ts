import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { podsumuj, sprawdzDanePlanu, TABELE, type DanePlanu } from "./dane-planu";
import { wczytajJson, wczytajXlsx } from "./dane-planu-xlsx";

const json = readFileSync("requirements/dane_planu.json", "utf8");
const xlsx = readFileSync("requirements/dane_planu.xlsx");

function dane(): DanePlanu {
  const wynik = wczytajJson(json);
  if (!wynik.ok) throw new Error(wynik.bledy.join("\n"));
  return wynik.dane;
}

describe("dane z requirements/", () => {
  it("JSON przechodzi sprawdzenie i ma oczekiwane liczby rekordów", () => {
    expect(podsumuj(dane())).toMatchObject({
      zajecia: 174,
      sale: 55,
      prowadzacy: 50,
      grupy: 51,
      roczniki: 6,
      studenci_grupy: 1126,
      kalendarz: 84,
    });
  });

  it("xlsx daje dokładnie te same dane co JSON, tabela po tabeli", async () => {
    const zXlsx = await wczytajXlsx(xlsx);
    if (!zXlsx.ok) throw new Error(zXlsx.bledy.join("\n"));
    const zJson = dane();
    for (const tabela of TABELE) {
      expect(zXlsx.dane[tabela], tabela).toEqual(zJson[tabela]);
    }
  });
});

describe("sprawdzDanePlanu", () => {
  const kopia = () => JSON.parse(json) as Record<string, Record<string, unknown>[]>;
  const bledy = (wejscie: unknown) => {
    const wynik = sprawdzDanePlanu(wejscie);
    return wynik.ok ? [] : wynik.bledy;
  };

  it("odrzuca nie-obiekt", () => {
    expect(bledy([])).toHaveLength(1);
    expect(bledy(null)).toHaveLength(1);
  });

  it("odrzuca z danych nadmiarowe tabele i kolumny", () => {
    const d = kopia();
    (d as Record<string, unknown>).meta = { opis: "x" };
    d.sale[0].cos_dodatkowego = 1;
    const wynik = sprawdzDanePlanu(d);
    expect(wynik.ok).toBe(true);
    if (wynik.ok) {
      expect(Object.keys(wynik.dane)).toEqual(TABELE);
      expect(Object.keys(wynik.dane.sale[0])).not.toContain("cos_dodatkowego");
    }
  });

  it("zgłasza brakującą tabelę", () => {
    const d = kopia();
    delete d.sale;
    expect(bledy(d)).toEqual(['Brakuje tabeli „sale”.']);
  });

  it("zgłasza zły typ wartości z numerem wiersza i kolumną", () => {
    const d = kopia();
    d.zajecia[2].liczba_spotkan = "dziewięć";
    expect(bledy(d)).toEqual([expect.stringContaining("zajecia, wiersz 3")]);
    expect(bledy(d)[0]).toContain("„liczba_spotkan”");
  });

  it("zgłasza powtórzony identyfikator i brakujące odwołanie", () => {
    const d = kopia();
    d.sale.push({ ...d.sale[0] });
    d.zajecia[0].prowadzacy = ["P999"];
    const wynik = bledy(d);
    expect(wynik.some((b) => b.includes("powtórzony identyfikator „A225”"))).toBe(true);
    expect(wynik.some((b) => b.includes("zajecia Z001, prowadzący: nie ma „P999”"))).toBe(true);
  });

  it("odrzuca dane bez zajęć", () => {
    const d = kopia();
    d.zajecia = [];
    expect(bledy(d)).toContain("Brak zajęć do zaplanowania.");
  });

  it("ogranicza liczbę komunikatów", () => {
    const d = kopia();
    for (const z of d.zajecia) z.grupy = ["nie ma takiej"];
    expect(bledy(d).length).toBeLessThanOrEqual(25);
  });
});

describe("wczytajJson i wczytajXlsx", () => {
  it("odrzucają śmieci z czytelnym komunikatem", async () => {
    expect(wczytajJson("{nie json")).toEqual({ ok: false, bledy: ["Plik nie jest poprawnym JSON-em."] });
    const wynik = await wczytajXlsx(new TextEncoder().encode("to nie jest xlsx"));
    expect(wynik.ok).toBe(false);
  });

  it("xlsx bez arkusza lub kolumny wskazuje, czego brakuje", async () => {
    const skoroszyt = new ExcelJS.Workbook();
    await skoroszyt.xlsx.load(xlsx as unknown as ArrayBuffer);
    skoroszyt.removeWorksheet("sale");
    skoroszyt.getWorksheet("grupy")!.spliceColumns(2, 1); // drops "rocznik"
    const wynik = await wczytajXlsx(new Uint8Array(await skoroszyt.xlsx.writeBuffer()));

    expect(wynik.ok).toBe(false);
    if (!wynik.ok) {
      expect(wynik.bledy).toContain('Brakuje arkusza „sale”.');
      expect(wynik.bledy.some((b) => b.includes("Arkusz „grupy”") && b.includes("„rocznik”"))).toBe(true);
    }
  });
});
