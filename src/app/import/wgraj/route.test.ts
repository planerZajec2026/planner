import { beforeEach, describe, expect, it, vi } from "vitest";

const wgraj = vi.hoisted(() => vi.fn());
// The loading itself is tested in src/lib/wgrywanie-danych.test.ts.
vi.mock("@/lib/wgrywanie-danych", () => ({ wgrajPlikDanych: wgraj }));

import { POST } from "./route";

function zadanie(naglowki: Record<string, string> = {}) {
  const dane = new FormData();
  dane.set("potwierdzenie", "tak");
  return new Request("http://localhost:3000/import/wgraj", {
    method: "POST",
    body: dane,
    headers: { host: "localhost:3000", origin: "http://localhost:3000", ...naglowki },
  });
}

const linie = async (r: Response) =>
  (await r.text())
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

beforeEach(() => {
  wgraj.mockReset();
});

describe("POST /import/wgraj", () => {
  it("streams each stage the loader reports, then the result", async () => {
    wgraj.mockImplementation(async (dane: FormData, zglos: (e: string) => void) => {
      expect(dane.get("potwierdzenie")).toBe("tak");
      zglos("sprawdzanie");
      zglos("zapis");
      return { status: "wgrano", podsumowanie: { zajecia: 174 } };
    });
    const odp = await POST(zadanie());

    expect(odp.status).toBe(200);
    expect(odp.headers.get("content-type")).toContain("application/x-ndjson");
    expect(odp.headers.get("cache-control")).toContain("no-transform");
    expect(await linie(odp)).toEqual([
      { etap: "sprawdzanie" },
      { etap: "zapis" },
      { wynik: { status: "wgrano", podsumowanie: { zajecia: 174 } } },
    ]);
  });

  it("ends with an error result when the loader throws", async () => {
    wgraj.mockRejectedValue(new Error("boom"));
    const wynik = (await linie(await POST(zadanie()))).at(-1);
    expect(wynik).toMatchObject({ wynik: { status: "blad", komunikat: expect.stringContaining("Nic nie zostało zmienione") } });
    expect(JSON.stringify(wynik)).not.toContain("boom");
  });

  it("refuses a post from another site", async () => {
    const odp = await POST(zadanie({ origin: "https://zly.example" }));
    expect(odp.status).toBe(403);
    expect(wgraj).not.toHaveBeenCalled();
  });
});
