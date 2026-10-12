import { expect } from '@playwright/test';

/**
 * Anything you can call `.locator()` on: a page, a locator, or an iframe's frame locator.
 * @typedef {import('@playwright/test').Page
 *   | import('@playwright/test').Locator
 *   | import('@playwright/test').FrameLocator} Scope
 */

/**
 * @typedef {Object} WaitForImagesOptions
 * @property {string} [selector='img'] Selector for the images to wait on.
 * @property {number} [minCount=0] Fail if fewer than this many images are found.
 * @property {number} [timeout=10000] Timeout in ms (applied per image, and to the minCount check).
 */

/**
 * Waits until every matching image has finished loading successfully
 * (i.e. `naturalWidth > 0`). Broken images will cause a timeout failure.
 *
 * Note: the image list is read once, so images added to the DOM after
 * that point are not checked. Use `minCount` to avoid passing before
 * any images have appeared.
 *
 * @param {Scope} scope Page, Locator or FrameLocator to search within.
 * @param {WaitForImagesOptions} [options]
 * @returns {Promise<void>}
 *
 * @example
 * const embed = page.frameLocator('iframe[src*="platform.twitter.com"]');
 * await waitForImagesLoaded(embed, { minCount: 1 });
 * await expect(page).toHaveScreenshot();
 */
export async function waitForImagesLoaded(scope, { selector = 'img', minCount = 0, timeout = 10_000 } = {}) {
  const images = scope.locator(selector);

  if (minCount > 0) {
    await expect.poll(() => images.count(), { timeout }).toBeGreaterThanOrEqual(minCount);
  }

  const count = await images.count();

  for (let i = 0; i < count; i++) {
    await expect(async () => {
      const naturalWidth = await images
        .nth(i)
        .evaluate(img => (img instanceof HTMLImageElement ? img.naturalWidth : 0));

      expect(naturalWidth).toBeGreaterThan(0);
    }).toPass({ timeout });
  }
}
