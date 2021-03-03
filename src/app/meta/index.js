// External
const { getGeneration, getTier, GENERATIONS, TIERS } = require('@abcnews/env-utils');
const { url2cmid } = require('@abcnews/url2cmid');

// Ours
const { INFO_SOURCE_LOGOS_HTML_FRAGMENT_ID, MOCK_ELEMENT, SELECTORS } = require('../../constants');
const { $, $$, detach, setOrAddMetaTag } = require('../utils/dom');
const { trim } = require('../utils/misc');

const FACEBOOK = /facebook\.com/;
const TWITTER = /twitter\.com/;
const EMAIL = /mailto:/;

const SHARE_ORDERING = ['facebook', 'twitter', 'native', 'email'];

let meta = null; // singleton

function addPLMetaTags() {
  let { document } = window.__API__;

  if (document.loaders) {
    document = document.loaders.articledetail;
  }

  const { contextSettings } = document;
  const { published, updated } = document.publishedDatePrepared;

  // Add missing meta tags from publication/update dates
  if (published) {
    setOrAddMetaTag('DCTERMS.issued', published.labelDate);
  }
  if (updated) {
    setOrAddMetaTag('DCTERMS.modified', updated.labelDate);
  }

  // Add missing meta tags based on the `meta.data.name` context setting to Presentation Layer pages
  if (contextSettings) {
    const mdn = contextSettings['meta.data.name'] || {};

    Object.keys(mdn).forEach(name => setOrAddMetaTag(name, mdn[name]));
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
    .filter(node => node !== infoSourceEl && trim(node.textContent).length > -1)
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
  const links = navigator.share ? [{ id: 'native', url, title }] : [];

  return $$('a', $(SELECTORS.SHARE_TOOLS))
    .reduce((links, linkEl) => {
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
    }, links)
    .sort((a, b) => SHARE_ORDERING.indexOf(a.id) - SHARE_ORDERING.indexOf(b.id));
}

function getRelatedStoriesIds() {
  return $$(`
    .attached-content > .inline-content.story > a,
    .related > article > a,
    [data-component="RelatedStories"] article > a
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

function initMeta(terminusDocument) {
  if (meta) {
    throw new Error('Cannot create meta more than once.');
  }

  const mixins = [
    // Add or update props defined by the 'meta.data.name' context setting
    ({ url, title, description }) => {
      const metaDataName = terminusDocument.contextSettings['meta.data.name'];

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
    })
  ];

  // Feed terminus document-based props through the above mixins
  meta = mixins.reduce((meta, step) => ({ ...meta, ...(step(meta) || {}) }), {
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
    isPL: getGeneration() === GENERATIONS.PL,
    isPreview: getTier() === TIERS.PREVIEW
  });

  return meta;
}

function getMeta() {
  if (!meta) {
    throw new Error('Cannot read meta before it is created.');
  }

  return meta;
}

module.exports = {
  initMeta,
  getMeta
};
