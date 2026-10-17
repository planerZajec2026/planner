import { test as base, expect, type Page } from "@playwright/test";

/** `page` that fails the test if the browser logs an error or throws. */
export const test = base.extend({
  // The fixture callback is positional; it is not named `use` so React's hooks lint rule leaves it alone.
  page: async ({ page }, provide) => {
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

export const ROUTES = ["/kierunki", "/harmonogram", "/prowadzacy", "/harmonogram-prowadzacych", "/import-eksport"] as const;

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
