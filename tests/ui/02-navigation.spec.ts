import { test, expect } from "@playwright/test";
import { gotoPage, paths, waitForApp } from "./helpers";

test("navigation updates active link and last route", async ({ page }) => {
  await gotoPage(page, paths.dashboard);

  await page.locator('a.nav-link[data-page="services"]').click();
  await waitForApp(page);
  await expect(page.locator("#pageTitle")).toHaveText("Service Health");
  await expect(page.locator('a.nav-link[data-page="services"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#navLastRoute")).toHaveText("Dashboard");

  await page.locator('a.nav-link[data-page="users"]').click();
  await waitForApp(page);
  await expect(page.locator("#pageTitle")).toHaveText("Users");
  await expect(page.locator('a.nav-link[data-page="users"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#navLastRoute")).toHaveText("Service Health");
});
