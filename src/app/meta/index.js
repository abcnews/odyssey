// @ts-check
import { getTier, TIERS, getApplication, APPLICATIONS } from '@abcnews/env-utils';
import { url2cmid } from '@abcnews/url2cmid';
import { INFO_SOURCE_LOGOS_HTML_FRAGMENT_ID, SELECTORS } from '../constants';
import { fetchDocument } from '../utils/content';
import { $, $$, detach, isAnchorElement, isElement } from '../utils/dom';
import { debug } from '../utils/logging';

let meta = null; // singleton

/**
 * @typedef {{id: 'native'|'facebook'|'twitter'|'email'|'linkedin'|'copylink', url: string, title: string}} ShareLink
 */

function getArticledetail() {
  try {
    // The key is "document" in `newsweb`, and "app" in `newsapp` PL
    const { document, app } = window.__NEXT_DATA__?.props?.pageProps;

    return (document || app).loaders.articledetail;
  } catch (err) {
    debug('Error accessing article data from __NEXT_DATA__', err);
    return null;
  }
}

/**
 * Get the content of a named data attribute from the first element with that attribute
 * @param {string} name
 * @returns {string|null}
 */
function getDataAttribute(name) {
  const el = $(`[data-${name}]`);

  return el ? el.getAttribute(`data-${name}`) : null;
}

/**
 * Get DOM elements that make up the byline
 * @returns {ChildNode[]}
 */
function getBylineNodes() {
  const bylineEl = $(SELECTORS.BYLINE);

  if (!bylineEl) {
    return [];
  }

  const clonedBylineEl = bylineEl.cloneNode(true);

  if (!isElement(clonedBylineEl)) {
    return [];
  }

  $$('[data-tooltip-uri]', clonedBylineEl).forEach(tooltipEl => tooltipEl.parentElement?.removeChild(tooltipEl));
  $$('a', clonedBylineEl).forEach(linkEl => {
    linkEl.removeAttribute('class');
    linkEl.removeAttribute('data-component');
    linkEl.removeAttribute('data-uri');
    linkEl.removeAttribute('style');
  });

  const bylineNodesParentEl = $('div,p,[data-component="Text"]', clonedBylineEl) || clonedBylineEl;

  return Array.from(bylineNodesParentEl.childNodes).filter(
    node => node.nodeType !== Node.COMMENT_NODE && (node.textContent || '').trim().length > -1
  );
}

const FACEBOOK = /facebook\.com/;
const TWITTER = /twitter\.com/;
const EMAIL = /mailto:/;
const LINK_QUERY_STRING = '?utm_campaign=abc_news_web&utm_content=link&utm_medium=content_shared&utm_source=abc_news_web';

const SHARE_ORDERING = ['facebook', 'linkedin', 'twitter', 'native', 'email', 'copylink'];

/**
 * Generate share links
 * @param {{url: string; title: string, isFuture: boolean}} options The title and URL of the article to generate share links for
 * @returns {ShareLink[]}
 */
function getShareLinks({ url, title, isFuture }) {
  /** @type {ShareLink[]} */
  const initLinks =
    // @ts-ignore Types claim navigator.share always exists, but it doesn't.
    navigator.share ? [{ id: 'native', url, title }] : [];

  initLinks.push({
    id: 'copylink',
    title,
    url: `${url}${LINK_QUERY_STRING}`,
  });

  return $$('a', $(isFuture ? SELECTORS.SHARE_UTILITY : SELECTORS.SHARE_TOOLS))
    .reduce((links, linkEl) => {
      if (!isAnchorElement(linkEl)) return links;

      const url = linkEl.href;

      /** @type {ShareLink|undefined} */
      let link;

      switch (url) {
        case (url.match(FACEBOOK) || {}).input:
          link = { id: 'facebook', url, title };
          break;
        case (url.match(TWITTER) || {}).input:
          link = { id: 'twitter', url, title };
          break;
        case (url.match(EMAIL) || {}).input:
          if (!navigator.share) {
            link = { id: 'email', url, title };
          }
          break;
        default:
          break;
      }

      if (link && !links.find(({ id }) => id === link.id)) {
        links.push(link);
      }

      return links;
    }, initLinks)
    .sort((a, b) => SHARE_ORDERING.indexOf(a.id) - SHARE_ORDERING.indexOf(b.id));
}

function getRelatedStoriesIds() {
  return $$('[data-component="RelatedStories"] [data-component="RelatedStoriesCard"] a').map(
    el => isAnchorElement(el) && url2cmid(el.href)
  );
}

function getRelatedMedia() {
  const relatedMediaEl = $(
    [
      '[data-component="FeatureMedia"] [data-component="Figure"]',
      '[data-component="FeatureMedia"] [data-component="WebContentWarning"]'
    ].join()
  );

  if (!relatedMediaEl) {
    return null;
  }

  return detach(relatedMediaEl);
}

