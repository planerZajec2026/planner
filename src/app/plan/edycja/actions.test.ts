import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WynikKontekstu } from "@/lib/data/plan-edycja";
import { przygotuj, wolneTerminy, type Cel, type KontekstEdycji } from "@/lib/plan-edycja";
import { JOB_ID, kontekstTestowy, ocenaTestowa } from "@/test/kontekst-planu";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  admin: vi.fn(),
  kontekst: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));
vi.mock("@/lib/data/plan-edycja", () => ({ getKontekstEdycji: mocks.kontekst }));

import { zapiszPrzydzial, type StanEdycji } from "./actions";

const POCZATEK: StanEdycji = { status: "poczatek" };

let k: KontekstEdycji;

const obecny = (id: string) => k.plan.find((p) => p.zajeciaId === id)!;

/** The first time other than the current one at which the class can be held, with a free room. */
function wolnyCel(id: string): Cel {
  const p = obecny(id);
  const t = wolneTerminy(przygotuj(k), id, p.tygodnie).find((x) => x.sale.length > 0 && (x.dzien !== p.dzien || x.slot !== p.slot))!;
  return { dzien: t.dzien, slot: t.slot, sala: t.sale[0], tygodnie: p.tygodnie };
}

function formularz(id: string, cel: Cel, inne: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("job", JOB_ID);
  fd.set("wersja", "0");
  fd.set("zajecia", id);
  fd.set("dzien", String(cel.dzien));
  fd.set("slot", String(cel.slot));
  fd.set("sala", cel.sala);
  fd.set("tygodnie", cel.tygodnie.join(","));
  for (const [pole, v] of Object.entries(inne)) fd.set(pole, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  k = kontekstTestowy();
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.admin.mockReturnValue({ rpc: mocks.rpc });
  mocks.kontekst.mockImplementation(async (): Promise<WynikKontekstu> => ({ status: "ok", kontekst: k, ocena: ocenaTestowa() }));
});

