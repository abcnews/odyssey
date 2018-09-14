// External
const { parseDate } = require('inn-abcdatetime-lib');
const url2cmid = require('util-url2cmid');

// Ours
const { MOCK_ELEMENT, SELECTORS } = require('../../constants');
const { $, $$, detach } = require('../utils/dom');
const { trim } = require('../utils/misc');

const STARTS_WITH_YEAR_PATTERN = /^\d{4}-/;
const ROGUE_YEAR_COLON_PATTERN = /:(\d+)$/;

const FACEBOOK = /facebook\.com/;
const TWITTER = /twitter\.com/;
const WHATS_APP = /whatsapp:/;
const REDDIT = /reddit\.com/;
const EMAIL = /mailto:/;

const SHARE_ORDERING = ['facebook', 'twitter', 'whatsapp', 'reddit', 'email'];

let meta = null; // singleton

function getMetaContent(name) {
  const el = $(`meta[name="${name}"]`);

  return el ? el.getAttribute('content') : null;
}

function getDate(metaElName, timeElClassName) {
  let datetime = getMetaContent(metaElName);

  if (datetime) {
    return parseDate(datetime);
  }

  datetime = ($(`time.${timeElClassName}`) || MOCK_ELEMENT).getAttribute('datetime') || '';

  if (STARTS_WITH_YEAR_PATTERN.test(datetime)) {
    return parseDate(datetime);
  }

  return datetime.replace(ROGUE_YEAR_COLON_PATTERN, '$1');
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
    .map(node => node.cloneNode(true));
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

function getShareLinks() {
  return $$('a', $(SELECTORS.SHARE_TOOLS))
    .reduce((links, linkEl) => {
      const href = linkEl.href;

      switch (href) {
        case (href.match(FACEBOOK) || {}).input:
          links.push({ id: 'facebook', href });
          break;
        case (href.match(TWITTER) || {}).input:
          links.push({ id: 'twitter', href });
          break;
        case (href.match(WHATS_APP) || {}).input:
          links.push({ id: 'whatsapp', href });
          break;
        case (href.match(REDDIT) || {}).input:
          links.push({ id: 'reddit', href });
          break;
        case (href.match(EMAIL) || {}).input:
          links.push({ id: 'email', href });
          break;
        default:
          break;
      }

      return links;
    }, [])
    .sort((a, b) => SHARE_ORDERING.indexOf(a.id) - SHARE_ORDERING.indexOf(b.id));
}

function getRelatedStoriesIds() {
  return $$(`
    .attached-content > .inline-content.story > a,
    .related > article > a
  `).map(el => url2cmid(el.href));
}

function getRelatedMedia() {
  const relatedMediaEl = $(`
    .view-hero-media,
    .content > article > header + figure,
    .attached-content > .inline-content.photo,
    .attached-content > .inline-content.video
  `);

  if (!relatedMediaEl) {
    return null;
  }

  return detach(relatedMediaEl);
}

function getMeta() {
  if (!meta) {
    meta = {
      title: getMetaContent('replacement-title') || $(SELECTORS.TITLE).textContent,
      published: getDate('DCTERMS.issued', 'original'),
      updated: getDate('DCTERMS.modified', 'updated'),
      bylineNodes: getBylineNodes(),
      infoSource: getInfoSource(),
      shareLinks: getShareLinks(),
      relatedMedia: getRelatedMedia(),
      relatedStoriesIds: getRelatedStoriesIds(),
      theme: getMetaContent('theme'),
      hasCaptionAttributions: getMetaContent('caption-attributions') !== 'false',
      hasCommentsEnabled: getMetaContent('showLivefyreComments') === 'true',
      isDarkMode: getMetaContent('dark-mode') === 'true'
    };
  }

  return meta;
}

module.exports = {
  getMeta
};
