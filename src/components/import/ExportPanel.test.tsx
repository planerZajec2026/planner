import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import { getGrupy, getKierunki } from "@/lib/data/kierunki";
import { getProwadzacy } from "@/lib/data/prowadzacy";
import type { ResolveContext } from "@/lib/import";
import { ExportPanel } from "./ExportPanel";

let ctx: ResolveContext;

beforeAll(async () => {
  const [kierunki, grupy, prowadzacy] = await Promise.all([getKierunki(), getGrupy(), getProwadzacy()]);
  ctx = { kierunki, grupy, prowadzacy };
});

describe("ExportPanel", () => {
  it("needs no target for the whole plan", () => {
    render(<ExportPanel {...ctx} />);
    expect(screen.getByLabelText("Zakres eksportu")).toHaveValue("calosc");
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it.each([
    ["kierunek", "Kierunek", "informatyka"],
    ["grupa", "Grupa", "inf-2a"],
    ["prowadzacy", "Prowadzący", "e-kaminska"],
  ])("scope %s shows a %s select preselected to the first entry", async (zakres, label, first) => {
    render(<ExportPanel {...ctx} />);
    await userEvent.selectOptions(screen.getByLabelText("Zakres eksportu"), zakres);
    expect(screen.getByLabelText(label)).toHaveValue(first);
  });

  it("explains that export needs the backend", async () => {
    render(<ExportPanel {...ctx} />);
    expect(screen.getByText("Plik .xlsx będzie zawierał wszystkie zaplanowane zajęcia wraz z salami i prowadzącymi.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Eksportuj do Excela" }));
    expect(screen.getByRole("status")).toHaveTextContent("Eksport będzie dostępny po podłączeniu backendu");
  });
});
