import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIMIT_DOMYSLNY, LIMIT_MAX, LIMIT_MIN, WAGI, WAGA_MAX, odczytajFormularz } from "./generator";

function formularz(wartosci: Record<string, string>): FormData {
  const fd = new FormData();
  fd.set("limit_czasu", String(LIMIT_DOMYSLNY));
  for (const w of WAGI) fd.set(`waga_${w.klucz}`, String(w.domyslna));
  for (const [k, v] of Object.entries(wartosci)) fd.set(k, v);
  return fd;
}

describe("WAGI", () => {
  it("odpowiadają wagom w solver/weights.py (nazwy i wartości domyślne)", () => {
    const zrodlo = readFileSync("solver/weights.py", "utf8");
    const wPythonie = Object.fromEntries(
      [...zrodlo.matchAll(/^\s+"(\w+)":\s*(\d+),/gm)].map(([, nazwa, wartosc]) => [nazwa, Number(wartosc)]),
    );
    expect(Object.fromEntries(WAGI.map((w) => [w.klucz, w.domyslna]))).toEqual(wPythonie);
  });
});

describe("limity czasu", () => {
  it("odpowiadają limitom workera (solver/worker.py)", () => {
    const zrodlo = readFileSync("solver/worker.py", "utf8");
    const stala = (nazwa: string) => Number(zrodlo.match(new RegExp(`${nazwa} = ([0-9.]+)`))?.[1]);
    expect([LIMIT_MIN, LIMIT_DOMYSLNY, LIMIT_MAX]).toEqual([
      stala("MINIMALNY_LIMIT_CZASU"),
      stala("DOMYSLNY_LIMIT_CZASU"),
      stala("MAKSYMALNY_LIMIT_CZASU"),
    ]);
  });
});

describe("odczytajFormularz", () => {
  it("domyślny formularz daje domyślny limit i brak zmienionych wag", () => {
    expect(odczytajFormularz(formularz({}))).toEqual({
      ok: true,
      parametry: { limit_czasu: LIMIT_DOMYSLNY, wagi: {} },
    });
  });

  it("wysyła tylko wagi różne od domyślnych", () => {
    const wynik = odczytajFormularz(formularz({ limit_czasu: "300", waga_poza_godzinami: "7", waga_okienka_studentow: "0" }));
    expect(wynik).toEqual({
      ok: true,
      parametry: { limit_czasu: 300, wagi: { poza_godzinami: 7, okienka_studentow: 0 } },
    });
  });

  it.each([String(LIMIT_MIN - 1), String(LIMIT_MAX + 1), "", "abc", "250.5", "-300"])("odrzuca limit %j", (limit) => {
    const wynik = odczytajFormularz(formularz({ limit_czasu: limit }));
    expect(wynik.ok).toBe(false);
    if (!wynik.ok) expect(wynik.bledy.limit).toBeTruthy();
  });

  it.each([String(LIMIT_MIN), String(LIMIT_MAX)])("przyjmuje granicę %s", (limit) => {
    expect(odczytajFormularz(formularz({ limit_czasu: limit })).ok).toBe(true);
  });

  it.each(["-1", "1.5", "abc", "", String(WAGA_MAX + 1)])("odrzuca wagę %j z komunikatem przy właściwym polu", (waga) => {
    const wynik = odczytajFormularz(formularz({ waga_poza_godzinami: waga }));
    expect(wynik.ok).toBe(false);
    if (!wynik.ok) expect(Object.keys(wynik.bledy.wagi)).toEqual(["poza_godzinami"]);
  });
});
