import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("release signals render ui and perf summaries", async ({ page }) => {
  await page.route("**/release-signals.json", (route) =>
    route.fulfill({
      json: {
        schemaVersion: "1.0",
        generatedAt: "2026-01-22T07:56:26.000Z",
        ui: {
          summary: {
            status: "fail",
            label: "Fail",
            totals: {
              total: 120,
              passed: 100,
              failed: 8,
              skipped: 6,
              flaky: 6,
            },
            durationMs: 240000,
          },
        },
        performance: {
          summary: {
            status: "pass",
            label: "Pass",
            scenarios: {
              total: 5,
              passed: 5,
              failed: 0,
              skipped: 0,
            },
            highlights: {
              avgMs: 120,
              p95Ms: 240,
              rps: 75,
              errorRate: 0.01,
            },
          },
        },
      },
    })
  );

  await gotoPage(page, paths.dashboard);

  await expect(page.locator("#qaState")).toHaveText("UI: Fail");
  await expect(page.locator("#qaFailed")).toHaveText("8");
  await expect(page.locator("#perfState")).toHaveText("Perf: Pass");
  await expect(page.locator("#perfWorstP95")).toHaveText("240 ms");
  await expect(page.locator("#perfErrorRate")).toHaveText("1.00%");
});
