import AxeBuilder from "@axe-core/playwright";
import { expect, ROUTES, test } from "./fixtures";

async function seriousViolations(page: import("@playwright/test").Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // Known issue: the design palette's --stone, --slate (on --paper) and weekend blue are below 4.5:1.
    // Re-enable once the palette is adjusted (see docs/specs/06-testy.md, "Known issues").
    .disableRules(["color-contrast"])
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
