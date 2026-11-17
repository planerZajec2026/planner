import { describe, expect, it } from "vitest";
import { daneProblemowTestowe } from "@/test/kontekst-planu";
import { przodkowie, problemyPlanu, zaokraglij, type DaneProblemow } from "./plan-problemy";

describe("problemyPlanu on the real data", () => {
  // The numbers solver/validator.py reports for e2e/fixtures/plan.json (its `raport.miekkie` and `wynik_miekkich`).
  it("adds up to exactly what the Python validator reports", () => {
    const wynik = problemyPlanu(daneProblemowTestowe());
    expect(wynik.miekkie).toEqual({
      preferencja_dni: 57,
      okienka_studentow: 225,
      okienka_prowadzacych: 240,
      poza_godzinami: 555,
      przeciazenie_dnia: 5,
      zla_wielkosc_sali: 3073,
    });
    expect(wynik.wynik).toBe(5088);
  });

  it("uses the job's weights on top of the defaults", () => {
    const wynik = problemyPlanu(daneProblemowTestowe(), { zla_wielkosc_sali: 0, poza_godzinami: 2 });
    expect(wynik.wynik).toBe(5088 - 3073 + 555);
    expect(wynik.problemy.some((p) => p.rodzaj === "zla_wielkosc_sali")).toBe(false);
  });

  it("lists places worst first, each with classes that exist in the plan", () => {
    const d = daneProblemowTestowe();
    const { problemy } = problemyPlanu(d);
    expect(problemy.length).toBeGreaterThan(10);
    for (let i = 1; i < problemy.length; i++) expect(problemy[i - 1].kara).toBeGreaterThanOrEqual(problemy[i].kara);
    for (const p of problemy) {
      expect(p.kara).toBeGreaterThan(0);
      expect(p.zajecia.length).toBeGreaterThan(0);
      for (const z of p.zajecia) expect(d.zajecia[z.id]).toBeDefined();
    }
  });

  it("never lists more penalty than the plan has, per kind", () => {
    const wynik = problemyPlanu(daneProblemowTestowe());
    const suma: Record<string, number> = {};
    for (const p of wynik.problemy) suma[p.rodzaj] = (suma[p.rodzaj] ?? 0) + p.jednostki;
    // Gaps, overloads, hours and rooms are listed in full; preferences only where they can improve.
    expect(suma.okienka_studentow).toBe(225);
    expect(suma.okienka_prowadzacych).toBe(240);
    expect(suma.poza_godzinami).toBe(555);
    expect(suma.przeciazenie_dnia).toBe(5);
    expect(suma.zla_wielkosc_sali).toBe(3073);
    expect(suma.preferencja_dni).toBeLessThanOrEqual(57);
  });
});

const male = (): DaneProblemow => ({
  zajecia: {
    W: { id: "W", przedmiot: "Analiza", forma: "W", grupy: ["R1"], prowadzacy: ["P1"], miejsca: 60, sloty: 2 },
    L1: { id: "L1", przedmiot: "Analiza", forma: "LI", grupy: ["L1"], prowadzacy: ["P1"], miejsca: 15, sloty: 2 },
    L2: { id: "L2", przedmiot: "Analiza", forma: "LI", grupy: ["L2"], prowadzacy: ["P2"], miejsca: 15, sloty: 2 },
  },
  plan: [
    { zajeciaId: "W", dzien: 1, slot: 1, sala: "A", tygodnie: [1, 2] },
    { zajeciaId: "L1", dzien: 1, slot: 5, sala: "B", tygodnie: [1, 2] },
    { zajeciaId: "L2", dzien: 1, slot: 5, sala: "B", tygodnie: [1, 2] },
  ],
  sale: [
    { id: "A", pojemnosc: 60 },
    { id: "B", pojemnosc: 20 },
  ],
  nadrzedne: { R1: null, L1: "R1", L2: "R1" },
  preferencje: { P1: "skumulowane", P2: "nieskumulowane" },
  etykiety: { grupy: { R1: "I rok", L1: "lab 1", L2: "lab 2" }, prowadzacy: { P1: "dr A", P2: "dr B" } },
});

