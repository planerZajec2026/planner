import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FazaWgrywania } from "@/lib/wgrywanie-klient";
import type { StanImportu } from "@/lib/wgrywanie-danych";

const wgraj = vi.hoisted(() => vi.fn());
const odswiez = vi.hoisted(() => vi.fn());

// jsdom has no server to upload to; the request itself is tested in wgrywanie-klient.test.ts.
vi.mock("@/lib/wgrywanie-klient", async (oryginal) => ({ ...(await oryginal<object>()), wyslijDane: wgraj }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: odswiez }) }));

import { ImportDanychForm } from "./ImportDanychForm";

beforeEach(() => {
  wgraj.mockReset();
  odswiez.mockReset();
});

const plik = new File(["{}"], "dane_planu.json", { type: "application/json" });

async function wyslij() {
  await userEvent.upload(screen.getByLabelText("Plik z danymi"), plik);
  await userEvent.click(screen.getByLabelText(/Rozumiem/));
  await userEvent.click(screen.getByRole("button", { name: "Wgraj dane" }));
}

describe("ImportDanychForm", () => {
  it("przyjmuje pliki xlsx i json", () => {
    render(<ImportDanychForm maDane={false} />);
    expect(screen.getByLabelText("Plik z danymi")).toHaveAttribute("accept", ".xlsx,.json");
  });

  it("ostrzega przed utratą danych i planów, gdy dane już są", () => {
    render(<ImportDanychForm maDane />);
    expect(screen.getByLabelText(/usunie dotychczasowe dane wejściowe i wszystkie wygenerowane plany/)).toBeInTheDocument();
  });

  it("nie straszy usuwaniem, gdy baza jest pusta", () => {
    render(<ImportDanychForm maDane={false} />);
    expect(screen.queryByText(/usunie/)).not.toBeInTheDocument();
  });

  it("wysyła plik i potwierdzenie na serwer", async () => {
    wgraj.mockResolvedValue({ status: "wgrano", podsumowanie: { zajecia: 174 } } satisfies StanImportu);
    render(<ImportDanychForm maDane />);
    await wyslij();

    await waitFor(() => expect(wgraj).toHaveBeenCalledTimes(1));
    const formData = wgraj.mock.calls[0][0] as FormData;
    expect(formData.has("plik")).toBe(true);
    expect(formData.get("potwierdzenie")).toBe("tak");
  });

  it("pokazuje podsumowanie po wgraniu", async () => {
    wgraj.mockResolvedValue({
      status: "wgrano",
      podsumowanie: { zajecia: 174, sale: 55, grupy: 51 },
    } satisfies StanImportu);
    render(<ImportDanychForm maDane />);
    await wyslij();

    expect(await screen.findByText(/174 zajęć do zaplanowania, 55 sal, 51 grup/)).toBeInTheDocument();
    expect(odswiez).toHaveBeenCalled();
  });

  it("wypisuje błędy z pliku", async () => {
    wgraj.mockResolvedValue({
      status: "blad",
      komunikat: "W pliku są błędy. Nic nie zostało wgrane.",
      szczegoly: ["Brakuje tabeli „sale”.", "zajecia Z001, prowadzący: nie ma „P999”."],
    } satisfies StanImportu);
    render(<ImportDanychForm maDane />);
    await wyslij();

    expect(await screen.findByText("W pliku są błędy. Nic nie zostało wgrane.")).toBeInTheDocument();
    expect(screen.getByText("Brakuje tabeli „sale”.")).toBeInTheDocument();
    expect(screen.getByText("zajecia Z001, prowadzący: nie ma „P999”.")).toBeInTheDocument();
  });

  it("pokazuje wybrany plik z rozmiarem", async () => {
    render(<ImportDanychForm maDane />);
    await userEvent.upload(screen.getByLabelText("Plik z danymi"), new File([new Uint8Array(300 * 1024)], "dane_planu.xlsx"));
    expect(screen.getByText("dane_planu.xlsx")).toBeInTheDocument();
    expect(screen.getByText(/300 KB/)).toBeInTheDocument();
  });

  it("bez potwierdzenia nie wysyła pliku", async () => {
    render(<ImportDanychForm maDane />);
    await userEvent.upload(screen.getByLabelText("Plik z danymi"), plik);
    await userEvent.click(screen.getByRole("button", { name: "Wgraj dane" }));
    expect(screen.getByText(/Potwierdź, że wgranie danych/)).toBeInTheDocument();
    expect(wgraj).not.toHaveBeenCalled();
  });

  it("pokazuje wysłaną część pliku, a potem etap pracy serwera", async () => {
    let postep: (f: FazaWgrywania) => void = () => {};
    let zakoncz: (s: StanImportu) => void = () => {};
    wgraj.mockImplementation((_fd: FormData, naPostep: (f: FazaWgrywania) => void) => {
      postep = naPostep;
      return new Promise<StanImportu>((r) => (zakoncz = r));
    });
    render(<ImportDanychForm maDane />);
    await wyslij();

    act(() => postep({ krok: "wysylanie", wyslano: 1024 * 1024, razem: 4 * 1024 * 1024 }));
    const pasek = screen.getByRole("progressbar", { name: "Postęp wgrywania" });
    expect(pasek).toHaveAttribute("aria-valuenow", "25");
    expect(screen.getByText("1 MB z 4 MB")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wgrywanie…" })).toBeDisabled();

    act(() => postep({ krok: "zapis" }));
    expect(screen.getByRole("progressbar", { name: "Postęp wgrywania" })).not.toHaveAttribute("aria-valuenow");
    expect(screen.getAllByText("Krok 3 z 3: zapis do bazy").length).toBeGreaterThan(0);

    await act(async () => zakoncz({ status: "wgrano", podsumowanie: { zajecia: 174 } }));
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText(/Wgrano dane: 174 zajęć/)).toBeInTheDocument();
  });
});
