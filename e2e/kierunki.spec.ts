import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/kierunki");
});

const headings = (page: import("@playwright/test").Page) => page.getByRole("region").getByRole("heading");

test("lists the programme with all 51 groups of the input data", async ({ page }) => {
  await expect(headings(page)).toHaveText(["Informatyka"]);
  await expect(page.getByText("51 grup")).toBeVisible();
  await expect(page.getByText("INF1-R1-G1", { exact: true })).toBeVisible();
  await expect(page.locator(".grupa-row")).toHaveCount(51);
});

test("a group row shows its year and students, and there is no study mode any more", async ({ page }) => {
  const row = page.locator(".grupa-row", { hasText: "INF1-R1-G1" });
  await expect(row).toContainText("Informatyka I st., rok I, sem. I");
  await expect(row).toContainText("24 studentów");
  await expect(page.getByText(/stacjonarne/i)).toHaveCount(0);
});

test("search narrows by programme or group and shows an empty state", async ({ page }) => {
  const search = page.getByRole("searchbox", { name: "Szukaj kierunku lub grupy" });
  await search.fill("inf1-r4-sem");
  await expect(headings(page)).toHaveText(["Informatyka"]);
  await expect(page.locator(".grupa-row")).toHaveCount(6);
  await expect(page.getByText("INF1-R1-G1", { exact: true })).toHaveCount(0);
  await search.fill("informat");
  await expect(page.locator(".grupa-row")).toHaveCount(51);
  await search.fill("xyz");
  await expect(page.getByText("Brak wyników dla „xyz”.")).toBeVisible();
});

test("a group's link opens its timetable", async ({ page }) => {
  await page.getByRole("link", { name: "Harmonogram grupy INF1-R1-G1" }).click();
  await expect(page).toHaveURL(/\/harmonogram\?grupa=INF1-R1-G1$/);
  await expect(page.getByLabel("Grupa")).toHaveValue("INF1-R1-G1");
});
