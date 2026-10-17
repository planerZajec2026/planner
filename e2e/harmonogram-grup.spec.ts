import { startOfWeek, weekLabel } from "../src/lib/dates";
import { classBlocks, countByColumn, expect, test } from "./fixtures";

const FRI = 6;
const SAT = 7;
const SUN = 8;

test("INF/Z-3 reproduces the design", async ({ page }) => {
  await page.goto("/harmonogram?grupa=inf-z-3&tydzien=2026-10-12");
  await expect(page.locator(".week-nav")).toContainText("12–18 października 2026");
  const blocks = await classBlocks(page);
  expect(countByColumn(blocks)).toEqual({ [FRI]: 2, [SAT]: 5, [SUN]: 3 });
  expect(blocks).toContainEqual({ column: FRI, row: "34 / 42", title: "Sieci komputerowe", meta: "B21 · dr Paweł Zieliński" });
  expect(blocks).toContainEqual({ column: SUN, row: "2 / 10", title: "Język angielski spec.", meta: "C14 · mgr Alicja Krupa" });
  await expect(page.locator(".day-header")).toHaveText(["Pon12.10", "Wt13.10", "Śr14.10", "Czw15.10", "Pt16.10", "Sob17.10", "Niedz18.10"]);
});

test("even/odd-week classes follow ISO week parity", async ({ page }) => {
  await page.goto("/harmonogram?grupa=inf-2a&tydzien=2026-10-12"); // week 42, even
  let titles = (await classBlocks(page)).map((b) => `${b.column}:${b.title}`);
  expect(titles).toContain("4:Programowanie obiektowe");
  expect(titles).not.toContain("5:Matematyka dyskretna");

  await page.goto("/harmonogram?grupa=inf-2a&tydzien=2026-10-19"); // week 43, odd
  titles = (await classBlocks(page)).map((b) => `${b.column}:${b.title}`);
  expect(titles).not.toContain("4:Programowanie obiektowe");
  expect(titles).toContain("5:Matematyka dyskretna");
  // 12:00–13:30 uses 15-minute rows
  expect((await classBlocks(page)).find((b) => b.title === "Matematyka dyskretna")?.row).toBe("18 / 24");
});

test("changing the mode narrows the groups and updates the URL and grid", async ({ page }) => {
  await page.goto("/harmonogram?grupa=inf-z-3&tydzien=2026-10-12");
  await expect(page.getByLabel("Grupa").locator("option")).toHaveText(["INF/Z-3", "INF/Z-2"]);

  await page.getByLabel("Tryb studiów").selectOption("stacjonarne");
  await expect(page).toHaveURL(/tryb=stacjonarne/);
  await expect(page).toHaveURL(/grupa=inf-2a/);
  await expect(page).toHaveURL(/tydzien=2026-10-12/);
  await expect(page.getByLabel("Grupa").locator("option")).toHaveText(["INF-2A", "INF-2B"]);
  await expect(page.locator(".class-block .title").first()).toHaveText("Bazy danych");
  expect(countByColumn(await classBlocks(page))).toEqual({ 2: 2, 4: 1 });
});

test("changing the group updates the grid", async ({ page }) => {
  await page.goto("/harmonogram?grupa=inf-2a&tydzien=2026-10-12");
  await page.getByLabel("Grupa").selectOption("inf-2b");
  await expect(page).toHaveURL(/grupa=inf-2b/);
  await expect(page.locator(".class-block .title")).toHaveText(["Sieci komputerowe", "Algorytmy i struktury danych", "Język angielski spec."]);
});

test("week buttons change the label, header dates and URL", async ({ page }) => {
  await page.goto("/harmonogram?grupa=inf-z-3&tydzien=2026-10-12");
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
  await expect(page.getByLabel("Grupa")).toHaveValue("inf-2a");
  // The server computes "today" in the same timezone as this test process.
  await expect(page.locator(".week-nav")).toContainText(weekLabel(startOfWeek(new Date())));
});

test("shows an empty state for a group with no classes", async ({ page }) => {
  await page.goto("/harmonogram?grupa=eko-3a&tydzien=2026-10-12");
  await expect(page.getByText("Brak zajęć w tym tygodniu.")).toBeVisible();
  await expect(page.locator(".calendar-grid")).toHaveCount(0);
});

test.describe("narrow window", () => {
  test.use({ viewport: { width: 780, height: 800 } });

  test("the calendar scrolls horizontally inside its card at full height", async ({ page }) => {
    await page.goto("/harmonogram?grupa=inf-z-3&tydzien=2026-10-12");
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
  await page.goto("/harmonogram?grupa=inf-z-3&tydzien=2026-10-12");
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
