import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("service regression toggle updates badge and note", async ({ page }) => {
  await page.route("**/release-signals.json", (route) =>
    route.fulfill({
      json: {
        generatedAt: "2026-01-22T08:30:18.524Z",
        performance: {
          scenarios: [
            {
              name: "services",
              path: "/pages/services.html",
              status: "pass",
              metrics: {
                avgMs: 32.4,
                p95Ms: 48.1,
                rps: 140.2,
                errorRate: 0,
              },
            },
          ],
        },
      },
    })
  );

  await gotoPage(page, paths.services);

  await page.locator("#simulatePerfRegression").click();
  await expect(page.locator("#serviceSignalNote")).toContainText("Regression: ON");
  await expect(page.locator("#serviceSignalBadge")).toHaveText("Perf: Degraded");
  await expect(page.locator("#simulatePerfRegression")).toBeDisabled();
  await expect(page.locator("#clearPerfRegression")).toBeEnabled();

  await page.locator("#clearPerfRegression").click();
  await expect(page.locator("#serviceSignalNote")).toContainText("Regression: OFF");
  await expect(page.locator("#serviceSignalBadge")).toHaveText("Perf: Pass");
});
