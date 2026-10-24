import { expect, test } from "./fixtures";

const names = (page: import("@playwright/test").Page) => page.locator(".instructor-name");

test.beforeEach(async ({ page }) => {
  await page.goto("/prowadzacy");
});

test("shows the 50 instructors of the input data, by their pseudonyms", async ({ page }) => {
  await expect(names(page)).toHaveCount(50);
  await expect(names(page).first()).toHaveText("dr P01");
  await expect(page.getByRole("article", { name: "mgr P03" })).toContainText("SJO");
});

test("each card lists the subjects the instructor teaches, and there is no e-mail", async ({ page }) => {
  const card = page.getByRole("article", { name: "dr P01" });
  await expect(card.locator(".tag")).toHaveText(["Kryptografia i bezpieczeństwo systemów", "Projektowanie sieci komputerowych"]);
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
});

test("searching by subject leaves only the instructors who teach it", async ({ page }) => {
  await page.getByRole("searchbox").fill("kryptografia");
  await expect(names(page)).toHaveText(["dr P01"]);
  await page.getByRole("searchbox").fill("xyz");
  await expect(page.getByText("Brak prowadzących spełniających kryteria.")).toBeVisible();
});

test("there is no way to add an instructor here", async ({ page }) => {
  await expect(page.getByRole("button", { name: /Dodaj prowadzącego/ })).toHaveCount(0);
});

test("'Zobacz harmonogram' opens the instructor's timetable", async ({ page }) => {
  await page.getByRole("article", { name: "dr P01" }).getByRole("link", { name: "Zobacz harmonogram" }).click();
  await expect(page).toHaveURL(/\/harmonogram-prowadzacych\?prowadzacy=P01$/);
  await expect(page.getByLabel("Prowadzący")).toHaveValue("P01");
});
