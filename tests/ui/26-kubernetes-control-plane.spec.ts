import { test, expect } from "@playwright/test";
import { gotoPageWithStorage, paths, storageKeys } from "./helpers";

test("kubernetes control plane toggles update health state", async ({ page }) => {
  await gotoPageWithStorage(page, paths.dashboard, {
    [storageKeys.role]: "admin",
  });

  await expect(page.locator("#kubeClusterBadge")).toHaveText("Stable");
  await page.locator("#kubeFailover").click();
  await expect(page.locator("#kubeClusterBadge")).toHaveText("Degraded");
  await expect(page.locator("#kubeApiStatus")).toHaveText("Failover");

  await page.locator("#kubeFailover").click();
  await expect(page.locator("#kubeClusterBadge")).toHaveText("Stable");
});
