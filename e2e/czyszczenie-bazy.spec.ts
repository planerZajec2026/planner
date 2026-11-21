import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

// Spec 17. The database is never cleared here: every other spec runs in parallel on the same data. Clearing itself is
// covered by the pgTAP test of wyczysc_dane_planu and the unit tests of the Server Action.
test("clearing the database asks for the typed phrase and can be cancelled", async ({ page }) => {
  await page.goto("/import");
  const strefa = page.getByRole("region", { name: "Strefa zagrożenia" });
  await strefa.getByRole("button", { name: "Wyczyść bazę danych…" }).click();

  const okno = page.getByRole("dialog", { name: "Wyczyścić całą bazę danych?" });
  await expect(okno).toContainText("Tej operacji nie da się cofnąć.");
  await expect(okno).toContainText(/zajęcia do zaplanowania: \d+/);

  const pole = okno.getByLabel("Aby potwierdzić, wpisz wyczyść bazę danych");
  const przycisk = okno.getByRole("button", { name: "Rozumiem, wyczyść bazę danych" });
  await expect(przycisk).toBeDisabled();
  await pole.fill("Wyczyść bazę danych");
  await expect(przycisk).toBeDisabled();
  await pole.fill("wyczyść bazę danych");
  await expect(przycisk).toBeEnabled();

  const { violations } = await new AxeBuilder({ page }).include("dialog").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);

  await okno.getByRole("button", { name: "Anuluj" }).click();
  await expect(okno).toHaveCount(0);
  await expect(page.getByText(/W bazie jest już \d+ zajęć do zaplanowania/)).toBeVisible();
});
