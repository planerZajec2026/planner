import { describe, expect, it } from "vitest";
import { countPl, normalize, pluralPl } from "./pl";

describe("pluralPl", () => {
  it.each([
    [1, "grupa"],
    [2, "grupy"],
    [4, "grupy"],
    [5, "grup"],
    [12, "grup"],
    [14, "grup"],
    [21, "grup"],
    [22, "grupy"],
    [112, "grup"],
    [0, "grup"],
  ])("%i → %s", (n, form) => {
    expect(pluralPl(n, "grupa", "grupy", "grup")).toBe(form);
  });

  it("countPl prefixes the number", () => {
    expect(countPl(3, "grupa", "grupy", "grup")).toBe("3 grupy");
  });
});

describe("normalize", () => {
  it("strips Polish diacritics, including ł", () => {
    expect(normalize("Łódź")).toBe("lodz");
    expect(normalize("Zażółć gęślą jaźń")).toBe("zazolc gesla jazn");
  });

  it("lower-cases and trims", () => {
    expect(normalize("  GÓRSKI ")).toBe("gorski");
  });
});
