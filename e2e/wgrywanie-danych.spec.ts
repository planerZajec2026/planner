import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";

// These tests replace all input data and plans in the database, so they run alone, after the others
// (the "wgrywanie-danych" project in playwright.config.ts). Every run starts from the global setup again.

const json = readFileSync("requirements/dane_planu.json", "utf8");
const xlsx = readFileSync("requirements/dane_planu.xlsx");

test.describe.configure({ mode: "serial" });

test("a file with errors is rejected with the list of problems and changes nothing", async ({ page }) => {
  const dane = JSON.parse(json);
  delete dane.sale;
  dane.zajecia[1].liczba_spotkan = "dziewięć";

  await page.goto("/import-eksport");
  await page.getByLabel("Plik z danymi").setInputFiles({ name: "zly.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(dane)) });
  await page.getByLabel(/Rozumiem/).check();
  await page.getByRole("button", { name: "Wgraj dane" }).click();

  await expect(page.getByText("W pliku są błędy. Nic nie zostało wgrane.")).toBeVisible();
  await expect(page.getByText("Brakuje tabeli „sale”.")).toBeVisible();
  await expect(page.getByText(/zajecia, wiersz 2: niepoprawna wartość w kolumnie „liczba_spotkan”/)).toBeVisible();

  await page.goto("/plan");
  await expect(page.getByText("174 zajęć", { exact: true })).toBeVisible(); // the plan is still there
});

test("the upload needs the confirmation", async ({ page }) => {
  await page.goto("/import-eksport");
  await page.getByLabel("Plik z danymi").setInputFiles({ name: "dane_planu.json", mimeType: "application/json", buffer: Buffer.from(json) });
  await page.getByRole("button", { name: "Wgraj dane" }).click();
  await expect(page.getByText(/Potwierdź, że wgranie danych/)).toBeVisible();
});

test("loading dane_planu.xlsx replaces the data and drops the generated plan", async ({ page }) => {
  await page.goto("/import-eksport");
  await expect(page.getByText(/W bazie jest już 174 zajęć do zaplanowania/)).toBeVisible();
  await page.getByLabel("Plik z danymi").setInputFiles({ name: "dane_planu.xlsx", mimeType: "application/octet-stream", buffer: xlsx });
  await page.getByLabel(/Rozumiem/).check();
  await page.getByRole("button", { name: "Wgraj dane" }).click();
  await expect(page.getByText(/174 zajęć do zaplanowania, 55 sal, 50 prowadzących, 51 grup, 6 roczników, 372 studentów/)).toBeVisible();

  // The data is there, the plan generated from the old data is gone.
  await page.goto("/kierunki");
  await expect(page.getByText("51 grup")).toBeVisible();
  await page.goto("/plan");
  await expect(page.getByText(/Nie wygenerowano jeszcze żadnego planu/)).toBeVisible();
  await page.goto("/harmonogram?grupa=INF1-R1-G1");
  await expect(page.getByText(/Nie wygenerowano jeszcze planu/)).toBeVisible();
});

test("the same data loads from the JSON file too", async ({ page }) => {
  await page.goto("/import-eksport");
  await page.getByLabel("Plik z danymi").setInputFiles({ name: "dane_planu.json", mimeType: "application/json", buffer: Buffer.from(json) });
  await page.getByLabel(/Rozumiem/).check();
  await page.getByRole("button", { name: "Wgraj dane" }).click();
  await expect(page.getByText(/174 zajęć do zaplanowania, 55 sal/)).toBeVisible();
});
