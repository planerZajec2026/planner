import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
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

test("the active plan lists the places to improve, each opening the editor with a way back", async ({ page }) => {
  await page.goto("/generator");
  const job = page.locator('[data-status="done"]').first();
  const problemy = job.getByRole("region", { name: "Do poprawy" });
  await expect(problemy).toContainText("Plan spełnia wszystkie ograniczenia twarde");
  await expect(problemy.locator("li.problem").first()).toContainText(/kara \d/);

  const link = problemy.locator(".problem-zajecia a").first();
  await expect(link).toHaveAttribute("href", /^\/plan\/edycja\?zajecia=Z\d+&powrot=generator$/);
  await link.click();
  await expect(page).toHaveURL(/\/plan\/edycja\?zajecia=Z\d+&powrot=generator$/);
  await expect(page.getByText(/^Edycja zajęć Z\d+/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Wróć do generatora" }).last()).toHaveAttribute("href", "/generator");
});

test("a running job shows the progress the worker reported", async ({ page }) => {
  // The worker is not run in tests: the row is what it would have written mid-run (spec 15).
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // CI passes the variables in the environment.
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const id = randomUUID();
  const teraz = new Date().toISOString();
  const wstawiono = await supabase.from("generation_jobs").insert({
    id,
    status: "running",
    parametry: { limit_czasu: 200 },
    rozpoczeto: teraz,
    postep: { etap: "optymalizacja", uplynelo_s: 50, limit_s: 200, rozwiazania: 3, kara: 7000, kara_startowa: 9000, dolna_granica: 2650, zaktualizowano: teraz },
  });
  expect(wstawiono.error).toBeNull();
  try {
    await page.goto("/generator");
    const job = page.locator('[data-status="running"]').first();
    await expect(job.getByRole("progressbar", { name: "Postęp generowania" })).toHaveAttribute("aria-valuenow", "25");
    await expect(job).toContainText("Etap 2 z 2: optymalizacja");
    await expect(job).toContainText("czas solvera: 50 z 200 s");
    await expect(job).toContainText("kara wg solvera (start 9000)");
  } finally {
    await supabase.from("generation_jobs").delete().eq("id", id);
  }
});
