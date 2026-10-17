import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import { getGrupy, getKierunki } from "@/lib/data/kierunki";
import type { Grupa, Kierunek } from "@/lib/types";
import { lastReplacedParams, setUrl } from "@/test/navigation";
import { GrupaFilters } from "./GrupaFilters";

let kierunki: Kierunek[];
let grupy: Grupa[];

beforeAll(async () => {
  [kierunki, grupy] = await Promise.all([getKierunki(), getGrupy()]);
});

const optionLabels = (label: string) =>
  [...(screen.getByLabelText(label) as HTMLSelectElement).options].map((o) => o.textContent);

describe("GrupaFilters", () => {
  it("shows the selected group and only matching groups", () => {
    render(
      <GrupaFilters kierunki={kierunki} grupy={grupy} tryb="niestacjonarne" kierunekId="informatyka" grupaId="inf-z-3" weekStart="2026-10-12" />,
    );
    expect(screen.getByLabelText("Tryb studiów")).toHaveValue("niestacjonarne");
    expect(screen.getByLabelText("Grupa")).toHaveValue("inf-z-3");
    expect(optionLabels("Tryb studiów")).toEqual(["Niestacjonarne (zaoczne)", "Stacjonarne"]);
    expect(optionLabels("Grupa")).toEqual(["INF/Z-3", "INF/Z-2"]);
  });

  it("switching the mode picks the first matching group and keeps the week", async () => {
    setUrl("/harmonogram?grupa=inf-z-3&tydzien=2026-10-12");
    render(
      <GrupaFilters kierunki={kierunki} grupy={grupy} tryb="niestacjonarne" kierunekId="informatyka" grupaId="inf-z-3" weekStart="2026-10-12" />,
    );
    await userEvent.selectOptions(screen.getByLabelText("Tryb studiów"), "stacjonarne");
    expect(Object.fromEntries(lastReplacedParams())).toEqual({
      tryb: "stacjonarne",
      kierunek: "informatyka",
      grupa: "inf-2a",
      tydzien: "2026-10-12",
    });
  });

  it("switching the programme keeps the mode", async () => {
    render(
      <GrupaFilters kierunki={kierunki} grupy={grupy} tryb="niestacjonarne" kierunekId="informatyka" grupaId="inf-z-3" weekStart="2026-10-12" />,
    );
    await userEvent.selectOptions(screen.getByLabelText("Kierunek"), "zarzadzanie");
    expect(Object.fromEntries(lastReplacedParams())).toMatchObject({ tryb: "niestacjonarne", kierunek: "zarzadzanie", grupa: "zip-z-2" });
  });

  it("shows a disabled 'Brak grup' select and drops grupa from the URL when nothing matches", async () => {
    const bezEkoZ = grupy.filter((g) => g.id !== "eko-z-1");
    setUrl("/harmonogram?grupa=eko-3a");
    const { rerender } = render(
      <GrupaFilters kierunki={kierunki} grupy={bezEkoZ} tryb="stacjonarne" kierunekId="ekonomia" grupaId="eko-3a" weekStart="2026-10-12" />,
    );
    await userEvent.selectOptions(screen.getByLabelText("Tryb studiów"), "niestacjonarne");
    expect(lastReplacedParams().has("grupa")).toBe(false);

    rerender(<GrupaFilters kierunki={kierunki} grupy={bezEkoZ} tryb="niestacjonarne" kierunekId="ekonomia" weekStart="2026-10-12" />);
    expect(screen.getByLabelText("Grupa")).toBeDisabled();
    expect(optionLabels("Grupa")).toEqual(["Brak grup"]);
  });
});
