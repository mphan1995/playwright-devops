import { test, expect } from "@playwright/test";
import { gotoPageWithStorage, paths, setRole, storageKeys } from "./helpers";

test("users roster is available and admin controls stay gated", async ({ page }) => {
  await gotoPageWithStorage(page, paths.users, {
    [storageKeys.role]: "user",
  });

  const rows = page.locator(".data-table tbody tr");
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(0);

  const adminGateBefore = await page
    .locator(".page-content [data-role-allow]")
    .evaluateAll((elements) => {
      const adminElements = elements.filter((element) =>
        element.dataset.roleAllow
          ?.split(",")
          .map((value) => value.trim())
          .includes("admin")
      );
      return {
        count: adminElements.length,
        hiddenCount: adminElements.filter((element) => element.hidden).length,
      };
    });
  expect(adminGateBefore.count).toBeGreaterThan(0);
  expect(adminGateBefore.hiddenCount).toBe(adminGateBefore.count);

  await setRole(page, "admin");

  const adminGateAfter = await page
    .locator(".page-content [data-role-allow]")
    .evaluateAll((elements) => {
      const adminElements = elements.filter((element) =>
        element.dataset.roleAllow
          ?.split(",")
          .map((value) => value.trim())
          .includes("admin")
      );
      return {
        count: adminElements.length,
        hiddenCount: adminElements.filter((element) => element.hidden).length,
      };
    });
  expect(adminGateAfter.hiddenCount).toBe(0);
});
