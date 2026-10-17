import { classBlocks, expect, test } from "./fixtures";

const stats = (page: import("@playwright/test").Page) => page.locator(".summary-stat");

test("dr Paweł Zieliński reproduces the design, with calculated stats", async ({ page }) => {
  await page.goto("/harmonogram-prowadzacych?prowadzacy=p-zielinski&tydzien=2026-10-12");
  await expect(page.locator(".summary-card .instructor-name")).toHaveText("dr Paweł Zieliński");
  await expect(page.locator(".summary-card .instructor-role")).toHaveText("Instytut Informatyki · p.zielinski@uczelnia.edu.pl");
  await expect(stats(page)).toHaveText(["w tym tygodniu8 godz.", "grupy3", "tryby studiów2"]);

  const blocks = await classBlocks(page);
  // Mon 10–12, Tue 14–16, Fri 16–18, Sun 10–12
  expect(blocks.map((b) => [b.column, b.row])).toEqual([
    [2, "10 / 18"],
    [3, "26 / 34"],
    [6, "34 / 42"],
    [8, "10 / 18"],
  ]);
  expect(blocks[0].meta).toBe("B21 · Grupa INF-2A · stacjonarne");
  expect(blocks[3].meta).toBe("Lab 4 · Grupa INF/Z-3 · niestacjonarne");
});

test("switching instructor and week updates the card, stats and grid", async ({ page }) => {
  await page.goto("/harmonogram-prowadzacych?prowadzacy=p-zielinski&tydzien=2026-10-12");
  await page.getByLabel("Prowadzący").selectOption("t-gorski");
  await expect(page).toHaveURL(/prowadzacy=t-gorski/);
  await expect(page.locator(".summary-card .instructor-name")).toHaveText("mgr inż. Tomasz Górski");
  await expect(stats(page)).toHaveText(["w tym tygodniu8 godz.", "grupy3", "tryby studiów2"]);

  await page.getByRole("button", { name: "Następny tydzień" }).click();
  await expect(page).toHaveURL(/tydzien=2026-10-19/);
  await expect(stats(page)).toHaveText(["w tym tygodniu6 godz.", "grupy2", "tryby studiów2"]);
  expect(await classBlocks(page)).toHaveLength(3);
});

test("defaults to the first instructor", async ({ page }) => {
  await page.goto("/harmonogram-prowadzacych?tydzien=2026-10-12");
  await expect(page.getByLabel("Prowadzący")).toHaveValue("e-kaminska");
});

test("back link returns to the instructor list", async ({ page }) => {
  await page.goto("/harmonogram-prowadzacych?prowadzacy=p-zielinski&tydzien=2026-10-12");
  await page.getByRole("link", { name: "← Prowadzący" }).click();
  await expect(page).toHaveURL(/\/prowadzacy$/);
});
