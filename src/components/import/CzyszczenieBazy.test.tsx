import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FRAZA_POTWIERDZENIA, type StanCzyszczenia } from "@/lib/czyszczenie-bazy";

const wyczysc = vi.hoisted(() => vi.fn());

// The real action imports the server-only admin client, which can't load outside the server.
vi.mock("@/app/import/actions", () => ({ wyczyscBaze: wyczysc }));

import { CzyszczenieBazy } from "./CzyszczenieBazy";

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

const STAN = { zajecia: 174, grupy: 51, sale: 55, prowadzacy: 50, plany: 3 };

beforeEach(() => wyczysc.mockReset());

const otworz = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Wyczyść bazę danych…" }));
  return screen.getByRole("dialog", { name: "Wyczyścić całą bazę danych?" });
};

describe("CzyszczenieBazy", () => {
  it("okno wylicza, co zostanie usunięte", async () => {
    render(<CzyszczenieBazy stan={STAN} />);
    const okno = await otworz();

    expect(okno).toHaveTextContent("Tej operacji nie da się cofnąć.");
    expect(within(okno).getByText("zajęcia do zaplanowania: 174")).toBeInTheDocument();
    expect(within(okno).getByText("wygenerowane plany (z ręcznymi zmianami): 3")).toBeInTheDocument();
  });

  it("przycisk odblokowuje się dopiero po ręcznym wpisaniu dokładnej frazy", async () => {
    render(<CzyszczenieBazy stan={STAN} />);
    const okno = await otworz();
    const pole = within(okno).getByLabelText(`Aby potwierdzić, wpisz ${FRAZA_POTWIERDZENIA}`);
    const przycisk = within(okno).getByRole("button", { name: "Rozumiem, wyczyść bazę danych" });

    expect(przycisk).toBeDisabled();
    await userEvent.type(pole, "Wyczyść bazę danych");
    expect(przycisk).toBeDisabled();

    await userEvent.clear(pole);
    await userEvent.type(pole, FRAZA_POTWIERDZENIA);
    expect(przycisk).toBeEnabled();
  });

  it("po wyczyszczeniu zamyka okno i mówi, co usunięto", async () => {
    wyczysc.mockResolvedValue({ status: "wyczyszczono", usunieto: STAN } satisfies StanCzyszczenia);
    render(<CzyszczenieBazy stan={STAN} />);
    const okno = await otworz();
    await userEvent.type(within(okno).getByRole("textbox"), FRAZA_POTWIERDZENIA);
    await userEvent.click(within(okno).getByRole("button", { name: "Rozumiem, wyczyść bazę danych" }));

    await waitFor(() => expect(wyczysc).toHaveBeenCalledTimes(1));
    expect((wyczysc.mock.calls[0][1] as FormData).get("potwierdzenie")).toBe(FRAZA_POTWIERDZENIA);
    expect(await screen.findByText(/Baza danych została wyczyszczona/)).toHaveTextContent("zajęcia do zaplanowania: 174");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("błąd serwera zostaje w oknie", async () => {
    wyczysc.mockResolvedValue({ status: "blad", komunikat: "Baza odrzuciła czyszczenie." } satisfies StanCzyszczenia);
    render(<CzyszczenieBazy stan={STAN} />);
    const okno = await otworz();
    await userEvent.type(within(okno).getByRole("textbox"), FRAZA_POTWIERDZENIA);
    await userEvent.click(within(okno).getByRole("button", { name: "Rozumiem, wyczyść bazę danych" }));

    expect(await within(okno).findByText("Baza odrzuciła czyszczenie.")).toBeInTheDocument();
  });

  it("przy pustej bazie nie ma czego czyścić", () => {
    render(<CzyszczenieBazy stan={{ zajecia: 0, grupy: 0, sale: 0, prowadzacy: 0, plany: 0 }} />);
    expect(screen.getByRole("button", { name: "Wyczyść bazę danych…" })).toBeDisabled();
    expect(screen.getByText(/Baza jest pusta/)).toBeInTheDocument();
  });
});
