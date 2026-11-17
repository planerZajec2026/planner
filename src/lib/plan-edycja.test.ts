import { describe, expect, it } from "vitest";
import { kontekstTestowy } from "@/test/kontekst-planu";
import {
  bladTygodni,
  dostepneTygodnie,
  naruszenia,
  odczytajFormularz,
  opcjeTygodni,
  opisTerminu,
  opisZajec,
  przygotuj,
  razem,
  salaPasuje,
  tenSamPrzydzial,
  wolneTerminy,
  zmianyDla,
  type KontekstEdycji,
  type Przydzial,
  type SalaPlanu,
  type ZajeciaPlanu,
} from "./plan-edycja";

const zajecia = (id: string, nadpisz: Partial<ZajeciaPlanu> = {}): ZajeciaPlanu => ({
  id,
  przedmiot: `Przedmiot ${id}`,
  forma: "K",
  grupy: [`G-${id}`],
  prowadzacy: [`P-${id}`],
  miejsca: 20,
  liczbaSpotkan: 4,
  sloty: 2,
  czestotliwosc: "co_tydzien",
  tydzienOd: 1,
  tydzienDo: 4,
  tygodnieNiedostepne: [],
  typySal: ["sala_dydaktyczna"],
  dozwoloneSale: [],
  wymaganeWyposazenie: [],
  powiazanie: null,
  typPowiazania: null,
  ...nadpisz,
});

const sala = (id: string, nadpisz: Partial<SalaPlanu> = {}): SalaPlanu => ({
  id,
  typ: "sala_dydaktyczna",
  pojemnosc: 30,
  wyposazenie: [],
  dostepna: true,
  ...nadpisz,
});

const TYG = [1, 2, 3, 4];

/** Two classes, A on Monday and B on Tuesday, both in S1; tests add what they need. */
function maly(nadpisz: Partial<KontekstEdycji> = {}): KontekstEdycji {
  return {
    jobId: "00000000-0000-0000-0000-000000000001",
    wersja: 0,
    zajecia: { A: zajecia("A"), B: zajecia("B") },
    plan: [
      { zajeciaId: "A", dzien: 1, slot: 1, sala: "S1", tygodnie: TYG },
      { zajeciaId: "B", dzien: 2, slot: 3, sala: "S1", tygodnie: TYG },
    ],
    sale: [
      sala("S1"),
      sala("S2", { pojemnosc: 10 }),
      sala("S3", { typ: "pracownia_komputerowa", wyposazenie: ["MAC"] }),
      sala("S4", { dostepna: false }),
      sala("S5", { pojemnosc: null }),
      sala("S6"),
    ],
    kolizje: [],
    blokady: [],
    wykluczone: {},
    etykiety: { grupy: { "G-A": "Grupa A", "G-B": "Grupa B" }, prowadzacy: { "P-A": "dr A", "P-B": "dr B" } },
    ...nadpisz,
  };
}

const przenies = (k: KontekstEdycji, cel: Partial<Przydzial> = {}, id = "A") => {
  const i = przygotuj(k);
  return naruszenia(i, [{ ...i.plan.get(id)!, ...cel }]);
};
const numery = (k: KontekstEdycji, cel: Partial<Przydzial> = {}, id = "A") => przenies(k, cel, id).map((n) => n.ograniczenie);

