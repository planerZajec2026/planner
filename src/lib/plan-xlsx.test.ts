import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { zbudujXlsx } from "./plan-xlsx";

const wiersz = {
  id: "Z001",
  przedmiot: "Analiza matematyczna I",
  forma: "Wykład",
  grupy: "INF1-R1 · Cały rocznik",
  prowadzacy: "dr P39",
  dzien: "Poniedziałek",
  od: "10:15",
  do: "12:00",
  sala: "A281",
  tygodnie: "co tydzień",
};

describe("zbudujXlsx", () => {
  it("zapisuje plan i informacje w dwóch arkuszach", async () => {
    const bufor = await zbudujXlsx([wiersz, { ...wiersz, id: "Z002", sala: "A283" }], [{ Pole: "Zadanie", Wartość: "abc" }]);

    const book = new ExcelJS.Workbook();
    await book.xlsx.load(bufor as unknown as ArrayBuffer);
    expect(book.worksheets.map((s) => s.name)).toEqual(["Plan", "Informacje"]);

    const plan = book.getWorksheet("Plan")!;
    expect(plan.rowCount).toBe(3);
    expect(plan.getRow(1).values).toEqual([undefined, "Id", "Przedmiot", "Forma", "Grupy", "Prowadzący", "Dzień", "Od", "Do", "Sala", "Tygodnie"]);
    expect(plan.getRow(2).getCell(9).value).toBe("A281");
    expect(plan.getRow(3).getCell(1).value).toBe("Z002");
    expect(plan.getRow(2).getCell(7).value).toBe("10:15");

    expect(book.getWorksheet("Informacje")!.getRow(2).values).toEqual([undefined, "Zadanie", "abc"]);
  });

  it("działa też dla pustego planu", async () => {
    const book = new ExcelJS.Workbook();
    await book.xlsx.load((await zbudujXlsx([], [])) as unknown as ArrayBuffer);
    expect(book.getWorksheet("Plan")!.rowCount).toBe(1);
  });
});
