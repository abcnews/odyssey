// @ts-check
import { join } from 'node:path';
import { test, expect } from '@playwright/test';

test.describe('producers documentation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      `${process.env.TEST_PAGE_ORIGIN}/news/2025-06-05/odyssey-producers-documentation/8676500?terminusBaseURL=https://api-preview.private.terminus.abc-prod.net.au/api/v2&future=true`
    );
  });

  test('has title', async ({ page }) => {
    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Odyssey: How and why to use it/);
  });

  test('visual', async ({ page }) => {
    await page.mainFrame().waitForFunction(() => window.__ODYSSEY__);
    await expect(page.locator('#content')).toHaveScreenshot({ stylePath: join(__dirname, 'screenshots.css') });
  });
});
