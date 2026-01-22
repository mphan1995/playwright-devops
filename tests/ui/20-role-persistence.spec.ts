import { test, expect } from "@playwright/test";
import { gotoPage, paths, setRole } from "./helpers";

test("role selection persists across routes and reloads", async ({ page }) => {
  await gotoPage(page, paths.dashboard);
  await setRole(page, "moderator");

  await page.locator('a.nav-link[data-page="users"]').click();
  await expect(page.locator("#pageTitle")).toHaveText("Users");
  await expect(page.locator("#roleBadge")).toHaveText("Moderator");
  await expect(page.locator("#navRole")).toHaveText("Moderator");

  await page.reload();
  await expect(page.locator("#roleBadge")).toHaveText("Moderator");
});
