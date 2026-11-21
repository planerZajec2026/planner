import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StanEdycji } from "@/app/plan/edycja/actions";
import { dzienLabel, poczatekSlotu } from "@/lib/plan";
import { przygotuj, wolneTerminy, type KontekstEdycji } from "@/lib/plan-edycja";
import { ocenaPlanu } from "@/lib/plan-problemy";
import { JOB_ID, kontekstTestowy, ocenaTestowa } from "@/test/kontekst-planu";

const zapisz = vi.hoisted(() => vi.fn());

// The real action imports the server-only admin client, which can't load outside the server.
vi.mock("@/app/plan/edycja/actions", () => ({ zapiszPrzydzial: zapisz }));

import { EdycjaForm } from "./EdycjaForm";

let k: KontekstEdycji;

beforeEach(() => {
  zapisz.mockReset();
  k = kontekstTestowy();
});

const obecny = (id: string) => k.plan.find((p) => p.zajeciaId === id)!;
const pokaz = (id: string) => render(<EdycjaForm kontekst={k} zajeciaId={id} powrot="/plan?sala=A281" />);
const zapiszBtn = () => screen.getByRole("button", { name: "Zapisz zmianę" });

/** The first free time other than the current one, as the grid shows it. */
function wolny(id: string) {
  const p = obecny(id);
  const t = wolneTerminy(przygotuj(k), id, p.tygodnie).find((x) => x.sale.length > 0 && (x.dzien !== p.dzien || x.slot !== p.slot))!;
  const nazwa = `${dzienLabel(t.dzien)} ${poczatekSlotu(t.slot)}: wolne sale: ${t.sale.length}`;
  return { t, nazwa, sala: t.sale.includes(p.sala) ? p.sala : t.sale[0] };
}

