import { expect, test } from "./fixtures";

const names = (page: import("@playwright/test").Page) => page.locator(".instructor-name");

// A 1×1 PNG, enough for the photo preview.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test.beforeEach(async ({ page }) => {
  await page.goto("/prowadzacy");
});

test("shows the 6 instructors from the design", async ({ page }) => {
  await expect(names(page)).toHaveText([
    "prof. Ewa Kamińska",
    "dr hab. Marta Nowak",
    "mgr inż. Tomasz Górski",
    "dr Paweł Zieliński",
    "dr Marek Sobolewski",
    "mgr Alicja Krupa",
  ]);
});

test("searching 'sieci' leaves only dr Paweł Zieliński", async ({ page }) => {
  await page.getByRole("searchbox").fill("sieci");
  await expect(names(page)).toHaveText(["dr Paweł Zieliński"]);
});

test("invalid submit shows errors; valid submit with a photo adds a card", async ({ page }) => {
  await page.getByRole("button", { name: "+ Dodaj prowadzącego" }).click();
  await page.getByRole("button", { name: "Zapisz prowadzącego" }).click();
  await expect(page.locator(".field-error")).toHaveText(["To pole jest wymagane", "To pole jest wymagane", "To pole jest wymagane"]);

  await page.getByLabel("Imię *").fill("Katarzyna");
  await page.getByLabel("Nazwisko *").fill("Lewandowska");
  await page.getByLabel("E-mail *").fill("zly-adres");
  await page.getByRole("button", { name: "Zapisz prowadzącego" }).click();
  await expect(page.locator(".field-error")).toHaveText(["Nieprawidłowy adres e-mail"]);

  await page.getByLabel("E-mail *").fill("k.lewandowska@uczelnia.edu.pl");
  await page.getByLabel("Przedmioty").fill("Elektronika, Miernictwo");
  await page.getByLabel("Zdjęcie").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Zapisz prowadzącego" }).click();

  await expect(page.getByRole("status")).toHaveText("Dodano prowadzącego (dane lokalne)");
  await expect(names(page).first()).toHaveText("mgr Katarzyna Lewandowska");
  const card = page.getByRole("article", { name: "mgr Katarzyna Lewandowska" });
  await expect(card.locator(".avatar img")).toBeVisible();
  await expect(card.locator(".tag")).toHaveText(["Elektronika", "Miernictwo"]);
  await expect(page.getByRole("form")).toHaveCount(0);
});

test("'Zobacz harmonogram' opens the instructor's timetable", async ({ page }) => {
  await page.getByRole("article", { name: "dr Paweł Zieliński" }).getByRole("link", { name: "Zobacz harmonogram" }).click();
  await expect(page).toHaveURL(/\/harmonogram-prowadzacych\?prowadzacy=p-zielinski$/);
  await expect(page.getByLabel("Prowadzący")).toHaveValue("p-zielinski");
});
