import { describe, expect, it } from "vitest";
import { inicjaly, pelneImie } from "./prowadzacy";

describe("pelneImie", () => {
  it("shows the degree with the pseudonym as the source data gives it", () => {
    expect(pelneImie({ nazwa: "dr hab. P12" })).toBe("dr hab. P12");
  });
});

describe("inicjaly", () => {
  it("uses the pseudonym id for the avatar", () => {
    expect(inicjaly({ id: "P12" })).toBe("P12");
  });
});