describe("EdycjaForm", () => {
  it("zaczyna od obecnego terminu i nie pozwala go zapisać bez zmiany", () => {
    pokaz("Z001");
    const p = obecny("Z001");

    expect(screen.getByLabelText("Dzień")).toHaveValue(String(p.dzien));
    expect(screen.getByLabelText("Początek")).toHaveValue(String(p.slot));
    expect(screen.getByLabelText("Sala")).toHaveValue(p.sala);
    expect(screen.getByText(/To obecny termin zajęć/)).toBeInTheDocument();
    expect(zapiszBtn()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Przywróć obecny termin" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Wróć do planu" })).toHaveAttribute("href", "/plan?sala=A281");
  });

  it("opisuje salę typem i pojemnością i proponuje tylko sale pasujące do zajęć", () => {
    pokaz("Z001");
    const opcje = within(screen.getByLabelText("Sala")).getAllByRole("option");

    expect(within(screen.getByLabelText("Sala")).getByRole("option", { name: /^A283 · aula · \d+ miejsc/ })).toBeInTheDocument();
    // Z001 needs 118 seats; most of the 55 rooms are too small.
    expect(opcje.length).toBeLessThan(k.sale.length);
    for (const o of opcje) {
      const sala = k.sale.find((s) => s.id === (o as HTMLOptionElement).value)!;
      expect(sala.pojemnosc ?? 0).toBeGreaterThanOrEqual(k.zajecia.Z001.miejsca);
    }
  });

  it("na żywo pokazuje konflikt wybranego terminu i blokuje zapis", async () => {
    pokaz("Z001");
    // The Faculty Council meets on Tuesday in slots 9–10 and the instructor of Z001 is a member.
    await userEvent.selectOptions(screen.getByLabelText("Dzień"), "2");
    await userEvent.selectOptions(screen.getByLabelText("Początek"), "9");

    expect(screen.getByText("Tego terminu nie da się zapisać")).toBeInTheDocument();
    expect(screen.getByText(/Rada Wydziału/)).toBeInTheDocument();
    expect(zapiszBtn()).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Przywróć obecny termin" }));
    expect(screen.getByLabelText("Dzień")).toHaveValue(String(obecny("Z001").dzien));
    expect(screen.queryByText("Tego terminu nie da się zapisać")).not.toBeInTheDocument();
  });

  it("kliknięcie wolnego terminu ustawia dzień, godzinę i wolną salę, a zapis wysyła je do akcji", async () => {
    zapisz.mockResolvedValue({ status: "zapisano", komunikat: "Zapisano zmianę." } satisfies StanEdycji);
    pokaz("Z002");
    const { t, nazwa, sala } = wolny("Z002");

    await userEvent.click(screen.getByRole("button", { name: nazwa }));

    expect(screen.getByRole("button", { name: nazwa })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Dzień")).toHaveValue(String(t.dzien));
    expect(screen.getByLabelText("Początek")).toHaveValue(String(t.slot));
    expect(screen.getByLabelText("Sala")).toHaveValue(sala);
    expect(screen.getByText(/nie łamie żadnych ograniczeń/)).toBeInTheDocument();
    expect(zapiszBtn()).toBeEnabled();

    await userEvent.click(zapiszBtn());

    await waitFor(() => expect(zapisz).toHaveBeenCalledTimes(1));
    const fd = zapisz.mock.calls[0][1] as FormData;
    expect(Object.fromEntries(fd)).toEqual({
      job: JOB_ID,
      wersja: "0",
      zajecia: "Z002",
      dzien: String(t.dzien),
      slot: String(t.slot),
      sala,
      tygodnie: obecny("Z002").tygodnie.join(","),
    });
    expect(await screen.findByText("Zapisano zmianę.")).toBeInTheDocument();
    // The selects keep the saved values (a form action would have reset them).
    expect(screen.getByLabelText("Dzień")).toHaveValue(String(t.dzien));
  });

  it("pokazuje konflikty zwrócone przez serwer i chowa je po zmianie wyboru", async () => {
    zapisz.mockResolvedValue({
      status: "blad",
      komunikat: "Tej zmiany nie da się zapisać, bo łamie ograniczenia planu.",
      naruszenia: [{ ograniczenie: 4, opis: "Sala B551 jest w tym czasie zajęta: ktoś był szybszy.", zajecia: ["Z002"] }],
    } satisfies StanEdycji);
    pokaz("Z002");
    const { t, nazwa } = wolny("Z002");
    await userEvent.click(screen.getByRole("button", { name: nazwa }));
    await userEvent.click(zapiszBtn());

    expect(await screen.findByText(/ktoś był szybszy/)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Dzień"), String(t.dzien === 1 ? 2 : 1));
    expect(screen.queryByText(/ktoś był szybszy/)).not.toBeInTheDocument();
  });

  it("mówi, które zajęcia przeniosą się razem", () => {
    pokaz("Z037");

    expect(screen.getByText(/przeniosą się zajęcia powiązane/)).toHaveTextContent("Z038");
  });

  it("mówi, w jakim dniu są zajęcia, które muszą być w innym dniu", async () => {
    pokaz("Z002");
    const partner = obecny("Z003");

    expect(screen.getByText(/Zajęcia powiązane muszą być w innym dniu/)).toHaveTextContent(`Z003), ${dzienLabel(partner.dzien).toLowerCase()}`);

    await userEvent.selectOptions(screen.getByLabelText("Dzień"), String(partner.dzien));
    expect(screen.getByText(/muszą być w różnych dniach/)).toBeInTheDocument();
    expect(zapiszBtn()).toBeDisabled();
  });

  it("zajęcia co tydzień nie mają wyboru tygodni", () => {
    pokaz("Z001");

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("Tych zajęć nie da się przenieść na inne tygodnie.")).toBeInTheDocument();
  });

  it("zajęcia co 2 tygodnie wybierają tygodnie parzyste albo nieparzyste", async () => {
    pokaz("Z056");
    const tygodnie = screen.getByLabelText("Tygodnie");
    const wybrane = (tygodnie as HTMLSelectElement).value;
    const inne = wybrane === "parzyste" ? "nieparzyste" : "parzyste";

    expect(within(tygodnie).getAllByRole("option")).toHaveLength(2);
    await userEvent.selectOptions(tygodnie, inne);
    expect(tygodnie).toHaveValue(inne);
    expect(screen.getByRole("button", { name: "Przywróć obecny termin" })).toBeEnabled();
  });

  it("wybrane tygodnie zaznacza się pojedynczo, a zła liczba tygodni blokuje zapis i siatkę", async () => {
    pokaz("Z105");
    const p = obecny("Z105");
    const z = k.zajecia.Z105;

    expect(screen.getByText(`Tygodnie: wybrano ${z.liczbaSpotkan} z ${z.liczbaSpotkan}`)).toBeInTheDocument();
    for (const t of p.tygodnie) expect(screen.getByRole("checkbox", { name: String(t) })).toBeChecked();

    await userEvent.click(screen.getByRole("checkbox", { name: String(p.tygodnie[0]) }));

    expect(screen.getByText(`Tygodnie: wybrano ${z.liczbaSpotkan - 1} z ${z.liczbaSpotkan}`)).toBeInTheDocument();
    expect(screen.getByText(/Najpierw wybierz poprawne tygodnie/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(zapiszBtn()).toBeDisabled();
  });

  describe("kara miękkich", () => {
    it("bez zmiany pokazuje karę planu teraz", () => {
      render(<EdycjaForm kontekst={k} ocena={ocenaTestowa()} zajeciaId="Z002" powrot="/plan" />);
      expect(screen.getByText(/Kara miękkich planu:/)).toHaveTextContent("Kara miękkich planu: 5088. Wybierz inny termin");
    });

    it("po wyborze terminu pokazuje karę po zmianie i różnicę", async () => {
      render(<EdycjaForm kontekst={k} ocena={ocenaTestowa()} zajeciaId="Z002" powrot="/plan" />);
      const { t, nazwa, sala } = wolny("Z002");
      await userEvent.click(screen.getByRole("button", { name: nazwa }));

      const po = ocenaPlanu(k, ocenaTestowa(), [{ ...obecny("Z002"), dzien: t.dzien, slot: t.slot, sala }]).wynik;
      const roznica = po - 5088;
      const panel = screen.getByText(/^Kara miękkich: 5088 →/).closest(".kara-zmiana")!;
      expect(panel).toHaveTextContent(`→ ${po.toLocaleString("pl-PL")}`);
      expect(panel).toHaveTextContent(
        roznica < 0 ? "Ta zmiana zmniejsza karę." : roznica > 0 ? "Ta zmiana zwiększa karę." : "Ta zmiana nie zmienia kary.",
      );
      expect(panel).toHaveClass("kara-zmiana", roznica < 0 ? "lepiej" : roznica > 0 ? "gorzej" : "kara-zmiana");
    });

    it("podaje karę po wygenerowaniu, gdy ręczne zmiany ją zmieniły", () => {
      render(<EdycjaForm kontekst={k} ocena={{ ...ocenaTestowa(), wynikPoGenerowaniu: 6000 }} zajeciaId="Z002" powrot="/plan" />);
      expect(screen.getByText(/Kara miękkich planu:/)).toHaveTextContent("5088 (po wygenerowaniu 6000)");
    });

    it("bez danych oceny nie pokazuje kary", () => {
      pokaz("Z002");
      expect(screen.queryByText(/Kara miękkich/)).toBeNull();
    });
  });

  it("siatka oznacza obecny termin i terminy zajęte", () => {
    pokaz("Z001");
    const p = obecny("Z001");

    expect(screen.getByRole("button", { name: new RegExp(`^${dzienLabel(p.dzien)} ${poczatekSlotu(p.slot)}: .*obecny termin$`) })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Tuesday 16:15 is the Faculty Council.
    expect(screen.getByRole("button", { name: "Wtorek 16:15: termin zajęty" })).toHaveTextContent("—");
  });
});
