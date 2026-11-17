import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Zadanie } from "@/lib/data/plan";
import type { Postep } from "@/lib/postep";
import { PostepZadania } from "./PostepZadania";

const TERAZ = Date.parse("2026-11-17T10:00:10Z");

const zadanie = (z: Partial<Zadanie>): Zadanie => ({
  id: "j",
  status: "running",
  limitCzasu: 200,
  wagi: {},
  utworzono: "2026-11-17T09:58:00Z",
  rozpoczeto: "2026-11-17T09:59:00Z",
  zakonczono: null,
  blad: null,
  raport: null,
  wynikMiekkich: null,
  zmianyReczne: 0,
  postep: null,
  ...z,
});

const postep = (p: Partial<Postep>): Postep => ({
  etap: "optymalizacja",
  uplyneloS: 50,
  limitS: 200,
  rozwiazania: 0,
  kara: null,
  karaStartowa: null,
  dolnaGranica: null,
  zaktualizowano: "2026-11-17T10:00:09Z",
  ...p,
});

describe("PostepZadania", () => {
  it("shows the share of the time limit the solver has used", () => {
    render(<PostepZadania zadanie={zadanie({ postep: postep({ uplyneloS: 50.7 }) })} teraz={TERAZ} />);
    const pasek = screen.getByRole("progressbar", { name: "Postęp generowania" });
    expect(pasek).toHaveAttribute("aria-valuenow", "25");
    expect(screen.getByText("czas solvera: 50 z 200 s")).toBeInTheDocument();
    expect(screen.getByText("Etap 2 z 2: optymalizacja")).toBeInTheDocument();
    expect(screen.getByText(/analizuje model/)).toBeInTheDocument();
  });

  it("shows the solver's penalty once it found better plans", () => {
    render(
      <PostepZadania
        zadanie={zadanie({ postep: postep({ rozwiazania: 12, kara: 7132, karaStartowa: 17306, dolnaGranica: 2650 }) })}
        teraz={TERAZ}
      />,
    );
    expect(screen.getByText(/12 coraz lepszych planów/)).toBeInTheDocument();
    expect(screen.getByText("kara wg solvera (start 17 306)")).toBeInTheDocument();
    expect(screen.getByText("7132")).toBeInTheDocument();
    expect(screen.getByText("2650")).toBeInTheDocument();
  });

  it("warns when the worker went quiet", () => {
    render(<PostepZadania zadanie={zadanie({ postep: postep({ zaktualizowano: "2026-11-17T09:59:00Z" }) })} teraz={TERAZ} />);
    expect(screen.getByText(/Ostatni sygnał od workera 70 sekund temu/)).toBeInTheDocument();
  });

  it("does not warn about a fresh signal", () => {
    render(<PostepZadania zadanie={zadanie({ postep: postep({}) })} teraz={TERAZ} />);
    expect(screen.queryByText(/Ostatni sygnał/)).not.toBeInTheDocument();
  });

  it("has no bar before the first report or while the job waits", () => {
    const { rerender } = render(<PostepZadania zadanie={zadanie({})} teraz={TERAZ} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText(/Pierwszy raport postępu/)).toBeInTheDocument();

    rerender(<PostepZadania zadanie={zadanie({ status: "queued", rozpoczeto: null })} teraz={TERAZ} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText(/czeka, aż worker je pobierze/)).toBeInTheDocument();
  });

  it("shows nothing for a finished job", () => {
    const { container } = render(<PostepZadania zadanie={zadanie({ status: "done", postep: postep({ etap: "zapis" }) })} teraz={TERAZ} />);
    expect(container).toBeEmptyDOMElement();
  });
});
