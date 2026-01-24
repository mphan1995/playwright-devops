import { test, expect } from "@playwright/test";
import { defaultKubeState, gotoPageWithStorage, paths, storageKeys } from "./helpers";

test("kubernetes hpa and pool actions update counts", async ({ page }) => {
  await gotoPageWithStorage(page, paths.dashboard, {
    [storageKeys.role]: "admin",
    [storageKeys.kube]: JSON.stringify(defaultKubeState),
  });

  const hpaValue = page.locator("#kubeHpaValue");
  await expect(hpaValue).toHaveText("6 pods");
  await page.locator('[data-hpa-step="1"]').click();
  await expect(hpaValue).toHaveText("7 pods");

  const coreNodes = page.locator('[data-kube-pool="core"] [data-pool-nodes]');
  await expect(coreNodes).toHaveText("Nodes: 6/6");
  await page.locator('[data-pool-action="scale"][data-pool-target="core"]').click();
  await expect(coreNodes).toHaveText("Nodes: 7/7");
  await page.locator('[data-pool-action="drain"][data-pool-target="core"]').click();
  await expect(coreNodes).toHaveText("Nodes: 6/7");
});
