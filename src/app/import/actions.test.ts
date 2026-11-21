import { beforeEach, describe, expect, it, vi } from "vitest";
import { FRAZA_POTWIERDZENIA, type StanCzyszczenia } from "@/lib/czyszczenie-bazy";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), admin: vi.fn(), revalidatePath: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));

import { wyczyscBaze } from "./actions";

const POCZATEK: StanCzyszczenia = { status: "poczatek" };
const USUNIETO = { zajecia: 174, grupy: 51, sale: 55, prowadzacy: 50, plany: 2 };

function formularz(potwierdzenie?: string): FormData {
  const fd = new FormData();
  if (potwierdzenie !== undefined) fd.set("potwierdzenie", potwierdzenie);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: USUNIETO, error: null });
  mocks.admin.mockReturnValue({ rpc: mocks.rpc });
});

describe("wyczyscBaze", () => {
  it("czyści bazę po wpisaniu frazy i odświeża wszystkie strony", async () => {
    const wynik = await wyczyscBaze(POCZATEK, formularz(FRAZA_POTWIERDZENIA));

    expect(mocks.rpc).toHaveBeenCalledWith("wyczysc_dane_planu");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(wynik).toEqual({ status: "wyczyszczono", usunieto: USUNIETO });
  });

  it.each([undefined, "", "Wyczyść bazę danych", "tak"])("bez dokładnej frazy (%s) niczego nie usuwa", async (wpisane) => {
    const wynik = await wyczyscBaze(POCZATEK, formularz(wpisane));

    expect(wynik.status).toBe("blad");
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("zgłasza błąd bazy i nie odświeża stron", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "permission denied" } });
    const wynik = await wyczyscBaze(POCZATEK, formularz(FRAZA_POTWIERDZENIA));

    expect(wynik).toMatchObject({ status: "blad", komunikat: expect.stringContaining("Nic nie zostało usunięte") });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("bez klucza serwera mówi, że nie ma dostępu do zapisu", async () => {
    mocks.admin.mockImplementation(() => {
      throw new Error("brak SUPABASE_SERVICE_ROLE_KEY");
    });
    const wynik = await wyczyscBaze(POCZATEK, formularz(FRAZA_POTWIERDZENIA));
    expect(wynik).toMatchObject({ status: "blad", komunikat: expect.stringContaining("dostępu do zapisu") });
  });
});
