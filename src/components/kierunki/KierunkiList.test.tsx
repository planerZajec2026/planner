import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GRUPY, KIERUNKI } from "@/test/fixtures";
import { KierunkiList } from "./KierunkiList";

const sections = () => screen.queryAllByRole("region");
const sectionTitles = () => sections().map((s) => within(s).getByRole("heading").textContent);

describe("KierunkiList", () => {
  it("renders every programme with its group count", () => {
    render(<KierunkiList kierunki={KIERUNKI} grupy={GRUPY} />);
    expect(sectionTitles()).toEqual(["Fizyka", "Informatyka"]);
    expect(sections().map((s) => within(s).getByText(/grup/).textContent)).toEqual(["1 grupa", "3 grupy"]);
  });

  it("shows each group with its year and number of students, and no study mode", () => {
    render(<KierunkiList kierunki={KIERUNKI} grupy={GRUPY} />);
    const row = screen.getByText("INF1-R1-G1").closest(".grupa-row") as HTMLElement;
    expect(within(row).getByText("Informatyka I st., rok I, sem. I")).toBeInTheDocument();
    expect(within(row).getByText("24 studentów")).toBeInTheDocument();
    expect(screen.queryByText(/stacjonarne/i)).not.toBeInTheDocument();
  });

  it("filters by programme name, ignoring diacritics", async () => {
    render(<KierunkiList kierunki={KIERUNKI} grupy={GRUPY} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Szukaj kierunku lub grupy" }), "FIZYK");
    expect(sectionTitles()).toEqual(["Fizyka"]);
  });

  it("filters by group code", async () => {
    render(<KierunkiList kierunki={KIERUNKI} grupy={GRUPY} />);
    await userEvent.type(screen.getByRole("searchbox"), "r1-g");
    expect(sectionTitles()).toEqual(["Informatyka"]);
    expect(screen.getAllByRole("link", { name: /^Harmonogram grupy/ }).map((a) => a.getAttribute("aria-label"))).toEqual([
      "Harmonogram grupy INF1-R1-G1",
      "Harmonogram grupy INF1-R1-G2",
    ]);
  });

  it("shows the empty state when nothing matches", async () => {
    render(<KierunkiList kierunki={KIERUNKI} grupy={GRUPY} />);
    await userEvent.type(screen.getByRole("searchbox"), "xyz");
    expect(sections()).toHaveLength(0);
    expect(screen.getByText("Brak wyników dla „xyz”.")).toBeInTheDocument();
  });

  it("links each group to its timetable", () => {
    render(<KierunkiList kierunki={KIERUNKI} grupy={GRUPY} />);
    expect(screen.getByRole("link", { name: "Harmonogram grupy INF1-R1-G1" })).toHaveAttribute(
      "href",
      "/harmonogram?grupa=INF1-R1-G1",
    );
  });
});
