import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIMIT_DOMYSLNY, MAKS_OCZEKUJACYCH, WAGI } from "@/lib/generator";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  oczekujace: { count: 0 as number | null, error: null as { message: string } | null },
  admin: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));

import { zlecGenerowanie, type StanFormularza } from "./actions";

const POCZATEK: StanFormularza = { status: "poczatek" };

function formularz(wartosci: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("limit_czasu", String(LIMIT_DOMYSLNY));
  for (const w of WAGI) fd.set(`waga_${w.klucz}`, String(w.domyslna));
  for (const [k, v] of Object.entries(wartosci)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.oczekujace.count = 0;
  mocks.oczekujace.error = null;
  mocks.insert.mockResolvedValue({ error: null });
  mocks.admin.mockReturnValue({
    from: () => ({
      select: () => ({ in: () => Promise.resolve({ ...mocks.oczekujace }) }),
      insert: mocks.insert,
    }),
  });
});

describe("zlecGenerowanie", () => {
  it("dodaje zadanie z parametrami z formularza i odświeża stronę", async () => {
    const stan = await zlecGenerowanie(POCZATEK, formularz({ limit_czasu: "300", waga_poza_godzinami: "9" }));

    expect(stan.status).toBe("zlecone");
    expect(mocks.insert).toHaveBeenCalledWith({ parametry: { limit_czasu: 300, wagi: { poza_godzinami: 9 } } });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/generator");
  });

  it("odrzuca błędny formularz bez dotykania bazy", async () => {
    const stan = await zlecGenerowanie(POCZATEK, formularz({ limit_czasu: "10" }));

    expect(stan).toMatchObject({ status: "blad", bledy: { limit: expect.any(String) } });
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("nie zleca, gdy w kolejce jest już za dużo zadań", async () => {
    mocks.oczekujace.count = MAKS_OCZEKUJACYCH;
    const stan = await zlecGenerowanie(POCZATEK, formularz());

    expect(stan).toMatchObject({ status: "blad", komunikat: expect.stringContaining(String(MAKS_OCZEKUJACYCH)) });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("zleca, gdy w kolejce jest o jedno zadanie mniej niż limit", async () => {
    mocks.oczekujace.count = MAKS_OCZEKUJACYCH - 1;
    expect((await zlecGenerowanie(POCZATEK, formularz())).status).toBe("zlecone");
  });

  it("mówi o braku konfiguracji, gdy serwer nie ma klucza do zapisu", async () => {
    mocks.admin.mockImplementation(() => {
      throw new Error("Brak SUPABASE_SERVICE_ROLE_KEY");
    });
    const stan = await zlecGenerowanie(POCZATEK, formularz());

    expect(stan).toMatchObject({ status: "blad", komunikat: expect.stringContaining("skonfigurowanego") });
    expect(JSON.stringify(stan)).not.toContain("SERVICE_ROLE");
  });

  it("zgłasza błąd bazy przy liczeniu kolejki i przy zapisie", async () => {
    mocks.oczekujace.error = { message: "boom" };
    expect((await zlecGenerowanie(POCZATEK, formularz())).status).toBe("blad");

    mocks.oczekujace.error = null;
    mocks.insert.mockResolvedValue({ error: { message: "boom" } });
    const stan = await zlecGenerowanie(POCZATEK, formularz());
    expect(stan).toMatchObject({ status: "blad", komunikat: expect.any(String) });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
