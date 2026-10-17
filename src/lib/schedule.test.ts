import { describe, expect, it } from "vitest";
import { parseISODate } from "./dates";
import { sumaGodzin, typLabel, zajeciaWTygodniu } from "./schedule";
import type { Powtarzalnosc, Zajecia } from "./types";

const zajecia = (id: string, powtarzalnosc: Powtarzalnosc): Zajecia => ({
  id,
  przedmiot: "Test",
  typ: "wyklad",
  prowadzacyId: "p",
  grupaId: "g",
  dzien: 1,
  od: "08:00",
  do: "10:00",
  sala: "A1",
  powtarzalnosc,
});

const lista = [zajecia("co", "co-tydzien"), zajecia("par", "parzyste"), zajecia("niepar", "nieparzyste")];
const ids = (z: Zajecia[]) => z.map((x) => x.id);

describe("zajeciaWTygodniu", () => {
  it("keeps weekly and even-week classes in an even ISO week", () => {
    expect(ids(zajeciaWTygodniu(lista, parseISODate("2026-10-12")!))).toEqual(["co", "par"]); // week 42
  });

  it("keeps weekly and odd-week classes in an odd ISO week", () => {
    expect(ids(zajeciaWTygodniu(lista, parseISODate("2026-10-19")!))).toEqual(["co", "niepar"]); // week 43
  });
});

describe("sumaGodzin", () => {
  it("adds up durations in hours", () => {
    expect(sumaGodzin([{ od: "08:00", do: "10:00" }, { od: "12:00", do: "13:30" }])).toBe(3.5);
  });

  it("is 0 for no classes", () => {
    expect(sumaGodzin([])).toBe(0);
  });
});

describe("typLabel", () => {
  it.each([
    ["wyklad", "Wykład"],
    ["cwiczenia", "Ćwiczenia"],
    ["laboratorium", "Laboratorium"],
    ["seminarium", "Seminarium"],
  ] as const)("%s → %s", (typ, label) => {
    expect(typLabel(typ)).toBe(label);
  });
});
