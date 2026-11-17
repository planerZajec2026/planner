import { describe, expect, it } from "vitest";
import { odczytajPostep, opisEtapu, procent, sekundOdSygnalu, type Postep } from "./postep";

const baza: Postep = {
  etap: "optymalizacja",
  uplyneloS: 50,
  limitS: 200,
  rozwiazania: 0,
  kara: null,
  karaStartowa: null,
  dolnaGranica: null,
  zaktualizowano: null,
};

describe("odczytajPostep", () => {
  it("reads what the worker writes", () => {
    expect(
      odczytajPostep({
        etap: "optymalizacja",
        uplynelo_s: 61.3,
        limit_s: 200,
        rozwiazania: 12,
        kara: 7132,
        kara_startowa: 17306,
        dolna_granica: 2650,
        zaktualizowano: "2026-11-17T10:00:00.123+00:00",
      }),
    ).toEqual({
      etap: "optymalizacja",
      uplyneloS: 61.3,
      limitS: 200,
      rozwiazania: 12,
      kara: 7132,
      karaStartowa: 17306,
      dolnaGranica: 2650,
      zaktualizowano: "2026-11-17T10:00:00.123+00:00",
    });
  });

  it("fills in fields the first report does not have yet", () => {
    expect(odczytajPostep({ etap: "wczytywanie", limit_s: 300 })).toMatchObject({
      uplyneloS: 0,
      rozwiazania: 0,
      kara: null,
      zaktualizowano: null,
    });
  });

  it.each([null, "x", [1], {}, { etap: "nowy-etap", limit_s: 200 }, { etap: "szukanie" }, { etap: "szukanie", limit_s: 0 }])(
    "rejects %j",
    (json) => expect(odczytajPostep(json)).toBeNull(),
  );
});

describe("procent", () => {
  it("is the share of the time limit the solver has used", () => {
    expect(procent({ ...baza, uplyneloS: 50 })).toBe(25);
    expect(procent({ ...baza, etap: "szukanie", uplyneloS: 0.9 })).toBe(0);
  });

  it("does not run past 100 when the solver overshoots its limit", () => {
    expect(procent({ ...baza, uplyneloS: 203.4 })).toBe(100);
  });

  it("is 0 while loading and 100 while saving", () => {
    expect(procent({ ...baza, etap: "wczytywanie", uplyneloS: 0 })).toBe(0);
    expect(procent({ ...baza, etap: "zapis", uplyneloS: 150 })).toBe(100);
  });
});

describe("opisEtapu", () => {
  it("says the solver is still preparing before the first improved plan", () => {
    expect(opisEtapu(baza).opis).toContain("analizuje model");
  });

  it("counts the improved plans in Polish", () => {
    expect(opisEtapu({ ...baza, rozwiazania: 1 }).opis).toContain("1 lepszy plan");
    expect(opisEtapu({ ...baza, rozwiazania: 3 }).opis).toContain("3 coraz lepsze plany");
    expect(opisEtapu({ ...baza, rozwiazania: 12 }).opis).toContain("12 coraz lepszych planów");
  });
});

describe("sekundOdSygnalu", () => {
  it("counts whole seconds since the last write", () => {
    const p = { ...baza, zaktualizowano: "2026-11-17T10:00:00.000Z" };
    expect(sekundOdSygnalu(p, Date.parse("2026-11-17T10:00:42.900Z"))).toBe(42);
  });

  it("is null without a timestamp", () => {
    expect(sekundOdSygnalu(baza, Date.now())).toBeNull();
    expect(sekundOdSygnalu({ ...baza, zaktualizowano: "wczoraj" }, Date.now())).toBeNull();
  });
});
