import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StanImportu } from "@/app/import-eksport/actions";

const wgraj = vi.hoisted(() => vi.fn());

// The real action imports the server-only admin client, which can't load outside the server.
vi.mock("@/app/import-eksport/actions", () => ({ wgrajDane: wgraj }));

import { ImportDanychForm } from "./ImportDanychForm";

beforeEach(() => wgraj.mockReset());

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

  it("wysyła plik i potwierdzenie do akcji", async () => {
    wgraj.mockResolvedValue({ status: "wgrano", podsumowanie: { zajecia: 174 } } satisfies StanImportu);
    render(<ImportDanychForm maDane />);
    await wyslij();

    await waitFor(() => expect(wgraj).toHaveBeenCalledTimes(1));
    const formData = wgraj.mock.calls[0][1] as FormData;
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
});
