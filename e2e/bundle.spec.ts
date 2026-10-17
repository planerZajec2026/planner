import { expect, test } from "./fixtures";

/**
 * Guards spec 07's bundle budget. Motion's drag/layout features must load lazily (LazyMotion), which breaks
 * silently if a component imports `m` from the `motion/react` barrel instead of `motion/react-m`
 * (that alone adds ~32 kB gzip to every page). Measured on the spec 07 merge: ~157 kB of JS before `load`.
 */
const MAX_INITIAL_JS_KB = 165;

for (const route of ["/kierunki", "/prowadzacy", "/import-eksport"]) {
  test(`${route} loads at most ${MAX_INITIAL_JS_KB} kB of JS (compressed) up front`, async ({ page }) => {
    await page.goto(route, { waitUntil: "load" });
    const kb = await page.evaluate(
      () =>
        performance
          .getEntriesByType("resource")
          .filter((e): e is PerformanceResourceTiming => e.name.endsWith(".js"))
          .reduce((sum, e) => sum + e.encodedBodySize, 0) / 1024,
    );
    console.log(`${route}: ${kb.toFixed(1)} kB`);
    expect(kb).toBeLessThanOrEqual(MAX_INITIAL_JS_KB);
  });
}
