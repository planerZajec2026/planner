import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProwadzacyForm } from "./ProwadzacyForm";

const setup = () => {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(<ProwadzacyForm onSave={onSave} onCancel={onCancel} />);
  return { onSave, onCancel, save: () => userEvent.click(screen.getByRole("button", { name: "Zapisz prowadzącego" })) };
};

describe("ProwadzacyForm", () => {
  it("focuses the first field when opened", () => {
    setup();
    expect(screen.getByLabelText("Imię *")).toHaveFocus();
  });

  it("shows required-field errors and focuses the first invalid field", async () => {
    const { onSave, save } = setup();
    await userEvent.click(screen.getByLabelText("Instytut / Katedra"));
    await save();

    for (const label of ["Imię *", "Nazwisko *", "E-mail *"]) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription("To pole jest wymagane");
    }
    expect(screen.getByLabelText("Imię *")).toHaveFocus();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects a malformed e-mail", async () => {
    const { onSave, save } = setup();
    await userEvent.type(screen.getByLabelText("Imię *"), "Katarzyna");
    await userEvent.type(screen.getByLabelText("Nazwisko *"), "Lewandowska");
    await userEvent.type(screen.getByLabelText("E-mail *"), "zly-adres");
    await save();
    expect(screen.getByLabelText("E-mail *")).toHaveAccessibleDescription("Nieprawidłowy adres e-mail");
    expect(screen.getByLabelText("E-mail *")).toHaveFocus();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("clears a field's error when it is edited", async () => {
    const { save } = setup();
    await save();
    await userEvent.type(screen.getByLabelText("Nazwisko *"), "N");
    expect(screen.getByLabelText("Nazwisko *")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Imię *")).toHaveAttribute("aria-invalid", "true");
  });

  it("saves trimmed values once", async () => {
    const { onSave, save } = setup();
    await userEvent.type(screen.getByLabelText("Imię *"), "  Katarzyna ");
    await userEvent.type(screen.getByLabelText("Nazwisko *"), "Lewandowska");
    await userEvent.selectOptions(screen.getByLabelText("Tytuł naukowy"), "dr inż.");
    await userEvent.type(screen.getByLabelText("Instytut / Katedra"), "Instytut Elektroniki");
    await userEvent.type(screen.getByLabelText("E-mail *"), "k.lewandowska@uczelnia.edu.pl");
    await userEvent.type(screen.getByLabelText("Przedmioty"), "Bazy danych , SQL,, ");
    await save();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      tytul: "dr inż.",
      imie: "Katarzyna",
      nazwisko: "Lewandowska",
      instytut: "Instytut Elektroniki",
      email: "k.lewandowska@uczelnia.edu.pl",
      przedmioty: ["Bazy danych", "SQL"],
      zdjecieUrl: undefined,
    });
  });

  it("describes the subjects field with its hint", () => {
    setup();
    expect(screen.getByLabelText("Przedmioty")).toHaveAccessibleDescription("Oddziel przecinkami");
  });

  it("cancels", async () => {
    const { onCancel } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Anuluj" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
