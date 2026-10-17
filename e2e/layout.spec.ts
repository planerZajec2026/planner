import { expect, ROUTES, test } from "./fixtures";

/** Makes the page taller than the viewport and scrolls every candidate container to the bottom. */
async function scrollToBottom(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const main = document.querySelector<HTMLElement>("main.content")!;
    const filler = document.createElement("div");
    filler.style.height = "2000px";
    main.appendChild(filler);
    document.scrollingElement!.scrollTop = 99999;
    main.scrollTop = 99999;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const sidebar = document.querySelector(".sidebar")!.getBoundingClientRect();
    return {
      windowScroll: document.scrollingElement!.scrollTop,
      mainScroll: main.scrollTop,
      sidebarTop: sidebar.top,
      sidebarHeight: sidebar.height,
      mainLeft: main.getBoundingClientRect().left,
      horizontalOverflow: document.scrollingElement!.scrollWidth > window.innerWidth,
    };
  });
}

for (const width of [1440, 1024, 780]) {
  test.describe(`desktop layout at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const route of ROUTES) {
      test(`${route}: sidebar stays put, only the content scrolls`, async ({ page }) => {
        await page.goto(route);
        const r = await scrollToBottom(page);
        expect(r.windowScroll).toBe(0);
        expect(r.mainScroll).toBeGreaterThan(0);
        expect(r.sidebarTop).toBe(0);
        expect(r.sidebarHeight).toBe(800);
        expect(r.mainLeft).toBe(248); // content sits next to the sidebar, never wrapped below it
        expect(r.horizontalOverflow).toBe(false);
      });
    }
  });
}

test.describe("phone layout", { tag: "@phone" }, () => {
  for (const route of ROUTES) {
    test(`${route}: sidebar stacks above the content and the page scrolls`, async ({ page }) => {
      await page.goto(route);
      const r = await scrollToBottom(page);
      expect(r.windowScroll).toBeGreaterThan(0);
      expect(r.mainScroll).toBe(0);
      expect(r.mainLeft).toBe(0);
      expect(r.horizontalOverflow).toBe(false);
    });
  }
});

test.describe("navigation", () => {
  test("/ redirects to /kierunki", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/kierunki$/);
  });

  const LABELS: Record<(typeof ROUTES)[number], string> = {
    "/kierunki": "Kierunki i grupy",
    "/harmonogram": "Harmonogram grup",
    "/prowadzacy": "Prowadzący",
    "/harmonogram-prowadzacych": "Harmonogram prowadzących",
    "/import-eksport": "Import i eksport danych",
  };

  for (const route of ROUTES) {
    test(`${route} marks its nav item as current`, async ({ page }) => {
      await page.goto(route);
      const nav = page.getByRole("navigation", { name: "Nawigacja główna" });
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(nav.getByRole("link", { name: LABELS[route], exact: true })).toHaveAttribute("aria-current", "page");
    });
  }
});
