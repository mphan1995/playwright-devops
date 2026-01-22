import { test, expect } from "@playwright/test";
import { gotoPageWithStorage, paths, setRole, storageKeys } from "./helpers";

test("settings guardrails keep admin overrides gated", async ({ page }) => {
  await gotoPageWithStorage(page, paths.settings, {
    [storageKeys.role]: "user",
  });

  const adminGateBefore = await page
    .locator(".settings-grid [data-role-allow]")
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
    .locator(".settings-grid [data-role-allow]")
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
