import { describe, expect, it } from "vitest";
import {
  dataDnia,
  doEksportu,
  doEventow,
  filtruj,
  formaNaTyp,
  koniecSlotu,
  lancuchGrup,
  spotkaniaDoEventow,
  spotkaniaWTygodniu,
  odczytajDzien,
  odczytajFiltry,
  odczytajTydzien,
  opisTygodni,
  nazwaPliku,
  doJson,
  wierszZBazy,
  zapytanie,
  podpisDnia,
  poczatekSlotu,
  sortujWgCzasu,
  wTygodniu,
  type KalendarzDzien,
  type PlanWiersz,
} from "./plan";

const wiersz = (nadpisz: Partial<PlanWiersz> = {}): PlanWiersz => ({
  zajeciaId: "Z001",
  przedmiot: "Analiza matematyczna I",
  forma: "W",
  rocznikId: "INF1-R1",
  grupy: ["INF1-R1-ALL"],
  prowadzacy: ["P39"],
  dzien: 1,
  slotOd: 3,
  slotDo: 4,
  sala: "A281",
  tygodnie: Array.from({ length: 14 }, (_, i) => i + 1),
  czestotliwosc: "co_tydzien",
  ...nadpisz,
});

describe("sloty", () => {
  it.each([
    [1, "08:15", "09:00"],
    [2, "09:15", "10:00"],
    [3, "10:15", "11:00"],
    [12, "19:15", "20:00"],
  ])("slot %i trwa %s–%s", (slot, od, koniec) => {
    expect(poczatekSlotu(slot)).toBe(od);
    expect(koniecSlotu(slot)).toBe(koniec);
  });
});

describe("formaNaTyp", () => {
  it.each([
    ["W", "wyklad"],
    ["K", "cwiczenia"],
    ["LEK", "cwiczenia"],
    ["LI", "laboratorium"],
    ["P", "laboratorium"],
    ["SEM", "seminarium"],
  ] as const)("%s → %s", (forma, typ) => expect(formaNaTyp(forma)).toBe(typ));
});

describe("opisTygodni", () => {
  it("co tydzień przez cały semestr", () => expect(opisTygodni(wiersz())).toBe("co tydzień"));

  it("co tydzień od tygodnia 6", () => {
    const w = wiersz({ tygodnie: [6, 7, 8, 9, 10, 11, 12, 13, 14] });
    expect(opisTygodni(w)).toBe("co tydzień, tyg. 6–14");
  });

  it("co 2 tygodnie rozpoznaje parzystość", () => {
    expect(opisTygodni(wiersz({ czestotliwosc: "co_2_tygodnie", tygodnie: [1, 3, 5, 7, 9, 11, 13] }))).toBe(
      "co 2 tygodnie, nieparzyste (1, 3, 5, 7, 9, 11, 13)",
    );
    expect(opisTygodni(wiersz({ czestotliwosc: "co_2_tygodnie", tygodnie: [2, 4] }))).toContain("parzyste");
  });

  it("wybrane tygodnie wymienia je po kolei", () => {
    expect(opisTygodni(wiersz({ czestotliwosc: "wybrane_tygodnie", tygodnie: [11, 2, 5] }))).toBe(
      "wybrane tygodnie: 2, 5, 11",
    );
  });
});

