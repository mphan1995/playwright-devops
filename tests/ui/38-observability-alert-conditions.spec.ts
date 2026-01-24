import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("observability alert reacts to saturation and apdex dips", async ({ page }) => {
  await gotoPage(page, paths.dashboard);

  await page.waitForFunction(() => Boolean((window as any).devopsDashboard?.metrics));
  await page.evaluate(() => {
    const dashboard = (window as any).devopsDashboard;
    dashboard.state.metricProfile = "spike";
    dashboard.state.metricState.apdex = 0.78;
    dashboard.state.metricState.saturation = 90;
    dashboard.state.metricState.errRate = 0.4;
    dashboard.metrics.updateMetrics();
  });

  await expect(page.locator("#alertState")).toHaveText("Attention");
});
