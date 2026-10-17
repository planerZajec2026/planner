import AxeBuilder from "@axe-core/playwright";
import { PRZYKLADOWY_PLAN } from "../src/lib/import";
import { expect, ROUTES, test } from "./fixtures";

async function seriousViolations(page: import("@playwright/test").Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} — ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

for (const route of ROUTES) {
  test(`${route} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(route === "/harmonogram" ? "/harmonogram?grupa=inf-z-3&tydzien=2026-10-12" : route);
    expect(await seriousViolations(page)).toEqual([]);
  });
}

test("the add-instructor form has no serious accessibility violations", async ({ page }) => {
  await page.goto("/prowadzacy");
  await page.getByRole("button", { name: "+ Dodaj prowadzącego" }).click();
  await page.getByRole("button", { name: "Zapisz prowadzącego" }).click(); // include the error state
  expect(await seriousViolations(page)).toEqual([]);
});

test("import results, banners and form errors have no serious accessibility violations", async ({ page }) => {
  await page.goto("/import-eksport");
  await page.getByLabel("Plik JSON z planem zajęć").setInputFiles({
    name: "plan.json",
    mimeType: "application/json",
    buffer: Buffer.from(PRZYKLADOWY_PLAN),
  });
  await expect(page.getByText("Podgląd importu")).toBeVisible();
  await page.getByRole("button", { name: "Dodaj zajęcia do planu" }).click();
  await page.locator(".export-row").getByRole("button", { name: "Eksportuj do Excela" }).click();
  expect(await seriousViolations(page)).toEqual([]);
});
