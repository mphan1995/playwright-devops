import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("qa gate shows risk when failures spike", async ({ page }) => {
  await gotoPage(page, paths.dashboard);

  await page.waitForFunction(() => (window as any).devopsDashboard?.metrics);
  await page.evaluate(() => {
    const dashboard = (window as any).devopsDashboard;
    dashboard.state.qaState.total = 120;
    dashboard.state.qaState.passed = 100;
    dashboard.state.qaState.failed = 8;
    dashboard.state.qaState.flaky = 4;
    dashboard.state.qaState.duration = 240;
    dashboard.state.qaState.coverage = 81;
    dashboard.metrics.updateQaMetrics();
  });

  await expect(page.locator("#qaState")).toHaveText("Risk");
  await expect(page.locator("#qaFailed")).toHaveText("8");
});
