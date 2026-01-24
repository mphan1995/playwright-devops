import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("performance ramp sets spike window in metrics state", async ({ page }) => {
  await gotoPage(page, paths.dashboard);

  await page.locator("#perfStartBtn").click();
  await page.locator("#perfRampBtn").click();

  const spikeUntil = await page.evaluate(() => (window as any).devopsDashboard.state.metricSpikeUntil);
  expect(spikeUntil).toBeGreaterThan(Date.now());

  await page.locator("#perfStopBtn").click();
});
