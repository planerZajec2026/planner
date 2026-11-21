import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, streamed, test } from "./fixtures";

// The other specs run in parallel against the same plan and count classes per day, room and instructor. The edit that
// is really saved here therefore changes only the room of one lecture that none of them looks at, and never to a room
// they filter or assert on.
const ZAJECIA = "Z099";
const PROWADZACY = "P15";
const SALE_INNYCH_TESTOW = new Set(["A283", "A272", "A234", "A123", "A121", "A281"]);

const zapisz = (page: Page) => page.getByRole("button", { name: "Zapisz zmianę" });
const obecnyTermin = (page: Page) => page.locator(".edycja-meta div", { hasText: "Obecny termin" });

/** A room that fits the class, is free at its current time and is not `bez`. */
async function wolnaSala(page: Page, bez: string[]): Promise<string> {
  const opcje = await page
    .getByLabel("Sala")
    .locator("option")
    .evaluateAll((els) => els.map((o) => ({ id: (o as HTMLOptionElement).value, opis: o.textContent ?? "" })));
  const sala = opcje.find((o) => !bez.includes(o.id) && !SALE_INNYCH_TESTOW.has(o.id) && !o.opis.endsWith("(zajęta)"));
  expect(sala, "the plan should leave a free room for the lecture").toBeDefined();
  return sala!.id;
}

test("a class is opened from the plan and the form starts from its current placement", async ({ page }) => {
  await page.goto(`/plan?prowadzacy=${PROWADZACY}`);
  await page.getByRole("link", { name: `Edytuj ${ZAJECIA}` }).click();

  await expect(page).toHaveURL(new RegExp(`/plan/edycja\\?zajecia=${ZAJECIA}`));
  await expect(page.getByText(`Edycja zajęć ${ZAJECIA}`)).toBeVisible();
  await expect(page.getByText(/To obecny termin zajęć/)).toBeVisible();
  await expect(page.getByText(/^Kara miękkich planu: [\d\s]+/)).toBeVisible();
  await expect(zapisz(page)).toBeDisabled();
  // The way back keeps the plan's filters.
  await expect(page.getByRole("link", { name: "Wróć do planu" }).last()).toHaveAttribute("href", `/plan?prowadzacy=${PROWADZACY}`);

  // Another free room at the same time; nothing is saved until the button is pressed.
  const dzien = await page.getByLabel("Dzień").inputValue();
  const poczatek = await page.getByLabel("Początek").inputValue();
  const sala = await page.getByLabel("Sala").inputValue();
  await page.getByLabel("Sala").selectOption(await wolnaSala(page, [sala]));
  await expect(page.getByText(/nie łamie żadnych ograniczeń/)).toBeVisible();
  // The penalty is recomputed for the chosen time (spec 15).
  await expect(page.locator(".kara-zmiana")).toContainText(/^Kara miękkich: [\d\s]+ → [\d\s]+ \(([+−][\d\s]+|0)\)/);
  await expect(page.locator(".kara-zmiana")).toContainText(/Ta zmiana (zmniejsza|zwiększa|nie zmienia) kar/);
  await expect(zapisz(page)).toBeEnabled();

  await page.getByRole("button", { name: "Przywróć obecny termin" }).click();
  await expect(page.getByLabel("Dzień")).toHaveValue(dzien);
  await expect(page.getByLabel("Początek")).toHaveValue(poczatek);
  await expect(page.getByLabel("Sala")).toHaveValue(sala);
  await expect(zapisz(page)).toBeDisabled();
});

test("a conflicting time is explained and cannot be saved", async ({ page }) => {
  // Z001 is taught by a member of the Faculty Council, which meets on Tuesday at 16:15.
  await page.goto("/plan/edycja?zajecia=Z001");
  await page.getByLabel("Dzień").selectOption({ label: "Wtorek" });
  await page.getByLabel("Początek").selectOption({ label: "16:15–18:00" }); // two 45-minute units with a break

  await expect(page.getByText("Tego terminu nie da się zapisać")).toBeVisible();
  await expect(page.getByText(/Rada Wydziału/)).toBeVisible();
  await expect(zapisz(page)).toBeDisabled();

  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});

test("a saved change shows in the plan, the export and the generator; a stale form is refused", async ({ page, context }) => {
  const adres = `/plan/edycja?zajecia=${ZAJECIA}`;
  await page.goto(adres);
  const poczatkowa = await page.getByLabel("Sala").inputValue();

  // A second tab opens the same class before the first one saves.
  const druga = await context.newPage();
  await druga.goto(adres);
  await streamed(druga);

  const nowa = await wolnaSala(page, [poczatkowa]);
  await page.getByLabel("Sala").selectOption(nowa);
  await zapisz(page).click();

  await expect(page.getByText(new RegExp(`^Zapisano: .*sala ${nowa}\\.`))).toBeVisible();
  // The page got the saved plan back: the new room is now the current one, so there is nothing left to save.
  await expect(obecnyTermin(page)).toContainText(`sala ${nowa}`);
  await expect(zapisz(page)).toBeDisabled();

  await page.getByRole("link", { name: "Wróć do planu" }).last().click();
  const wiersz = page.locator(".plan-table tr", { hasText: ZAJECIA });
  await expect(wiersz).toContainText(nowa);
  await expect(wiersz).toContainText("zmienione ręcznie");
  await expect(page.getByText(/zmienione ręcznie: \d+/)).toBeVisible();

  const eksport = await (await page.request.get(`/plan/eksport?format=json&prowadzacy=${PROWADZACY}`)).json();
  expect(eksport.zadanie.zmiany_reczne).toBeGreaterThan(0);
  expect(eksport.zajecia.find((z: { id: string }) => z.id === ZAJECIA)).toMatchObject({ sala: nowa, zmienione_recznie: true });

  await page.goto("/generator");
  await expect(page.getByText(/Aktywny plan ma zmiany ręczne/)).toBeVisible();

  // The second tab still shows the plan from before the change. Its save is refused and the form gets fresh data.
  const trzecia = await wolnaSala(druga, [poczatkowa, nowa]);
  await druga.getByLabel("Sala").selectOption(trzecia);
  await zapisz(druga).click();
  await expect(druga.getByText(/Plan został w międzyczasie zmieniony/)).toBeVisible();
  await expect(obecnyTermin(druga)).toContainText(`sala ${nowa}`);

  // With the fresh data the same form saves; this also puts the lecture back where it was.
  await druga.getByLabel("Sala").selectOption(poczatkowa);
  await zapisz(druga).click();
  await expect(druga.getByText(new RegExp(`^Zapisano: .*sala ${poczatkowa}\\.`))).toBeVisible();
  await expect(obecnyTermin(druga)).toContainText(`sala ${poczatkowa}`);
  await druga.close();
});

test("a link to a class that is not in the plan says so instead of failing", async ({ page }) => {
  await page.goto("/plan/edycja?zajecia=Z999");
  await expect(page.getByText("Zajęć Z999 nie ma w aktualnym planie.")).toBeVisible();

  await page.goto("/plan/edycja");
  await expect(page.getByText("Nie wybrano zajęć do edycji.")).toBeVisible();
  await page.getByRole("link", { name: "Wróć do planu" }).click();
  await expect(page).toHaveURL(/\/plan$/);
});

test("the edit page fits a phone screen", { tag: "@phone" }, async ({ page }) => {
  await page.goto(`/plan/edycja?zajecia=${ZAJECIA}`);
  await expect(page.getByRole("table")).toBeVisible();
  expect(await page.evaluate(() => document.scrollingElement!.scrollWidth > window.innerWidth)).toBe(false);
});
