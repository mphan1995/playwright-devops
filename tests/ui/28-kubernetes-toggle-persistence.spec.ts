import { test, expect } from "@playwright/test";
import { defaultKubeState, gotoPageWithStorage, paths, storageKeys, waitForApp } from "./helpers";

test("kubernetes toggles persist across reloads", async ({ page }) => {
  await gotoPageWithStorage(page, paths.dashboard, {
    [storageKeys.role]: "admin",
    [storageKeys.kube]: JSON.stringify(defaultKubeState),
  });

  const autoscaler = page.locator("#kubeAutoscalerToggle");
  const pdb = page.locator("#kubePdbToggle");

  await expect(autoscaler).toBeChecked();
  await expect(pdb).toBeChecked();

  await autoscaler.locator("..").click();
  await pdb.locator("..").click();
  await expect(autoscaler).not.toBeChecked();
  await expect(pdb).not.toBeChecked();

  await page.reload();
  await waitForApp(page);

  await expect(autoscaler).not.toBeChecked();
  await expect(pdb).not.toBeChecked();
});
