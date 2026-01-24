import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("service signals table renders performance scenarios", async ({ page }) => {
  await page.route("**/release-signals.json", (route) =>
    route.fulfill({
      json: {
        generatedAt: "2026-01-22T08:30:18.524Z",
        performance: {
          summary: {
            status: "pass",
            label: "Pass",
            scenarios: {
              total: 2,
              passed: 2,
              failed: 0,
              skipped: 0,
            },
          },
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
            {
              name: "dashboard",
              path: "/pages/index.html",
              status: "pass",
              metrics: {
                avgMs: 28.2,
                p95Ms: 44.9,
                rps: 165.8,
                errorRate: 0,
              },
            },
          ],
        },
      },
    })
  );

  await gotoPage(page, paths.services);

  await expect(page.locator("#serviceSignalRows tr")).toHaveCount(2);
  await expect(page.locator("#serviceSignalRows tr.active")).toHaveCount(1);
  await expect(page.locator("#serviceSignalBadge")).toHaveText("Perf: Pass");
});
