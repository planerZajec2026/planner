import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  admin: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));

import { wgrajDane, type StanImportu } from "./actions";

const POCZATEK: StanImportu = { status: "poczatek" };
const json = readFileSync("requirements/dane_planu.json", "utf8");
const xlsx = readFileSync("requirements/dane_planu.xlsx");

function formularz(plik?: File, potwierdzenie: string | null = "tak"): FormData {
  const fd = new FormData();
  if (plik) fd.set("plik", plik);
  if (potwierdzenie) fd.set("potwierdzenie", potwierdzenie);
  return fd;
}

const plikJson = (tekst = json, nazwa = "dane_planu.json") => new File([tekst], nazwa, { type: "application/json" });
const plikXlsx = () => new File([new Uint8Array(xlsx)], "dane_planu.xlsx");

const PODSUMOWANIE = { zajecia: 174, sale: 55, prowadzacy: 50, grupy: 51, roczniki: 6, studenci: 372 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: PODSUMOWANIE, error: null });
  mocks.admin.mockReturnValue({ rpc: mocks.rpc });
});

describe("wgrajDane", () => {
  it("wgrywa poprawny plik JSON przez funkcję bazy i zwraca podsumowanie", async () => {
    const stan = await wgrajDane(POCZATEK, formularz(plikJson()));

    expect(stan).toEqual({ status: "wgrano", podsumowanie: PODSUMOWANIE });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    const [nazwa, argumenty] = mocks.rpc.mock.calls[0];
    expect(nazwa).toBe("wgraj_dane_planu");
    expect(argumenty.payload.zajecia).toHaveLength(174);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("plik xlsx daje do bazy te same dane co JSON", async () => {
    await wgrajDane(POCZATEK, formularz(plikXlsx()));
    const zXlsx = mocks.rpc.mock.calls[0][1].payload;

    mocks.rpc.mockClear();
    await wgrajDane(POCZATEK, formularz(plikJson()));
    expect(zXlsx).toEqual(mocks.rpc.mock.calls[0][1].payload);
  });

  it("wymaga potwierdzenia i nie dotyka bazy bez niego", async () => {
    const stan = await wgrajDane(POCZATEK, formularz(plikJson(), null));

    expect(stan).toMatchObject({ status: "blad", komunikat: expect.stringContaining("Potwierdź") });
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("odrzuca brak pliku, zły typ i zbyt duży plik", async () => {
    expect(await wgrajDane(POCZATEK, formularz())).toMatchObject({ status: "blad", komunikat: "Wybierz plik z danymi." });
    expect(await wgrajDane(POCZATEK, formularz(plikJson(json, "dane.csv")))).toMatchObject({
      status: "blad",
      komunikat: "Wybierz plik .xlsx albo .json.",
    });
    const duzy = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "dane.json");
    expect(await wgrajDane(POCZATEK, formularz(duzy))).toMatchObject({ status: "blad", komunikat: expect.stringContaining("za duży") });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("pokazuje błędy w pliku i niczego nie wgrywa", async () => {
    const dane = JSON.parse(json);
    delete dane.sale;
    dane.zajecia[0].prowadzacy = ["P999"];
    const stan = await wgrajDane(POCZATEK, formularz(plikJson(JSON.stringify(dane))));

    expect(stan).toMatchObject({ status: "blad", komunikat: expect.stringContaining("Nic nie zostało wgrane") });
    expect(stan.status === "blad" && stan.szczegoly).toContain("Brakuje tabeli „sale”.");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("nie przyjmuje pliku, który nie jest JSON-em", async () => {
    const stan = await wgrajDane(POCZATEK, formularz(plikJson("{to nie json")));
    expect(stan).toMatchObject({ status: "blad", szczegoly: ["Plik nie jest poprawnym JSON-em."] });
  });

  it("przekazuje odmowę bazy i nie odświeża stron", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'violates foreign key constraint "x"' } });
    const stan = await wgrajDane(POCZATEK, formularz(plikJson()));

    expect(stan).toMatchObject({ status: "blad", komunikat: expect.stringContaining("Nic nie zostało zmienione") });
    expect(stan.status === "blad" && stan.szczegoly?.[0]).toContain("foreign key");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("mówi o braku konfiguracji, gdy serwer nie ma klucza do zapisu", async () => {
    mocks.admin.mockImplementation(() => {
      throw new Error("Brak SUPABASE_SERVICE_ROLE_KEY");
    });
    const stan = await wgrajDane(POCZATEK, formularz(plikJson()));

    expect(stan).toMatchObject({ status: "blad", komunikat: expect.stringContaining("skonfigurowanego") });
    expect(JSON.stringify(stan)).not.toContain("SERVICE_ROLE");
  });
});
