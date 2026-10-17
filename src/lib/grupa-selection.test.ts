import { beforeAll, describe, expect, it } from "vitest";
import { getGrupy, getKierunki } from "./data/kierunki";
import { resolveGrupaSelection } from "./grupa-selection";
import type { Grupa, Kierunek } from "./types";

let kierunki: Kierunek[];
let grupy: Grupa[];

beforeAll(async () => {
  [kierunki, grupy] = await Promise.all([getKierunki(), getGrupy()]);
});

const resolve = (input: Parameters<typeof resolveGrupaSelection>[2]) => {
  const s = resolveGrupaSelection(kierunki, grupy, input);
  return { tryb: s.tryb, kierunek: s.kierunekId, grupa: s.grupa?.kod, grupy: s.grupy.map((g) => g.kod) };
};

describe("resolveGrupaSelection", () => {
  it("takes mode and programme from the requested group", () => {
    expect(resolve({ grupa: "inf-z-3" })).toMatchObject({
      tryb: "niestacjonarne",
      kierunek: "informatyka",
      grupa: "INF/Z-3",
    });
  });

  it("defaults to the first group", () => {
    const first = grupy[0];
    expect(resolve({})).toMatchObject({ tryb: first.tryb, kierunek: first.kierunekId, grupa: first.kod });
  });

  it("replaces a group that does not match the mode and programme", () => {
    expect(resolve({ tryb: "stacjonarne", kierunek: "zarzadzanie", grupa: "inf-z-3" })).toEqual({
      tryb: "stacjonarne",
      kierunek: "zarzadzanie",
      grupa: "ZIP-1A",
      grupy: ["ZIP-1A"],
    });
  });

  it("lists only groups matching mode and programme", () => {
    expect(resolve({ tryb: "niestacjonarne", kierunek: "informatyka" }).grupy).toEqual(["INF/Z-3", "INF/Z-2"]);
  });

  it("ignores unknown values", () => {
    expect(resolve({ tryb: "xyz", kierunek: "nope", grupa: "inf-z-3" })).toMatchObject({
      tryb: "niestacjonarne",
      kierunek: "informatyka",
      grupa: "INF/Z-3",
    });
  });

  it("returns no group when nothing matches", () => {
    const empty = resolveGrupaSelection(kierunki, [], { tryb: "stacjonarne", kierunek: "ekonomia" });
    expect(empty.grupy).toEqual([]);
    expect(empty.grupa).toBeUndefined();
  });
});
