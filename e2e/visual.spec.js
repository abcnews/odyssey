// @ts-check
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { ARTICLES, EMBED_CONTENT_ELEMENTS, PLATFORMS, RESOLUTIONS } from './fixtures';
import { waitForImagesLoaded } from './helpers/waitForImages';

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
    PLATFORMS.forEach(
      /** @param {[string, string]} platform */
      ([subdomain, prefix]) => {
        test.describe(`${prefix}`, { tag: `@${prefix}` }, () => {
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

              targets.forEach(({ selector, tags }) => {
                test(`${selector}`, { tag: (tags || []).map(t => `@${t}`) }, async ({ page }) => {
                  const testElement = page.locator(selector).first();
                  await expect(testElement).toHaveCount(1);
                  await testElement.scrollIntoViewIfNeeded();
                  await testElement.waitFor({ state: 'visible' });

                  // It seems to be very complicated to handle visual tests on pages with lazy loaded images.
                  // The following section uses the Odyssey lazy loaded images API to check the picture has loaded (if
                  // it's visible in the viewport) before taking screenshots.
                  const pictures = testElement.locator('.Picture');
                  const pictureCount = await pictures.count();
                  for (let i = 0; i < pictureCount; i++) {
                    await expect(async () => {
                      const data = await pictures.nth(i).evaluate(rootEl => {
                        return {
                          loaded: rootEl.hasAttribute('loaded'),
                          // @ts-expect-error .api isn't defined in this context
                          rect: rootEl.api?.getRect(),
                          viewport: { width: window.innerWidth, height: window.innerHeight }
                        };
                      });

                      // Only test for load if this picture is in the viewport.
                      if (
                        data.rect &&
                        data.rect.left < data.viewport.width &&
                        data.rect.right > 0 &&
                        data.rect.top < data.viewport.height &&
                        data.rect.bottom > 0
                      ) {
                        expect(data.loaded).toBe(true);
                      }
                    }).toPass();
                  }

                  // It seem to sometimes be possible that there's a moment between the Picture component's lazy load API
                  // marking the component as loaded and the image actually loading.
                  // This checks that any image elements inside the Picture component being tested has actually loaded an
                  // image by waiting for the image element itself reports a `naturalWidth` which will be zero for images
                  // that haven't yet loaded.
                  await waitForImagesLoaded(pictures);

                  // Wait until interactive components have loaded their iframes
                  if (tags?.includes('iframe')) {
                    // 1. The iframe has been injected into the page
                    const iframe = testElement.locator('iframe');
                    await expect(iframe).toBeVisible({ timeout: 15_000 });

                    // 2. Content inside the iframe has rendered
                    const embed = testElement.frameLocator('iframe');

                    // Target individual third party content that indicates a loaded state
                    for (const embedType in EMBED_CONTENT_ELEMENTS) {
                      if (tags?.includes(embedType)) {
                        await expect(embed.locator(EMBED_CONTENT_ELEMENTS[embedType])).toBeVisible();
                      }
                    }

                    // Wait for images in iframe content too
                    await waitForImagesLoaded(embed);
                  }

                  await expect(testElement).toHaveScreenshot({
                    stylePath: join(__dirname, 'screenshots.css')
                  });
                });
              });
            });
          });
        });
      }
    );
  });
});