describe("filtruj", () => {
  const wiersze = [
    wiersz({ zajeciaId: "Z1" }),
    wiersz({ zajeciaId: "Z2", grupy: ["INF1-R1-G1"], prowadzacy: ["P31"], sala: "A225", dzien: 3, tygodnie: [6, 7] }),
    wiersz({ zajeciaId: "Z3", rocznikId: "INF2-R1", grupy: ["INF2-R1-ALL"], prowadzacy: ["P39", "P40"] }),
  ];
  const ids = (f: Parameters<typeof filtruj>[1]) => filtruj(wiersze, f).map((w) => w.zajeciaId);

  it("bez filtrów zwraca wszystko", () => expect(ids({})).toEqual(["Z1", "Z2", "Z3"]));
  it("po grupie", () => expect(ids({ grupa: "INF1-R1-G1" })).toEqual(["Z2"]));
  it("po prowadzącym także wśród kilku", () => expect(ids({ prowadzacy: "P40" })).toEqual(["Z3"]));
  it("po sali i dniu", () => {
    expect(ids({ sala: "A225" })).toEqual(["Z2"]);
    expect(ids({ dzien: 3 })).toEqual(["Z2"]);
  });
  it("po roczniku", () => expect(ids({ rocznik: "INF2-R1" })).toEqual(["Z3"]));
  it("po tygodniu", () => expect(ids({ tydzien: 7 })).toEqual(["Z1", "Z2", "Z3"]));
  it("filtry łączą się", () => expect(ids({ tydzien: 7, dzien: 1 })).toEqual(["Z1", "Z3"]));
  it("wTygodniu pomija zajęcia spoza tygodnia", () => {
    expect(wTygodniu(wiersze, 1).map((w) => w.zajeciaId)).toEqual(["Z1", "Z3"]);
  });
});

describe("sortujWgCzasu", () => {
  it("porządkuje po dniu, starcie, sali i id, bez zmiany wejścia", () => {
    const wejscie = [
      wiersz({ zajeciaId: "Z3", dzien: 2, slotOd: 1 }),
      wiersz({ zajeciaId: "Z2", dzien: 1, slotOd: 5, sala: "B1" }),
      wiersz({ zajeciaId: "Z1", dzien: 1, slotOd: 5, sala: "A1" }),
    ];
    expect(sortujWgCzasu(wejscie).map((w) => w.zajeciaId)).toEqual(["Z1", "Z2", "Z3"]);
    expect(wejscie.map((w) => w.zajeciaId)).toEqual(["Z3", "Z2", "Z1"]);
  });
});

describe("kalendarz tygodni planu", () => {
  const kalendarz: KalendarzDzien[] = [
    { data: "2027-01-06", planDnia: 3, nrTygodnia: 10 },
    { data: "2027-01-08", planDnia: 3, nrTygodnia: 11 },
    { data: "2027-01-26", planDnia: 3, nrTygodnia: 14 },
    { data: "2026-11-11", planDnia: null, nrTygodnia: null },
  ];

  it("środa tygodnia 11 to piątek 8 stycznia (dzień odpracowania)", () => {
    expect(dataDnia(kalendarz, 3, 11)).toBe("2027-01-08");
    expect(podpisDnia(kalendarz, 3, 11)).toBe("08.01");
  });

  it("środa tygodnia 14 to wtorek 26 stycznia", () => expect(dataDnia(kalendarz, 3, 14)).toBe("2027-01-26"));
  it("brak daty gdy dzień nie występuje", () => {
    expect(dataDnia(kalendarz, 1, 1)).toBeUndefined();
    expect(podpisDnia(kalendarz, 1, 1)).toBe("");
  });
});

describe("doEventow", () => {
  const etykiety = { grupy: { "INF1-R1-ALL": "INF1-R1 · Cały rocznik" }, prowadzacy: { P39: "dr P39" } };

  it("zamienia sloty na godziny i buduje opis", () => {
    const [e] = doEventow([wiersz()], etykiety);
    expect(e).toMatchObject({ id: "Z001", dzien: 1, od: "10:15", do: "12:00", typ: "wyklad", tytul: "Analiza matematyczna I" });
    expect(e.meta).toBe("INF1-R1 · Cały rocznik · A281 · dr P39");
  });

  it("używa identyfikatorów, gdy brakuje etykiet", () => {
    const [e] = doEventow([wiersz()], { grupy: {}, prowadzacy: {} });
    expect(e.meta).toBe("INF1-R1-ALL · A281 · P39");
  });
});

