import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

type Recorded = { pseudo: string | null; total: number; props: string[] };

/**
 * Records every animation/transition the browser starts (incl. view-transition pseudo-elements) until read.
 * Waits for the page to be idle first: on a direct visit React also animates the Suspense reveal of the streamed
 * content, which can start just after page.goto() returns and must not be counted against the next action.
 */
async function startRecording(page: Page) {
  await page.waitForFunction(
    () => document.getAnimations().every((a) => a.playState !== "running" && !a.pending),
    null,
    { polling: 50 },
  );
  await page.evaluate(() => {
    const w = window as unknown as { __rec: Recorded[]; __recStop?: boolean };
    w.__rec = [];
    w.__recStop = false;
    const seen = new WeakSet<Animation>();
    const loop = () => {
      for (const a of document.getAnimations()) {
        if (seen.has(a)) continue;
        seen.add(a);
        const effect = a.effect as KeyframeEffect | null;
        const t = effect?.getTiming() ?? {};
        const props = new Set(
          (effect?.getKeyframes() ?? []).flatMap((k) => Object.keys(k)).filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)),
        );
        w.__rec.push({ pseudo: effect?.pseudoElement ?? null, total: (Number(t.duration) || 0) + (t.delay ?? 0), props: [...props] });
      }
      if (!w.__recStop) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

/** Lets animations settle, then returns what was recorded. */
async function stopRecording(page: Page): Promise<Recorded[]> {
  await page.waitForTimeout(700);
  return page.evaluate(() => {
    const w = window as unknown as { __rec: Recorded[]; __recStop?: boolean };
    w.__recStop = true;
    return w.__rec;
  });
}

/** Fully visible: the element and its ancestors are opaque and untransformed. */
async function expectSettled(page: Page, selector: string) {
  await page.mouse.move(0, 0); // a hover lift under the pointer is intended, not an unfinished animation
  await page.waitForTimeout(200); // let the 120ms hover-out transition finish
  const issues = await page.locator(selector).first().evaluate((el) => {
    const out: string[] = [];
    for (let node: Element | null = el; node && node !== document.body; node = node.parentElement) {
      const cs = getComputedStyle(node);
      const label = `${node.tagName.toLowerCase()}.${[...node.classList].join(".")}`;
      if (cs.opacity !== "1") out.push(`${label} opacity ${cs.opacity}`);
      if (cs.transform !== "none" && cs.transform !== "matrix(1, 0, 0, 1, 0, 0)") out.push(`${label} transform ${cs.transform}`);
      if (cs.translate !== "none" && cs.translate !== "0px") out.push(`${label} translate ${cs.translate}`);
    }
    return out;
  });
  expect(issues, `${selector} should be fully visible`).toEqual([]);
}

const MAX_MS = 400;
const tooLong = (rec: Recorded[]) => rec.filter((r) => r.total > MAX_MS);
/** Animations that take time and change position or size (the browser's 0ms group setup doesn't count). */
const moving = (rec: Recorded[]) =>
  rec.filter((r) => r.total > 0 && r.props.some((p) => p === "transform" || p === "translate" || p === "scale"));
const viewTransitions = (rec: Recorded[]) => rec.filter((r) => r.pseudo?.startsWith("::view-transition"));

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("week change slides the calendar via a view transition, within 400ms", async ({ page }) => {
    await page.goto("/harmonogram?grupa=INF1-R1-G1&tydzien=2026-10-12");
    await startRecording(page);
    await page.getByRole("button", { name: "Następny tydzień" }).click();
    await expect(page.locator(".day-header").first()).toHaveText("Pon19.10");
    const rec = await stopRecording(page);

    expect(viewTransitions(rec).length).toBeGreaterThan(0);
    expect(moving(viewTransitions(rec)).length).toBeGreaterThan(0); // the slide
    expect(tooLong(rec)).toEqual([]);
    await expectSettled(page, ".calendar-grid");
  });

  test("group change crossfades without sliding", async ({ page }) => {
    await page.goto("/harmonogram?grupa=INF1-R1-G1&tydzien=2026-10-12");
    await startRecording(page);
    await page.getByLabel("Grupa").selectOption("INF1-R1-G2");
    await expect(page.locator(".class-block .title").first()).toHaveText("Fizyka");
    const rec = await stopRecording(page);

    expect(viewTransitions(rec).length).toBeGreaterThan(0);
    expect(moving(viewTransitions(rec).filter((r) => !r.pseudo?.startsWith("::view-transition-group")))).toEqual([]);
    expect(tooLong(rec)).toEqual([]);
    await expectSettled(page, ".calendar-grid");
  });

  test("rapid week clicks end on the right week with a single calendar", async ({ page }) => {
    await page.goto("/harmonogram?grupa=INF1-R1-G1&tydzien=2026-10-12");
    const next = page.getByRole("button", { name: "Następny tydzień" });
    await next.click();
    await next.click();
    await next.click();
    await expect(page).toHaveURL(/tydzien=2026-11-02/);
    await expect(page.locator(".week-nav")).toContainText("2–8 listopada 2026");
    await expect(page.locator(".day-header").first()).toHaveText("Pon02.11");
    await expect(page.locator(".calendar-grid")).toHaveCount(1);
    await expectSettled(page, ".calendar-grid");
  });

  test("page change animates the new page in and keeps the sidebar still", async ({ page }) => {
    await page.goto("/kierunki");
    await startRecording(page);
    await page.getByRole("navigation", { name: "Nawigacja główna" }).getByRole("link", { name: "Prowadzący", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Prowadzący zajęcia" })).toBeVisible();
    const rec = await stopRecording(page);

    expect(viewTransitions(rec).length).toBeGreaterThan(0);
    expect(rec.filter((r) => r.pseudo?.includes("(sidebar)") && r.props.length > 0)).toEqual([]);
    expect(tooLong(rec)).toEqual([]);
    await expectSettled(page, ".card-grid");

    // The active pill (Motion layoutId) ends exactly under the new active item.
    const [pill, item] = await Promise.all([
      page.locator(".nav-pill").boundingBox(),
      page.locator('.nav-item[aria-current="page"]').boundingBox(),
    ]);
    expect(pill).toEqual(item);
  });
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("nothing moves on a week change or a page change, but content still updates", async ({ page }) => {
    await page.goto("/harmonogram?grupa=INF1-R1-G1&tydzien=2026-10-12");
    await startRecording(page);
    await page.getByRole("button", { name: "Następny tydzień" }).click();
    await expect(page.locator(".day-header").first()).toHaveText("Pon19.10");
    await page.getByRole("navigation", { name: "Nawigacja główna" }).getByRole("link", { name: "Prowadzący", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Prowadzący zajęcia" })).toBeVisible();
    const rec = await stopRecording(page);

    expect(moving(rec)).toEqual([]);
    await expectSettled(page, ".card-grid");
  });
});