export const initMeta = terminusDocument => {
  if (meta) {
    throw new Error('Cannot create meta more than once.');
  }

  /**
   * @typedef {Object} MetaData;
   * @prop {Record<string, string | boolean>} _metaDataName
   * @prop {string} url
   * @prop {string} title
   * @prop {string} description
   * @prop {boolean} isNewsApp
   * @prop {boolean} isFuture
   * @prop {ShareLink[]} shareLinks
   */

  /**
   * @type {((meta: Partial<MetaData>) => Partial<MetaData> | null)[]}
   */
  const mixins = [
    // Add or update props defined by the 'meta.data.name' context setting
    ({ url, title, description }) => {
      const metaDataName = terminusDocument.contextSettings && terminusDocument.contextSettings['meta.data.name'];

      return metaDataName
        ? {
            _metaDataName: metaDataName,
            url: metaDataName['replacement-url'] || url,
            title: metaDataName['replacement-title'] || title,
            description: metaDataName['replacement-description'] || description,
            theme: metaDataName.theme || null,
            hasCaptionAttributions: metaDataName['caption-attributions'] !== false,
            isDarkMode: metaDataName['dark-mode'] === true
          }
        : null;
    },
    // Discover if the page was rendered by the News app
    () => {
      let isNewsApp = false;

      try {
        const pageURL =
          window && window.location !== window.parent.location ? document.referrer : document.location.href;

        isNewsApp = pageURL.indexOf('newsapp') > -1;
      } catch (err) {}

      return {
        isNewsApp
      };
    },
    // Parse share links from the DOM, using url & title props
    ({ url, title, isFuture }) => ({
      shareLinks:
        typeof url !== 'undefined' && typeof title !== 'undefined' && typeof isFuture !== 'undefined'
          ? getShareLinks({ url, title, isFuture })
          : []
    }),
    // Parse remaining props from the DOM, sometimes using defaults
    () => ({
      bylineNodes: getBylineNodes(),
      infoSourceLogosHTMLFragmentId: getDataAttribute('info-source-logos') || INFO_SOURCE_LOGOS_HTML_FRAGMENT_ID,
      relatedMedia: getRelatedMedia(),
      relatedStoriesIds: getRelatedStoriesIds()
    }),
    // Create media lookups & pre-emptively fetch Teaser document targets we'll use later
    () =>
      (terminusDocument._embedded.mediaEmbedded || [])
        .concat(terminusDocument._embedded.mediaFeatured || [])
        .concat(terminusDocument._embedded.mediaRelated || [])
        .reduce(
          (memo, doc) => {
            const { docType, id, media, target } = doc;

            if (!memo.mediaById[id]) {
              memo.media.push(doc);
              memo.mediaById[id] = doc;
            }

            switch (docType) {
              case 'Teaser':
                if (target) {
                  // Pre-empt a future fetch of the target document
                  fetchDocument({ id: target.id, type: target.docType.toLowerCase() });
                }
                break;
              case 'Image':
              case 'ImageProxy':
                // It's possible for the `media` key to be undefined if it's an ImageProxy
                // pointing at a deleted image. The `!!media` condition will stop Odyssey
                // falling over in that case.
                if (!memo.imagesById[id] && !!media) {
                  memo.images.push(doc);
                  memo.imagesById[id] = doc;
                  memo.imagesByBinaryKey[media.image.primary.binaryKey] = doc;
                }
                break;
              default:
                break;
            }

            return memo;
          },
          {
            images: [],
            imagesByBinaryKey: {},
            imagesById: {},
            media: [],
            mediaById: {}
          }
        )
  ];

  // Feed terminus document-based props through the above mixins
  meta = mixins.reduce((meta, step) => ({ ...meta, ...(step(meta) || {}) }), {
    _articledetail: getArticledetail(),
    _terminusDocument: terminusDocument,
    id: terminusDocument.id,
    url: terminusDocument.canonicalURL,
    title: terminusDocument.title,
    description: terminusDocument.synopsis,
    published: new Date(terminusDocument.dates.displayPublished),
    updated: terminusDocument.dates.displayUpdated ? new Date(terminusDocument.dates.displayUpdated) : null,
    productionUnit: terminusDocument.productionUnit,
    infoSource: terminusDocument.source
      ? {
          name: terminusDocument.source,
          url: terminusDocument.sourceURL
        }
      : null,
    // keep isPL around until we can audit Odyssey plugins and ensure none depend on it
    isPL: true,
    isPreview: getTier() === TIERS.PREVIEW,
    isFuture: getApplication() === APPLICATIONS.PLNF
  });

  return meta;
};

export const getMeta = () => {
  if (!meta) {
    throw new Error('Cannot read meta before it is created.');
  }

  return meta;
};

export const lookupImageByAssetURL = url => {
  const { imagesByBinaryKey } = getMeta();
  const [, binaryKey] = url.match(/\/([0-9a-f]{32})\b/) || [];

  if (binaryKey) {
    return imagesByBinaryKey[binaryKey];
  }

  return null;
};
