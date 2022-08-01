import { getTier, TIERS } from '@abcnews/env-utils';
import { url2cmid } from '@abcnews/url2cmid';
import { INFO_SOURCE_LOGOS_HTML_FRAGMENT_ID, SELECTORS } from '../../constants';
import { $, $$, detach } from '../utils/dom';
import { trim } from '../utils/misc';

const FACEBOOK = /facebook\.com/;
const TWITTER = /twitter\.com/;
const EMAIL = /mailto:/;

const SHARE_ORDERING = ['facebook', 'twitter', 'native', 'email'];

let meta = null; // singleton

function getArticledetail() {
  try {
    // The key is "document" in `newsweb`, and "app" in `newsapp` PL
    const { document, app } = window.__API__;

    return (document || app).loaders.articledetail;
  } catch (err) {
    return null;
  }
}

function getDataAttribute(name) {
  const el = $(`[data-${name}]`);

  return el ? el.getAttribute(`data-${name}`) : null;
}

function getBylineNodes() {
  const infoSourceEl = $(SELECTORS.INFO_SOURCE);
  const bylineEl = $(SELECTORS.BYLINE);

  if (!bylineEl) {
    return [];
  }

  const bylineSubEl = $('p', bylineEl);

  return Array.from((bylineSubEl || bylineEl).childNodes)
    .filter(node => node !== infoSourceEl && (node.textContent || '').trim().length > -1)
    .map(node => {
      const clone = node.cloneNode(true);

      if (clone.tagName === 'A') {
        clone.removeAttribute('class');
        clone.removeAttribute('data-component');
      }

      return clone;
    });
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
  return $$(`
    .attached-content > .inline-content.story > a,
    .related > article > a,
    [data-component="RelatedStories"] [data-component="RelatedStoriesCard"] a
  `).map(el => url2cmid(el.href));
}

function getRelatedMedia() {
  const relatedMediaEl = $(`
    .view-hero-media,
    .content > article > header + figure,
    .published + .inline-content.full.photo,
    .published + .inline-content.full.video,
    .attached-content > .inline-content.photo,
    .attached-content > .inline-content.video,
    [data-component="FeatureMedia"] [data-component="Figure"],
    [data-component="FeatureMedia"] [data-component="WebContentWarning"]
  `);

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
            hasCommentsEnabled: metaDataName['showLivefyreComments'] === true,
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
    // Create media lookups
    () =>
      (terminusDocument._embedded.mediaEmbedded || [])
        .concat(terminusDocument._embedded.mediaFeatured || [])
        .concat(terminusDocument._embedded.mediaRelated || [])
        .reduce(
          (memo, item) => {
            const { docType, id, media } = item;

            if (docType === 'Image' || docType === 'ImageProxy') {
              memo.images.push(item);
              memo.imagesById[id] = item;

              const { binaryKey, complete } = media.image.primary;

              if (binaryKey) {
                memo.imagesByBinaryKey[binaryKey] = item;
              } else if (docType === 'ImageProxy' && complete) {
                const proxiedId = url2cmid(complete[0].url);

                if (proxiedId) {
                  memo.imagesById[proxiedId] = item;
                }
              }
            }

            return memo;
          },
          {
            images: [],
            imagesByBinaryKey: {},
            imagesById: {}
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
  const { imagesByBinaryKey, imagesById } = getMeta();
  const [, binaryKey] = url.match(/\/([0-9a-f]{32})\b/) || [];

  if (binaryKey) {
    return imagesByBinaryKey[binaryKey];
  }

  return imagesById[url2cmid(url)] || null;
};