describe("naruszenia", () => {
  it("accepts a move to a free time and room", () => {
    expect(przenies(maly(), { dzien: 3, slot: 5, sala: "S6" })).toEqual([]);
  });

  it("accepts an unchanged placement", () => {
    expect(przenies(maly())).toEqual([]);
  });

  describe("1: day, slots, room", () => {
    it.each([
      ["a day after Friday", { dzien: 6 }],
      ["day zero", { dzien: 0 }],
      ["a fractional day", { dzien: 1.5 }],
      ["slot zero", { slot: 0 }],
      ["a start from which the class does not fit in the day", { slot: 12 }],
      ["an unknown room", { sala: "X9" }],
      ["no room", { sala: "" }],
    ])("rejects %s", (_, cel) => {
      expect(numery(maly(), cel)).toEqual([1]);
    });

    it("accepts the last start that fits", () => {
      expect(przenies(maly(), { slot: 11 })).toEqual([]);
    });

    it("rejects a class that is not in the plan", () => {
      const n = naruszenia(przygotuj(maly()), [{ zajeciaId: "C", dzien: 1, slot: 1, sala: "S1", tygodnie: TYG }]);
      expect(n).toEqual([{ ograniczenie: 1, opis: "Zajęć C nie ma w planie.", zajecia: ["C"] }]);
    });

    it("rejects the same class changed twice", () => {
      const p = { zajeciaId: "A", dzien: 3, slot: 1, sala: "S1", tygodnie: TYG };
      expect(naruszenia(przygotuj(maly()), [p, p]).map((n) => n.ograniczenie)).toEqual([1]);
    });
  });

  describe("2: weeks", () => {
    it("rejects weeks that do not match the frequency", () => {
      const n = przenies(maly(), { tygodnie: [1, 2, 3] });
      expect(n).toHaveLength(1);
      expect(n[0]).toMatchObject({ ograniczenie: 2, zajecia: ["A"] });
      expect(n[0].opis).toContain("wybrano 3 tyg., a zajęcia mają 4 spotkań");
    });
  });

  describe("3: instructor", () => {
    const k = () => maly({ zajecia: { A: zajecia("A"), B: zajecia("B", { prowadzacy: ["P-X", "P-A"] }) } });

    it("rejects two classes of one instructor at the same time", () => {
      const n = przenies(k(), { dzien: 2, slot: 4, sala: "S6" });
      expect(n).toEqual([
        {
          ograniczenie: 3,
          opis: "dr A prowadzi w tym czasie inne zajęcia: Przedmiot B (Konwersatorium, B), Wtorek 10:15–12:00.",
          zajecia: ["A", "B"],
        },
      ]);
    });

    it("accepts classes that only touch", () => {
      expect(przenies(k(), { dzien: 2, slot: 5, sala: "S6" })).toEqual([]);
      expect(przenies(k(), { dzien: 2, slot: 1, sala: "S6" })).toEqual([]);
    });

    it("accepts the same hours in different weeks", () => {
      const kontekst = maly({
        zajecia: {
          A: zajecia("A", { czestotliwosc: "co_2_tygodnie", liczbaSpotkan: 2 }),
          B: zajecia("B", { czestotliwosc: "co_2_tygodnie", liczbaSpotkan: 2, prowadzacy: ["P-A"] }),
        },
        plan: [
          { zajeciaId: "A", dzien: 1, slot: 1, sala: "S1", tygodnie: [1, 3] },
          { zajeciaId: "B", dzien: 2, slot: 3, sala: "S1", tygodnie: [2, 4] },
        ],
      });
      expect(przenies(kontekst, { dzien: 2, slot: 3 })).toEqual([]);
      expect(numery(kontekst, { dzien: 2, slot: 3, tygodnie: [2, 4] })).toEqual([3, 4]);
    });
  });

  describe("4: room", () => {
    it("rejects a room that is taken", () => {
      const n = przenies(maly(), { dzien: 2, slot: 3 });
      expect(n).toHaveLength(1);
      expect(n[0]).toMatchObject({ ograniczenie: 4, zajecia: ["A", "B"] });
      expect(n[0].opis).toBe("Sala S1 jest w tym czasie zajęta: Przedmiot B (Konwersatorium, B), Wtorek 10:15–12:00.");
    });

    it("accepts another room at the same time", () => {
      expect(przenies(maly(), { dzien: 2, slot: 3, sala: "S6" })).toEqual([]);
    });
  });

  describe("5: students", () => {
    it("rejects two classes of one group at the same time", () => {
      const k = maly({ zajecia: { A: zajecia("A"), B: zajecia("B", { grupy: ["G-A"] }) } });
      const n = przenies(k, { dzien: 2, slot: 2, sala: "S6" });
      expect(n).toHaveLength(1);
      expect(n[0].ograniczenie).toBe(5);
      expect(n[0].opis).toContain("Grupa Grupa A ma w tym czasie inne zajęcia");
    });

    it.each([
      ["as listed", [["G-A", "G-B"]] as [string, string][]],
      ["in the other order", [["G-B", "G-A"]] as [string, string][]],
    ])("rejects groups with common students (%s)", (_, kolizje) => {
      const n = przenies(maly({ kolizje }), { dzien: 2, slot: 3, sala: "S6" });
      expect(n).toHaveLength(1);
      expect(n[0].ograniczenie).toBe(5);
      expect(n[0].opis).toContain("mają wspólnych studentów");
    });

    it("accepts groups without common students", () => {
      expect(przenies(maly({ kolizje: [["G-A", "G-C"]] }), { dzien: 2, slot: 3, sala: "S6" })).toEqual([]);
    });
  });

  describe("6: room type, allowed rooms, equipment", () => {
    it("rejects a room of another type", () => {
      const n = przenies(maly(), { sala: "S3" });
      expect(n).toHaveLength(1);
      expect(n[0].ograniczenie).toBe(6);
      expect(n[0].opis).toBe("Sala S3 to pracownia komputerowa, a zajęcia wymagają: sala dydaktyczna.");
    });

    it("rejects a room excluded from planning", () => {
      const n = przenies(maly(), { sala: "S4" });
      expect(n.map((x) => x.opis)).toEqual(["Sala S4 jest wyłączona z planowania."]);
    });

    it("rejects a room outside the allowed list", () => {
      const k = maly({ zajecia: { A: zajecia("A", { typySal: [], dozwoloneSale: ["S6"] }), B: zajecia("B") } });
      expect(numery(k, { sala: "S1" })).toEqual([6]);
      expect(przenies(k, { sala: "S6" })).toEqual([]);
    });

    it("accepts an allowed room even when it is excluded from planning or of another type", () => {
      const k = maly({ zajecia: { A: zajecia("A", { typySal: [], dozwoloneSale: ["S4", "S3"] }), B: zajecia("B") } });
      expect(przenies(k, { sala: "S4" })).toEqual([]);
      expect(przenies(k, { sala: "S3" })).toEqual([]);
    });

    it("rejects a room without the required equipment", () => {
      const k = maly({
        zajecia: {
          A: zajecia("A", { typySal: ["sala_dydaktyczna", "pracownia_komputerowa"], wymaganeWyposazenie: ["MAC"] }),
          B: zajecia("B"),
        },
      });
      const n = przenies(k, { sala: "S6" });
      expect(n.map((x) => x.opis)).toEqual(["W sali S6 brakuje wyposażenia: MAC."]);
      expect(przenies(k, { sala: "S3" })).toEqual([]);
    });
  });

  describe("7: capacity", () => {
    it("rejects a room that is too small", () => {
      const n = przenies(maly(), { sala: "S2" });
      expect(n).toEqual([{ ograniczenie: 7, opis: "Sala S2 ma 10 miejsc, a potrzeba 20.", zajecia: ["A"] }]);
    });

    it("rejects a room of unknown capacity", () => {
      expect(numery(maly(), { sala: "S5" })).toEqual([7]);
    });

    it("accepts a room with exactly enough seats", () => {
      const k = maly({ zajecia: { A: zajecia("A", { miejsca: 30 }), B: zajecia("B") } });
      expect(przenies(k, { sala: "S6" })).toEqual([]);
    });
  });

  describe("8: excluded hours of an instructor", () => {
    const k = () => maly({ wykluczone: { "P-A": [[3, 6]], "P-B": [[3, 5]] } });

    it("rejects any slot of the class in an excluded hour", () => {
      const n = przenies(k(), { dzien: 3, slot: 5 });
      expect(n).toHaveLength(1);
      expect(n[0].ograniczenie).toBe(8);
      expect(n[0].opis).toBe(
        "dr A nie może prowadzić zajęć w tym czasie (środa, 13:15): dezyderat lub Rada Wydziału.",
      );
      expect(numery(k(), { dzien: 3, slot: 6 })).toEqual([8]);
    });

    it("ignores the hours of other instructors and other days", () => {
      expect(przenies(k(), { dzien: 3, slot: 4 })).toEqual([]);
      expect(przenies(k(), { dzien: 3, slot: 7 })).toEqual([]);
      expect(przenies(k(), { dzien: 4, slot: 6 })).toEqual([]);
    });
  });

  describe("9: fixed blocks", () => {
    const blokady = [{ grupa: "G-A", dzien: 4, slotOd: 3, slotDo: 4 }];

    it("rejects a class of the blocked group in the blocked hours", () => {
      const n = przenies(maly({ blokady }), { dzien: 4, slot: 4 });
      expect(n).toEqual([
        { ograniczenie: 9, opis: "Grupa Grupa A ma blokadę stałą: czwartek 10:15–12:00.", zajecia: ["A"] },
      ]);
      expect(numery(maly({ blokady }), { dzien: 4, slot: 2 })).toEqual([9]);
    });

    it("accepts hours next to the block and other days", () => {
      expect(przenies(maly({ blokady }), { dzien: 4, slot: 1 })).toEqual([]);
      expect(przenies(maly({ blokady }), { dzien: 4, slot: 5 })).toEqual([]);
      expect(przenies(maly({ blokady }), { dzien: 5, slot: 3 })).toEqual([]);
    });

    it("applies the block to groups with common students", () => {
      const k = maly({ blokady: [{ grupa: "G-X", dzien: 4, slotOd: 3, slotDo: 4 }], kolizje: [["G-A", "G-X"]] });
      expect(numery(k, { dzien: 4, slot: 3 })).toEqual([9]);
      expect(przenies(k, { dzien: 4, slot: 3 }, "B")).toEqual([]);
    });
  });

  describe("10: linked classes", () => {
    it("rejects classes linked by rozne_dni on the same day", () => {
      const k = maly({
        zajecia: {
          A: zajecia("A", { powiazanie: "POW", typPowiazania: "rozne_dni" }),
          B: zajecia("B", { powiazanie: "POW", typPowiazania: "rozne_dni" }),
        },
      });
      const n = przenies(k, { dzien: 2, slot: 7, sala: "S6" });
      expect(n).toEqual([
        {
          ograniczenie: 10,
          opis: "Zajęcia powiązane muszą być w różnych dniach, a Przedmiot B (Konwersatorium, B) też są w dniu: wtorek.",
          zajecia: ["A", "B"],
        },
      ]);
      expect(przenies(k, { dzien: 3 })).toEqual([]);
    });

    const razemK = () =>
      maly({
        zajecia: {
          A: zajecia("A", { powiazanie: "POW", typPowiazania: "ten_sam_termin", tydzienDo: 2, liczbaSpotkan: 2 }),
          B: zajecia("B", { powiazanie: "POW", typPowiazania: "ten_sam_termin", tydzienOd: 3, liczbaSpotkan: 2 }),
        },
        plan: [
          { zajeciaId: "A", dzien: 1, slot: 1, sala: "S1", tygodnie: [1, 2] },
          { zajeciaId: "B", dzien: 1, slot: 1, sala: "S1", tygodnie: [3, 4] },
        ],
      });

    it("rejects moving one class of a ten_sam_termin set", () => {
      expect(numery(razemK(), { dzien: 3 })).toEqual([10]);
      expect(numery(razemK(), { slot: 3 })).toEqual([10]);
      expect(numery(razemK(), { sala: "S6" })).toEqual([10]);
    });

    it("accepts moving the whole set, and names the class in each message", () => {
      const i = przygotuj(razemK());
      expect(naruszenia(i, zmianyDla(i, "A", { dzien: 3, slot: 5, sala: "S6", tygodnie: [1, 2] }))).toEqual([]);

      const n = naruszenia(i, zmianyDla(i, "A", { dzien: 3, slot: 5, sala: "S2", tygodnie: [1, 2] }));
      expect(n.map((x) => x.opis)).toEqual([
        "A: Sala S2 ma 10 miejsc, a potrzeba 20.",
        "B: Sala S2 ma 10 miejsc, a potrzeba 20.",
      ]);
    });

    it("reports a clash between two changed classes once", () => {
      const i = przygotuj(maly());
      const n = naruszenia(i, [
        { zajeciaId: "A", dzien: 3, slot: 1, sala: "S6", tygodnie: TYG },
        { zajeciaId: "B", dzien: 3, slot: 2, sala: "S6", tygodnie: TYG },
      ]);
      expect(n).toHaveLength(1);
      expect(n[0]).toMatchObject({ ograniczenie: 4, zajecia: ["A", "B"] });
    });
  });

  it("sorts violations by constraint number", () => {
    const k = maly({ wykluczone: { "P-A": [[2, 3]] } });
    expect(numery(k, { dzien: 2, slot: 3, sala: "S1", tygodnie: [1] })).toEqual([2, 4, 8]);
  });
});

