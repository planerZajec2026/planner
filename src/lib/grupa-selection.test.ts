import { describe, expect, it } from "vitest";
import { GRUPY, KIERUNKI } from "@/test/fixtures";
import { resolveGrupaSelection } from "./grupa-selection";

const resolve = (input: Parameters<typeof resolveGrupaSelection>[2]) => {
  const s = resolveGrupaSelection(KIERUNKI, GRUPY, input);
  return { kierunek: s.kierunekId, grupa: s.grupa?.kod, grupy: s.grupy.map((g) => g.kod) };
};

describe("resolveGrupaSelection", () => {
  it("takes the programme from the requested group", () => {
    expect(resolve({ grupa: "INF1-R1-G1" })).toMatchObject({ kierunek: "informatyka", grupa: "INF1-R1-G1" });
  });

  it("defaults to the first group", () => {
    const first = GRUPY[0];
    expect(resolve({})).toMatchObject({ kierunek: first.kierunekId, grupa: first.kod });
  });

  it("replaces a group that does not belong to the requested programme", () => {
    expect(resolve({ kierunek: "fizyka", grupa: "INF1-R1-G1" })).toEqual({
      kierunek: "fizyka",
      grupa: "FIZ-R1-ALL",
      grupy: ["FIZ-R1-ALL"],
    });
  });

  it("lists only the groups of the programme", () => {
    expect(resolve({ kierunek: "informatyka" }).grupy).toEqual(["INF1-R1-ALL", "INF1-R1-G1", "INF1-R1-G2"]);
  });

  it("ignores unknown values", () => {
    expect(resolve({ kierunek: "nope", grupa: "INF1-R1-G1" })).toMatchObject({
      kierunek: "informatyka",
      grupa: "INF1-R1-G1",
    });
  });

  it("returns no group when the programme has none", () => {
    const empty = resolveGrupaSelection(KIERUNKI, [], { kierunek: "fizyka" });
    expect(empty.grupy).toEqual([]);
    expect(empty.grupa).toBeUndefined();
  });

  it("returns nothing at all when there is no data", () => {
    expect(resolveGrupaSelection([], [], {})).toEqual({ kierunekId: "", grupy: [], grupa: undefined });
  });
});
