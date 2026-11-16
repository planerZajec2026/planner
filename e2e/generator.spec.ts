import { expect, test } from "./fixtures";

test("shows the default parameters and the last finished job with its report", async ({ page }) => {
  await page.goto("/generator");
  await expect(page.getByLabel("Limit czasu (sekundy)")).toHaveValue("200");
  await expect(page.getByLabel("Godziny skrajne")).toHaveValue("1");

  const job = page.locator('[data-status="done"]').first();
  await expect(job).toContainText("Gotowe");
  await expect(job).toContainText("naruszeń twardych");
  await expect(job).toContainText("5088");
  await expect(job.getByRole("link", { name: "Zobacz plan" })).toHaveAttribute("href", "/plan");
});

test("rejects a time limit outside 200–400 s next to the field", async ({ page }) => {
  await page.goto("/generator");
  await page.getByLabel("Limit czasu (sekundy)").fill("100");
  await page.getByRole("button", { name: "Generuj plan" }).click();
  await expect(page.getByLabel("Limit czasu (sekundy)")).toHaveAccessibleDescription("Podaj liczbę sekund od 200 do 400.");
});

test("queues a job that then shows up in the list", async ({ page }) => {
  await page.goto("/generator");
  await page.getByLabel("Limit czasu (sekundy)").fill("300");
  await page.getByRole("button", { name: "Generuj plan" }).click();
  await expect(page.getByText("Zadanie dodane do kolejki")).toBeVisible();
  await expect(page.locator('[data-status="queued"]').first()).toContainText("limit 300 s");
});