describe("bladTygodni", () => {
  const co2 = zajecia("A", { czestotliwosc: "co_2_tygodnie", tydzienOd: 1, tydzienDo: 8, liczbaSpotkan: 4 });
  const wybrane = zajecia("A", {
    czestotliwosc: "wybrane_tygodnie",
    tydzienOd: 1,
    tydzienDo: 6,
    liczbaSpotkan: 3,
    tygodnieNiedostepne: [4],
  });

  it("accepts every week of the range for a weekly class, in any order", () => {
    expect(bladTygodni(zajecia("A"), [4, 2, 3, 1])).toBeNull();
  });

  it("rejects repeated, fractional and out-of-range weeks", () => {
    expect(bladTygodni(zajecia("A"), [1, 1, 2, 3])).toBe("tygodnie się powtarzają");
    expect(bladTygodni(zajecia("A"), [1, 2, 3, 3.5])).toBe("tygodnie muszą być liczbami całkowitymi");
    expect(bladTygodni(zajecia("A"), [1, 2, 3, 5])).toBe("tygodnie muszą być z zakresu 1–4");
  });

  it("accepts either parity for a class every two weeks", () => {
    expect(bladTygodni(co2, [1, 3, 5, 7])).toBeNull();
    expect(bladTygodni(co2, [2, 4, 6, 8])).toBeNull();
  });

  it("rejects mixed parities and gaps for a class every two weeks", () => {
    expect(bladTygodni(co2, [1, 2, 5, 7])).toContain("parzystych i nieparzystych");
    expect(bladTygodni({ ...co2, liczbaSpotkan: 3 }, [1, 3, 7])).toContain("co drugi tydzień");
  });

  it("accepts any available weeks of the right count for chosen weeks", () => {
    expect(bladTygodni(wybrane, [1, 5, 6])).toBeNull();
    expect(bladTygodni(wybrane, [1, 5])).toContain("wybrano 2 tyg.");
    expect(bladTygodni(wybrane, [1, 4, 5])).toBe("tydzień 4 jest niedostępny dla tych zajęć");
  });

  it("skips unavailable weeks of a weekly class", () => {
    const z = zajecia("A", { tygodnieNiedostepne: [2], liczbaSpotkan: 3 });
    expect(dostepneTygodnie(z)).toEqual([1, 3, 4]);
    expect(bladTygodni(z, [1, 3, 4])).toBeNull();
  });
});

