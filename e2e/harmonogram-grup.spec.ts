import { startOfWeek, weekLabel } from "../src/lib/dates";
import { classBlocks, countByColumn, expect, test } from "./fixtures";

// Calendar columns: 2 = Monday … 6 = Friday.
const MON = 2;
const TUE = 3;
const WED = 4;
const THU = 5;
const FRI = 6;

test("INF1-R1-G1 shows its own classes and those of its year, from the generated plan", async ({ page }) => {
  await page.goto("/harmonogram?grupa=INF1-R1-G1&tydzien=2026-10-12");
  await expect(page.locator(".week-nav")).toContainText("12–18 października 2026");
  const blocks = await classBlocks(page);
  expect(countByColumn(blocks)).toEqual({ [MON]: 2, [TUE]: 2, [WED]: 3, [THU]: 3, [FRI]: 3 });
  // A lecture for the whole year, held in a room of its own.
  expect(blocks).toContainEqual({ column: FRI, row: "27 / 34", title: "Analiza matematyczna I", meta: "A283 · prof. P39" });
  await expect(page.locator(".day-header")).toHaveText(["Pon12.10", "Wt13.10", "Śr14.10", "Czw15.10", "Pt16.10", "Sob17.10", "Niedz18.10"]);
});

test("make-up days follow the plan of another weekday: Friday 8 January holds Wednesday's classes", async ({ page }) => {
  await page.goto("/harmonogram?grupa=INF1-R1-G1&tydzien=2027-01-04");
  const blocks = await classBlocks(page);
  // 4–6 January is the winter break, 7 January is a regular Thursday, and Friday 8 January runs the Wednesday plan.
  expect(countByColumn(blocks)).toEqual({ [THU]: 3, [FRI]: 2 });
  expect(blocks.filter((b) => b.column === FRI).map((b) => b.title)).toEqual(["Matematyka dyskretna z logiką", "Języki programowania"]);
  await expect(page.locator(".day-header").nth(4)).toHaveText("Pt08.01");
});

test("there is no study-mode filter and the programme has all its groups", async ({ page }) => {
  await page.goto("/harmonogram?grupa=INF1-R1-G1&tydzien=2026-10-12");
  await expect(page.getByLabel("Tryb studiów")).toHaveCount(0);
  await expect(page.getByLabel("Kierunek").locator("option")).toHaveText(["Informatyka"]);
  await expect(page.getByLabel("Grupa").locator("option")).toHaveCount(51);
});

test("changing the group updates the URL, keeps the week and changes the grid", async ({ page }) => {
  await page.goto("/harmonogram?grupa=INF1-R1-G1&tydzien=2026-10-12");
  await page.getByLabel("Grupa").selectOption("INF1-R1-G2");
  await expect(page).toHaveURL(/grupa=INF1-R1-G2/);
  await expect(page).toHaveURL(/tydzien=2026-10-12/);
  await expect(page.locator(".class-block .title").first()).toHaveText("Fizyka");
  expect(countByColumn(await classBlocks(page))).toMatchObject({ [MON]: 2, [TUE]: 4 });
});

test("week buttons change the label, header dates and URL", async ({ page }) => {
  await page.goto("/harmonogram?grupa=INF1-R1-G1&tydzien=2026-10-12");
  await page.getByRole("button", { name: "Następny tydzień" }).click();
  await expect(page.locator(".week-nav")).toContainText("19–25 października 2026");
  await expect(page).toHaveURL(/tydzien=2026-10-19/);
  await expect(page.locator(".day-header").first()).toHaveText("Pon19.10");

  await page.getByRole("button", { name: "Poprzedni tydzień" }).click();
  await page.getByRole("button", { name: "Poprzedni tydzień" }).click();
  await expect(page.locator(".week-nav")).toContainText("5–11 października 2026");
  await expect(page).toHaveURL(/tydzien=2026-10-05/);
});

test("without params shows the first group in the current week", async ({ page }) => {
  await page.goto("/harmonogram");
  await expect(page.getByLabel("Grupa")).toHaveValue("INF1-R1-ALL");
  // The server computes "today" in the same timezone as this test process.
  await expect(page.locator(".week-nav")).toContainText(weekLabel(startOfWeek(new Date())));
});

test("shows an empty state for a week outside the semester", async ({ page }) => {
  await page.goto("/harmonogram?grupa=INF1-R1-G1&tydzien=2026-08-03");
  await expect(page.getByText("Brak zajęć w tym tygodniu.")).toBeVisible();
  await expect(page.locator(".calendar-grid")).toHaveCount(0);
});

test.describe("narrow window", () => {
  test.use({ viewport: { width: 780, height: 800 } });

  test("the calendar scrolls horizontally inside its card at full height", async ({ page }) => {
    await page.goto("/harmonogram?grupa=INF1-R1-G1&tydzien=2026-10-12");
    const box = await page.locator(".calendar-scroll").evaluate((el) => ({
      scrolls: el.scrollWidth > el.clientWidth,
      height: el.clientHeight,
      gridHeight: el.querySelector(".calendar-grid")!.clientHeight,
    }));
    expect(box.scrolls).toBe(true);
    expect(box.height).toBeGreaterThanOrEqual(box.gridHeight);
  });
});

test("a slow week change keeps the current calendar, dimmed, instead of showing the loading text", async ({ page }) => {
  await page.goto("/harmonogram?grupa=INF1-R1-G1&tydzien=2026-10-12");
  // Hold the server response for the next week to simulate a slow backend.
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(/tydzien=2026-10-19/, async (route) => {
    await held;
    await route.continue();
  });

  await page.getByRole("button", { name: "Następny tydzień" }).click();
  await expect(page.locator(".week-nav")).toContainText("19–25 października 2026"); // optimistic label
  await expect(page.locator(".pending-region")).toHaveAttribute("aria-busy", "true");
  await expect(page.locator(".day-header").first()).toHaveText("Pon12.10"); // old calendar still shown
  await expect(page.getByText("Wczytywanie harmonogramu…")).toHaveCount(0);

  release();
  await expect(page.locator(".day-header").first()).toHaveText("Pon19.10");
  await expect(page.locator(".pending-region")).not.toHaveAttribute("aria-busy");
});
