import { getTier, TIERS } from '@abcnews/env-utils';
import { url2cmid } from '@abcnews/url2cmid';
import { INFO_SOURCE_LOGOS_HTML_FRAGMENT_ID, SELECTORS } from '../constants';
import { fetchDocument } from '../utils/content';
import { $, $$, detach } from '../utils/dom';

const FACEBOOK = /facebook\.com/;
const TWITTER = /twitter\.com/;
const EMAIL = /mailto:/;

const SHARE_ORDERING = ['facebook', 'twitter', 'native', 'email'];

let meta = null; // singleton

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

function getDataAttribute(name) {
  const el = $(`[data-${name}]`);

  return el ? el.getAttribute(`data-${name}`) : null;
}

function getBylineNodes() {
  const bylineEl = $(SELECTORS.BYLINE);

  if (!bylineEl) {
    return [];
  }

  const clonedBylineEl = bylineEl.cloneNode(true);

  $$('[data-tooltip-uri]', clonedBylineEl).forEach(tooltipEl => tooltipEl.parentElement.removeChild(tooltipEl));
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

function getShareLinks({ url, title }) {
  return $$('a', $(SELECTORS.SHARE_TOOLS))
    .reduce(
      (links, linkEl) => {
        const url = linkEl.href;
        let link;

        switch (url) {
          case (url.match(FACEBOOK) || {}).input:
            link = { id: 'facebook', url };
            break;
          case (url.match(TWITTER) || {}).input:
            link = { id: 'twitter', url };
            break;
          case (url.match(EMAIL) || {}).input:
            if (!navigator.share) {
              link = { id: 'email', url };
            }
            break;
          default:
            break;
        }

        if (link && !links.find(({ id }) => id === link.id)) {
          links.push(link);
        }

        return links;
      },
      navigator.share ? [{ id: 'native', url, title }] : []
    )
    .sort((a, b) => SHARE_ORDERING.indexOf(a.id) - SHARE_ORDERING.indexOf(b.id));
}

function getRelatedStoriesIds() {
  return $$('[data-component="RelatedStories"] [data-component="RelatedStoriesCard"] a').map(el => url2cmid(el.href));
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
    ({ url, title }) => ({
      shareLinks: getShareLinks({ url, title })
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
    isPreview: getTier() === TIERS.PREVIEW
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