describe("opcjeTygodni", () => {
  it("offers one option for a weekly class", () => {
    expect(opcjeTygodni(zajecia("A"))).toEqual([{ id: "wszystkie", label: "co tydzień", tygodnie: TYG }]);
  });

  it("offers the parities that give the right number of meetings", () => {
    const z = zajecia("A", { czestotliwosc: "co_2_tygodnie", tydzienOd: 1, tydzienDo: 5, liczbaSpotkan: 3 });
    expect(opcjeTygodni(z)).toEqual([{ id: "nieparzyste", label: "nieparzyste (1, 3, 5)", tygodnie: [1, 3, 5] }]);
    expect(opcjeTygodni({ ...z, tydzienDo: 6 }).map((o) => o.id)).toEqual(["nieparzyste", "parzyste"]);
  });

  it("offers nothing for chosen weeks", () => {
    expect(opcjeTygodni(zajecia("A", { czestotliwosc: "wybrane_tygodnie" }))).toEqual([]);
  });
});

describe("salaPasuje", () => {
  it("agrees with constraints 6 and 7", () => {
    const k = maly();
    const i = przygotuj(k);
    for (const s of k.sale) {
      const zle = naruszenia(i, [{ zajeciaId: "A", dzien: 5, slot: 9, sala: s.id, tygodnie: TYG }]);
      expect(salaPasuje(k.zajecia.A, s), s.id).toBe(zle.length === 0);
    }
  });
});

