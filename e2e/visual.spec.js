// @ts-check
import { join } from 'node:path';
import { test, expect } from '@playwright/test';

// TODO: A test to ensure the branch/development version of Odyssey is being used for testing

/**
 * @type {[number, number][]}
 */
const RESOLUTIONS = [
  [1920, 1080],
  [390, 844]
];

/**
 * The outputs to test with as an array of [subdomain, path_prefix]
 * @type {[string, string][]}
 */
const PLATFORMS = [
  ['www', 'news'],
  ['newsapp', 'newsapp']
];

/**
 * List of articles and elements to do visual tests on
 * @type {[string, {targets: string[]}][]}
 */
const ARTICLES = [
  [
    '105234668', // Finding Robert Bogucki, the man who disappeared on purpose
    {
      targets: ['.Block', '.Header.is-layered']
    }
  ]
];

/**
 *
 * @param {string} path_prefix The prefix (denoting web or app)
 * @param {string} article An article ID
 */

test.use({
  ignoreHTTPSErrors: true // This is to allow loading dev stuff on localhost.
});

ARTICLES.forEach(([article, { targets }]) => {
  test.describe(`article ${article}`, { tag: `@${article}` }, () => {
    PLATFORMS.forEach(([subdomain, prefix]) => {
      test.describe(`${prefix}`, { tag: `@${prefix}` }, () => {
        test.beforeEach(async ({ page }) => {
          const url = `https://${subdomain}.abc.net.au/${prefix}/${article}?future=true`;
          // Substitute production odyssey for local dev build
          await page.route('https://www.abc.net.au/res/sites/news-projects/odyssey/**/*', route => {
            const url = route
              .request()
              .url()
              .replace(
                /https:\/\/www.abc.net.au\/res\/sites\/news-projects\/odyssey\/[^\/]+/,
                'https://localhost:8000'
              );
            return route.continue({ url });
          });

          // Uncomment this to help diagnose errors inside the headless browser
          // which would be otherwise invisible.
          // page.on('console', msg => console.log(msg.text(), msg.location(), msg.args()));
          await page.goto(url);
          await page.mainFrame().waitForFunction(() => window.__ODYSSEY__);
        });

        RESOLUTIONS.forEach(resolution => {
          // TODO: Add resolution tag
          test.describe(`${resolution.join(',')}`, () => {
            test.beforeEach(async ({ page }) => {
              await page.setViewportSize({ width: resolution[0], height: resolution[1] });
            });

            // Above the fold is being troublesome and doesn't add much
            // test('above the fold', async ({ page }) => {
            //   await expect(page).toHaveScreenshot({ timeout: 30000, stylePath: join(__dirname, 'screenshots.css') });
            // });

            targets.forEach(target => {
              test(`${target}`, { tag: `@${target}` }, async ({ page }) => {
                const locator = page.locator(target).first();
                await expect(locator).toHaveCount(1);
                await locator.scrollIntoViewIfNeeded();
                await page.waitForTimeout(100);
                await expect(locator).toHaveScreenshot({
                  timeout: 30000,
                  stylePath: join(__dirname, 'screenshots.css')
                });
              });
            });
          });
        });
      });
    });
  });
});