describe("doEksportu", () => {
  it("daje czytelne wartości i porządek wg czasu", () => {
    const wiersze = [wiersz({ zajeciaId: "Z2", dzien: 3 }), wiersz({ zajeciaId: "Z1", dzien: 1, slotOd: 1, slotDo: 2 })];
    const [pierwszy, drugi] = doEksportu(wiersze, { grupy: {}, prowadzacy: {} });
    expect(pierwszy).toMatchObject({ id: "Z1", dzien: "Poniedziałek", od: "08:15", do: "10:00", forma: "Wykład" });
    expect(drugi).toMatchObject({ id: "Z2", dzien: "Środa", tygodnie: "co tydzień" });
  });
});

describe("parametry w adresie", () => {
  it.each([
    ["1", 1],
    ["14", 14],
    ["0", undefined],
    ["15", undefined],
    ["2.5", undefined],
    ["abc", undefined],
    [undefined, undefined],
  ])("tydzień %j → %j", (wartosc, oczekiwany) => expect(odczytajTydzien(wartosc)).toBe(oczekiwany));

  it.each([
    ["1", 1],
    ["5", 5],
    ["6", undefined],
    ["0", undefined],
    [undefined, undefined],
  ])("dzień %j → %j", (wartosc, oczekiwany) => expect(odczytajDzien(wartosc)).toBe(oczekiwany));
});

describe("odczytajFiltry", () => {
  it("czyta pierwsze wartości i odrzuca niepoprawny dzień i tydzień", () => {
    expect(
      odczytajFiltry({ grupa: ["INF1-R1-G1", "x"], sala: "A281", dzien: "9", tydzien: "3", prowadzacy: "" }),
    ).toEqual({
      rocznik: undefined,
      grupa: "INF1-R1-G1",
      prowadzacy: undefined,
      sala: "A281",
      dzien: undefined,
      tydzien: 3,
    });
  });
});

describe("zapytanie", () => {
  it("pomija puste wartości i koduje znaki", () => {
    expect(zapytanie({ grupa: "INF1-R1-G1", sala: undefined, tydzien: 2, prowadzacy: "" })).toBe(
      "?grupa=INF1-R1-G1&tydzien=2",
    );
    expect(zapytanie({ sala: "B571/572" })).toBe("?sala=B571%2F572");
  });
  it("zwraca pusty napis bez parametrów", () => expect(zapytanie({})).toBe(""));
});

describe("nazwaPliku", () => {
  it("bez filtrów to plan całego semestru", () => expect(nazwaPliku({}, "xlsx")).toBe("plan-zajec.xlsx"));
  it("dopisuje filtry i zamienia niebezpieczne znaki", () => {
    expect(nazwaPliku({ grupa: "INF1-R1-G1", sala: "B571/572", tydzien: 4 }, "json")).toBe(
      "plan-zajec-grupa-INF1-R1-G1-sala-B571_572-tydzien-4.json",
    );
  });
});

describe("doJson", () => {
  it("zachowuje identyfikatory i liczby", () => {
    const [z] = doJson([wiersz()]);
    expect(z).toMatchObject({
      id: "Z001",
      grupy: ["INF1-R1-ALL"],
      prowadzacy: ["P39"],
      dzien: 1,
      slot_od: 3,
      slot_do: 4,
      od: "10:15",
      do: "12:00",
      czestotliwosc: "co_tydzien",
    });
    expect(z.tygodnie).toHaveLength(14);
  });
});

