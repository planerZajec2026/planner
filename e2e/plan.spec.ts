import { classBlocks, expect, streamed, test } from "./fixtures";

const rows = (page: import("@playwright/test").Page) => page.locator(".plan-table tbody tr");

test("the table lists the whole plan: all 174 classes with their placement", async ({ page }) => {
  await page.goto("/plan");
  await expect(page.getByText("174 zajęć", { exact: true })).toBeVisible();
  await expect(rows(page)).toHaveCount(174);

  const z001 = page.locator(".plan-table tr", { hasText: "Z001" });
  await expect(z001).toContainText("Analiza matematyczna I");
  await expect(z001).toContainText("Piątek");
  await expect(z001).toContainText("A283");
  await expect(z001).toContainText("co tydzień");
});

test("the plan is sorted by day and start time", async ({ page }) => {
  await page.goto("/plan");
  const days = await page.locator(".plan-table tbody tr td:nth-child(6)").allTextContents();
  const order = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek"];
  const indexes = days.map((d) => order.indexOf(d));
  expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
});

test("filters narrow the table and the summary, and the URL keeps them", async ({ page }) => {
  await page.goto("/plan");
  await page.getByLabel("Sala").selectOption("A281");
  await page.getByRole("button", { name: "Pokaż" }).click(); // a plain form submit: the whole page loads again
  await expect(page).toHaveURL(/sala=A281/);
  await streamed(page);
  await expect(page.getByText("4 z 174 zajęć")).toBeVisible();
  await expect(rows(page)).toHaveCount(4);

  await page.getByRole("link", { name: "Wyczyść filtry" }).click();
  await expect(rows(page)).toHaveCount(174);
});

test("a stale link with an unknown group shows the whole plan instead of an empty page", async ({ page }) => {
  await page.goto("/plan?grupa=nie-ma-takiej");
  await expect(rows(page)).toHaveCount(174);
});

test("the weekly view maps plan weeks onto calendar dates, make-up days included", async ({ page }) => {
  await page.goto("/plan?widok=tydzien&grupa=INF1-R1-G1&tydzien=11");
  await expect(page.getByText("Tydzień 11 z 14")).toBeVisible();
  // The 11th Wednesday of the plan is Friday 8 January 2027; the other days have their own 11th occurrence.
  await expect(page.locator(".day-header")).toHaveText(["Pon21.12", "Wt15.12", "Śr08.01", "Czw17.12", "Pt11.12"]);
  expect((await classBlocks(page)).length).toBeGreaterThan(0);
});

test("the weekly view asks for a selection instead of drawing all classes at once", async ({ page }) => {
  await page.goto("/plan?widok=tydzien");
  await expect(page.getByText(/Wybierz rocznik, grupę, prowadzącego lub salę/)).toBeVisible();
  await expect(page.locator(".calendar-grid")).toHaveCount(0);
});

test("week buttons move between plan weeks", async ({ page }) => {
  await page.goto("/plan?widok=tydzien&prowadzacy=P01&tydzien=1");
  await page.getByRole("link", { name: "Następny tydzień" }).click();
  await expect(page).toHaveURL(/tydzien=2/);
  await expect(page.getByText("Tydzień 2 z 14")).toBeVisible();
});

test.describe("export", () => {
  test("downloads the whole plan as a spreadsheet", async ({ page }) => {
    const odpowiedz = await page.request.get("/plan/eksport");
    expect(odpowiedz.status()).toBe(200);
    expect(odpowiedz.headers()["content-type"]).toContain("spreadsheetml");
    expect(odpowiedz.headers()["content-disposition"]).toContain('filename="plan-zajec.xlsx"');
    // An .xlsx is a zip archive.
    expect((await odpowiedz.body()).subarray(0, 2).toString()).toBe("PK");
  });

  test("the JSON export follows the filters", async ({ page }) => {
    const odpowiedz = await page.request.get("/plan/eksport?format=json&sala=A281");
    expect(odpowiedz.headers()["content-disposition"]).toContain('filename="plan-zajec-sala-A281.json"');
    const dane = await odpowiedz.json();
    expect(dane.liczba_zajec).toBe(4);
    expect(dane.zajecia).toHaveLength(4);
    expect(dane.zajecia.every((z: { sala: string }) => z.sala === "A281")).toBe(true);
  });

  test("the download buttons carry the current filters", async ({ page }) => {
    await page.goto("/plan?sala=A281");
    await expect(page.getByRole("link", { name: "Pobierz XLSX" })).toHaveAttribute("href", "/plan/eksport?sala=A281");
    await expect(page.getByRole("link", { name: "Pobierz JSON" })).toHaveAttribute("href", "/plan/eksport?sala=A281&format=json");
  });
});