describe("problemyPlanu on a small plan", () => {
  it("counts a lecture of the parent group in each lab group's day", () => {
    const { miekkie, problemy } = problemyPlanu(male());
    // Lab groups: slots 1-2 and 5-6 give 2 empty slots in each of 2 weeks, for both groups.
    expect(miekkie.okienka_studentow).toBe(8);
    const okienka = problemy.filter((p) => p.rodzaj === "okienka_studentow");
    expect(okienka).toHaveLength(2); // L1 and L2 differ in their own lab, so they are not merged
    expect(okienka[0]).toMatchObject({ jednostki: 4, kara: 12 });
    expect(okienka[0].opis).toBe("Poniedziałek: 4 puste sloty w 2 tygodniach");
  });

  it("merges groups that share the very same problem", () => {
    const d = male();
    d.plan = d.plan.filter((p) => p.zajeciaId === "W");
    d.zajecia.Y = { id: "Y", przedmiot: "Fizyka", forma: "K", grupy: ["L1", "L2"], prowadzacy: ["P2"], miejsca: 30, sloty: 1 };
    d.plan.push({ zajeciaId: "Y", dzien: 1, slot: 6, sala: "A", tygodnie: [1] });
    // Week 1 of both lab groups: slots 1-2 (lecture) and 6, so 3 empty slots each; the year itself has no gap.
    const { miekkie, problemy } = problemyPlanu(d);
    expect(miekkie.okienka_studentow).toBe(6);
    expect(problemy.filter((p) => p.rodzaj === "okienka_studentow")).toEqual([
      expect.objectContaining({
        kto: "lab 1, lab 2",
        jednostki: 6,
        kara: 18,
        opis: "Poniedziałek: 3 puste sloty w 1 tygodniu (w każdej z grup)",
      }),
    ]);
  });

  it("charges slot 1 and slots from 10 on for every week", () => {
    const { miekkie, problemy } = problemyPlanu(male());
    expect(miekkie.poza_godzinami).toBe(2); // W starts in slot 1, in 2 weeks
    expect(problemy.find((p) => p.rodzaj === "poza_godzinami")?.zajecia.map((z) => z.id)).toEqual(["W"]);
  });

  it("charges empty seats in percentage points and skips rooms of unknown size", () => {
    const d = male();
    expect(problemyPlanu(d).miekkie.zla_wielkosc_sali).toBe(50); // 25 % + 25 % in room B
    d.sale = [{ id: "A", pojemnosc: 60 }, { id: "B", pojemnosc: null }];
    expect(problemyPlanu(d).miekkie.zla_wielkosc_sali).toBe(0);
  });

  it("lists a cumulative preference only when it can improve", () => {
    const d = male();
    // P1 teaches on one day: counted (1) but nothing to improve; P2 has a single class: nothing to spread.
    expect(problemyPlanu(d).miekkie.preferencja_dni).toBe(1);
    expect(problemyPlanu(d).problemy.filter((p) => p.rodzaj === "preferencja_dni")).toEqual([]);

    d.plan[1] = { ...d.plan[1], dzien: 3 };
    expect(problemyPlanu(d).problemy.filter((p) => p.rodzaj === "preferencja_dni")).toEqual([
      expect.objectContaining({ kto: "dr A", jednostki: 2, kara: 10, opis: "Woli zajęcia skumulowane, a ma je w 2 dniach" }),
    ]);
  });
});

describe("helpers", () => {
  it("rounds halves to even like Python", () => {
    expect([0.5, 1.5, 2.5, 2.4, 2.6, -0.5].map(zaokraglij)).toEqual([0, 2, 2, 2, 3, 0]);
  });

  it("walks up the parent groups and stops on a cycle", () => {
    expect(przodkowie({ L: "C", C: "R", R: null }, "L")).toEqual(["L", "C", "R"]);
    expect(przodkowie({ A: "B", B: "A" }, "A")).toEqual(["A", "B"]);
  });
});