describe("helpers", () => {
  it("compares placements regardless of the order of weeks", () => {
    const p = { zajeciaId: "A", dzien: 1, slot: 1, sala: "S1", tygodnie: [1, 2] };
    expect(tenSamPrzydzial(p, { ...p, tygodnie: [2, 1] })).toBe(true);
    expect(tenSamPrzydzial(p, { ...p, tygodnie: [1] })).toBe(false);
    expect(tenSamPrzydzial(p, { ...p, sala: "S2" })).toBe(false);
    expect(tenSamPrzydzial(p, { ...p, slot: 2 })).toBe(false);
    expect(tenSamPrzydzial(p, { ...p, dzien: 2 })).toBe(false);
  });

  it("describes a class and a time", () => {
    expect(opisZajec(zajecia("A", { forma: "W" }))).toBe("Przedmiot A (Wykład, A)");
    expect(opisTerminu({ dzien: 5, slot: 7 }, 2)).toBe("Piątek 14:15–16:00");
  });
});

describe("odczytajFormularz", () => {
  const formularz = (nadpisz: Record<string, string | null> = {}) => {
    const fd = new FormData();
    const pola: Record<string, string | null> = {
      job: "00000000-0000-0000-0000-00000000e2e0",
      wersja: "3",
      zajecia: "Z001",
      dzien: "5",
      slot: "7",
      sala: "A283",
      tygodnie: "1, 2,3",
      ...nadpisz,
    };
    for (const [k, v] of Object.entries(pola)) if (v !== null) fd.set(k, v);
    return fd;
  };

  it("reads a complete form", () => {
    expect(odczytajFormularz(formularz())).toEqual({
      jobId: "00000000-0000-0000-0000-00000000e2e0",
      wersja: 3,
      zajeciaId: "Z001",
      cel: { dzien: 5, slot: 7, sala: "A283", tygodnie: [1, 2, 3] },
    });
  });

  it("reads an empty list of weeks", () => {
    expect(odczytajFormularz(formularz({ tygodnie: "" }))?.cel.tygodnie).toEqual([]);
  });

  it.each([
    ["a missing job", { job: null }],
    ["a job that is not a uuid", { job: "abc" }],
    ["a missing version", { wersja: null }],
    ["a negative version", { wersja: "-1" }],
    ["a missing class", { zajecia: "" }],
    ["a day that is not a number", { dzien: "pon" }],
    ["a fractional slot", { slot: "1.5" }],
    ["a missing room", { sala: null }],
    ["weeks that are not numbers", { tygodnie: "1,a" }],
    ["too many weeks", { tygodnie: Array.from({ length: 15 }, (_, i) => i + 1).join(",") }],
  ])("rejects %s", (_, nadpisz) => {
    expect(odczytajFormularz(formularz(nadpisz))).toBeNull();
  });
});

