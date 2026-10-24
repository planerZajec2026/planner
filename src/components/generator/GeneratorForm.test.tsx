import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StanFormularza } from "@/app/generator/actions";
import { LIMIT_DOMYSLNY, LIMIT_MAX, LIMIT_MIN, WAGI } from "@/lib/generator";

const zlec = vi.hoisted(() => vi.fn());

// The real action imports the server-only admin client, which can't load outside the server.
vi.mock("@/app/generator/actions", () => ({ zlecGenerowanie: zlec }));

import { GeneratorForm } from "./GeneratorForm";

beforeEach(() => zlec.mockReset());

const wyslij = () => userEvent.click(screen.getByRole("button", { name: "Generuj plan" }));

describe("GeneratorForm", () => {
  it("proponuje domyślny limit czasu i domyślne wagi", () => {
    render(<GeneratorForm />);

    const limit = screen.getByLabelText("Limit czasu (sekundy)");
    expect(limit).toHaveValue(LIMIT_DOMYSLNY);
    expect(limit).toHaveAttribute("min", String(LIMIT_MIN));
    expect(limit).toHaveAttribute("max", String(LIMIT_MAX));
    for (const waga of WAGI) {
      expect(screen.getByLabelText(waga.label)).toHaveValue(waga.domyslna);
    }
  });

  it("wysyła wartości z formularza do akcji", async () => {
    zlec.mockResolvedValue({ status: "zlecone", komunikat: "ok" } satisfies StanFormularza);
    render(<GeneratorForm />);

    const limit = screen.getByLabelText("Limit czasu (sekundy)");
    await userEvent.clear(limit);
    await userEvent.type(limit, "350");
    await wyslij();

    await waitFor(() => expect(zlec).toHaveBeenCalledTimes(1));
    const formData = zlec.mock.calls[0][1] as FormData;
    expect(formData.get("limit_czasu")).toBe("350");
    expect(formData.get("waga_poza_godzinami")).toBe("1");
  });

  it("pokazuje potwierdzenie po zleceniu zadania", async () => {
    zlec.mockResolvedValue({ status: "zlecone", komunikat: "Zadanie dodane do kolejki." } satisfies StanFormularza);
    render(<GeneratorForm />);
    await wyslij();

    expect(await screen.findByText("Zadanie dodane do kolejki.")).toBeInTheDocument();
  });

  it("opisuje błąd przy właściwym polu", async () => {
    zlec.mockResolvedValue({
      status: "blad",
      bledy: { limit: "Podaj liczbę sekund od 200 do 400.", wagi: { poza_godzinami: "Podaj liczbę całkowitą od 0 do 1000." } },
    } satisfies StanFormularza);
    render(<GeneratorForm />);
    await wyslij();

    const limit = await screen.findByLabelText("Limit czasu (sekundy)");
    expect(limit).toHaveAttribute("aria-invalid", "true");
    expect(limit).toHaveAccessibleDescription("Podaj liczbę sekund od 200 do 400.");
    expect(screen.getByLabelText("Godziny skrajne")).toHaveAccessibleDescription("Podaj liczbę całkowitą od 0 do 1000.");
    expect(screen.getByText("Popraw zaznaczone pola i spróbuj ponownie.")).toBeInTheDocument();
  });

  it("pokazuje komunikat błędu serwera", async () => {
    zlec.mockResolvedValue({ status: "blad", komunikat: "W kolejce jest już 3 zadań." } satisfies StanFormularza);
    render(<GeneratorForm />);
    await wyslij();

    expect(await screen.findByText("W kolejce jest już 3 zadań.")).toBeInTheDocument();
  });
});
