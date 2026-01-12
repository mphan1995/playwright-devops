import { test, expect } from "@playwright/test";
import { gotoPage, paths, setRole } from "./helpers";

test("users table and admin-only card", async ({ page }) => {
  await gotoPage(page, paths.users);

  const rows = page.locator(".data-table tbody tr");
  await expect(rows).toHaveCount(4);
  await expect(page.locator(".data-table")).toContainText("MaX Phan");

  const adminCard = page.locator(".info-card", { hasText: "Pending Access Requests" });
  await expect(adminCard).toBeHidden();

  await setRole(page, "admin");
  await expect(adminCard).toBeVisible();
});
