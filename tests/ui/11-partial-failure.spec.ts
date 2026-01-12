import { test, expect } from "@playwright/test";
import { paths, waitForApp } from "./helpers";

test("forced telemetry failure shows fallback but keeps page online", async ({ page }) => {
  await page.goto(`${paths.services}?fail=1`);
  await waitForApp(page);

  await expect(page.locator("#toggleServiceFailure")).toBeDisabled();
  await expect(page.locator("#toggleServiceFailure")).toHaveText("Failure Locked");
  await expect(page.locator("#serviceBanner")).toContainText("Telemetry feed offline");
  await expect(page.locator("#serviceEmpty")).toBeVisible();
  await expect(page.locator(".status-chip", { hasText: "Unknown" }).first()).toBeVisible();
});
