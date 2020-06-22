// External
const { getGeneration, getTier, GENERATIONS, TIERS } = require('@abcnews/env-utils');
const parseDate = require('date-fns/parse');
const url2cmid = require('util-url2cmid');

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
  const { document } = window.__API__;
  const { contextSettings } = document;
  const { published, updated } = document.publishedDatePrepared;

  // Add missing meta tags from publication/update dates
  setOrAddMetaTag('DCTERMS.issued', published.labelDate);
  setOrAddMetaTag('DCTERMS.modified', updated.labelDate);

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

function getCanonicalURL() {
  const el = $(`link[rel="canonical"]`);

  return el ? el.getAttribute('href') : document.location.href;
}

function getMetaContent(name) {
  const el = $(`meta[name="${name}"],meta[property="${name}"]`);

  return el ? el.getAttribute('content') : null;
}

function getDate(metaElName, timeElClassName) {
  const date = parseDate(
    getMetaContent(metaElName) || ($(`time.${timeElClassName}`) || MOCK_ELEMENT).getAttribute('datetime') || ''
  );

  return isNaN(date) ? null : date;
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

function getInfoSource() {
  let infoSourceLinkEl = $(SELECTORS.INFO_SOURCE_LINK);

  if (!infoSourceLinkEl) {
    const infoSourceMetaContent = getMetaContent('ABC.infoSource');

    if (infoSourceMetaContent) {
      infoSourceLinkEl = $(`a[title="${infoSourceMetaContent}"]`);
    } else {
      const infoSourceEl = $(SELECTORS.INFO_SOURCE);

      if (infoSourceEl) {
        infoSourceLinkEl = document.createElement('a');
        infoSourceLinkEl.textContent = infoSourceEl.textContent;
      }
    }
  }

  return infoSourceLinkEl
    ? {
        name: trim(infoSourceLinkEl.textContent),
        url: infoSourceLinkEl.getAttribute('href')
      }
    : null;
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
    [data-component="DetailHeader"] [data-component="Figure"],
    [data-component="DetailHeader"] [data-component="WebContentWarning"]
  `);

  if (!relatedMediaEl) {
    return null;
  }

  return detach(relatedMediaEl);
}

function getProductionUnit() {
  if (window.__API__) {
    return window.__API__.document.productionUnit;
  }

  if (!Array.isArray(window.dataLayer)) {
    return null;
  }

  return window.dataLayer.find(x => x.document != null).document[name] || null;
}

function getMeta() {
  if (!meta) {
    const isPl = getGeneration() === GENERATIONS.PL;

    if (isPl) {
      addPLMetaTags();
    }

    const url = getMetaContent('replacement-url') || getCanonicalURL();
    const title = getMetaContent('replacement-title') || $(SELECTORS.TITLE).textContent;
    const description = getMetaContent('replacement-description') || getMetaContent('description');

    meta = {
      id: getMetaContent('ContentId') || getMetaContent('ABC.ContentId'),
      url,
      title,
      description,
      published: getDate('DCTERMS.issued', 'original'),
      updated: getDate('DCTERMS.modified', 'updated'),
      bylineNodes: getBylineNodes(),
      productionUnit: getProductionUnit(),
      infoSource: getInfoSource(),
      infoSourceLogosHTMLFragmentId: getDataAttribute('info-source-logos') || INFO_SOURCE_LOGOS_HTML_FRAGMENT_ID,
      shareLinks: getShareLinks({ url, title, description }),
      relatedMedia: getRelatedMedia(),
      relatedStoriesIds: getRelatedStoriesIds(),
      theme: getMetaContent('theme'),
      hasCaptionAttributions: getMetaContent('caption-attributions') !== 'false',
      hasCommentsEnabled: getMetaContent('showLivefyreComments') === 'true',
      isDarkMode: getMetaContent('dark-mode') === 'true',
      isPl,
      isPreview: getTier() === TIERS.P
    };
  }

  return meta;
}

module.exports = {
  getMeta
};
