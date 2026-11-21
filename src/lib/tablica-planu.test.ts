import { describe, expect, it } from "vitest";
import { przygotuj, wolneTerminy, type WolnyTermin } from "@/lib/plan-edycja";
import { kontekstTestowy, ocenaTestowa } from "@/test/kontekst-planu";
import {
  adresTablicy,
  formularzZapisu,
  komorkaPod,
  krotkieTygodnie,
  odczytajFiltr,
  opcjeFiltra,
  salaPoUpuszczeniu,
  stanKomorki,
  zajeciaWFiltrze,
} from "./tablica-planu";

const k = kontekstTestowy();
const { nadrzedne } = ocenaTestowa();
const opcje = opcjeFiltra(k, nadrzedne);

describe("filtr tablicy", () => {
  it("grupa pokazuje swoje zajęcia i zajęcia grup nadrzędnych (wykład rocznika)", () => {
    const ids = zajeciaWFiltrze(k, { rodzaj: "grupa", id: "INF1-R1-G1" }, nadrzedne).map((p) => p.zajeciaId);
    expect(ids).toContain("Z001"); // wykład dla INF1-R1-ALL
    expect(ids).toContain("Z002"); // ćwiczenia INF1-R1-G1
    expect(ids).not.toContain("Z004"); // ćwiczenia INF1-R1-G2
  });

  it("prowadzący i sala filtrują wprost, tydzień zostawia tylko zajęcia w tym tygodniu", () => {
    for (const p of zajeciaWFiltrze(k, { rodzaj: "prowadzacy", id: "P39" }, nadrzedne)) {
      expect(k.zajecia[p.zajeciaId].prowadzacy).toContain("P39");
    }
    for (const p of zajeciaWFiltrze(k, { rodzaj: "sala", id: "A283" }, nadrzedne)) expect(p.sala).toBe("A283");

    const wszystkie = zajeciaWFiltrze(k, { rodzaj: "grupa", id: "INF1-R1-G1" }, nadrzedne);
    const tydzien1 = zajeciaWFiltrze(k, { rodzaj: "grupa", id: "INF1-R1-G1", tydzien: 1 }, nadrzedne);
    expect(tydzien1.length).toBeLessThan(wszystkie.length); // ćwiczenia z analizy zaczynają się w tygodniu 6
    expect(tydzien1.every((p) => p.tygodnie.includes(1))).toBe(true);
  });

  it("czyta filtr z adresu, a bez niego bierze grupę zajęć z ?zajecia= albo pierwszą grupę", () => {
    expect(odczytajFiltr({ prowadzacy: "P39", tydzien: "3" }, opcje, k)).toEqual({ rodzaj: "prowadzacy", id: "P39", tydzien: 3 });
    expect(odczytajFiltr({ sala: "NIE-MA", grupa: "INF1-R1-G2" }, opcje, k)).toMatchObject({ rodzaj: "grupa", id: "INF1-R1-G2" });
    expect(odczytajFiltr({}, opcje, k, "Z004")).toMatchObject({ rodzaj: "grupa", id: "INF1-R1-G2" });
    expect(odczytajFiltr({}, opcje, k)).toMatchObject({ rodzaj: "grupa", id: opcje.grupa[0].value });
    expect(odczytajFiltr({ tydzien: "99" }, opcje, k)?.tydzien).toBeUndefined();
  });

  it("proponuje tylko grupy i prowadzących, którzy mają zajęcia", () => {
    expect(opcje.grupa.map((o) => o.value)).toContain("INF1-R1-G1");
    expect(opcje.prowadzacy.length).toBeGreaterThan(0);
    const prowadzacyZZajeciami = new Set(Object.values(k.zajecia).flatMap((z) => z.prowadzacy));
    expect(opcje.prowadzacy.every((o) => prowadzacyZZajeciami.has(o.value))).toBe(true);
  });

  it("buduje adres tablicy z filtrem, zaznaczonymi zajęciami i powrotem", () => {
    expect(adresTablicy({ rodzaj: "sala", id: "A283", tydzien: 2 }, { zajecia: "Z001", powrot: "generator" })).toBe(
      "/plan/edycja?sala=A283&tydzien=2&zajecia=Z001&powrot=generator",
    );
  });
});

