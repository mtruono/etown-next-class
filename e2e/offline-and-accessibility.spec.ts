import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { openAssistant } from "./helpers";

test("saved schedule remains readable offline and live navigation is explained", async ({
  context,
  page,
}) => {
  await openAssistant(page);
  await page.evaluate(async () => {
    if ("serviceWorker" in navigator) await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(
    page.getByRole("heading", { name: "Fictional Field Biology" }),
  ).toBeVisible();
  await expect(
    page.getByText(/live navigation needs a connection/u),
  ).toBeVisible();
  await context.setOffline(false);
});

test("keyboard, axe, safe-area dock, and horizontal layout remain accessible", async ({
  page,
}) => {
  await openAssistant(page);
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  const layout = await page.evaluate(() => {
    const dock = document.querySelector<HTMLElement>(".home-dock")!;
    const content = document.querySelector<HTMLElement>(".assistant-main")!;
    const dockStyle = getComputedStyle(dock);
    const contentStyle = getComputedStyle(content);
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      dockBottom: dock.getBoundingClientRect().bottom,
      viewportHeight: window.innerHeight,
      dockPaddingBottom: dockStyle.paddingBottom,
      contentPaddingBottom: Number.parseFloat(contentStyle.paddingBottom),
      dockHeight: dock.getBoundingClientRect().height,
    };
  });
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(Math.abs(layout.dockBottom - layout.viewportHeight)).toBeLessThan(1);
  expect(layout.contentPaddingBottom).toBeGreaterThan(layout.dockHeight);
  expect(layout.dockPaddingBottom).toBeTruthy();
});
