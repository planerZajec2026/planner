import AxeBuilder from "@axe-core/playwright";
import { expect, ROUTES, test } from "./fixtures";

async function seriousViolations(page: import("@playwright/test").Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} — ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

// Pages that show nothing useful without a selection are checked with one.
const WITH_DATA: Partial<Record<(typeof ROUTES)[number], string>> = {
  "/harmonogram": "/harmonogram?grupa=INF1-R1-G1&tydzien=2026-10-12",
  "/harmonogram-prowadzacych": "/harmonogram-prowadzacych?prowadzacy=P01&tydzien=2026-10-12",
};

for (const route of ROUTES) {
  test(`${route} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(WITH_DATA[route] ?? route);
    expect(await seriousViolations(page)).toEqual([]);
  });
}

test("the weekly plan view has no serious accessibility violations", async ({ page }) => {
  await page.goto("/plan?widok=tydzien&grupa=INF1-R1-G1&tydzien=2");
  await expect(page.locator(".calendar-grid")).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});

test("the generator's form errors have no serious accessibility violations", async ({ page }) => {
  await page.goto("/generator");
  await page.getByLabel("Limit czasu (sekundy)").fill("100");
  await page.getByRole("button", { name: "Generuj plan" }).click();
  await expect(page.getByLabel("Limit czasu (sekundy)")).toHaveAttribute("aria-invalid", "true");
  expect(await seriousViolations(page)).toEqual([]);
});

test("the import page with a rejected file has no serious accessibility violations", async ({ page }) => {
  await page.goto("/import-eksport");
  await page.getByLabel("Plik z danymi").setInputFiles({ name: "zly.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await page.getByLabel(/Rozumiem/).check();
  await page.getByRole("button", { name: "Wgraj dane" }).click();
  await expect(page.getByText("W pliku są błędy. Nic nie zostało wgrane.")).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});
