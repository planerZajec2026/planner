import { PRZYKLADOWY_PLAN } from "../src/lib/import";
import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/import-eksport");
});

test("dropping the design's sample reports 1 class and 1 conflict", async ({ page }) => {
  const dataTransfer = await page.evaluateHandle((json) => {
    const dt = new DataTransfer();
    dt.items.add(new File([json], "plan.json", { type: "application/json" }));
    return dt;
  }, PRZYKLADOWY_PLAN);
  const dropzone = page.locator(".dropzone");
  await dropzone.dispatchEvent("dragover", { dataTransfer });
  await expect(dropzone).toHaveClass(/drag-over/);
  await dropzone.dispatchEvent("drop", { dataTransfer });

  await expect(page.locator(".import-stat")).toHaveText(["1zajęcia w pliku", "0gotowych do importu", "1konflikt"]);
  await expect(page.getByText("Sala B21 jest zajęta: Bazy danych (INF/Z-3), pt 18:00–20:00")).toBeVisible();
  await expect(page.getByRole("button", { name: "Importuj 0 zajęć" })).toBeDisabled();

  await page.getByRole("button", { name: "Zastąp" }).click();
  await page.getByRole("button", { name: "Importuj 1 zajęcia" }).click();
  await expect(page.getByText("Zaimportowano (dane lokalne)")).toBeVisible();
});

test("a malformed file shows a readable Polish error", async ({ page }) => {
  await page.getByLabel("Plik JSON z planem zajęć").setInputFiles({
    name: "zly.json",
    mimeType: "application/json",
    buffer: Buffer.from("{ nie json"),
  });
  const alert = page.getByRole("region", { name: "Import z pliku JSON" }).getByRole("alert");
  await expect(alert).toContainText("Nie udało się wczytać pliku „zly.json”");
  await expect(alert).toContainText("Nieprawidłowy plik JSON");
});

test("the manual form blocks a missing field and od >= do, then adds a valid class", async ({ page }) => {
  const add = page.getByRole("button", { name: "Dodaj zajęcia do planu" });
  await add.click();
  await expect(page.getByLabel("Sala *")).toHaveAttribute("aria-invalid", "true");

  await page.getByLabel("Przedmiot *").fill("Fizyka");
  await page.getByLabel("Godzina od *").fill("12:00");
  await page.getByLabel("Godzina do *").fill("10:00");
  await page.getByLabel("Sala *").fill("C1");
  await add.click();
  await expect(page.getByText("Godzina zakończenia musi być późniejsza niż rozpoczęcia")).toBeVisible();

  await page.getByLabel("Dzień tygodnia").selectOption("3");
  await page.getByLabel("Godzina od *").fill("18:00");
  await page.getByLabel("Godzina do *").fill("19:30");
  await add.click();
  await expect(page.getByText("Dodano zajęcia (dane lokalne)")).toBeVisible();
});

test("export explains that the backend is needed", async ({ page }) => {
  await page.getByLabel("Zakres eksportu").selectOption("grupa");
  await expect(page.getByRole("region", { name: "Eksport danych" }).getByLabel("Grupa")).toHaveValue("inf-2a");
  await page.locator(".export-row").getByRole("button", { name: "Eksportuj do Excela" }).click();
  await expect(page.getByText("Eksport będzie dostępny po podłączeniu backendu")).toBeVisible();
});

test.describe("narrow window", () => {
  test.use({ viewport: { width: 780, height: 900 } });

  test("the import card stacks into one column", async ({ page }) => {
    const columns = await page.locator(".two-col").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(columns).toBe(1);
  });
});
