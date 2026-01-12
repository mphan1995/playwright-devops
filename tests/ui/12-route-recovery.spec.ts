import { test, expect } from "@playwright/test";
import { gotoPageWithStorage, paths, storageKeys } from "./helpers";

const brokenHealth = JSON.stringify({
  dashboard: false,
  services: true,
  users: false,
  permissions: false,
  settings: false,
});

test("route fallback can recover a broken page", async ({ page }) => {
  await gotoPageWithStorage(page, paths.services, {
    [storageKeys.role]: "admin",
    [storageKeys.routeHealth]: brokenHealth,
  });

  const fallback = page.locator("[data-route-fallback]");
  await expect(fallback).toBeVisible();
  await page.locator("[data-recover-route]").click();
  await expect(fallback).toHaveCount(0);
  await expect(page.locator(".page-content > section").first()).toBeVisible();
  await expect(page.locator("#routeStatusBadge")).toHaveText("Route: Healthy");
});