describe("wierszZBazy", () => {
  it("składa wiersz z zagnieżdżonej odpowiedzi i liczy koniec zajęć ze slotów", () => {
    const w = wierszZBazy({
      zajecia_id: "Z002",
      dzien: 4,
      slot: 5,
      sala_id: "A225",
      tygodnie: [8, 6, 7],
      zajecia_plan: {
        forma: "K",
        rocznik_id: "INF1-R1",
        sloty_na_spotkanie: 3,
        czestotliwosc: "co_tydzien",
        przedmioty_plan: { nazwa: "Analiza" },
        zajecia_plan_grupy: [{ grupa_id: "B" }, { grupa_id: "A" }],
        zajecia_plan_prowadzacy: [{ prowadzacy_id: "P2" }, { prowadzacy_id: "P1" }],
      },
    });
    expect(w).toMatchObject({ slotOd: 5, slotDo: 7, grupy: ["A", "B"], prowadzacy: ["P1", "P2"], tygodnie: [6, 7, 8] });
  });
});

describe("lancuchGrup", () => {
  const grupy = [
    { id: "ALL" },
    { id: "G1", nadrzednaId: "ALL" },
    { id: "SPEC-A", nadrzednaId: "ALL" },
    { id: "A1", nadrzednaId: "SPEC-A" },
  ];
  it("zwraca grupę i jej grupy nadrzędne od najbliższej", () => {
    expect(lancuchGrup(grupy, "A1")).toEqual(["A1", "SPEC-A", "ALL"]);
    expect(lancuchGrup(grupy, "G1")).toEqual(["G1", "ALL"]);
    expect(lancuchGrup(grupy, "ALL")).toEqual(["ALL"]);
  });
  it("nieznana grupa daje pusty łańcuch, a cykl nie zapętla", () => {
    expect(lancuchGrup(grupy, "nie ma")).toEqual([]);
    expect(lancuchGrup([{ id: "A", nadrzednaId: "B" }, { id: "B", nadrzednaId: "A" }], "A")).toEqual(["A", "B"]);
  });
});

describe("spotkaniaWTygodniu", () => {
  // Poniedziałek 4 I 2027 jest 12. wystąpieniem planu poniedziałku, środa 6 I to 10., a piątek 8 I to 11. środa.
  const kalendarz: KalendarzDzien[] = [
    { data: "2027-01-04", planDnia: 1, nrTygodnia: 12 },
    { data: "2027-01-05", planDnia: 2, nrTygodnia: 12 },
    { data: "2027-01-06", planDnia: null, nrTygodnia: null },
    { data: "2027-01-07", planDnia: 4, nrTygodnia: 12 },
    { data: "2027-01-08", planDnia: 3, nrTygodnia: 11 },
  ];
  const poniedzialek = new Date(2027, 0, 4);
  const srody = wiersz({ zajeciaId: "S", dzien: 3, tygodnie: [11] });
  const poniedzialki = wiersz({ zajeciaId: "P", dzien: 1, tygodnie: [12, 13] });

  it("umieszcza zajęcia w dniu kalendarza, nie w dniu planu (środa tygodnia 11 wypada w piątek)", () => {
    const wynik = spotkaniaWTygodniu([srody, poniedzialki], kalendarz, poniedzialek);
    expect(wynik.map((s) => [s.wiersz.zajeciaId, s.data, s.dzien])).toEqual([
      ["P", "2027-01-04", 1],
      ["S", "2027-01-08", 5],
    ]);
  });

  it("pomija dni wolne i zajęcia spoza tygodnia", () => {
    const innyTydzien = wiersz({ zajeciaId: "X", dzien: 1, tygodnie: [3] });
    expect(spotkaniaWTygodniu([innyTydzien], kalendarz, poniedzialek)).toEqual([]);
    expect(spotkaniaWTygodniu([srody], kalendarz, new Date(2026, 11, 28))).toEqual([]);
  });

  it("zamienia spotkania na wydarzenia z unikalnym id i podanym opisem", () => {
    const [e] = spotkaniaDoEventow(spotkaniaWTygodniu([srody], kalendarz, poniedzialek), { grupy: {}, prowadzacy: {} }, (w) => w.sala);
    expect(e).toMatchObject({ id: "S-2027-01-08", dzien: 5, od: "10:15", do: "12:00", tytul: "Analiza matematyczna I", meta: "A281" });
  });
});
