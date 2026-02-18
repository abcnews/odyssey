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
 * @type {{cmid: string; targets: {selector: string; tags?: string[]}[]}[]}
 */
const ARTICLES = [
  {
    cmid: '105234668', // Finding Robert Bogucki, the man who disappeared on purpose
    targets: [
      { selector: '.Block', tags: ['Block', 'Caption'] },
      { selector: '.Header.is-layered', tags: ['Header'] }
    ]
  },
  {
    cmid: '106260980',
    targets: [{ selector: '.Header.is-dark', tags: ['Header'] }]
  },
  {
    cmid: '105888546',
    targets: [{ selector: '.Header', tags: ['Header'] }] // no media
  },
  {
    cmid: '106004326', // When the southern lights are seen further north
    targets: [{ selector: '.Block:has(.Block-mediaCaption)', tags: ['Block', 'Caption'] }]
  },
  {
    cmid: '106196216',
    targets: [
      { selector: '.Mosaic', tags: ['Mosaic'] },
      { selector: '.Quote.is-pullquote', tags: ['Quote'] }
    ]
  },
  {
    cmid: '105866280', // The ocean’s ‘wall of death’
    targets: [{ selector: '.Gallery', tags: ['Gallery'] }]
  },
  {
    cmid: '102321436',
    targets: [
      { selector: '.Backdrop', tags: ['Backdrop'] },
      { selector: '.FormatCredit', tags: ['FormatCredit'] }
    ]
  },
  // {
  //   cmid: '105906708',
  //   targets: [
  //     { selector: '.Header', tags: ['Header'] } // supplant
  //   ]
  // },
  {
    cmid: '105996614',
    targets: [{ selector: '.Mosaic.u-full', tags: ['Mosaic'] }]
  },
  {
    cmid: '105412700',
    targets: [
      { selector: '.Block.has-light', tags: ['Block'] },
      { selector: '.ShareBar', tags: ['Share'] }
    ]
  },
  {
    cmid: '106097868',
    targets: [{ selector: '.Main > hr', tags: ['HR'] }]
  },
  {
    cmid: '105637506',
    targets: [{ selector: '.ImageEmbed.is-cover', tags: ['Config'] }]
  },
  {
    cmid: '105957172',
    targets: [
      { selector: '.u-pull-in', tags: ['pull-in'] },
      { selector: '.u-quote', tags: ['Smart Quotes'] }
    ]
  },
  {
    cmid: '104573748',
    targets: [
      { selector: '.u-cta', tags: ['CTA'] },
      { selector: '[data-component="Iframe"]', tags: ['Datawrapper', 'iframe'] }
    ]
  }
];

/**
 *
 * @param {string} path_prefix The prefix (denoting web or app)
 * @param {string} article An article ID
 */

test.use({
  ignoreHTTPSErrors: true // This is to allow loading dev stuff on localhost.
});

ARTICLES.forEach(({ targets, cmid }) => {
  test.describe(`article ${cmid}`, { tag: `@${cmid}` }, () => {
    PLATFORMS.forEach(([subdomain, prefix]) => {
      test.describe(`${prefix}`, { tag: `@${prefix}` }, () => {
        // test.beforeEach(async ({ page }) => {

        // });

        RESOLUTIONS.forEach(resolution => {
          // TODO: Add resolution tag
          test.describe(`${resolution.join(',')}`, async () => {
            test.beforeEach(async ({ page }) => {
              await page.setViewportSize({ width: resolution[0], height: resolution[1] });
              const url = `https://${subdomain}.abc.net.au/${prefix}/${cmid}`;
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

            // Above the fold is being troublesome and doesn't add much
            // test('above the fold', async ({ page }) => {
            //   await expect(page).toHaveScreenshot({ timeout: 30000, stylePath: join(__dirname, 'screenshots.css') });
            // });

            targets.forEach(({ selector, tags }) => {
              test(`${selector}`, { tag: (tags || []).map(t => `@${t}`) }, async ({ page }) => {
                const testElement = page.locator(selector).first();
                await expect(testElement).toHaveCount(1);
                await testElement.scrollIntoViewIfNeeded();
                await testElement.waitFor({ state: 'visible' });

                // It seems to be very complicated to handle visual tests on pages with lazy loaded images.
                // This is a hack to get around that by looking for any image elements inside the element being tested
                // and waiting for them to have loaded by checking if the image element itself reports a `naturalWidth`
                // which will be zero for images that haven't yet loaded.
                const images = testElement.locator('img');
                const imagesCount = await images.count();
                for (let i = 0; i < imagesCount; i++) {
                  await expect(async () => {
                    const naturalWidth = await images.nth(i).evaluate(img => {
                      return img instanceof HTMLImageElement && img.naturalWidth;
                    });

                    expect(naturalWidth).toBeGreaterThan(0);
                  }).toPass();
                }

                await expect(testElement).toHaveScreenshot({
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