describe("komorkaPod", () => {
  // 5 days × 12 slots of 100 × 40 px, starting at (100, 50).
  const obszar = { left: 100, top: 50, width: 500, height: 480 };

  it("zamienia punkt na dzień i slot", () => {
    expect(komorkaPod(100, 50, obszar, 0, 2)).toEqual({ dzien: 1, slot: 1 });
    expect(komorkaPod(599, 129, obszar, 0, 2)).toEqual({ dzien: 5, slot: 2 });
    expect(komorkaPod(350, 250, obszar, 0, 1)).toEqual({ dzien: 3, slot: 6 });
  });

  it("uwzględnia slot, za który chwycono zajęcia, i trzyma je w obrębie dnia", () => {
    expect(komorkaPod(350, 250, obszar, 1, 2)).toEqual({ dzien: 3, slot: 5 });
    expect(komorkaPod(350, 55, obszar, 1, 2)).toEqual({ dzien: 3, slot: 1 });
    expect(komorkaPod(350, 525, obszar, 0, 3)).toEqual({ dzien: 3, slot: 10 });
  });

  it("poza obszarem nie ma komórki", () => {
    expect(komorkaPod(99, 100, obszar, 0, 1)).toBeNull();
    expect(komorkaPod(300, 530, obszar, 0, 1)).toBeNull();
  });
});

describe("stany komórek i sala po upuszczeniu", () => {
  const t = (nadpisz: Partial<WolnyTermin>): WolnyTermin => ({ dzien: 1, slot: 1, terminWolny: true, sale: ["B471", "A283"], ...nadpisz });

  it("rozróżnia wolny termin, brak sali, konflikt i zajęcia, które się nie mieszczą", () => {
    expect(stanKomorki(t({}), 2)).toBe("wolny");
    expect(stanKomorki(t({ sale: [] }), 2)).toBe("bez-sali");
    expect(stanKomorki(t({ terminWolny: false, sale: [] }), 2)).toBe("konflikt");
    expect(stanKomorki(t({ slot: 12 }), 2)).toBe("poza");
    expect(stanKomorki(undefined, 2)).toBe("poza");
  });

  it("zgadza się z siatką wolnych terminów formularza", () => {
    const i = przygotuj(k);
    const p = k.plan.find((x) => x.zajeciaId === "Z002")!;
    const terminy = wolneTerminy(i, "Z002", p.tygodnie);
    const stany = terminy.map((x) => stanKomorki(x, k.zajecia.Z002.sloty));
    expect(stany).toContain("wolny");
    expect(stany).toContain("konflikt");
    expect(stany).toContain("poza"); // dwa sloty nie zaczną się w slocie 12
  });

  it("zostawia obecną salę, gdy jest wolna, a inaczej daje najmniejszą wolną", () => {
    expect(salaPoUpuszczeniu(t({}), "A283")).toBe("A283");
    expect(salaPoUpuszczeniu(t({}), "B551")).toBe("B471");
    expect(salaPoUpuszczeniu(t({ sale: [] }), "B551")).toBe("B551");
  });
});

it("krótki opis tygodni odróżnia zajęcia stojące obok siebie", () => {
  const wszystkie = Array.from({ length: 14 }, (_, i) => i + 1);
  expect(krotkieTygodnie({ tygodnie: wszystkie }, { czestotliwosc: "co_tydzien" })).toBe("");
  expect(krotkieTygodnie({ tygodnie: [6, 7, 8, 9, 10, 11, 12, 13, 14] }, { czestotliwosc: "co_tydzien" })).toBe("tyg. 6–14");
  expect(krotkieTygodnie({ tygodnie: [1, 3, 5, 7, 9, 11, 13] }, { czestotliwosc: "co_2_tygodnie" })).toBe("tyg. nieparzyste");
  expect(krotkieTygodnie({ tygodnie: [2, 4, 6] }, { czestotliwosc: "co_2_tygodnie" })).toBe("tyg. parzyste");
  expect(krotkieTygodnie({ tygodnie: [1, 4, 9] }, { czestotliwosc: "wybrane_tygodnie" })).toBe("3 wybranych tyg.");
});

it("formularzZapisu zawiera wszystko, co czyta akcja zapisu", () => {
  const fd = formularzZapisu(k, "Z002", { dzien: 2, slot: 3, sala: "B471", tygodnie: [6, 7, 8] });
  expect(Object.fromEntries(fd)).toEqual({ job: k.jobId, wersja: "0", zajecia: "Z002", dzien: "2", slot: "3", sala: "B471", tygodnie: "6,7,8" });
});
