import { beforeAll, describe, expect, it } from "vitest";
import { nakladajaSie, znajdzKonflikty, type KonfliktContext } from "./conflicts";
import { getGrupy } from "./data/kierunki";
import { getProwadzacy } from "./data/prowadzacy";
import { getWszystkieZajecia } from "./data/zajecia";
import type { Zajecia } from "./types";

let ctx: KonfliktContext;
let istniejace: Zajecia[];

beforeAll(async () => {
  const [grupy, prowadzacy, zajecia] = await Promise.all([getGrupy(), getProwadzacy(), getWszystkieZajecia()]);
  ctx = { grupy, prowadzacy };
  istniejace = zajecia;
});

/** A class that clashes with nothing in the mock plan unless overridden. */
const nowe = (overrides: Partial<Zajecia> = {}): Zajecia => ({
  id: "nowe",
  przedmiot: "Fizyka",
  typ: "wyklad",
  prowadzacyId: "m-nowak",
  grupaId: "eko-3a",
  dzien: 3,
  od: "18:00",
  do: "19:00",
  sala: "Z1",
  powtarzalnosc: "co-tydzien",
  ...overrides,
});

const konflikty = (z: Zajecia) => znajdzKonflikty([z], istniejace, ctx)[0];

describe("znajdzKonflikty", () => {
  it("flags the design's sample: Bazy danych in B21 on Friday 18:00–20:00", () => {
    const [k] = konflikty(
      nowe({ przedmiot: "Bazy danych", prowadzacyId: "e-kaminska", grupaId: "inf-z-3", dzien: 5, od: "18:00", do: "20:00", sala: "B21" }),
    );
    expect(k.rodzaje).toEqual(["sala", "prowadzacy", "grupa"]);
    expect(k.opis).toBe("Sala B21 jest zajęta: Bazy danych (INF/Z-3), pt 18:00–20:00");
  });

  it("finds nothing for a free slot", () => {
    expect(konflikty(nowe())).toEqual([]);
  });

  it("detects a clash by room alone, ignoring case", () => {
    // Monday 10–12 in B21: Sieci komputerowe (INF-2A).
    const [k] = konflikty(nowe({ dzien: 1, od: "11:00", do: "12:30", sala: "b21" }));
    expect(k.rodzaje).toEqual(["sala"]);
    expect(k.opis).toBe("Sala B21 jest zajęta: Sieci komputerowe (INF-2A), pon 10:00–12:00");
  });

  it("detects a clash by instructor alone", () => {
    const [k] = konflikty(nowe({ prowadzacyId: "p-zielinski", dzien: 2, od: "15:00", do: "17:00" }));
    expect(k.rodzaje).toEqual(["prowadzacy"]);
    expect(k.opis).toBe("dr Paweł Zieliński prowadzi w tym czasie: Sieci komputerowe (INF-2B), wt 14:00–16:00");
  });

  it("detects a clash by group alone", () => {
    const [k] = konflikty(nowe({ grupaId: "inf-z-3", dzien: 7, od: "09:00", do: "09:30" }));
    expect(k.rodzaje).toEqual(["grupa"]);
    expect(k.opis).toBe("Grupa INF/Z-3 ma w tym czasie: Język angielski spec., niedz 08:00–10:00");
  });

  it("does not flag classes that only touch", () => {
    expect(konflikty(nowe({ grupaId: "inf-z-3", dzien: 6, od: "18:00", do: "19:00" }))).toEqual([]);
  });

  it("does not flag even-week against odd-week classes", () => {
    // INF-2A Wednesday 10–12 lab runs in even weeks only.
    expect(konflikty(nowe({ grupaId: "inf-2a", dzien: 3, od: "10:00", do: "12:00", powtarzalnosc: "nieparzyste" }))).toEqual([]);
    const [k] = konflikty(nowe({ grupaId: "inf-2a", dzien: 3, od: "10:00", do: "12:00", powtarzalnosc: "parzyste" }));
    expect(k.opis).toBe("Grupa INF-2A ma w tym czasie: Programowanie obiektowe, śr 10:00–12:00 (tygodnie parzyste)");
  });

  it("checks new classes against each other", () => {
    const a = nowe({ id: "a" });
    const b = nowe({ id: "b", od: "18:30", do: "19:30", sala: "Z2", prowadzacyId: "a-krupa" });
    const [ka, kb] = znajdzKonflikty([a, b], istniejace, ctx);
    expect(ka.map((k) => k.z.id)).toEqual(["b"]);
    expect(kb.map((k) => k.z.id)).toEqual(["a"]);
  });
});

describe("nakladajaSie", () => {
  it("requires the same day", () => {
    expect(nakladajaSie(nowe({ dzien: 1 }), nowe({ id: "x", dzien: 2 }))).toBe(false);
  });
});
