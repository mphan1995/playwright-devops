import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("alert state switches when error rate spikes", async ({ page }) => {
  await gotoPage(page, paths.dashboard);

  await page.waitForFunction(() => (window as any).devopsDashboard?.metrics);
  await page.evaluate(() => {
    const dashboard = (window as any).devopsDashboard;
    dashboard.state.metricState.errRate = 1.6;
    dashboard.metrics.updateMetrics();
  });

  await expect(page.locator("#alertState")).toHaveText("Attention");
});
