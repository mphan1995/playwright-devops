import { test, expect } from "@playwright/test";
import { gotoPageWithStorage, paths, storageKeys } from "./helpers";

test("dashboard loads core panels", async ({ page }) => {
  await gotoPageWithStorage(page, paths.dashboard, {
    [storageKeys.releaseState]: "queued",
    [storageKeys.approvals]: "0",
  });

  await expect(page.locator("#pageTitle")).toHaveText("Dashboard");
  await expect(page.locator(".panel.pipeline")).toBeVisible();
  await expect(page.locator(".step")).toHaveCount(8);
  await expect(page.locator("#runState")).toHaveText("Queued");
  await expect(page.locator("#approvalCount")).toHaveText("0/2");
});
