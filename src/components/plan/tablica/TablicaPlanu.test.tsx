import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { kontekstTestowy, ocenaTestowa } from "@/test/kontekst-planu";

// The real action imports the server-only admin client, which can't load outside the server.
vi.mock("@/app/plan/edycja/actions", () => ({ zapiszPrzydzial: vi.fn() }));

import { TablicaPlanu } from "./TablicaPlanu";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
});

afterEach(() => vi.restoreAllMocks());

const k = kontekstTestowy();
const filtr = { rodzaj: "grupa" as const, id: "INF1-R1-G1" };

function pokaz(onZaznacz = vi.fn()) {
  const wynik = render(
    <TablicaPlanu kontekst={k} ocena={ocenaTestowa()} filtr={filtr} onZaznacz={onZaznacz} onZapisano={vi.fn()} />,
  );
  return { ...wynik, onZaznacz };
}

/** Lays the board out like a browser would: the slot area at (100, 50), 100 px per day, 46 px per slot. */
function geometria() {
  const obszar = { left: 100, top: 50, width: 500, height: 12 * 46 };
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const r = this.classList.contains("tablica-obszar") ? obszar : { left: 100, top: 50, width: 100, height: 86 };
    return { ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top, toJSON: () => r } as DOMRect;
  });
}

const kafelek = (container: HTMLElement, id: string) => container.querySelector<HTMLElement>(`[data-zajecia="${id}"]`)!;
const wskaznik = { pointerId: 1, button: 0, pointerType: "mouse" };

describe("TablicaPlanu", () => {
  it("pokazuje zajęcia grupy z wykładami rocznika, ale nie innych grup", () => {
    const { container } = pokaz();
    expect(kafelek(container, "Z001")).toBeInTheDocument(); // wykład INF1-R1-ALL
    expect(kafelek(container, "Z002")).toBeInTheDocument();
    expect(kafelek(container, "Z004")).toBeNull(); // ćwiczenia INF1-R1-G2
    expect(kafelek(container, "Z001")).toHaveTextContent("Analiza matematyczna I");
  });

  it("kliknięcie zaznacza zajęcia", async () => {
    const { container, onZaznacz } = pokaz();
    await userEvent.click(kafelek(container, "Z002"));
    expect(onZaznacz).toHaveBeenCalledWith("Z002");
  });

  it("przeciąganie koloruje terminy, a upuszczenie otwiera okno z potwierdzeniem", () => {
    geometria();
    const { container, onZaznacz } = pokaz();
    const z002 = kafelek(container, "Z002");

    fireEvent.pointerDown(z002, { ...wskaznik, clientX: 150, clientY: 60 });
    fireEvent.pointerMove(z002, { ...wskaznik, clientX: 152, clientY: 61 }); // below the threshold: still a press
    expect(container.querySelector(".tablica-komorka")).toBeNull();

    fireEvent.pointerMove(z002, { ...wskaznik, clientX: 350, clientY: 250 });
    expect(container.querySelectorAll(".tablica-komorka")).toHaveLength(60);
    expect(container.querySelector(".tablica-komorka.wolny")).not.toBeNull();
    expect(container.querySelector(".tablica-komorka.konflikt")).not.toBeNull();
    // Wednesday (column 4), the slot under the pointer, two slots long.
    expect(container.querySelector<HTMLElement>(".tablica-cel")!.style.gridColumn).toBe("4");
    expect(container.querySelector<HTMLElement>(".tablica-cel")!.style.gridRow).toBe("6 / span 2");
    expect(container.querySelector(".tablica-kopia")).toHaveTextContent("Analiza matematyczna I");
    // Where the class is now (Monday, slot 5) has its own colour while it is dragged.
    const zrodlo = container.querySelector<HTMLElement>(".tablica-zrodlo")!;
    expect([zrodlo.style.gridColumn, zrodlo.style.gridRow]).toEqual(["2", "6 / span 2"]);

    fireEvent.pointerUp(z002, { ...wskaznik, clientX: 350, clientY: 250 });
    fireEvent.click(z002);
    expect(container.querySelector(".tablica-komorka")).toBeNull();
    expect(container.querySelector(".tablica-zrodlo")).toBeNull();
    expect(screen.getByRole("dialog", { name: "Przenieść zajęcia?" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /^Dzień/ })).toHaveTextContent("Środa");
    // The click that ends a drag does not select the class.
    expect(onZaznacz).not.toHaveBeenCalled();
  });

  it("prawy przycisk otwiera szczegóły zajęć, a nie zaznacza ich", () => {
    const { container, onZaznacz } = pokaz();
    fireEvent.contextMenu(kafelek(container, "Z002"));

    const okno = screen.getByRole("dialog", { name: "Analiza matematyczna I" });
    expect(okno).toHaveTextContent("Poniedziałek, 12:15–14:00 (105 min)");
    expect(okno).toHaveTextContent("SalaB551");
    expect(okno).toHaveTextContent("Prowadzidr P31");
    expect(okno).toHaveTextContent("Kod zajęćZ002");
    expect(onZaznacz).not.toHaveBeenCalled();
  });

  it("Esc przerywa przeciąganie bez okna i bez zaznaczenia", () => {
    geometria();
    const { container, onZaznacz } = pokaz();
    const z002 = kafelek(container, "Z002");

    fireEvent.pointerDown(z002, { ...wskaznik, clientX: 150, clientY: 60 });
    fireEvent.pointerMove(z002, { ...wskaznik, clientX: 350, clientY: 250 });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(container.querySelector(".tablica-komorka")).toBeNull();

    fireEvent.pointerUp(z002, { ...wskaznik, clientX: 350, clientY: 250 });
    fireEvent.click(z002);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onZaznacz).not.toHaveBeenCalled();
  });

  it("upuszczenie na obecny termin niczego nie otwiera", () => {
    geometria();
    const { container } = pokaz();
    const z002 = kafelek(container, "Z002");
    const p = k.plan.find((x) => x.zajeciaId === "Z002")!;
    // The centre of the current start: column of its day, row of its slot.
    const x = 100 + (p.dzien - 1) * 100 + 50;
    const y = 50 + (p.slot - 1) * 46 + 10;

    // Held by its first slot (the mocked tile starts at y = 50).
    fireEvent.pointerDown(z002, { ...wskaznik, clientX: 150, clientY: 60 });
    fireEvent.pointerMove(z002, { ...wskaznik, clientX: x, clientY: y });
    expect(container.querySelector(".tablica-cel")).not.toBeNull();
    fireEvent.pointerUp(z002, { ...wskaznik, clientX: x, clientY: y });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
