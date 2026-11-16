import { test as base, expect, type Page } from "@playwright/test";

/** Resolves once every Suspense boundary of a freshly loaded page has been swapped in (see the `page` fixture). */
export async function streamed(page: Page) {
  await page.waitForFunction(() => !document.querySelector('div[hidden][id^="S:"]'));
}

/** `page` that fails the test if the browser logs an error or throws. */
export const test = base.extend({
  // The fixture callback is positional; it is not named `use` so React's hooks lint rule leaves it alone.
  page: async ({ page }, provide) => {
    // A freshly loaded page streams: until React swaps a Suspense boundary's content in, the finished markup sits in a
    // hidden copy next to the fallback, so locators briefly match twice. Wait for the swap after every page load.
    const goto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await goto(url, options);
      await streamed(page);
      return response;
    };

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await provide(page);
    expect(errors, "browser errors").toEqual([]);
  },
});

export { expect };

export const ROUTES = [
  "/kierunki",
  "/harmonogram",
  "/prowadzacy",
  "/harmonogram-prowadzacych",
  "/plan",
  "/generator",
  "/import-eksport",
] as const;

/** Calendar blocks as { column, row, title, meta }; column 2 = Monday … 8 = Sunday. */
export async function classBlocks(page: Page) {
  return page.locator(".class-block").evaluateAll((els) =>
    els.map((el) => ({
      column: Number((el as HTMLElement).style.gridColumn),
      row: (el as HTMLElement).style.gridRow,
      title: el.querySelector(".title")?.textContent ?? "",
      meta: el.querySelector(".meta")?.textContent ?? "",
    })),
  );
}

export function countByColumn(blocks: { column: number }[]) {
  return blocks.reduce<Record<number, number>>((acc, b) => ({ ...acc, [b.column]: (acc[b.column] ?? 0) + 1 }), {});
}
