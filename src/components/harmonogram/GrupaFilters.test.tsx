import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GRUPY, KIERUNKI } from "@/test/fixtures";
import { lastReplacedParams, setUrl } from "@/test/navigation";
import { GrupaFilters } from "./GrupaFilters";

const optionLabels = (label: string) =>
  [...(screen.getByLabelText(label) as HTMLSelectElement).options].map((o) => o.textContent);

const filters = (props: Partial<React.ComponentProps<typeof GrupaFilters>> = {}) => (
  <GrupaFilters
    kierunki={KIERUNKI}
    grupy={GRUPY}
    kierunekId="informatyka"
    grupaId="INF1-R1-G1"
    weekStart="2026-10-12"
    {...props}
  />
);

describe("GrupaFilters", () => {
  it("shows the selected group and only the groups of its programme", () => {
    render(filters());
    expect(screen.getByLabelText("Kierunek")).toHaveValue("informatyka");
    expect(screen.getByLabelText("Grupa")).toHaveValue("INF1-R1-G1");
    expect(optionLabels("Grupa")).toEqual(["INF1-R1-ALL", "INF1-R1-G1", "INF1-R1-G2"]);
  });

  it("has no study-mode filter", () => {
    render(filters());
    expect(screen.queryByLabelText("Tryb studiów")).not.toBeInTheDocument();
  });

  it("switching the programme picks its first group and keeps the week", async () => {
    setUrl("/harmonogram?grupa=INF1-R1-G1&tydzien=2026-10-12");
    render(filters());
    await userEvent.selectOptions(screen.getByLabelText("Kierunek"), "fizyka");
    expect(Object.fromEntries(lastReplacedParams())).toEqual({
      kierunek: "fizyka",
      grupa: "FIZ-R1-ALL",
      tydzien: "2026-10-12",
    });
  });

  it("choosing a group puts it in the URL", async () => {
    render(filters());
    await userEvent.selectOptions(screen.getByLabelText("Grupa"), "INF1-R1-G2");
    expect(Object.fromEntries(lastReplacedParams())).toMatchObject({ kierunek: "informatyka", grupa: "INF1-R1-G2" });
  });

  it("shows a disabled 'Brak grup' select and drops grupa from the URL when the programme has none", async () => {
    const bezFizyki = GRUPY.filter((g) => g.kierunekId !== "fizyka");
    setUrl("/harmonogram?grupa=INF1-R1-G1");
    const { rerender } = render(filters({ grupy: bezFizyki }));
    await userEvent.selectOptions(screen.getByLabelText("Kierunek"), "fizyka");
    expect(lastReplacedParams().has("grupa")).toBe(false);

    rerender(filters({ grupy: bezFizyki, kierunekId: "fizyka", grupaId: undefined }));
    expect(screen.getByLabelText("Grupa")).toBeDisabled();
    expect(optionLabels("Grupa")).toEqual(["Brak grup"]);
  });
});
