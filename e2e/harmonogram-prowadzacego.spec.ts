import { classBlocks, expect, test } from "./fixtures";

const stats = (page: import("@playwright/test").Page) => page.locator(".summary-stat");

test("dr P01 shows the generated plan, with calculated stats", async ({ page }) => {
  await page.goto("/harmonogram-prowadzacych?prowadzacy=P01&tydzien=2026-10-12");
  await expect(page.locator(".summary-card .instructor-name")).toHaveText("dr P01");
  await expect(page.locator(".summary-card .instructor-role")).toHaveText("WFiIS");
  await expect(stats(page)).toHaveText(["w tym tygodniu7,75 godz.", "spotkań5", "grupy4"]);

  const blocks = await classBlocks(page);
  expect(blocks.map((b) => [b.column, b.row])).toEqual([
    [2, "11 / 18"],
    [3, "19 / 26"],
    [4, "19 / 26"],
    [4, "27 / 34"],
    [6, "27 / 30"],
  ]);
  expect(blocks[0].meta).toBe("A272 · INF2-R1 · Cały rocznik");
  expect(blocks[3].meta).toBe("A234 · INF2-R1 · Grupa L2");
});

test("switching instructor and week updates the card, stats and grid", async ({ page }) => {
  await page.goto("/harmonogram-prowadzacych?prowadzacy=P01&tydzien=2026-10-12");
  await page.getByLabel("Prowadzący").selectOption("P02");
  await expect(page).toHaveURL(/prowadzacy=P02/);
  await expect(page.locator(".summary-card .instructor-name")).toHaveText("dr P02");
  await expect(stats(page)).toHaveText(["w tym tygodniu5,25 godz.", "spotkania3", "grupy3"]);
  // A class held every other week moves between groups and days from one week to the next.
  expect((await classBlocks(page))[0]).toMatchObject({ column: 4, meta: "A123 · INF1-R2 · Grupa 3" });

  await page.getByRole("button", { name: "Następny tydzień" }).click();
  await expect(page).toHaveURL(/tydzien=2026-10-19/);
  await expect(page.locator(".day-header").first()).toHaveText("Pon19.10");
  expect((await classBlocks(page))[0]).toMatchObject({ column: 2, meta: "A121 · INF1-R2 · Grupa 2" });
});

test("defaults to the first instructor", async ({ page }) => {
  await page.goto("/harmonogram-prowadzacych?tydzien=2026-10-12");
  await expect(page.getByLabel("Prowadzący")).toHaveValue("P01");
});

test("back link returns to the instructor list", async ({ page }) => {
  await page.goto("/harmonogram-prowadzacych?prowadzacy=P01&tydzien=2026-10-12");
  await page.getByRole("link", { name: "← Prowadzący" }).click();
  await expect(page).toHaveURL(/\/prowadzacy$/);
});
