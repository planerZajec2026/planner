import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/kierunki");
});

const headings = (page: import("@playwright/test").Page) => page.getByRole("region").getByRole("heading");

test("lists the programmes with their groups", async ({ page }) => {
  await expect(headings(page)).toHaveText(["Informatyka", "Zarządzanie", "Ekonomia"]);
  await expect(page.getByText("4 grupy")).toBeVisible();
  await expect(page.getByText("INF/Z-3", { exact: true })).toBeVisible();
});

test("search narrows by programme or group and shows an empty state", async ({ page }) => {
  const search = page.getByRole("searchbox", { name: "Szukaj kierunku lub grupy" });
  await search.fill("ekonom");
  await expect(headings(page)).toHaveText(["Ekonomia"]);
  await search.fill("zip/z");
  await expect(headings(page)).toHaveText(["Zarządzanie"]);
  await expect(page.getByText("ZIP-1A", { exact: true })).toHaveCount(0);
  await search.fill("xyz");
  await expect(page.getByText("Brak wyników dla „xyz”.")).toBeVisible();
});

test("a group's link opens its timetable", async ({ page }) => {
  await page.getByRole("link", { name: "Harmonogram grupy INF/Z-3" }).click();
  await expect(page).toHaveURL(/\/harmonogram\?grupa=inf-z-3$/);
  await expect(page.getByLabel("Grupa")).toHaveValue("inf-z-3");
});
