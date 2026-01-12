import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("service telemetry failure and recovery", async ({ page }) => {
  await gotoPage(page, paths.services);

  await expect(page.locator(".service-card")).toHaveCount(6);
  await page.locator("#toggleServiceFailure").click();
  await expect(page.locator("#serviceBanner")).toContainText("Telemetry feed offline");
  await expect(page.locator("#serviceEmpty")).toBeVisible();

  await page.locator("#toggleServiceFailure").click();
  await expect(page.locator("#serviceBanner")).toHaveClass(/degraded/);
  await expect(page.locator("#serviceEmpty")).toBeHidden();
});
