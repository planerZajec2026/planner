import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// Spec 16. Nothing is saved here: the other specs run in parallel and count classes per day and slot. Saving a move is
// covered by the form in edycja-planu.spec.ts, which uses the same Server Action.
const ADRES = "/plan/edycja?grupa=INF1-R1-G1";

const kafelek = (page: Page, id: string) => page.locator(`[data-zajecia="${id}"]`);

/** Picks a tile up by its first slot and drags it over the first start time in the given state. */
async function przeciagnij(page: Page, tile: Locator, stan: "wolny" | "konflikt") {
  const box = (await tile.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + 30, { steps: 4 });
  const komorka = page.locator(`.tablica-komorka.${stan}`).first();
  await expect(komorka).toBeVisible();
  const cel = (await komorka.boundingBox())!;
  await page.mouse.move(cel.x + cel.width / 2, cel.y + cel.height / 2, { steps: 8 });
  await expect(page.locator(`.tablica-cel.${stan}`)).toBeVisible();
  await page.mouse.up();
}

test("dragging a class over the board colours the times and a drop asks for confirmation", async ({ page }) => {
  await page.goto(ADRES);
  const tile = kafelek(page, "Z002");
  await expect(tile).toBeVisible();
  const przed = await tile.getAttribute("style");

  await przeciagnij(page, tile, "wolny");

  const okno = page.getByRole("dialog", { name: "Przenieść zajęcia?" });
  await expect(okno).toBeVisible();
  await expect(okno.getByRole("columnheader")).toHaveText(["Teraz", "Po zmianie"]);
  await expect(okno.getByRole("row", { name: /^Dzień/ })).toContainText("Poniedziałek");
  await expect(okno).toContainText("Nowy termin nie łamie żadnych ograniczeń.");
  await expect(okno).toContainText(/Kara miękkich: [\d\s]+ → [\d\s]+/);
  await expect(okno.getByRole("button", { name: "Zapisz zmianę" })).toBeEnabled();
  expect(await new AxeBuilder({ page }).include("dialog").withTags(["wcag2a", "wcag2aa"]).analyze()).toMatchObject({
    violations: [],
  });

  await okno.getByRole("button", { name: "Anuluj" }).click();
  await expect(okno).toHaveCount(0);
  // Nothing moved.
  await expect(tile).toHaveAttribute("style", przed!);
});

test("a drop on a conflicting time lists the conflicts and cannot be saved", async ({ page }) => {
  await page.goto(ADRES);
  await przeciagnij(page, kafelek(page, "Z002"), "konflikt");

  const okno = page.getByRole("dialog", { name: "Przenieść zajęcia?" });
  await expect(okno).toContainText("Tego terminu nie da się zapisać");
  await expect(okno.getByRole("button", { name: "Zapisz zmianę" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(okno).toHaveCount(0);
});

test("a class opened by link is selected; clicking another one selects it with its form", async ({ page }) => {
  await page.goto("/plan/edycja?zajecia=Z002");
  await expect(page.getByLabel("Grupa")).toHaveValue("INF1-R1-G1");
  await expect(kafelek(page, "Z002")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Edycja zajęć Z002")).toBeVisible();

  await kafelek(page, "Z001").click();
  await expect(page.getByText("Edycja zajęć Z001")).toBeVisible();
  await expect(kafelek(page, "Z001")).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/zajecia=Z001/);
});

test("the filter shows one instructor or room and keeps the selected class", async ({ page }) => {
  await page.goto("/plan/edycja?zajecia=Z001");
  await page.getByLabel("Pokaż").selectOption("prowadzacy");
  await expect(page).toHaveURL(/prowadzacy=P39/);
  await expect(page).toHaveURL(/zajecia=Z001/);
  await expect(kafelek(page, "Z001")).toBeVisible();

  await page.getByLabel("Pokaż").selectOption("sala");
  await expect(page).toHaveURL(/sala=A283/);
  await expect(page.locator(".tablica-kafelek .meta").first()).not.toContainText("A283");
});

test.describe("on a laptop screen", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("selecting a class at the bottom of the board keeps a single scrollbar", async ({ page }) => {
    await page.goto(ADRES);
    await page.locator(".content").evaluate((main) => main.scrollTo(0, main.scrollHeight));
    await page.locator(".tablica-kafelek").last().click();
    await expect(page.getByText(/^Edycja zajęć Z\d+/)).toBeVisible();
    // Only main.content scrolls; the window never does (a hidden live region used to stick out below it).
    expect(await page.evaluate(() => document.scrollingElement!.scrollHeight)).toBeLessThanOrEqual(720);
  });
});