describe("with the real input data and a plan accepted by the Python validator", () => {
  const k = kontekstTestowy();
  const i = przygotuj(k);

  it("has a placement for every class", () => {
    expect(k.plan).toHaveLength(174);
    expect(Object.keys(k.zajecia)).toHaveLength(174);
  });

  it("finds no violation for any class in its current placement", () => {
    const zle = k.plan.flatMap((p) => naruszenia(i, [p]).map((n) => `${p.zajeciaId}: [${n.ograniczenie}] ${n.opis}`));
    expect(zle).toEqual([]);
  });

  it("finds the classes that move together", () => {
    expect(razem(k, "Z037")).toEqual(["Z037", "Z038"]);
    expect(razem(k, "Z038")).toEqual(["Z037", "Z038"]);
    expect(razem(k, "Z002")).toEqual(["Z002"]);
    expect(razem(k, "Z001")).toEqual(["Z001"]);
    expect(razem(k, "brak")).toEqual([]);
  });

  it("moves linked classes to the same day, slot and room and keeps their weeks", () => {
    const zmiany = zmianyDla(i, "Z037", { dzien: 1, slot: 1, sala: "A283", tygodnie: [7, 1, 2, 3, 4, 5, 6] });
    expect(zmiany).toEqual([
      { zajeciaId: "Z037", dzien: 1, slot: 1, sala: "A283", tygodnie: [1, 2, 3, 4, 5, 6, 7] },
      { zajeciaId: "Z038", dzien: 1, slot: 1, sala: "A283", tygodnie: [8, 9, 10, 11, 12, 13, 14] },
    ]);
  });

  it("rejects a lecture moved onto the Faculty Council for a council member", () => {
    // Z001 is taught by P39, a member of the council (Tuesday, slots 9–10).
    const n = naruszenia(i, zmianyDla(i, "Z001", { ...i.plan.get("Z001")!, dzien: 2, slot: 9 }));
    expect(n.map((x) => x.ograniczenie)).toContain(8);
  });

  it("rejects a class of the year with the fixed block during the block", () => {
    // INF1-R2-ALL has PE on Thursday, slots 1–4; Z056 is a lecture for that year.
    const n = naruszenia(i, zmianyDla(i, "Z056", { ...i.plan.get("Z056")!, dzien: 4, slot: 3 }));
    expect(n.map((x) => x.ograniczenie)).toContain(9);
  });

  describe("wolneTerminy", () => {
    // Weekly, linked (ten_sam_termin and rozne_dni), every two weeks, chosen weeks, allowed rooms, equipment.
    it.each(["Z001", "Z002", "Z037", "Z056", "Z105", "Z071", "Z115"])("agrees with naruszenia for %s", (id) => {
      const obecny = i.plan.get(id)!;
      const terminy = wolneTerminy(i, id, obecny.tygodnie);
      expect(terminy).toHaveLength(60);

      for (const t of terminy) {
        const wolne = k.sale
          .filter((s) => naruszenia(i, zmianyDla(i, id, { dzien: t.dzien, slot: t.slot, sala: s.id, tygodnie: obecny.tygodnie })).length === 0)
          .map((s) => s.id)
          .sort();
        expect([...t.sale].sort(), `${id} ${t.dzien}:${t.slot}`).toEqual(wolne);
        if (!t.terminWolny) expect(t.sale).toEqual([]);
      }

      // The class's own placement does not block it.
      const tu = terminy.find((t) => t.dzien === obecny.dzien && t.slot === obecny.slot)!;
      expect(tu.terminWolny).toBe(true);
      expect(tu.sale).toContain(obecny.sala);
    });

    it("lists the smallest rooms first", () => {
      const t = wolneTerminy(i, "Z002", i.plan.get("Z002")!.tygodnie).find((x) => x.sale.length > 1)!;
      const pojemnosci = t.sale.map((id) => i.sale.get(id)!.pojemnosc ?? 0);
      expect(pojemnosci).toEqual([...pojemnosci].sort((a, b) => a - b));
    });

    it("has no free time when the weeks are wrong", () => {
      expect(wolneTerminy(i, "Z001", [1]).every((t) => !t.terminWolny && t.sale.length === 0)).toBe(true);
    });

    it("returns nothing for an unknown class", () => {
      expect(wolneTerminy(i, "brak", [1])).toEqual([]);
    });
  });
});
