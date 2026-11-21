import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { problemyPlanu } from "@/lib/plan-problemy";
import { daneProblemowTestowe } from "@/test/kontekst-planu";

// The loader reads the database with the request's cookies, which can't load outside the server.
vi.mock("@/lib/data/plan-problemy", () => ({ getProblemyPlanu: vi.fn() }));

import { ListaProblemow } from "./ProblemyPlanu";

const problemy = problemyPlanu(daneProblemowTestowe());

describe("ListaProblemow", () => {
  it("lists the worst places first, each class linked to the editor with a way back", () => {
    render(<ListaProblemow problemy={problemy} wynikPoGenerowaniu={5088} />);

    expect(screen.getByText(/Plan spełnia wszystkie ograniczenia twarde/)).toHaveTextContent("teraz 5088)");
    const lista = screen.getAllByRole("list")[0];
    const pozycje = within(lista).getAllByRole("listitem").filter((li) => li.classList.contains("problem"));
    expect(pozycje).toHaveLength(8);
    expect(pozycje[0]).toHaveTextContent(`kara ${problemy.problemy[0].kara}`);

    const pierwsze = problemy.problemy[0].zajecia[0];
    expect(within(pozycje[0]).getByRole("link", { name: pierwsze.opis })).toHaveAttribute(
      "href",
      `/plan/edycja?zajecia=${pierwsze.id}&powrot=generator`,
    );
  });

  it("keeps further places folded away", () => {
    render(<ListaProblemow problemy={problemy} wynikPoGenerowaniu={5088} />);
    const wiecej = screen.getByText(/^Pokaż \d+ kolejn/);
    expect(wiecej.closest("details")).not.toHaveAttribute("open");
  });

  it("shows the score after generation when manual edits changed it", () => {
    render(<ListaProblemow problemy={problemy} wynikPoGenerowaniu={6000} />);
    expect(screen.getByText(/teraz 5088, po wygenerowaniu 6000/)).toBeInTheDocument();
    expect(screen.getByText("zmiana od wygenerowania").nextSibling).toHaveTextContent("−912");
  });

  it("shows the current score and its breakdown by kind", () => {
    render(<ListaProblemow problemy={problemy} wynikPoGenerowaniu={5088} />);
    expect(screen.getByText("kara teraz (z ręcznymi zmianami)").nextSibling).toHaveTextContent("5088");
    expect(screen.queryByText("zmiana od wygenerowania")).toBeNull();
    expect(screen.getByText(/^Godziny skrajne: /)).toHaveTextContent(`Godziny skrajne: ${problemy.miekkie.poza_godzinami}`);
  });

  it("says so when there is nothing to improve", () => {
    render(<ListaProblemow problemy={{ ...problemy, wynik: 0, problemy: [] }} wynikPoGenerowaniu={0} />);
    expect(screen.getByText(/Nie ma czego poprawiać/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
