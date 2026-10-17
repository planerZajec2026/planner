import { describe, expect, it } from "vitest";
import { inicjaly, pelneImie } from "./prowadzacy";

describe("pelneImie", () => {
  it("joins title, first name and surname", () => {
    expect(pelneImie({ tytul: "dr hab.", imie: "Marta", nazwisko: "Nowak" })).toBe("dr hab. Marta Nowak");
  });
});

describe("inicjaly", () => {
  it("takes the first letters of first name and surname", () => {
    expect(inicjaly({ imie: "Marta", nazwisko: "Nowak" })).toBe("MN");
  });

  it("upper-cases, Polish letters included", () => {
    expect(inicjaly({ imie: "łucja", nazwisko: "żak" })).toBe("ŁŻ");
  });
});
