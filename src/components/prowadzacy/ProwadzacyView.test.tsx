import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import { getProwadzacy } from "@/lib/data/prowadzacy";
import type { Prowadzacy } from "@/lib/types";
import { ProwadzacyView } from "./ProwadzacyView";

let lista: Prowadzacy[];

beforeAll(async () => {
  lista = await getProwadzacy();
});

const cardNames = () => screen.queryAllByRole("article").map((a) => a.getAttribute("aria-label"));

describe("ProwadzacyView", () => {
  it("renders all instructors with schedule links", () => {
    render(<ProwadzacyView initial={lista} />);
    expect(cardNames()).toHaveLength(6);
    expect(screen.getAllByRole("link", { name: "Zobacz harmonogram" })[0]).toHaveAttribute(
      "href",
      `/harmonogram-prowadzacych?prowadzacy=${lista[0].id}`,
    );
    expect(screen.getByRole("link", { name: "p.zielinski@uczelnia.edu.pl" })).toHaveAttribute(
      "href",
      "mailto:p.zielinski@uczelnia.edu.pl",
    );
  });

  it.each([
    ["sieci", ["dr Paweł Zieliński"]],
    ["kaminska", ["prof. Ewa Kamińska"]],
    ["programowanie", ["dr hab. Marta Nowak", "mgr inż. Tomasz Górski"]],
  ])("searching %j finds %j", async (query, names) => {
    render(<ProwadzacyView initial={lista} />);
    await userEvent.type(screen.getByRole("searchbox"), query);
    expect(cardNames()).toEqual(names);
  });

  it("shows the empty state when nothing matches", async () => {
    render(<ProwadzacyView initial={lista} />);
    await userEvent.type(screen.getByRole("searchbox"), "xyz");
    expect(screen.getByText("Brak prowadzących spełniających kryteria.")).toBeInTheDocument();
  });

  it("toggles the form", async () => {
    render(<ProwadzacyView initial={lista} />);
    const toggle = screen.getByRole("button", { name: "+ Dodaj prowadzącego" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveTextContent("Anuluj");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("form", { name: "Nowy prowadzący" })).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("adds a saved instructor at the top and closes the form", async () => {
    render(<ProwadzacyView initial={lista} />);
    await userEvent.click(screen.getByRole("button", { name: "+ Dodaj prowadzącego" }));
    await userEvent.type(screen.getByLabelText("Imię *"), "Katarzyna");
    await userEvent.type(screen.getByLabelText("Nazwisko *"), "Lewandowska");
    await userEvent.type(screen.getByLabelText("E-mail *"), "k.lewandowska@uczelnia.edu.pl");
    await userEvent.click(screen.getByRole("button", { name: "Zapisz prowadzącego" }));

    expect(cardNames()).toHaveLength(7);
    expect(cardNames()[0]).toBe("mgr Katarzyna Lewandowska");
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Dodano prowadzącego (dane lokalne)");
  });
});
