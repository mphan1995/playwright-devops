import { test, expect } from "@playwright/test";
import { gotoPage, paths, setRole } from "./helpers";

test("role selection persists across routes and reloads", async ({ page }) => {
  await gotoPage(page, paths.dashboard);
  await setRole(page, "operator");

  await page.locator('a.nav-link[data-page="users"]').click();
  await expect(page.locator("#pageTitle")).toHaveText("Users");
  await expect(page.locator("#roleBadge")).toHaveText("Operator");
  await expect(page.locator("#navRole")).toHaveText("Operator");

  await page.reload();
  await expect(page.locator("#roleBadge")).toHaveText("Operator");
});
