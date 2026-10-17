import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { getGrupy, getKierunki } from "@/lib/data/kierunki";
import { getProwadzacy } from "@/lib/data/prowadzacy";
import { getWszystkieZajecia } from "@/lib/data/zajecia";
import { PRZYKLADOWY_PLAN, type ResolveContext } from "@/lib/import";
import type { Zajecia } from "@/lib/types";
import { JsonImport } from "./JsonImport";

let ctx: ResolveContext;
let istniejace: Zajecia[];

beforeAll(async () => {
  const [kierunki, grupy, prowadzacy, zajecia] = await Promise.all([
    getKierunki(),
    getGrupy(),
    getProwadzacy(),
    getWszystkieZajecia(),
  ]);
  ctx = { kierunki, grupy, prowadzacy };
  istniejace = zajecia;
});

const setup = () => {
  const onImport = vi.fn();
  render(<JsonImport {...ctx} istniejace={istniejace} onImport={onImport} />);
  const upload = (content: string, name = "plan.json") =>
    userEvent.upload(screen.getByLabelText("Plik JSON z planem zajęć"), new File([content], name, { type: "application/json" }));
  return { onImport, upload };
};

const stats = () => screen.getAllByText(/./, { selector: ".import-stat" }).map((s) => s.textContent);
const importButton = () => screen.getByRole("button", { name: /^Importuj/ });

describe("JsonImport", () => {
  it("shows the expected file format", () => {
    setup();
    expect(screen.getByText(/"kierunek": "Informatyka"/)).toBeInTheDocument();
  });

  it("reports the design's sample as 1 class with 1 conflict", async () => {
    const { upload } = setup();
    await upload(PRZYKLADOWY_PLAN);

    expect(await screen.findByText("Podgląd importu")).toBeInTheDocument();
    expect(stats()).toEqual(["1zajęcia w pliku", "0gotowych do importu", "1konflikt"]);
    expect(screen.getByText("Sala B21 jest zajęta: Bazy danych (INF/Z-3), pt 18:00–20:00")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Zajęcia kolidują z planem");
    expect(importButton()).toHaveTextContent("Importuj 0 zajęć");
    expect(importButton()).toBeDisabled();
  });

  it("replacing resolves the conflict and imports, removing the replaced class", async () => {
    const { upload, onImport } = setup();
    await upload(PRZYKLADOWY_PLAN);
    await userEvent.click(await screen.findByRole("button", { name: "Zastąp" }));

    expect(stats()[1]).toBe("1gotowe do importu");
    expect(screen.getByText("Zastąpi: Bazy danych (pt 18:00–20:00)")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.click(importButton());

    expect(onImport).toHaveBeenCalledTimes(1);
    const [dodaj, usun] = onImport.mock.calls[0];
    expect(dodaj).toHaveLength(1);
    expect(dodaj[0]).toMatchObject({ przedmiot: "Bazy danych", grupaId: "inf-z-3", dzien: 5, sala: "B21" });
    expect(usun).toEqual(["z2"]);
    expect(screen.getByRole("status")).toHaveTextContent("Zaimportowano (dane lokalne)");
    expect(screen.queryByText("Podgląd importu")).not.toBeInTheDocument();
  });

  it("skipping keeps the import disabled, and undo brings the conflict back", async () => {
    const { upload } = setup();
    await upload(PRZYKLADOWY_PLAN);
    await userEvent.click(await screen.findByRole("button", { name: "Pomiń" }));
    expect(screen.getByText("Pominięto")).toBeInTheDocument();
    expect(importButton()).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Cofnij" }));
    expect(screen.getByRole("button", { name: "Zastąp" })).toBeInTheDocument();
  });

  it("imports a conflict-free file directly", async () => {
    const { upload, onImport } = setup();
    const plan = JSON.parse(PRZYKLADOWY_PLAN);
    plan.zajecia[0] = { ...plan.zajecia[0], dzien: "sroda", sala: "C1" };
    await upload(JSON.stringify(plan));
    expect(await screen.findByText("Podgląd importu")).toBeInTheDocument();
    expect(stats()).toEqual(["1zajęcia w pliku", "1gotowe do importu", "0konfliktów"]);
    await userEvent.click(importButton());
    expect(onImport.mock.calls[0][1]).toEqual([]);
  });

  it.each([
    ["{ nie json", "Nieprawidłowy plik JSON"],
    [JSON.stringify({ ...JSON.parse(PRZYKLADOWY_PLAN), grupa: undefined }), "Brak pola „grupa”"],
    [JSON.stringify({ ...JSON.parse(PRZYKLADOWY_PLAN), grupa: "ZZZ-9" }), "Nie znaleziono grupy „ZZZ-9”"],
  ])("shows a readable error for a bad file (%#)", async (content, message) => {
    const { upload } = setup();
    await upload(content, "zly.json");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Nie udało się wczytać pliku „zly.json”");
    expect(within(alert).getByText(message)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Anuluj" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rejects a file that is not JSON by name and type", async () => {
    setup();
    await userEvent.upload(screen.getByLabelText("Plik JSON z planem zajęć"), new File(["x"], "plan.txt", { type: "text/plain" }), {
      applyAccept: false,
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Wybierz plik w formacie .json");
  });
});
