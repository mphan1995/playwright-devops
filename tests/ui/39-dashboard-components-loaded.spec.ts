import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("dashboard components load hero and grid content", async ({ page }) => {
  await gotoPage(page, paths.dashboard);

  await expect(page.locator("#buildId")).toBeVisible();
  await expect(page.locator("#iacBadge")).toBeVisible();
  await expect(page.locator("#kubeClusterBadge")).toBeVisible();
});
