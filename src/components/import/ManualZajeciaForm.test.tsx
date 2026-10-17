import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { getGrupy, getKierunki } from "@/lib/data/kierunki";
import { getProwadzacy } from "@/lib/data/prowadzacy";
import { getWszystkieZajecia } from "@/lib/data/zajecia";
import type { ResolveContext } from "@/lib/import";
import type { Zajecia } from "@/lib/types";
import { ManualZajeciaForm } from "./ManualZajeciaForm";

let ctx: ResolveContext;
let istniejace: Zajecia[];

beforeAll(async () => {
  const [kierunki, grupy, prowadzacy, zajecia] = await Promise.all([
    getKierunki(),
    getGrupy(),
    getProwadzacy(),
    getWszystkieZajecia(),
  ]);
  ctx = { kierunki, grupy, prowadzacy };
  istniejace = zajecia;
});

const setup = () => {
  const onAdd = vi.fn();
  render(<ManualZajeciaForm {...ctx} istniejace={istniejace} onAdd={onAdd} />);
  return { onAdd, submit: () => userEvent.click(screen.getByRole("button", { name: "Dodaj zajęcia do planu" })) };
};

// <input type="time"> can't be typed into reliably in jsdom; set the value directly.
const setTime = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** A Wednesday-evening class that clashes with nothing in the mock plan. */
const fillValid = async () => {
  await userEvent.selectOptions(screen.getByLabelText("Grupa"), "inf-z-3");
  await userEvent.type(screen.getByLabelText("Przedmiot *"), "Fizyka");
  await userEvent.selectOptions(screen.getByLabelText("Prowadzący"), "a-krupa");
  await userEvent.selectOptions(screen.getByLabelText("Dzień tygodnia"), "3");
  setTime("Godzina od *", "18:00");
  setTime("Godzina do *", "19:30");
  await userEvent.type(screen.getByLabelText("Sala *"), "C1");
};

describe("ManualZajeciaForm", () => {
  it("narrows groups to the selected programme", async () => {
    setup();
    await userEvent.selectOptions(screen.getByLabelText("Kierunek"), "zarzadzanie");
    const options = [...(screen.getByLabelText("Grupa") as HTMLSelectElement).options].map((o) => o.textContent);
    expect(options).toEqual(["ZIP-1A", "ZIP/Z-2"]);
    expect(screen.getByLabelText("Grupa")).toHaveValue("zip-1a");
  });

  it("blocks submission when required fields are missing", async () => {
    const { onAdd, submit } = setup();
    await submit();
    for (const label of ["Przedmiot *", "Godzina od *", "Godzina do *", "Sala *"]) {
      expect(screen.getByLabelText(label)).toHaveAccessibleDescription("To pole jest wymagane");
    }
    expect(screen.getByLabelText("Przedmiot *")).toHaveFocus();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("blocks submission when od >= do", async () => {
    const { onAdd, submit } = setup();
    await fillValid();
    setTime("Godzina do *", "18:00");
    await submit();
    expect(screen.getByLabelText("Godzina do *")).toHaveAccessibleDescription(
      "Godzina zakończenia musi być późniejsza niż rozpoczęcia",
    );
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("blocks a conflicting class and explains why", async () => {
    const { onAdd, submit } = setup();
    await fillValid();
    await userEvent.selectOptions(screen.getByLabelText("Dzień tygodnia"), "6"); // INF/Z-3 has classes until 18:00 on Saturday
    setTime("Godzina od *", "17:00");
    await submit();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Zajęcia kolidują z planem");
    expect(alert).toHaveTextContent("Grupa INF/Z-3 ma w tym czasie: Bazy danych, sob 16:00–18:00");
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("adds a valid class, confirms, and resets the fields but keeps the group", async () => {
    const { onAdd, submit } = setup();
    await fillValid();
    await userEvent.selectOptions(screen.getByLabelText("Powtarzalność"), "parzyste");
    await submit();

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0]).toMatchObject({
      przedmiot: "Fizyka",
      typ: "wyklad",
      grupaId: "inf-z-3",
      prowadzacyId: "a-krupa",
      dzien: 3,
      od: "18:00",
      do: "19:30",
      sala: "C1",
      powtarzalnosc: "parzyste",
    });
    expect(screen.getByRole("status")).toHaveTextContent("Dodano zajęcia (dane lokalne)");
    expect(screen.getByLabelText("Przedmiot *")).toHaveValue("");
    expect(screen.getByLabelText("Powtarzalność")).toHaveValue("co-tydzien");
    expect(screen.getByLabelText("Grupa")).toHaveValue("inf-z-3");
  });

  it("'Wyczyść formularz' resets everything", async () => {
    const { submit } = setup();
    await userEvent.selectOptions(screen.getByLabelText("Kierunek"), "ekonomia");
    await userEvent.type(screen.getByLabelText("Przedmiot *"), "Fizyka");
    await submit();
    await userEvent.click(screen.getByRole("button", { name: "Wyczyść formularz" }));
    expect(screen.getByLabelText("Kierunek")).toHaveValue("informatyka");
    expect(screen.getByLabelText("Grupa")).toHaveValue("inf-2a");
    expect(screen.getByLabelText("Przedmiot *")).toHaveValue("");
    expect(screen.getByLabelText("Sala *")).not.toHaveAttribute("aria-invalid");
  });
});