describe("zapiszPrzydzial", () => {
  it("zapisuje poprawną zmianę i odświeża wszystkie strony", async () => {
    const cel = wolnyCel("Z002");
    const stan = await zapiszPrzydzial(POCZATEK, formularz("Z002", cel));

    expect(stan).toMatchObject({ status: "zapisano", komunikat: expect.stringContaining(`sala ${cel.sala}`) });
    expect(mocks.kontekst).toHaveBeenCalledWith(expect.anything(), "Z002");
    expect(mocks.rpc).toHaveBeenCalledWith("zapisz_przydzialy", {
      p_job_id: JOB_ID,
      p_wersja: 0,
      p_przydzialy: [{ zajecia_id: "Z002", dzien: cel.dzien, slot: cel.slot, sala_id: cel.sala, tygodnie: cel.tygodnie }],
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("przenosi razem zajęcia powiązane tym samym terminem, każde ze swoimi tygodniami", async () => {
    const cel = wolnyCel("Z037");
    const stan = await zapiszPrzydzial(POCZATEK, formularz("Z037", cel));

    expect(stan).toMatchObject({ status: "zapisano", komunikat: expect.stringContaining("Z038") });
    const { p_przydzialy } = mocks.rpc.mock.calls[0][1];
    expect(p_przydzialy).toEqual([
      { zajecia_id: "Z037", dzien: cel.dzien, slot: cel.slot, sala_id: cel.sala, tygodnie: obecny("Z037").tygodnie },
      { zajecia_id: "Z038", dzien: cel.dzien, slot: cel.slot, sala_id: cel.sala, tygodnie: obecny("Z038").tygodnie },
    ]);
  });

  it("zapisuje tylko to, co się zmieniło: sama zmiana tygodni nie rusza zajęć powiązanych", async () => {
    // Z105 has chosen weeks; swap one of them for a free week of its range, if there is one.
    const z = k.zajecia.Z105;
    const p = obecny("Z105");
    const wolne = [];
    for (let t = z.tydzienOd; t <= z.tydzienDo; t++) if (!p.tygodnie.includes(t) && !z.tygodnieNiedostepne.includes(t)) wolne.push(t);
    const kandydaci = wolne.map((t) => [...p.tygodnie.slice(1), t].sort((a, b) => a - b));
    const i = przygotuj(k);
    const tygodnie = kandydaci.find((kand) =>
      wolneTerminy(i, "Z105", kand).some((x) => x.dzien === p.dzien && x.slot === p.slot && x.sale.includes(p.sala)),
    );
    expect(tygodnie, "the fixture should leave Z105 a free week in its own room").toBeDefined();

    const stan = await zapiszPrzydzial(POCZATEK, formularz("Z105", { ...p, tygodnie: tygodnie! }));

    expect(stan.status).toBe("zapisano");
    expect(mocks.rpc.mock.calls[0][1].p_przydzialy).toEqual([
      { zajecia_id: "Z105", dzien: p.dzien, slot: p.slot, sala_id: p.sala, tygodnie },
    ]);
  });

  it("odrzuca zmianę łamiącą ograniczenie twarde i nazywa konflikt", async () => {
    // Z001 is taught by a member of the Faculty Council, which meets on Tuesday in slots 9–10.
    const stan = await zapiszPrzydzial(POCZATEK, formularz("Z001", { ...obecny("Z001"), dzien: 2, slot: 9 }));

    expect(stan.status).toBe("blad");
    if (stan.status !== "blad") return;
    expect(stan.naruszenia?.map((n) => n.ograniczenie)).toContain(8);
    expect(stan.naruszenia?.find((n) => n.ograniczenie === 8)?.opis).toContain("Rada Wydziału");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("odrzuca salę zajętą przez inne zajęcia", async () => {
    const cel = { ...obecny("Z002"), ...{ dzien: obecny("Z001").dzien, slot: obecny("Z001").slot, sala: obecny("Z001").sala } };
    const stan = await zapiszPrzydzial(POCZATEK, formularz("Z002", cel));

    expect(stan).toMatchObject({ status: "blad" });
    if (stan.status !== "blad") return;
    expect(stan.naruszenia?.map((n) => n.ograniczenie)).toContain(4);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("nie zapisuje terminu takiego samego jak obecny", async () => {
    const stan = await zapiszPrzydzial(POCZATEK, formularz("Z002", obecny("Z002")));

    expect(stan).toMatchObject({ status: "blad", komunikat: expect.stringContaining("taki sam") });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("odrzuca formularz wczytany przed inną zmianą planu", async () => {
    k.wersja = 3;
    const stan = await zapiszPrzydzial(POCZATEK, formularz("Z002", wolnyCel("Z002")));

    expect(stan).toMatchObject({ status: "blad", komunikat: expect.stringContaining("Plan został w międzyczasie zmieniony") });
    expect(mocks.rpc).not.toHaveBeenCalled();
    // The form gets fresh data, so the next attempt is checked against the current plan.
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("odrzuca formularz innego planu niż aktywny", async () => {
    const stan = await zapiszPrzydzial(
      POCZATEK,
      formularz("Z002", wolnyCel("Z002"), { job: "11111111-1111-1111-1111-111111111111" }),
    );

    expect(stan).toMatchObject({ status: "blad", komunikat: expect.stringContaining("nowy plan") });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("zgłasza nieaktualny plan, gdy baza odmówi zapisu (ktoś zapisał zmianę w tej samej chwili)", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const stan = await zapiszPrzydzial(POCZATEK, formularz("Z002", wolnyCel("Z002")));

    expect(stan).toMatchObject({ status: "blad", komunikat: expect.stringContaining("Plan został w międzyczasie zmieniony") });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("zgłasza błąd zapisu bez szczegółów z bazy", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "relation plan_zajec is on fire" } });
    const stan = await zapiszPrzydzial(POCZATEK, formularz("Z002", wolnyCel("Z002")));

    expect(stan).toEqual({ status: "blad", komunikat: "Nie udało się zapisać zmiany. Spróbuj ponownie." });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["bez zajęć", { zajecia: "" }],
    ["z wersją, która nie jest liczbą", { wersja: "x" }],
    ["z dniem, który nie jest liczbą", { dzien: "wtorek" }],
    ["z tygodniami, które nie są liczbami", { tygodnie: "1,dwa" }],
    ["z identyfikatorem planu, który nie jest uuid", { job: "plan" }],
  ])("odrzuca formularz %s bez dotykania bazy", async (_opis, pola) => {
    const stan = await zapiszPrzydzial(POCZATEK, formularz("Z002", obecny("Z002"), pola));

    expect(stan).toMatchObject({ status: "blad", komunikat: expect.stringContaining("niekompletny") });
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.kontekst).not.toHaveBeenCalled();
  });

  it("sprawdza dane z bazy, nie z formularza: nieznana sala i dzień spoza tygodnia są konfliktem", async () => {
    const stan = await zapiszPrzydzial(POCZATEK, formularz("Z002", { ...obecny("Z002"), dzien: 7, sala: "NIE-MA" }));

    expect(stan.status).toBe("blad");
    if (stan.status !== "blad") return;
    expect(stan.naruszenia?.map((n) => n.ograniczenie)).toEqual([1]);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("mówi, że zajęć nie ma w planie", async () => {
    mocks.kontekst.mockResolvedValue({ status: "brak-zajec" } satisfies WynikKontekstu);
    const stan = await zapiszPrzydzial(POCZATEK, formularz("Z999", obecny("Z002")));

    expect(stan).toMatchObject({ status: "blad", komunikat: expect.stringContaining("Z999") });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("mówi, że nie ma planu", async () => {
    mocks.kontekst.mockResolvedValue({ status: "brak-planu" } satisfies WynikKontekstu);
    const stan = await zapiszPrzydzial(POCZATEK, formularz("Z002", obecny("Z002")));

    expect(stan).toEqual({ status: "blad", komunikat: "Nie ma wygenerowanego planu." });
  });

  it("zgłasza brak konfiguracji serwera zamiast wyjątku", async () => {
    mocks.admin.mockImplementation(() => {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    });
    const stan = await zapiszPrzydzial(POCZATEK, formularz("Z002", wolnyCel("Z002")));

    expect(stan).toMatchObject({ status: "blad", komunikat: expect.stringContaining("Serwer nie ma skonfigurowanego dostępu") });
  });

  it("zgłasza błąd wczytywania planu zamiast wyjątku", async () => {
    mocks.kontekst.mockRejectedValue(new Error("Nie udało się pobrać planu: timeout"));
    const stan = await zapiszPrzydzial(POCZATEK, formularz("Z002", wolnyCel("Z002")));

    expect(stan).toEqual({ status: "blad", komunikat: "Nie udało się wczytać planu. Spróbuj ponownie." });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
