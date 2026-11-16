import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PROWADZACY } from "@/test/fixtures";
import { ProwadzacyView } from "./ProwadzacyView";

const cardNames = () => screen.queryAllByRole("article").map((a) => a.getAttribute("aria-label"));

describe("ProwadzacyView", () => {
  it("renders all instructors with schedule links and their subjects", () => {
    render(<ProwadzacyView prowadzacy={PROWADZACY} />);
    expect(cardNames()).toEqual(["dr P01", "prof. P02", "mgr P03"]);
    expect(screen.getAllByRole("link", { name: "Zobacz harmonogram" })[0]).toHaveAttribute(
      "href",
      "/harmonogram-prowadzacych?prowadzacy=P01",
    );
    expect(screen.getByText("Bazy danych")).toBeInTheDocument();
    expect(screen.getByText("SJO")).toBeInTheDocument();
  });

  it("offers no way to add an instructor and shows no e-mail addresses", () => {
    render(<ProwadzacyView prowadzacy={PROWADZACY} />);
    expect(screen.queryByRole("button", { name: /Dodaj prowadzącego/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /@/ })).not.toBeInTheDocument();
  });

  it.each([
    ["p02", ["prof. P02"]],
    ["bazy", ["dr P01"]],
    ["sjo", ["mgr P03"]],
    ["analiza", ["prof. P02"]],
  ])("searching %j finds %j", async (query, names) => {
    render(<ProwadzacyView prowadzacy={PROWADZACY} />);
    await userEvent.type(screen.getByRole("searchbox"), query);
    expect(cardNames()).toEqual(names);
  });

  it("shows the empty state when nothing matches", async () => {
    render(<ProwadzacyView prowadzacy={PROWADZACY} />);
    await userEvent.type(screen.getByRole("searchbox"), "xyz");
    expect(screen.getByText("Brak prowadzących spełniających kryteria.")).toBeInTheDocument();
  });
});
