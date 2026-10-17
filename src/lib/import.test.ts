import { beforeAll, describe, expect, it } from "vitest";
import { getGrupy, getKierunki } from "./data/kierunki";
import { getProwadzacy } from "./data/prowadzacy";
import { dzienFromNazwa, formatBlad, parsePlanJson, PRZYKLADOWY_PLAN, resolvePlan, type ResolveContext } from "./import";

let ctx: ResolveContext;

beforeAll(async () => {
  const [kierunki, grupy, prowadzacy] = await Promise.all([getKierunki(), getGrupy(), getProwadzacy()]);
  ctx = { kierunki, grupy, prowadzacy };
});

const sample = () => JSON.parse(PRZYKLADOWY_PLAN);
const errorsOf = (data: unknown) => {
  const r = parsePlanJson(typeof data === "string" ? data : JSON.stringify(data));
  return r.errors.map(formatBlad);
};

describe("dzienFromNazwa", () => {
  it.each([
    ["poniedzialek", 1],
    ["sroda", 3],
    ["Środa", 3],
    ["PIATEK", 5],
    [" niedziela ", 7],
  ])("%j → %i", (nazwa, dzien) => {
    expect(dzienFromNazwa(nazwa)).toBe(dzien);
  });

  it("returns null for unknown names", () => {
    expect(dzienFromNazwa("pt")).toBeNull();
    expect(dzienFromNazwa("friday")).toBeNull();
  });
});

describe("parsePlanJson", () => {
  it("accepts the sample from the design", () => {
    const r = parsePlanJson(PRZYKLADOWY_PLAN);
    expect(r.ok).toBe(true);
    expect(r.plan?.zajecia).toEqual([
      {
        przedmiot: "Bazy danych",
        typ: "wyklad",
        prowadzacy: "prof. Ewa Kaminska",
        dzien: 5,
        od: "18:00",
        do: "20:00",
        sala: "B21",
        powtarzalnosc: "co-tydzien",
      },
    ]);
  });

  it("rejects text that is not JSON", () => {
    expect(errorsOf("{ nie json")).toEqual(["Nieprawidłowy plik JSON"]);
  });

  it("rejects JSON that is not an object", () => {
    expect(errorsOf("[]")).toEqual(["Plik musi zawierać obiekt z planem zajęć"]);
  });

  it("reports a missing top-level field", () => {
    expect(errorsOf({ ...sample(), grupa: undefined })).toEqual(["Brak pola „grupa”"]);
  });

  it("reports an unknown mode", () => {
    expect(errorsOf({ ...sample(), tryb: "wieczorowe" })[0]).toMatch(/^Nieznany tryb studiów „wieczorowe”/);
  });

  it("reports row errors with the 1-based row number", () => {
    const zly = { przedmiot: "X", typ: "kurs", prowadzacy: "Ktoś", dzien: "sroda", od: "12:00", do: "10:00" };
    expect(errorsOf({ ...sample(), zajecia: [sample().zajecia[0], zly] })).toEqual([
      "Zajęcia nr 2: Brak pola „sala”",
      "Zajęcia nr 2: Nieznany typ zajęć „kurs” (dozwolone: wyklad, cwiczenia, laboratorium, seminarium)",
      "Zajęcia nr 2: Godzina rozpoczęcia (12:00) musi być wcześniejsza niż zakończenia (10:00)",
    ]);
  });

  it("reports an unknown day and a malformed time", () => {
    const row = { ...sample().zajecia[0], dzien: "piątunio", od: "25:00" };
    expect(errorsOf({ ...sample(), zajecia: [row] })).toEqual([
      "Zajęcia nr 1: Nieznany dzień tygodnia „piątunio”",
      "Zajęcia nr 1: Nieprawidłowa godzina „25:00” w polu „od” (oczekiwano GG:MM)",
    ]);
  });

  it("normalizes H:MM times and accepts Polish type labels", () => {
    const row = { ...sample().zajecia[0], typ: "Wykład", od: "8:00", do: "9:30" };
    const r = parsePlanJson(JSON.stringify({ ...sample(), zajecia: [row] }));
    expect(r.plan?.zajecia[0]).toMatchObject({ typ: "wyklad", od: "08:00", do: "09:30" });
  });

  it("rejects an empty or non-list zajecia", () => {
    expect(errorsOf({ ...sample(), zajecia: [] })).toEqual(["Lista „zajecia” jest pusta"]);
    expect(errorsOf({ ...sample(), zajecia: {} })).toEqual(["Pole „zajecia” musi być listą"]);
  });
});

describe("resolvePlan", () => {
  it("matches the group and the instructor ignoring diacritics", () => {
    const r = resolvePlan(parsePlanJson(PRZYKLADOWY_PLAN).plan!, ctx);
    expect(r.ok).toBe(true);
    expect(r.zajecia?.[0]).toMatchObject({ grupaId: "inf-z-3", prowadzacyId: "e-kaminska", dzien: 5 });
  });

  it("reports unknown group and instructor", () => {
    const plan = { ...parsePlanJson(PRZYKLADOWY_PLAN).plan! };
    plan.grupa = "ZZZ-9";
    plan.zajecia = [{ ...plan.zajecia[0], prowadzacy: "dr Jan Kowalski" }];
    expect(resolvePlan(plan, ctx).errors.map(formatBlad)).toEqual([
      "Nie znaleziono grupy „ZZZ-9”",
      "Zajęcia nr 1: Nie znaleziono prowadzącego „dr Jan Kowalski”",
    ]);
  });

  it("reports a group from another programme or mode", () => {
    const plan = { ...parsePlanJson(PRZYKLADOWY_PLAN).plan!, kierunek: "Ekonomia", tryb: "stacjonarne" as const };
    expect(resolvePlan(plan, ctx).errors.map(formatBlad)).toEqual([
      "Grupa INF/Z-3 nie należy do kierunku Ekonomia",
      "Grupa INF/Z-3 ma tryb „niestacjonarne”, a plik podaje „stacjonarne”",
    ]);
  });
});
