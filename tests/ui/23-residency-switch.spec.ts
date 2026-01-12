import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("data residency switch updates service zones", async ({ page }) => {
  await gotoPage(page, paths.services);

  await page.locator("#residencySelect").selectOption("eu-west-1");
  await expect(page.locator("#residencyBadge")).toHaveText("Residency: EU West");
  await expect(page.locator(".service-card").first()).toContainText("Zone: eu-west-1");
});
