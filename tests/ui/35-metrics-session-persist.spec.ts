import { test, expect } from "@playwright/test";
import { paths, waitForApp } from "./helpers";

test("observability metrics persist during reloads via session storage", async ({ page }) => {
  const payload = {
    metricState: {
      reqRate: 1520,
      errRate: 1.4,
      latency: 420,
      apdex: 0.88,
      saturation: 78,
      cacheHit: 89,
    },
  };

  await page.addInitScript((sessionPayload) => {
    sessionStorage.setItem("devops-metrics-session", JSON.stringify(sessionPayload));
  }, payload);

  await page.goto(paths.dashboard);
  await waitForApp(page);
  await page.waitForFunction(() => Boolean((window as any).devopsDashboard?.metrics));

  const errRate = await page.evaluate(() => (window as any).devopsDashboard.state.metricState.errRate);
  expect(errRate).toBeGreaterThan(1.1);
  await expect(page.locator("#alertState")).toHaveText("Attention");
});
