import ExcelJS from "exceljs";
import type { WierszEksportu } from "./plan";

export type InformacjeOPlanie = { Pole: string; Wartość: string }[];

const KOLUMNY: { header: string; key: keyof WierszEksportu; width: number }[] = [
  { header: "Id", key: "id", width: 9 },
  { header: "Przedmiot", key: "przedmiot", width: 42 },
  { header: "Forma", key: "forma", width: 16 },
  { header: "Grupy", key: "grupy", width: 28 },
  { header: "Prowadzący", key: "prowadzacy", width: 18 },
  { header: "Dzień", key: "dzien", width: 14 },
  { header: "Od", key: "od", width: 8 },
  { header: "Do", key: "do", width: 8 },
  { header: "Sala", key: "sala", width: 10 },
  { header: "Tygodnie", key: "tygodnie", width: 44 },
];

/** An .xlsx with the timetable on the first sheet and a short description of the plan on the second. */
export async function zbudujXlsx(wiersze: WierszEksportu[], informacje: InformacjeOPlanie): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  book.creator = "Siatka";

  const plan = book.addWorksheet("Plan", { views: [{ state: "frozen", ySplit: 1 }] });
  plan.columns = KOLUMNY.map(({ header, key, width }) => ({ header, key, width }));
  plan.addRows(wiersze);
  plan.getRow(1).font = { bold: true };
  plan.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: KOLUMNY.length } };

  const info = book.addWorksheet("Informacje");
  info.columns = [
    { header: "Pole", key: "Pole", width: 28 },
    { header: "Wartość", key: "Wartość", width: 48 },
  ];
  info.addRows(informacje);
  info.getRow(1).font = { bold: true };

  return Buffer.from(await book.xlsx.writeBuffer());
}
