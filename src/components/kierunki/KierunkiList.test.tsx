import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import { getGrupy, getKierunki } from "@/lib/data/kierunki";
import type { Grupa, Kierunek } from "@/lib/types";
import { KierunkiList } from "./KierunkiList";

let kierunki: Kierunek[];
let grupy: Grupa[];

beforeAll(async () => {
  [kierunki, grupy] = await Promise.all([getKierunki(), getGrupy()]);
});

const sections = () => screen.queryAllByRole("region");
const sectionTitles = () => sections().map((s) => within(s).getByRole("heading").textContent);

describe("KierunkiList", () => {
  it("renders every programme with its group count", () => {
    render(<KierunkiList kierunki={kierunki} grupy={grupy} />);
    expect(sectionTitles()).toEqual(["Informatyka", "Zarządzanie", "Ekonomia"]);
    expect(sections().map((s) => within(s).getByText(/grup/).textContent)).toEqual(["4 grupy", "2 grupy", "2 grupy"]);
  });

  it("filters by programme name, ignoring diacritics", async () => {
    render(<KierunkiList kierunki={kierunki} grupy={grupy} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Szukaj kierunku lub grupy" }), "zarzadz");
    expect(sectionTitles()).toEqual(["Zarządzanie"]);
  });

  it("filters by group code", async () => {
    render(<KierunkiList kierunki={kierunki} grupy={grupy} />);
    await userEvent.type(screen.getByRole("searchbox"), "inf/z");
    expect(sectionTitles()).toEqual(["Informatyka"]);
    expect(screen.getAllByRole("link", { name: /^Harmonogram grupy/ }).map((a) => a.getAttribute("aria-label"))).toEqual([
      "Harmonogram grupy INF/Z-3",
      "Harmonogram grupy INF/Z-2",
    ]);
  });

  it("shows the empty state when nothing matches", async () => {
    render(<KierunkiList kierunki={kierunki} grupy={grupy} />);
    await userEvent.type(screen.getByRole("searchbox"), "xyz");
    expect(sections()).toHaveLength(0);
    expect(screen.getByText("Brak wyników dla „xyz”.")).toBeInTheDocument();
  });

  it("links each group to its timetable", () => {
    render(<KierunkiList kierunki={kierunki} grupy={grupy} />);
    expect(screen.getByRole("link", { name: "Harmonogram grupy INF/Z-3" })).toHaveAttribute("href", "/harmonogram?grupa=inf-z-3");
  });
});
