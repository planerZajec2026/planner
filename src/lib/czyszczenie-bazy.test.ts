import { describe, expect, it } from "vitest";
import { FRAZA_POTWIERDZENIA, potwierdzono } from "./czyszczenie-bazy";

describe("potwierdzono", () => {
  it("przyjmuje tylko dokładnie wpisaną frazę (spacje wokół nie przeszkadzają)", () => {
    expect(potwierdzono(FRAZA_POTWIERDZENIA)).toBe(true);
    expect(potwierdzono(`  ${FRAZA_POTWIERDZENIA} `)).toBe(true);
  });

  it("odrzuca inną wielkość liter, brak polskich znaków i fragment frazy", () => {
    expect(potwierdzono("Wyczyść bazę danych")).toBe(false);
    expect(potwierdzono("wyczysc baze danych")).toBe(false);
    expect(potwierdzono("wyczyść bazę")).toBe(false);
    expect(potwierdzono("")).toBe(false);
  });
});
