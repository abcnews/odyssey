// @ts-check
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
// import { cross } from './utils';

// TODO: A test to ensure the branch/development version of Odyssey is being used for testing

/**
 * @type {[number, number][]}
 */
const RESOLUTIONS = [
  [1920, 1080],
  [390, 844]
];

// web/app
const PATH_PREFIXES = ['news', 'newsapp'];

// list of articles
const ARTICLES = new Map([
  [
    '105234668', // Finding Robert Bogucki, the man who disappeared on purpose
    {
      targets: ['.Block', '.Header.is-layered']
    }
  ]
  // ['101160796', { targets: ['.Gallery', '.Mosaic', '.u-cta'] }], // kitchen sink
  // ['8676500', { targets: [] }] // producer's documentation home
]);

/**
 *
 * @param {string} path_prefix The prefix (denoting web or app)
 * @param {string} article An article ID
 */
const constructFullUrl = (path_prefix, article) => {
  return `https://${path_prefix === 'newsapp' ? 'newsapp' : 'www'}.abc.net.au/${path_prefix}/${article}?future=true`;
};

// cross(RESOLUTIONS, PATH_PREFIXES, Array.from(ARTICLES.keys())).forEach(([resolution, prefix, article]) => {
Array.from(ARTICLES).forEach(([article, { targets }]) => {
  test.describe(`article ${article}`, { tag: `@${article}` }, () => {
    PATH_PREFIXES.forEach(prefix => {
      test.describe(`${prefix}`, { tag: `@${prefix}` }, () => {
        test.beforeEach(async ({ page }) => {
          const url = constructFullUrl(prefix, article);
          // Substitute production odyssey for local dev build
          // await page.route('https://www.abc.net.au/res/sites/news-projects/odyssey/**/*', route => {
          //   if (TEST_LOCAL_SERVER) {
          //     const url = route
          //       .request()
          //       .url()
          //       .replace(/https:\/\/www.abc.net.au\/res\/sites\/news-projects\/odyssey\/[^\/]+/, TEST_LOCAL_SERVER);
          //     return route.continue({ url });
          //   }
          //   return route.continue();
          // });
          // page.on('console', msg => console.log(msg.text(), msg.location(), msg.args()));
          await page.goto(url);
        });

        RESOLUTIONS.forEach(resolution => {
          test.use({ viewport: { width: resolution[0], height: resolution[1] } });

          // TODO: Add resolution tag
          test.describe(`${resolution.join(',')}`, () => {
            test.beforeEach(async ({ page }) => {
              await page.mainFrame().waitForFunction(() => window.__ODYSSEY__);
              await page.waitForTimeout(1000);
            });

            test('above the fold', async ({ page }) => {
              await expect(page).toHaveScreenshot({
                stylePath: join(__dirname, 'screenshots.css')
              });
            });

            targets.forEach(target => {
              test(`${target}`, { tag: `@${target}` }, async ({ page }) => {
                const locator = page.locator(target).first();
                await expect(locator).toHaveCount(1);
                await locator.scrollIntoViewIfNeeded();
                await page.waitForTimeout(500);
                await expect(locator).toHaveScreenshot({
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
