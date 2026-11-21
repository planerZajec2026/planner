import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { StanEdycji } from "@/app/plan/edycja/actions";
import { przygotuj, wolneTerminy, type KontekstEdycji } from "@/lib/plan-edycja";
import { salaPoUpuszczeniu } from "@/lib/tablica-planu";
import { JOB_ID, kontekstTestowy, ocenaTestowa } from "@/test/kontekst-planu";

const zapisz = vi.hoisted(() => vi.fn());

// The real action imports the server-only admin client, which can't load outside the server.
vi.mock("@/app/plan/edycja/actions", () => ({ zapiszPrzydzial: zapisz }));

import { PrzeniesienieDialog } from "./PrzeniesienieDialog";

// jsdom has <dialog> but not its modal API.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

let k: KontekstEdycji;
beforeEach(() => {
  zapisz.mockReset();
  k = kontekstTestowy();
});

/** The dialog for a drop of `id` on the first start the predicate picks from its free-time grid. */
function pokaz(id: string, wybierz: (t: ReturnType<typeof wolneTerminy>[number]) => boolean, zdarzenia = {}) {
  const i = przygotuj(k);
  const p = i.plan.get(id)!;
  const terminy = wolneTerminy(i, id, p.tygodnie);
  const t = terminy.find((x) => (x.dzien !== p.dzien || x.slot !== p.slot) && wybierz(x))!;
  const cel = { dzien: t.dzien, slot: t.slot, sala: salaPoUpuszczeniu(t, p.sala), tygodnie: p.tygodnie };
  const onZamknij = vi.fn();
  const onZapisano = vi.fn();
  render(
    <PrzeniesienieDialog
      kontekst={k}
      indeks={i}
      ocena={ocenaTestowa()}
      zajeciaId={id}
      cel={cel}
      terminy={terminy}
      onZamknij={onZamknij}
      onZapisano={onZapisano}
      {...zdarzenia}
    />,
  );
  return { cel, onZamknij, onZapisano };
}

describe("PrzeniesienieDialog", () => {
  it("pokazuje termin teraz i po zmianie, a wolny termin daje się zapisać", async () => {
    zapisz.mockResolvedValue({ status: "zapisano", komunikat: "Zapisano zmianę." } satisfies StanEdycji);
    const { cel, onZapisano } = pokaz("Z002", (t) => t.sale.length > 0);

    const dialog = screen.getByRole("dialog", { name: "Przenieść zajęcia?" });
    expect(dialog).toHaveTextContent("TerazPo zmianie");
    expect(screen.getByRole("row", { name: /^Dzień/ })).toHaveTextContent("Poniedziałek");
    expect(screen.getByLabelText("Nowa sala")).toHaveValue(cel.sala);
    expect(screen.getByText("Nowy termin nie łamie żadnych ograniczeń.")).toBeInTheDocument();
    expect(screen.getByText(/^Kara miękkich: 5088 →/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Zapisz zmianę" }));
    await waitFor(() => expect(zapisz).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(zapisz.mock.calls[0][1] as FormData)).toMatchObject({
      job: JOB_ID,
      zajecia: "Z002",
      dzien: String(cel.dzien),
      slot: String(cel.slot),
      sala: cel.sala,
    });
    await waitFor(() => expect(onZapisano).toHaveBeenCalledWith("Zapisano zmianę."));
  });

  it("termin z konfliktem pokazuje konflikty i nie pozwala zapisać", () => {
    pokaz("Z002", (t) => !t.terminWolny && t.slot <= 11);
    expect(screen.getByText("Tego terminu nie da się zapisać")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zapisz zmianę" })).toBeDisabled();
  });

  it("mówi, które zajęcia powiązane przeniosą się razem", () => {
    pokaz("Z037", (t) => t.sale.length > 0);
    expect(screen.getByText(/przeniosą się też zajęcia powiązane/)).toHaveTextContent("Z038");
  });

  it("pokazuje błąd serwera w oknie i zamyka się przyciskiem Anuluj", async () => {
    zapisz.mockResolvedValue({ status: "blad", komunikat: "Plan został w międzyczasie zmieniony." } satisfies StanEdycji);
    const { onZamknij, onZapisano } = pokaz("Z002", (t) => t.sale.length > 0);

    await userEvent.click(screen.getByRole("button", { name: "Zapisz zmianę" }));
    expect(await screen.findByText("Plan został w międzyczasie zmieniony.")).toBeInTheDocument();
    expect(onZapisano).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Anuluj" }));
    expect(onZamknij).toHaveBeenCalled();
  });
});
