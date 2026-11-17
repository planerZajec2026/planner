import { afterEach, describe, expect, it, vi } from "vitest";
import { ADRES_WGRYWANIA, rozmiarPliku, wyslijDane, type FazaWgrywania } from "./wgrywanie-klient";

/** Enough of XMLHttpRequest to replay an upload: the test drives the events by hand. */
class FalszywyXhr {
  static ostatni: FalszywyXhr;
  upload: { onprogress?: (e: { lengthComputable: boolean; loaded: number; total: number }) => void } = {};
  onprogress?: () => void;
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  status = 0;
  responseText = "";
  metoda = "";
  adres = "";
  wyslane: unknown;
  constructor() {
    FalszywyXhr.ostatni = this;
  }
  open(metoda: string, adres: string) {
    this.metoda = metoda;
    this.adres = adres;
  }
  send(body: unknown) {
    this.wyslane = body;
  }
  /** The server wrote more of the response. */
  dopisz(tekst: string) {
    this.responseText += tekst;
    this.onprogress?.();
  }
}

vi.stubGlobal("XMLHttpRequest", FalszywyXhr);
afterEach(() => vi.clearAllMocks());

describe("wyslijDane", () => {
  it("reports sent bytes, then each server stage, and resolves with the result line", async () => {
    const fazy: FazaWgrywania[] = [];
    const dane = new FormData();
    const obietnica = wyslijDane(dane, (f) => fazy.push(f));
    const xhr = FalszywyXhr.ostatni;
    expect(xhr.metoda).toBe("POST");
    expect(xhr.adres).toBe(ADRES_WGRYWANIA);
    expect(xhr.wyslane).toBe(dane);

    xhr.upload.onprogress!({ lengthComputable: true, loaded: 500, total: 2000 });
    xhr.upload.onprogress!({ lengthComputable: false, loaded: 900, total: 0 });
    xhr.status = 200;
    // A line can arrive in pieces; only whole lines count.
    xhr.dopisz('{"etap":"sprawdzanie"}\n{"etap":"za');
    xhr.dopisz('pis"}\n');
    xhr.dopisz('{"wynik":{"status":"wgrano","podsumowanie":{"zajecia":174}}}\n');
    xhr.onload!();

    expect(await obietnica).toEqual({ status: "wgrano", podsumowanie: { zajecia: 174 } });
    expect(fazy).toEqual([{ krok: "wysylanie", wyslano: 500, razem: 2000 }, { krok: "sprawdzanie" }, { krok: "zapis" }]);
  });

  it("turns transport failures into a message instead of throwing", async () => {
    let obietnica = wyslijDane(new FormData(), () => {});
    FalszywyXhr.ostatni.onerror!();
    expect(await obietnica).toMatchObject({ status: "blad", komunikat: expect.stringContaining("połączyć z serwerem") });

    obietnica = wyslijDane(new FormData(), () => {});
    FalszywyXhr.ostatni.status = 413;
    FalszywyXhr.ostatni.onload!();
    expect(await obietnica).toMatchObject({ status: "blad", komunikat: expect.stringContaining("za duży") });

    obietnica = wyslijDane(new FormData(), () => {});
    FalszywyXhr.ostatni.status = 403;
    FalszywyXhr.ostatni.onload!();
    expect(await obietnica).toMatchObject({ status: "blad", komunikat: expect.stringContaining("403") });

    // The stream ended after a stage but before the result.
    obietnica = wyslijDane(new FormData(), () => {});
    FalszywyXhr.ostatni.status = 200;
    FalszywyXhr.ostatni.dopisz('{"etap":"zapis"}\n');
    FalszywyXhr.ostatni.onload!();
    expect(await obietnica).toMatchObject({ status: "blad", komunikat: expect.stringContaining("bez wyniku") });
  });
});

describe("rozmiarPliku", () => {
  it("shows kilobytes below a megabyte and megabytes with one decimal above", () => {
    expect(rozmiarPliku(0)).toBe("0 KB");
    expect(rozmiarPliku(10)).toBe("1 KB");
    expect(rozmiarPliku(300 * 1024)).toBe("300 KB");
    expect(rozmiarPliku(1.25 * 1024 * 1024)).toBe("1,3 MB");
    expect(rozmiarPliku(4 * 1024 * 1024)).toBe("4 MB");
  });
});
